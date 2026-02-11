import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../../database/schemas/academic-year.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: User.name, schema: UserSchema },
      { name: Class.name, schema: ClassSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService, TenantDatabaseService],
  exports: [StudentsService],
})
export class StudentsModule {}
