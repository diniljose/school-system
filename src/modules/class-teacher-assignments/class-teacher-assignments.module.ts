/**
 * Class Teacher Assignments Module
 * Manages teacher-class assignments for scoped access control
 */
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassTeacherAssignmentsService } from './class-teacher-assignments.service';
import { ClassTeacherAssignmentsController } from './class-teacher-assignments.controller';
import {
  ClassTeacherAssignment,
  ClassTeacherAssignmentSchema,
} from '../../database/schemas/class-teacher-assignment.schema';
import { TeachersModule } from '../teachers/teachers.module';
import { ClassesModule } from '../classes/classes.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { DatabaseModule } from '../../database/database/database.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClassTeacherAssignment.name, schema: ClassTeacherAssignmentSchema },
    ]),
    forwardRef(() => TeachersModule),
    forwardRef(() => ClassesModule),
    forwardRef(() => AcademicYearsModule),
    DatabaseModule,
  ],
  controllers: [ClassTeacherAssignmentsController],
  providers: [ClassTeacherAssignmentsService],
  exports: [ClassTeacherAssignmentsService],
})
export class ClassTeacherAssignmentsModule {}
