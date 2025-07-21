import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GenAiModule } from './integrations/genai/genai.module';
import { OpenAiModule } from './integrations/openai/openai.module';
import { ResultsModule } from './results/results.module';
import { SurveyModule } from './survey/survey.mudule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GenAiModule,
    OpenAiModule,
    SurveyModule,
    ResultsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
