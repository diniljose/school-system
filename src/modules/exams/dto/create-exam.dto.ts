import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsMongoId,
  IsDateString,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamScheduleDto } from './exam-schedule.dto';

export enum ExamType {
  UNIT_TEST = 'UNIT_TEST',
  MID_TERM = 'MID_TERM',
  TERM_EXAM = 'TERM_EXAM',
  ANNUAL = 'ANNUAL',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
  PRACTICAL = 'PRACTICAL',
  ORAL = 'ORAL',
  PROJECT = 'PROJECT',
  OTHER = 'OTHER',
}

export class CreateExamDto {
  @ApiProperty({ description: 'Exam name', example: 'First Term Exam' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Exam description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Exam type',
    enum: ExamType,
    example: ExamType.TERM_EXAM,
  })
  @IsNotEmpty()
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiProperty({ description: 'Academic Year ID' })
  @IsNotEmpty()
  @IsMongoId()
  academicYear: string;

  @ApiProperty({
    description: 'Exam start date (YYYY-MM-DD)',
    example: '2024-03-01',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Exam end date (YYYY-MM-DD)',
    example: '2024-03-15',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Class IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  classes?: string[];

  @ApiPropertyOptional({
    description: 'Exam schedule',
    type: [ExamScheduleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamScheduleDto)
  schedule?: ExamScheduleDto[];

  @ApiPropertyOptional({
    description: 'Results published status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  resultsPublished?: boolean;

  @ApiPropertyOptional({ description: 'Result publish date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  resultPublishDate?: string;

  @ApiPropertyOptional({ description: 'Is exam active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
