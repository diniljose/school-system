import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTransferDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'completed', 'cancelled'] })
  @IsEnum(['pending', 'approved', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  transferCertificateNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  conductCertificate?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  documents?: {
    transferCertificate?: string;
    marksheet?: string;
    characterCertificate?: string;
    otherDocuments?: string[];
  };

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
