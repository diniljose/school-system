import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';

export enum ReportType {
  STUDENT = 'student',
  CLASS = 'class',
  ATTENDANCE = 'attendance',
  FEE_COLLECTION = 'fee_collection',
  EXAM_ANALYSIS = 'exam_analysis',
  TEACHER_PERFORMANCE = 'teacher_performance',
  SCHOOL_OVERVIEW = 'school_overview',
  DEFAULTERS = 'defaulters',
  PROMOTIONS = 'promotions',
}

export class ExportReportDto {
  @ApiProperty({ enum: ReportType })
  @IsNotEmpty()
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ description: 'Report data to be exported' })
  @IsNotEmpty()
  @IsObject()
  reportData: any;
}
