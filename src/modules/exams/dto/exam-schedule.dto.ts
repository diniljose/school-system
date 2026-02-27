import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';

export enum ExamScheduleStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export class ExamScheduleDto {
  @ApiProperty({ description: 'Class ID' })
  @IsNotEmpty()
  @IsMongoId()
  class: string;

  @ApiPropertyOptional({ description: 'Section (optional - if not provided, applies to all sections)' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ description: 'Subject ID' })
  @IsNotEmpty()
  @IsMongoId()
  subject: string;

  @ApiProperty({ description: 'Exam date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '11:00' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ description: 'Maximum marks', example: 100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  maxMarks: number;

  @ApiProperty({ description: 'Passing marks', example: 40 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  passingMarks: number;

  @ApiPropertyOptional({ description: 'Room/Hall number', example: 'Room 101' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Exam instructions for students' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Schedule status', enum: ExamScheduleStatus })
  @IsOptional()
  @IsEnum(ExamScheduleStatus)
  status?: ExamScheduleStatus;

  @ApiPropertyOptional({ description: 'Supervisor/Invigilator name or ID' })
  @IsOptional()
  @IsString()
  supervisor?: string;
}
