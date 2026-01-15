import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../../common/enums/student-status.enum';

export class QueryAttendanceDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by attendance status',
    enum: AttendanceStatus,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Subject ID for subject-wise filtering' })
  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Period number for period-wise filtering',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  period?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page for pagination',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
