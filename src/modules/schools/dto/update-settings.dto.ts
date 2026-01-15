import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Academic year start month (1-12)',
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  academicYearStart?: number;

  @ApiPropertyOptional({
    description: 'Academic year end month (1-12)',
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  academicYearEnd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradingSystem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attendanceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feeStructure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[];
}
