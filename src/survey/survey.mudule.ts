import { Module } from '@nestjs/common';
import { GenAiModule } from 'src/integrations/genai/genai.module';
import { OpenAiModule } from 'src/integrations/openai/openai.module';
import { ResultsModule } from 'src/results/results.module';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';

@Module({
  imports: [GenAiModule, OpenAiModule, ResultsModule],
  controllers: [SurveyController],
  providers: [SurveyService],
  exports: [SurveyService],
})
export class SurveyModule { }
