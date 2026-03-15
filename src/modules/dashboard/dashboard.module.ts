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
import {
  Enrollment,
  EnrollmentSchema,
} from '../../database/schemas/enrollment.schema';
import {
  SchoolEvent,
  EventSchema,
} from '../../database/schemas/event.schema';
import { Exam, ExamSchema } from '../../database/schemas/exam.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Parent, ParentSchema } from '../../database/schemas/parent.schema';
import { Result, ResultSchema } from '../../database/schemas/result.schema';
import { AuditLog, AuditLogSchema } from '../../database/schemas/audit-log.schema';
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
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: SchoolEvent.name, schema: EventSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: User.name, schema: UserSchema },
      { name: Parent.name, schema: ParentSchema },
      { name: Result.name, schema: ResultSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, TenantDatabaseService],
  exports: [DashboardService],
})
export class DashboardModule {}
