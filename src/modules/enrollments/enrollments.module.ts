import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import {
  Enrollment,
  EnrollmentSchema,
} from '../../database/schemas/enrollment.schema';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../../database/schemas/academic-year.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Class.name, schema: ClassSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
    ]),
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, TenantDatabaseService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
