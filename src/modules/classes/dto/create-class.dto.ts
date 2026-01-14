import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Grade 10', description: 'Class name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 10, description: 'Numeric grade level' })
  @IsNumber()
  @IsNotEmpty()
  grade: number;

  @ApiPropertyOptional({ example: 'Class 10 with science stream' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Next class ID for automatic promotion' })
  @IsMongoId()
  @IsOptional()
  nextClass?: string;
}
