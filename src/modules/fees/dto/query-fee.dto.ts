import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsMongoId,
  IsNumber,
  IsEnum,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeeStatus } from '../../../common/enums/student-status.enum';

export enum FeePeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  HALF_YEARLY = 'half_yearly',
  YEARLY = 'yearly',
}

export class QueryFeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  academicYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({ description: 'Section name (e.g., A, B, C)' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ enum: FeeStatus })
  @IsOptional()
  @IsEnum(FeeStatus)
  status?: FeeStatus;

  @ApiPropertyOptional({ enum: FeePeriodType })
  @IsOptional()
  @IsEnum(FeePeriodType)
  periodType?: FeePeriodType;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
