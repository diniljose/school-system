import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

class SectionDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty() @IsNotEmpty() @IsNumber() @Min(1) capacity: number;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() classTeacher?: string;
}

class PromotionCriteriaDto {
  @ApiProperty() @IsNotEmpty() @IsNumber() @Min(0) minimumPercentage: number;
  @ApiProperty() @IsNotEmpty() @IsNumber() @Min(0) minimumAttendance: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsMongoId({ each: true }) mandatorySubjects?: string[];
}

class OtherFeeDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty() @IsNotEmpty() @IsNumber() @Min(0) amount: number;
}

class FeeStructureDto {
  @ApiProperty() @IsNotEmpty() @IsNumber() @Min(0) tuitionFee: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) admissionFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) examFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) libraryFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) labFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sportsFee?: number;
  @ApiPropertyOptional({ type: [OtherFeeDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OtherFeeDto) otherFees?: OtherFeeDto[];
}

export class CreateClassDto {
  @ApiProperty({ example: 'Grade 1' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'Numeric grade level (auto-derived from name if not provided)' })
  @IsOptional()
  grade?: any;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  // Simple flat fields the frontend sends
  @ApiPropertyOptional({ description: 'Single section name (e.g. "A")' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Class teacher ID' })
  @IsOptional()
  @IsString()
  classTeacher?: string;

  @ApiPropertyOptional({ description: 'Room number' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Capacity' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  capacity?: number;

  // Complex nested fields
  @ApiPropertyOptional({ type: [SectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsMongoId({ each: true }) subjects?: string[];
  @ApiPropertyOptional() @IsOptional() @IsMongoId() nextClass?: string;

  @ApiPropertyOptional({ type: PromotionCriteriaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PromotionCriteriaDto)
  promotionCriteria?: PromotionCriteriaDto;

  @ApiPropertyOptional({ type: FeeStructureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeeStructureDto)
  feeStructure?: FeeStructureDto;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
