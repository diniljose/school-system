import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min, Max, IsMongoId, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AuditAction } from '../../../database/schemas/audit-log.schema';

export class QueryActivityLogDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  resource?: string; // e.g., 'Student', 'Fee', 'Attendance'

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  groupByDate?: boolean = true;
}

export class ActivityLogStatsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
