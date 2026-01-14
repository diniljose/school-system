import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddQualificationDto {
  @ApiProperty({ example: 'Bachelor of Science', description: 'Degree name' })
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiProperty({
    example: 'University of XYZ',
    description: 'Institution name',
  })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ example: 2010, description: 'Year of completion' })
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty({ example: 'A+', description: 'Grade obtained' })
  @IsString()
  @IsNotEmpty()
  grade: string;
}
