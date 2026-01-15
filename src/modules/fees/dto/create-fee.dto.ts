import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class FeeComponentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  dueDate: Date;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountReason?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fine?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fineReason?: string;
}

export class CreateFeeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  academicYear: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  student: string;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(2000)
  year: number;

  @ApiProperty({ type: [FeeComponentDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeComponentDto)
  feeComponents: FeeComponentDto[];

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  dueDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
