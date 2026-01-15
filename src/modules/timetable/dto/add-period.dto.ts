import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { PeriodType } from '../../../database/schemas/timetable.schema';

export class AddPeriodDto {
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
