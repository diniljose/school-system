import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddScheduleDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Class ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  class: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Subject ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: '2024-01-15', description: 'Exam date' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '09:00', description: 'Start time (HH:mm format)' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '11:00', description: 'End time (HH:mm format)' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: 100, description: 'Maximum marks' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  maxMarks: number;

  @ApiPropertyOptional({ example: 40, description: 'Passing marks' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  passingMarks?: number;

  @ApiPropertyOptional({ example: 'Room 101', description: 'Examination room' })
  @IsString()
  @IsOptional()
  room?: string;
}
