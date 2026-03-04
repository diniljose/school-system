import { IsString, IsNotEmpty, IsMongoId, IsEnum, IsNumber, IsArray, IsBoolean, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle, SplitOption } from '../../../database/schemas/fee-structure.schema';

export class FeeComponentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsBoolean()
  @IsOptional()
  isOptional?: boolean = false;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateFeeStructureDto {
  @IsMongoId()
  academicYear: string;

  @IsMongoId()
  class: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsEnum(SplitOption)
  @IsOptional()
  splitOption?: SplitOption = SplitOption.NO_SPLIT;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeComponentDto)
  components: FeeComponentDto[];

  @IsArray()
  @IsOptional()
  dueDays?: number[] = [10];  // Default: 10th of month

  @IsNumber()
  @IsOptional()
  @Min(0)
  lateFeePenalty?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number = 5;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateFeeStructureDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsEnum(SplitOption)
  @IsOptional()
  splitOption?: SplitOption;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeComponentDto)
  @IsOptional()
  components?: FeeComponentDto[];

  @IsArray()
  @IsOptional()
  dueDays?: number[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  lateFeePenalty?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
