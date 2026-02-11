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
  @ApiPropertyOptional() @IsOptional() @IsString() transferCertificate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() marksheet?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() characterCertificate?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) otherDocuments?: string[];
}

export class TransferOutDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toSchool?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromSchool?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSchoolName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSchoolAddress?: string;

  @ApiPropertyOptional({ description: 'Transfer date (defaults to today if not provided)' })
  @IsOptional()
  @IsString()
  transferDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() lastClassAttended?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastAttendanceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conductCertificate?: string;

  @ApiPropertyOptional({ type: DocumentsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentsDto)
  documents?: DocumentsDto;

  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
