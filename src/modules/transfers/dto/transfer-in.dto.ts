import {
  IsNotEmpty,
  IsMongoId,
  IsString,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferInDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  fromSchool?: string;

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  transferCertificateNumber?: string;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  transferCertificateDate?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
