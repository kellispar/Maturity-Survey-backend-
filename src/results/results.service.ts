import { Injectable } from '@nestjs/common';
import { SurveyAnswer, SurveyData } from 'src/integrations/base-ai.service';
import { SurveyRequestDto } from 'src/survey/dto/survey-request.dto';
import { mockCategories } from 'src/survey/mock/category.mock';
import { mockMaturities } from 'src/survey/mock/maturity.mock';
import { mockPrograms } from 'src/survey/mock/program.mock';
import {
  mockQuestions,
  mockQuestionScores,
} from 'src/survey/mock/question.mock';
import { AssessmentPDF, AssessmentResult } from './types/assessment';

@Injectable()
export class ResultsService {
  constructor() { }

  getResults(payload: SurveyRequestDto): SurveyData {
    const { answers, programId } = payload;

    // Need to validate but we will do later
    const program = mockPrograms.find((p) => p.id === programId);
    if (!program) {
      throw new Error('Not found program');
    }

    const convertedAnswers = answers
      .map((a) => {
        const question = mockQuestions.find((q) => q.id === a.id);

        if (!question) {
          return undefined;
        }

        const category = mockCategories.find(
          (c) => c.id === question.categoryId,
        );

        return {
          question: {
            text: question.name,
            category: category?.name || 'Uncategorized',
            description: mockQuestionScores.find((qs) => qs.score === a.answer)
              ?.description,
          },
          value: a.answer,
        };
      })
      .filter(Boolean) as SurveyAnswer[];

    return {
      survey: {
        name: program.name,
        id: program.id,
      },
      answers: convertedAnswers,
      maturityScore: this.calculateAverageMaturityScore(convertedAnswers),
    };
  }

  convertSurveyResults(surveyData: SurveyData): AssessmentPDF {
    return {
      surveyName: surveyData.survey.name,
      overallScore: this.calculateTotalScore(surveyData.answers),
      rationale: '',
      assessmentResults: this.convertSurveyToAssessmentPDF(surveyData.answers),
    };
  }

  private calculateTotalScore(surveyAnswers: SurveyAnswer[]): number {
    return surveyAnswers.reduce((total, answer) => {
      return total + (answer.value || 0);
    }, 0);
  }

  private convertSurveyToAssessmentPDF(
    surveyAnswers: SurveyAnswer[],
  ): AssessmentResult[] {
    const categoryGroups = surveyAnswers.reduce(
      (acc, answer) => {
        const category = answer.question.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          ...answer,
        });
        return acc;
      },
      {} as Record<string, SurveyAnswer[]>,
    );

    return Object.entries(categoryGroups).map(([category, answers]) => {
      const maturityLevel = this.calculateAverageMaturityScore(answers);

      console.log('`maturityLevel', maturityLevel);

      return {
        category,
        maturityLevel:
          mockMaturities.find((m) => m.level === Math.round(maturityLevel))
            ?.name || 'Unknown',
      };
    });
  }

  private calculateAverageMaturityScore(surveyAnswers: SurveyAnswer[]) {
    if (surveyAnswers.length === 0) {
      return 0;
    }

    const sum = surveyAnswers.reduce((acc, answer) => {
      return acc + (answer.value || 0);
    }, 0);

    return sum / surveyAnswers.length;
  }
}
