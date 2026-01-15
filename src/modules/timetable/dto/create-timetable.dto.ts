import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DayOfWeek,
  PeriodType,
} from '../../../database/schemas/timetable.schema';

class PeriodDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  periodNumber: number;

  @ApiProperty({ enum: PeriodType })
  @IsNotEmpty()
  @IsEnum(PeriodType)
  periodType: PeriodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  teacher?: string;

  @ApiProperty({ example: '09:00' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '09:45' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class BreakDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '10:30' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '10:45' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ enum: DayOfWeek, isArray: true })
  @IsNotEmpty()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  days: DayOfWeek[];
}

class TimingsDto {
  @ApiProperty({ example: '08:00' })
  @IsNotEmpty()
  @IsString()
  schoolStartTime: string;

  @ApiProperty({ example: '15:00' })
  @IsNotEmpty()
  @IsString()
  schoolEndTime: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  periodDuration: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  breakDuration: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  lunchDuration: number;
}

export class CreateTimetableDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  academicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  class: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiProperty({ type: [PeriodDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeriodDto)
  schedule: PeriodDto[];

  @ApiPropertyOptional({ type: [BreakDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakDto)
  breaks?: BreakDto[];

  @ApiProperty({ type: TimingsDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TimingsDto)
  timings: TimingsDto;

  @ApiProperty({ enum: DayOfWeek, isArray: true })
  @IsNotEmpty()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  workingDays: DayOfWeek[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
