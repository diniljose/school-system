import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  ONLINE = 'online',
  CHEQUE = 'cheque',
}

export class RecordPaymentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
