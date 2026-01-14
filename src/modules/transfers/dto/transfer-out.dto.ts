import {
  IsNotEmpty,
  IsMongoId,
  IsString,
  IsOptional,
  IsDate,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferOutDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  toSchool?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalSchoolName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalSchoolAddress?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  transferDate: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  effectiveDate?: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastClassAttended?: string;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  lastAttendanceDate?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  conductCertificate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
