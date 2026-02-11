import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { Teacher, TeacherSchema } from '../../database/schemas/teacher.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import { Subject, SubjectSchema } from '../../database/schemas/subject.schema';
import {
  Attendance,
  AttendanceSchema,
} from '../../database/schemas/attendance.schema';
import { Fee, FeeSchema } from '../../database/schemas/fee.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Fee.name, schema: FeeSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, TenantDatabaseService],
  exports: [DashboardService],
})
export class DashboardModule {}
