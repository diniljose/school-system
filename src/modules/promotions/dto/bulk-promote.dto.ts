import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class BulkPromoteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  toClassId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toSection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromAcademicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toAcademicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  // Frontend aliases
  @ApiPropertyOptional({ description: 'Alias for classId' })
  @IsOptional()
  @IsString()
  fromClass?: string;

  @ApiPropertyOptional({ description: 'Alias for toClassId' })
  @IsOptional()
  @IsString()
  toClass?: string;
}
