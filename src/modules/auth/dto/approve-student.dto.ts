import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsMongoId } from 'class-validator';

export class ApproveStudentDto {
  @ApiPropertyOptional({ description: 'Override class ID (if authority wants to change class)' })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({ description: 'Override section (if authority wants to change section)' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Override academic year ID (if authority wants to change academic year)' })
  @IsOptional()
  @IsMongoId()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Custom admission number (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  admissionNumber?: string;
}
