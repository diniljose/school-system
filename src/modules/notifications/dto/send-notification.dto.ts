import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class SendNotificationDto {
  @ApiPropertyOptional({
    description: 'Force resend to all recipients',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceResend?: boolean;

  @ApiPropertyOptional({
    description: 'Send via email',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Send via SMS',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendSMS?: boolean;

  @ApiPropertyOptional({
    description: 'Send via push notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean;

  @ApiPropertyOptional({
    description: 'Send via in-app notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendInApp?: boolean;
}
