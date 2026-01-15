import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { Result, ResultSchema } from '../../database/schemas/result.schema';
import { Exam, ExamSchema } from '../../database/schemas/exam.schema';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import {
  Settings,
  SettingsSchema,
} from '../../database/schemas/settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Result.name, schema: ResultSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
