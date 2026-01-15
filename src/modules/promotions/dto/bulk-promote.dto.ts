import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class BulkPromoteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  toClassId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  toSection: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  fromAcademicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  toAcademicYear: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
