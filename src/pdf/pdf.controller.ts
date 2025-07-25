import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) { }

  @Post()
  async generatePdf(@Body('html') html: string, @Res() res: Response) {
    const data = {};

    const pdf = await this.pdfService.generateAiInsightPdf(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"',
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
