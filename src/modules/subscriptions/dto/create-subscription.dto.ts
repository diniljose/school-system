import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../../database/schemas/subscription.schema';

class LimitsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxStudents: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxTeachers: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxClasses: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  storageGB: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  smsCredits: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  emailCredits: number;
}

class BillingDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ default: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'annually'] })
  @IsString()
  billingCycle: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  nextBillingDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastPaymentDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lastPaymentAmount?: number;
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'School ID' })
  @IsNotEmpty()
  @IsString()
  school: string;

  @ApiProperty({ enum: SubscriptionPlan })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  trialEndsAt?: Date;

  @ApiProperty({ type: LimitsDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LimitsDto)
  limits: LimitsDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiProperty({ type: BillingDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BillingDto)
  billing: BillingDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
