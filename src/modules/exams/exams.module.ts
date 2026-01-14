import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { Exam, ExamSchema } from '../../database/schemas/exam.schema';
import { Result, ResultSchema } from '../../database/schemas/result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: Result.name, schema: ResultSchema },
    ]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
