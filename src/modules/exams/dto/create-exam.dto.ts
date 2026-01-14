import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ example: 'First Term Exam', description: 'Exam name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'First term examination for all classes' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Academic Year ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ example: '2024-01-15', description: 'Exam start date' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2024-01-25', description: 'Exam end date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    example: 'written',
    description: 'Exam type (written, practical, oral)',
  })
  @IsString()
  @IsOptional()
  examType?: string;

  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of Class IDs',
  })
  @IsArray()
  @IsMongoId({ each: true })
  classes: string[];
}
