import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';
import {
  Timetable,
  TimetableSchema,
} from '../../database/schemas/timetable.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import { Teacher, TeacherSchema } from '../../database/schemas/teacher.schema';
import { Subject, SubjectSchema } from '../../database/schemas/subject.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../../database/schemas/academic-year.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timetable.name, schema: TimetableSchema },
      { name: Class.name, schema: ClassSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
    ]),
  ],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
