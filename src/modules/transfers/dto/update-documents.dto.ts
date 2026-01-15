import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateDocumentsDto {
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
