import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class DocumentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferCertificate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marksheet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  characterCertificate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherDocuments?: string[];
}

export class TransferInDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  fromSchool?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSchoolName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSchoolAddress?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  transferDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousSchoolTC?: string;

  @ApiPropertyOptional({ type: DocumentsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentsDto)
  documents?: DocumentsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
