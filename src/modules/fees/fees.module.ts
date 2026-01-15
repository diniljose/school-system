import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { Fee, FeeSchema } from '../../database/schemas/fee.schema';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearSchema,
} from '../../database/schemas/academic-year.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Fee.name, schema: FeeSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Class.name, schema: ClassSchema },
      { name: AcademicYear.name, schema: AcademicYearSchema },
    ]),
  ],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}
