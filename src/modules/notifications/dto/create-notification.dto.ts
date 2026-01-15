import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsMongoId,
  IsBoolean,
  IsDateString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationPriority,
  RecipientType,
} from '../../../database/schemas/notification.schema';

class ActionRequiredDto {
  @ApiProperty({ description: 'Action type' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Due date for action' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Action link' })
  @IsOptional()
  @IsString()
  link?: string;
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({
    description: 'Recipient type',
    enum: RecipientType,
  })
  @IsNotEmpty()
  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @ApiPropertyOptional({
    description: 'Array of recipient IDs (for INDIVIDUAL recipient type)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({
    description: 'Target class IDs (for CLASS recipient type)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  targetClasses?: string[];

  @ApiPropertyOptional({
    description: 'Target sections (for SECTION recipient type)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSections?: string[];

  @ApiPropertyOptional({
    description: 'Schedule notification for later',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Notification expiration date',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Attachment URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Action required details',
    type: ActionRequiredDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionRequiredDto)
  actionRequired?: ActionRequiredDto;

  @ApiPropertyOptional({
    description: 'Requires acknowledgement',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresAcknowledgement?: boolean;

  @ApiPropertyOptional({
    description: 'Send email notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Send SMS notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendSMS?: boolean;

  @ApiPropertyOptional({
    description: 'Send push notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendPush?: boolean;

  @ApiPropertyOptional({
    description: 'Send in-app notification',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendInApp?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
