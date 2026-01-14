import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { SubscriptionPlan } from '../../../database/schemas/subscription.schema';

export class ChangePlanDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan)
  newPlan: SubscriptionPlan;
}
