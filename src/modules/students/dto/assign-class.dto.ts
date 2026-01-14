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
  academicYearId: string;
}
