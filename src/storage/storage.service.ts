import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  expiresIn?: number; // For presigned URLs
}

export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    // Cloudflare R2 configuration
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;

    if (!this.bucketName) {
      throw new Error('R2_BUCKET_NAME environment variable is required');
    }

    this.s3Client = new S3Client({
      region: 'auto', // Cloudflare R2 uses 'auto' as region
      endpoint: this.configService.get<string>('R2_ENDPOINT')!,
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'R2_SECRET_ACCESS_KEY',
        )!,
      },
    });

    this.logger.log('Cloudflare R2 Storage Service initialized');
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    key: string,
    file: Buffer | Uint8Array | string,
    options: UploadOptions = {},
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file from R2 storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (response.Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }

      throw new Error('Invalid response body type');
    } catch (error) {
      this.logger.error(`Failed to download file ${key}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get a presigned URL for file upload
   */
  async getPresignedUploadUrl(
    key: string,
    options: UploadOptions = {},
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });

      this.logger.log(`Generated presigned upload URL for: ${key}`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL for ${key}:`,
        error,
      );
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Get a presigned URL for file download
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated presigned download URL for: ${key}`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned download URL for ${key}:`,
        error,
      );
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from R2 storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in R2 storage
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      this.logger.error(`Failed to check file existence ${key}:`, error);
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        etag: response.ETag?.replace(/"/g, '') || '',
      };
    } catch (error) {
      this.logger.error(`Failed to get file info for ${key}:`, error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * List files in a directory (prefix)
   */
  async listFiles(
    prefix?: string,
    maxKeys: number = 1000,
  ): Promise<FileInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents || []).map((obj) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag?.replace(/"/g, '') || '',
      }));
    } catch (error) {
      this.logger.error(`Failed to list files with prefix ${prefix}:`, error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Upload file from stream
   */
  async uploadFromStream(
    key: string,
    stream: Readable,
    options: UploadOptions = {},
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: stream,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded from stream successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file from stream ${key}:`, error);
      throw new Error(`Failed to upload file from stream: ${error.message}`);
    }
  }

  /**
   * Generate a unique key for file storage
   */
  generateUniqueKey(originalName: string, prefix?: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '');

    const key = `${prefix ? prefix + '/' : ''}${baseName}-${timestamp}-${randomSuffix}${extension ? '.' + extension : ''}`;

    return key;
  }
}
