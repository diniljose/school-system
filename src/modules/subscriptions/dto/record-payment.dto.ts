import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDate,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecordPaymentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ default: 'USD' })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @ApiProperty({ enum: ['completed', 'pending', 'failed'], default: 'completed' })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ enum: ['card', 'bank_transfer', 'cash', 'check', 'other'] })
  @IsNotEmpty()
  @IsString()
  method: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
