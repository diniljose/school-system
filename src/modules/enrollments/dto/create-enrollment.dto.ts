import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsDateString,
} from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Student ID' })
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @ApiProperty({ description: 'Academic Year ID' })
  @IsNotEmpty()
  @IsMongoId()
  academicYearId: string;

  @ApiProperty({ description: 'Class ID' })
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiPropertyOptional({ description: 'Section name (A, B, C etc.) — optional for classes without sections' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Roll number' })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional({ description: 'Enrollment date' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
