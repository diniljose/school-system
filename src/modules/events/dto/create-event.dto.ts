import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';
import {
  EventType,
  EventVisibility,
} from '../../../database/schemas/event.schema';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventType, default: EventType.OTHER })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO string)' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Start time (HH:MM)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:MM)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizer?: string;

  @ApiPropertyOptional({
    enum: EventVisibility,
    isArray: true,
    default: [EventVisibility.ALL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EventVisibility, { each: true })
  visibility?: EventVisibility[];

  @ApiPropertyOptional({ description: 'Target class IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  targetClasses?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHoliday?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurringPattern?: string;

  @ApiPropertyOptional({ description: 'Color for calendar display' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Academic Year ID' })
  @IsOptional()
  @IsMongoId()
  academicYearId?: string;
}
