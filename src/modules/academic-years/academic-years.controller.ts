import { Controller } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';

@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}
}
