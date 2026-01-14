import {
  IsNotEmpty,
  IsMongoId,
  IsString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RetainStudentDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  class: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}
