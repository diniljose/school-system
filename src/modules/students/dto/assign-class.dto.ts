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
  academicYearId: string;
}
