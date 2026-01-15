import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, IsMongoId, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum TransferType {
  IN = 'in',
  OUT = 'out',
}

export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class QueryTransferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional({ enum: TransferType })
  @IsOptional()
  @IsEnum(TransferType)
  type?: TransferType;

  @ApiPropertyOptional({ enum: TransferStatus })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
