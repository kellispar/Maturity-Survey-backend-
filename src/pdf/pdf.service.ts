import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { AssessmentPDF } from 'src/results/types/assessment';

@Injectable()
export class PdfService {
  private templateFolder = path.join(__dirname, '..', 'templates');
  private templatePaths = {
    aiInsight: path.join(this.templateFolder, 'ai-insight.hbs'),
    assessmentResults: path.join(this.templateFolder, 'assessment-results.hbs'),
  };

  private browser: puppeteer.Browser;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });
  }

  async generateAiInsightPdf(data: any) {
    const html = this.renderTemplate(data, this.templatePaths.aiInsight);
    const page = await this.browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm' },
    });

    await page.close();
    return buffer;
  }

  async generateAssessmentPdf(assessmentPDF: AssessmentPDF) {
    const html = this.renderTemplate(
      assessmentPDF,
      this.templatePaths.assessmentResults,
    );
    const page = await this.browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm' },
    });

    await page.close();
    return buffer;
  }

  private renderTemplate(data: any, templatePath: string): string {
    const source = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }
}
