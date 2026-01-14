import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicYearsService } from './academic-years.service';
import { AcademicYearsController } from './academic-years.controller';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../../database/schemas/academic-year.schema';
import { School, SchoolSchema } from '../../database/schemas/school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademicYear.name, schema: AcademicYearSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
  ],
  controllers: [AcademicYearsController],
  providers: [AcademicYearsService],
  exports: [AcademicYearsService],
})
export class AcademicYearsModule {}
