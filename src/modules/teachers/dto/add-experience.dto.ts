import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddExperienceDto {
  @ApiProperty({ example: 'ABC School', description: 'Institution name' })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({ example: 'Senior Teacher', description: 'Designation' })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({ example: '2015-01-01', description: 'Start date' })
  @IsDateString()
  @IsNotEmpty()
  fromDate: string;

  @ApiPropertyOptional({ example: '2020-12-31', description: 'End date' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ example: 'Taught Mathematics to grades 9-12' })
  @IsString()
  @IsOptional()
  description?: string;
}
