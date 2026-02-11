import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class TermDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty() @IsNotEmpty() @IsString() startDate: string;
  @ApiProperty() @IsNotEmpty() @IsString() endDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() examStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() examEndDate?: string;
}

class HolidayDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty() @IsNotEmpty() @IsString() date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class CreateAcademicYearDto {
  @ApiPropertyOptional({ description: 'School ID (auto-derived from auth context if not provided)' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiProperty({ description: 'Academic year name', example: '2024-2025' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO string)' })
  @IsNotEmpty()
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ type: [TermDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermDto)
  terms?: TermDto[];

  @ApiPropertyOptional({ type: [HolidayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
