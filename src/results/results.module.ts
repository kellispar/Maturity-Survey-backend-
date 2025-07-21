import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule { }
