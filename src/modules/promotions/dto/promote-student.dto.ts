import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class PromoteStudentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  fromAcademicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  toAcademicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  fromClass: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  toClass: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fromSection: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  toSection: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
