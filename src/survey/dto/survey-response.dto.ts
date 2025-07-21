import { IsString } from 'class-validator';

export class SurveyResponseDto {
  @IsString()
  aiSummary: string;

  @IsString()
  mermaidDiagram: string;
}
