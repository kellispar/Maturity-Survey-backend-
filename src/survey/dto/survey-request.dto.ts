import { Type } from 'class-transformer';
import { IsArray, IsNumber } from 'class-validator';

export class SurveyAnswerDto {
  @IsNumber()
  id: number;

  @IsNumber()
  answer: number;
}

export class SurveyRequestDto {
  @IsNumber()
  programId: number;

  @IsArray()
  @Type(() => SurveyAnswerDto)
  answers: SurveyAnswerDto[];
}
