import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsMongoId,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubjectType } from '../../../database/schemas/subject.schema';

class GradeSchemeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  min: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Max(100)
  max: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  gpa: number;
}

class GradingSchemeDto {
  @ApiPropertyOptional({ type: GradeSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradeSchemeDto)
  A?: GradeSchemeDto;

  @ApiPropertyOptional({ type: GradeSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradeSchemeDto)
  B?: GradeSchemeDto;

  @ApiPropertyOptional({ type: GradeSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradeSchemeDto)
  C?: GradeSchemeDto;

  @ApiPropertyOptional({ type: GradeSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradeSchemeDto)
  D?: GradeSchemeDto;

  @ApiPropertyOptional({ type: GradeSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradeSchemeDto)
  F?: GradeSchemeDto;
}

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'MATH101' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Introduction to Mathematics' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SubjectType, example: SubjectType.CORE })
  @IsNotEmpty()
  @IsEnum(SubjectType)
  type: SubjectType;

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  classes?: string[];

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  teachers?: string[];

  @ApiPropertyOptional({ example: 3, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({ example: 40, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingMarks?: number;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMarks?: number;

  @ApiPropertyOptional({ example: 70, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  theoryMarks?: number;

  @ApiPropertyOptional({ example: 30, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  practicalMarks?: number;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  internalMarks?: number;

  @ApiPropertyOptional({ example: 80, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  externalMarks?: number;

  @ApiPropertyOptional({ type: GradingSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradingSchemeDto)
  gradingScheme?: GradingSchemeDto;

  @ApiPropertyOptional({ example: 'Comprehensive mathematics syllabus' })
  @IsOptional()
  @IsString()
  syllabus?: string;

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resources?: string[];

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursPerWeek?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  hasAttendance?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  hasExam?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasLab?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}
