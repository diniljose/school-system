import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsMongoId,
  IsNumber,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubjectType } from '../../../database/schemas/subject.schema';

class GradeSchemeDto {
  @ApiProperty() @IsNotEmpty() @IsNumber() min: number;
  @ApiProperty() @IsNotEmpty() @IsNumber() max: number;
  @ApiProperty() @IsNotEmpty() @IsNumber() gpa: number;
}

class GradingSchemeDto {
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => GradeSchemeDto) A?: GradeSchemeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => GradeSchemeDto) B?: GradeSchemeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => GradeSchemeDto) C?: GradeSchemeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => GradeSchemeDto) D?: GradeSchemeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => GradeSchemeDto) F?: GradeSchemeDto;
}

export class CreateSubjectDto {
  @ApiProperty({ description: 'Subject name', example: 'Mathematics' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Subject code', example: 'MATH-101' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ enum: SubjectType, example: SubjectType.CORE, description: 'Subject type (optional — accepts any string)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() classes?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() teachers?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) credits?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) passingMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) theoryMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) practicalMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) internalMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) externalMarks?: number;

  @ApiPropertyOptional({ type: GradingSchemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GradingSchemeDto)
  gradingScheme?: GradingSchemeDto;

  @ApiPropertyOptional() @IsOptional() @IsString() syllabus?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) resources?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) hoursPerWeek?: number;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isMandatory?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() hasAttendance?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() hasExam?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() hasLab?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}
