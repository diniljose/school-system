import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsMongoId,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceReportDto {
  @ApiProperty({ description: 'Month (1-12)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @ApiProperty({ description: 'Year (e.g., 2024)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(2000)
  @Type(() => Number)
  year: number;

  @ApiPropertyOptional({ description: 'Subject ID for subject-wise report' })
  @IsOptional()
  @IsMongoId()
  subjectId?: string;
}

export class YearlyReportDto {
  @ApiProperty({ description: 'Year (e.g., 2024)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(2000)
  @Type(() => Number)
  year: number;

  @ApiPropertyOptional({ description: 'Subject ID for subject-wise report' })
  @IsOptional()
  @IsMongoId()
  subjectId?: string;
}

export class DefaulterQueryDto {
  @ApiProperty({ description: 'Attendance date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Minimum attendance threshold percentage',
    default: 75,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  threshold?: number;
}
