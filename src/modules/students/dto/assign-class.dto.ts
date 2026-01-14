<<<<<<< HEAD
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignClassDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
=======
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignClassDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty({ example: 'ROLL001' })
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  academicYearId: string;
}
