import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAiService, PromptOptions, SurveyData } from '../base-ai.service';

@Injectable()
export class GenAiService extends BaseAiService {
  private readonly genAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenAI({
      apiKey,
    });
  }

  /**
   * Implementation of the abstract generateText method for Google GenAI
   */
  async generateText(prompt: string, options?: PromptOptions): Promise<string> {
    try {
      this.logger.log('Generating text with Google GenAI');

      const response = await this.genAI.models.generateContent({
        model: options?.model || 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || '';
    } catch (error) {
      this.logger.error('Error generating text with Google GenAI', error);
      throw new Error(`Failed to generate text with Google GenAI: ${error}`);
    }
  }

  /**
   * Generate Mermaid diagram with specific Google GenAI optimizations
   */
  async generateOptimizedMermaidDiagram(
    surveySummaryResult: string,
  ): Promise<string> {
    const options: PromptOptions = {
      model: 'gemini-2.5-flash-lite-preview-06-17	',
      temperature: 0.1, // Very low temperature for consistent diagram syntax
      maxTokens: 800,
    };
    return this.generateMermaidDiagram(surveySummaryResult, options);
  }

  /**
   * Generate comprehensive analysis with Google GenAI's strengths
   */
  async generateDetailedAnalysis(surveyData: SurveyData): Promise<string> {
    const options: PromptOptions = {
      model: 'gemini-2.5-flash-lite-preview-06-17',
      temperature: 0.7,
      maxTokens: 2000,
    };
    return this.generateRecommendations(surveyData, options);
  }
}
