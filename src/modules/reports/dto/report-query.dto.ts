import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsMongoId, IsDateString, IsString } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  academicYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  examId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
