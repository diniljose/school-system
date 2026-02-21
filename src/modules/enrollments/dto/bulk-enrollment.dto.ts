import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEnrollmentItemDto {
  @ApiProperty({ description: 'Student ID' })
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @ApiPropertyOptional({ description: 'Section name (overrides top-level section)' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Roll number' })
  @IsOptional()
  @IsString()
  rollNumber?: string;
}

export class BulkEnrollmentDto {
  @ApiProperty({ description: 'Academic Year ID' })
  @IsNotEmpty()
  @IsMongoId()
  academicYearId: string;

  @ApiProperty({ description: 'Class ID' })
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiPropertyOptional({ description: 'Default section for all students — optional for classes without sections' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ description: 'Array of students to enroll', type: [BulkEnrollmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEnrollmentItemDto)
  students: BulkEnrollmentItemDto[];

  @ApiPropertyOptional({ description: 'Enrollment date' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
