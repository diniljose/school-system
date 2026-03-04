import { IsMongoId, IsEnum, IsNumber, IsArray, IsBoolean, IsOptional, IsString, Min, Max } from 'class-validator';
import { FeePeriodType } from '../../../database/schemas/fee.schema';

/**
 * DTO for generating fees from a fee structure for a class/section
 */
export class GenerateFeesFromStructureDto {
  @IsMongoId()
  feeStructureId: string;

  @IsEnum(FeePeriodType)
  periodType: FeePeriodType;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  periodNumber?: number;  // Depends on periodType. Optional if generateAllPeriods is true

  @IsNumber()
  year: number;

  @IsBoolean()
  @IsOptional()
  generateAllPeriods?: boolean;  // If true, generate all periods for the year (12 for monthly, 4 for quarterly, etc.)

  @IsString()
  @IsOptional()
  periodLabel?: string;  // Auto-generated if not provided

  @IsString()
  @IsOptional()
  remarks?: string;
}

/**
 * DTO for bulk payment marking
 */
export class BulkMarkPaidDto {
  @IsArray()
  @IsMongoId({ each: true })
  feeIds: string[];

  @IsString()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

/**
 * DTO for marking individual fee as paid (partial or full)
 */
export class MarkFeeAsPaidDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsBoolean()
  @IsOptional()
  markFullyPaid?: boolean = false;  // If true, ignore amount and mark full due as paid
}

/**
 * DTO for creating individual student fee (custom)
 */
export class CreateIndividualFeeDto {
  @IsMongoId()
  studentId: string;

  @IsMongoId()
  academicYear: string;

  @IsEnum(FeePeriodType)
  periodType: FeePeriodType;

  @IsNumber()
  @Min(1)
  @Max(12)
  periodNumber: number;

  @IsNumber()
  year: number;

  @IsString()
  @IsOptional()
  periodLabel?: string;

  @IsArray()
  components: {
    name: string;
    amount: number;
  }[];

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  discountReason?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

/**
 * DTO for querying fee structures
 */
export class QueryFeeStructureDto {
  @IsMongoId()
  @IsOptional()
  academicYear?: string;

  @IsMongoId()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
