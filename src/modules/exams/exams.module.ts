import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { Exam, ExamSchema } from '../../database/schemas/exam.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import { Subject, SubjectSchema } from '../../database/schemas/subject.schema';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import {
  Attendance,
  AttendanceSchema,
} from '../../database/schemas/attendance.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
  ],
  controllers: [ExamsController],
  providers: [ExamsService, TenantDatabaseService],
  exports: [ExamsService],
})
export class ExamsModule {}
