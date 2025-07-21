import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenAiService } from './genai.service';

@Module({
  imports: [ConfigModule],
  providers: [GenAiService],
  exports: [GenAiService],
})
export class GenAiModule { }
