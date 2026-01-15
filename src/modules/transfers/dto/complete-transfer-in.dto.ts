import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId, IsDateString } from 'class-validator';

export class CompleteTransferInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  currentClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  currentSection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  currentAcademicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  admissionDate?: string;
}
