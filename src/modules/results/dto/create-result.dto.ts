import {
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SubjectResultDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  subject: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  maxMarks: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  obtainedMarks: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPassed?: boolean;
}

export class CreateResultDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  exam: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  class: string;

  @ApiProperty({ type: [SubjectResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectResultDto)
  subjects: SubjectResultDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
