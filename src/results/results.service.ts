import { Injectable } from '@nestjs/common';
import { SurveyAnswer, SurveyData } from 'src/integrations/base-ai.service';
import { SurveyRequestDto } from 'src/survey/dto/survey-request.dto';
import { mockPrograms } from 'src/survey/mock/program.mock';
import { mockQuestions } from 'src/survey/mock/question.mock';

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
        const question = mockQuestions.find(
          (q) => q.id === a.id && q.programId === programId,
        );

        if (!question) {
          return undefined;
        }

        return {
          question: {
            text: question.question,
            category: program.name,
            description: question.description,
          },
          value: a.answer,
        };
      })
      .filter(Boolean) as SurveyAnswer[];

    return {
      survey: {
        name: program.name,
      },
      answers: convertedAnswers,
      maturityScore: this.calculateAverageMaturityScore(convertedAnswers),
    };
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
