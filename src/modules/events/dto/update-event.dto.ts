import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';
import {
  EventType,
  EventStatus,
  EventVisibility,
} from '../../../database/schemas/event.schema';

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventVisibility, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(EventVisibility, { each: true })
  visibility?: EventVisibility[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  targetClasses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHoliday?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
