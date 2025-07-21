import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GenAiService } from 'src/integrations/genai/genai.service';
import { OpenAiService } from 'src/integrations/openai/openai.service';
import { ResultsService } from 'src/results/results.service';
import { SurveyResponseDto } from 'src/survey/dto/survey-response.dto';
import { mockPrograms } from 'src/survey/mock/program.mock';
import { mockQuestions } from 'src/survey/mock/question.mock';
import { SurveyRequestDto } from './dto/survey-request.dto';

@Controller('survey')
export class SurveyController {
  constructor(
    private readonly openAiService: OpenAiService,
    private readonly genAiService: GenAiService,
    private readonly resultsService: ResultsService,
  ) { }

  @Get('/programs')
  getPrograms() {
    return {
      programs: mockPrograms,
    };
  }

  @Get('/:programId/questions')
  getQuestions(@Param('programId') programId: number) {
    const questions = mockQuestions.filter(
      (q) => Number(q.programId) === Number(programId),
    );

    return {
      questions,
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

    return {
      aiSummary,
      mermaidDiagram,
    };
  }
}
