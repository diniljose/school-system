import {
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FeeComponentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  discountReason?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  fine?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fineReason?: string;
}

export class CreateFeeDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  month: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty({ type: [FeeComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeComponentDto)
  feeComponents: FeeComponentDto[];

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}
