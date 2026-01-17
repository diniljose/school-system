import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import {
  Attendance,
  AttendanceSchema,
} from '../../database/schemas/attendance.schema';
import { Fee, FeeSchema } from '../../database/schemas/fee.schema';
import { Exam, ExamSchema } from '../../database/schemas/exam.schema';
import { Result, ResultSchema } from '../../database/schemas/result.schema';
import { Teacher, TeacherSchema } from '../../database/schemas/teacher.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../../database/schemas/academic-year.schema';
import {
  Promotion,
  PromotionSchema,
} from '../../database/schemas/promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Fee.name, schema: FeeSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Result.name, schema: ResultSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
