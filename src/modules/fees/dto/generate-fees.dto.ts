import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class GenerateFeesDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(2000)
  year: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  dueDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
