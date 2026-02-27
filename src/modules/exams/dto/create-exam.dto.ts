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
  // Accept lowercase variants from frontend
  unit_test = 'unit_test',
  midterm = 'midterm',
  mid_term = 'mid_term',
  final = 'final',
  quarterly = 'quarterly',
  half_yearly = 'half_yearly',
  monthly = 'monthly',
  weekly = 'weekly',
  practical = 'practical',
  oral = 'oral',
  project = 'project',
  other = 'other',
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

  @ApiProperty({ description: 'Exam type', enum: ExamType })
  @IsNotEmpty()
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiPropertyOptional({ description: 'Academic Year ID' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiProperty({ description: 'Exam start date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'Exam end date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Class IDs', type: [String] })
  @IsOptional()
  @IsArray()
  classes?: string[];

  @ApiPropertyOptional({ description: 'Single class ID (frontend shorthand)' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Exam status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Sections (if empty, applies to all sections)', type: [String] })
  @IsOptional()
  @IsArray()
  sections?: string[];

  @ApiPropertyOptional({ description: 'Exam schedule', type: [ExamScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamScheduleDto)
  schedule?: ExamScheduleDto[];

  @ApiPropertyOptional({ description: 'Results published status', default: false })
  @IsOptional()
  @IsBoolean()
  resultsPublished?: boolean;

  @ApiPropertyOptional({ description: 'Result publish date' })
  @IsOptional()
  @IsString()
  resultPublishDate?: string;

  @ApiPropertyOptional({ description: 'Is exam active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Study leave days (dates with no exams)', type: [String] })
  @IsOptional()
  @IsArray()
  studyLeaveDays?: string[];
}
