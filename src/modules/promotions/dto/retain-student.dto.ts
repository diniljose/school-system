import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class RetainStudentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  academicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
