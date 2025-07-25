import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SurveyData } from 'src/integrations/base-ai.service';
import { GenAiService } from 'src/integrations/genai/genai.service';
import { OpenAiService } from 'src/integrations/openai/openai.service';
import { PdfService } from 'src/pdf/pdf.service';
import { ResultsService } from 'src/results/results.service';
import { StorageService } from 'src/storage/storage.service';
import { SurveyResponseDto } from 'src/survey/dto/survey-response.dto';
import { mockPrograms } from 'src/survey/mock/program.mock';
import {
  mockQuestions,
  mockQuestionScores,
} from 'src/survey/mock/question.mock';
import { SurveyRequestDto } from './dto/survey-request.dto';
import { mockCategories } from './mock/category.mock';

@Controller('survey')
export class SurveyController {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly genAiService: GenAiService,
    private readonly resultsService: ResultsService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) { }

  @Get('/programs')
  getPrograms() {
    return {
      programs: mockPrograms,
    };
  }

  @Get('/:programId/questions')
  getQuestions(@Param('programId') programId: number) {
    const categories = mockCategories.filter((cat) =>
      cat.programIds.includes(Number(programId)),
    );
    const questions = mockQuestions
      .map((q) => {
        const cat = categories.find((c) => c.id === q.categoryId);
        if (!cat) return undefined;

        return {
          ...q,
          category: cat.name,
          description: this.parseQuestionDescription(),
        };
      })
      .filter(Boolean);

    return {
      questions,
      scores: mockQuestionScores,
    };
  }

  @Post('/results')
  async getResults(
    @Body() payload: SurveyRequestDto,
  ): Promise<SurveyResponseDto> {
    // Create the initial response
    const response = this.resultsService.getResults(payload);

    // Generate AI summary
    const aiSummary = await this.genAiService.generateDetailedAnalysis({
      survey: response.survey,
      answers: response.answers,
      maturityScore: response.maturityScore,
    });

    // Update the response with the AI summary
    // This would be implemented in a real application

    // Generate a process flow diagram
    const mermaidDiagram =
      await this.genAiService.generateMermaidDiagram(aiSummary);

    const pdfPath = await this.generatePDFResults(response);

    return {
      aiSummary,
      mermaidDiagram,
      pdfPath,
    };
  }

  @Post('/results/pdf-download')
  async downloadResults(@Body('pdfPath') pdfPath: string): Promise<string> {
    // Get the survey results
    const preSignUrl = await this.storageService.getPresignedDownloadUrl(
      pdfPath,
      3600,
    );

    return preSignUrl;
  }

  private parseQuestionDescription() {
    return mockQuestionScores
      .map((qs) => `${qs.score} = ${qs.description}`)
      .join(', ');
  }

  private async generatePDFResults(surveyData: SurveyData) {
    const assessmentPDF = this.resultsService.convertSurveyResults(surveyData);
    // This would be implemented in a real application
    let aiResponse =
      await this.genAiService.generateTransitionAssessment(assessmentPDF);

    try {
      aiResponse = JSON.parse(
        aiResponse.replaceAll('```json', '').replaceAll('```', ''),
      );
    } catch (error) {
      console.error(`Something went wrong!: ${error}`);
    }

    console.log('[AI Response]: ', aiResponse);

    assessmentPDF.rationale = (aiResponse as any)?.rationale || '';

    const pdfFile = await this.pdfService.generateAssessmentPdf(assessmentPDF);

    const pdfName = `${assessmentPDF.surveyName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    const key = this.storageService.generateUniqueKey(pdfName, 'pdfs');

    await this.storageService.uploadFile(key, pdfFile, {
      contentType: 'application/pdf',
      metadata: {
        originalName: key,
        uploadedAt: new Date().toISOString(),
      },
    });

    return key;
  }
}
