/**
 * Create Class Teacher Assignment DTO
 */
import { IsString, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassTeacherAssignmentDto {
  @ApiProperty({ description: 'Teacher ID' })
  @IsMongoId()
  teacher: string;

  @ApiProperty({ description: 'Class ID' })
  @IsMongoId()
  class: string;

  @ApiProperty({ description: 'Academic Year ID' })
  @IsMongoId()
  academicYear: string;

  @ApiPropertyOptional({ description: 'Section name (A, B, C, etc.)' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({
    description: 'Is this teacher the class teacher (homeroom teacher)?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isClassTeacher?: boolean;

  @ApiPropertyOptional({ description: 'Notes about this assignment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
