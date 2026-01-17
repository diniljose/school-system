import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class GradeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  grade: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  minPercentage: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxPercentage: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(10)
  gpa: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGradeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  gpa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
