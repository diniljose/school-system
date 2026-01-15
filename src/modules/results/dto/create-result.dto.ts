import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

class SubjectResultDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  subject: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  maxMarks: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  obtainedMarks: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPassed?: boolean;
}

export class CreateResultDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  academicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  exam: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  student: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  class: string;

  @ApiProperty({ type: [SubjectResultDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectResultDto)
  subjects: SubjectResultDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
