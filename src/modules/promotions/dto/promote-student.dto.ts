import {
  IsNotEmpty,
  IsMongoId,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromoteStudentDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  fromAcademicYear: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  toAcademicYear: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  fromClass: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  toClass: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromSection: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toSection: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  previousPercentage?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  previousAttendance?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
