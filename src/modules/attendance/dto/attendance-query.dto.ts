import {
  IsOptional,
  IsDate,
  IsMongoId,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceQueryDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  year?: number;
}
