import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class SettingsDto {
  @ApiPropertyOptional({ description: 'Academic year start month (1-12)', minimum: 1, maximum: 12 })
  @IsOptional() @IsNumber() @Min(1) @Max(12)
  academicYearStart?: number;

  @ApiPropertyOptional({ description: 'Academic year end month (1-12)', minimum: 1, maximum: 12 })
  @IsOptional() @IsNumber() @Min(1) @Max(12)
  academicYearEnd?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() gradingSystem?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attendanceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feeStructure?: string;
  @ApiPropertyOptional({ default: 'USD' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ default: 'UTC' }) @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ default: 'MM/DD/YYYY' }) @IsOptional() @IsString() dateFormat?: string;

  @ApiPropertyOptional({ type: [String], description: 'Working days' })
  @IsOptional() @IsArray() @IsString({ each: true })
  workingDays?: string[];
}

class FeaturesDto {
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() attendance?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() fees?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() exams?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() library?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() transport?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() hostel?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() canteen?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() notifications?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() parentPortal?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() studentPortal?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() onlinePayment?: boolean;
}

export class CreateSchoolDto {
  @ApiProperty({ description: 'School name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Unique school code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'URL-friendly identifier (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'School logo URL' }) @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional({ description: 'School address' }) @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;

  @ApiPropertyOptional({ type: SettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SettingsDto)
  settings?: SettingsDto;

  @ApiPropertyOptional({ type: FeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeaturesDto)
  features?: FeaturesDto;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;

  /**
   * Pending admin info (for school registration with approval workflow)
   */
  @ApiPropertyOptional({
    description: 'Admin credentials to be created after approval',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  pendingAdmin?: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    phone?: string;
  };
}
