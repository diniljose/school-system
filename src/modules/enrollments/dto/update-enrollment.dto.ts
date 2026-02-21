import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { EnrollmentStatus } from '../../../database/schemas/enrollment.schema';

export class UpdateEnrollmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  withdrawalReason?: string;

  @ApiPropertyOptional({ enum: ['pass', 'fail', 'promoted', 'retained', 'pending'] })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rank?: number;
}
