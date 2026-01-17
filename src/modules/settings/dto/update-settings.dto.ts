import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class AcademicSettingsDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(12)
  sessionStartMonth: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(12)
  sessionEndMonth: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  workingDays: string[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  periodsPerDay: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  periodDuration: number;
}

class AttendanceSettingsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumRequired: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  absentDaysBeforeAlert: number;

  @ApiProperty()
  @IsBoolean()
  trackSubjectWise: boolean;
}

class NotificationSettingsDto {
  @ApiProperty()
  @IsBoolean()
  enableEmail: boolean;

  @ApiProperty()
  @IsBoolean()
  enableSMS: boolean;

  @ApiProperty()
  @IsBoolean()
  enablePush: boolean;
}

class ExamSettingsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  passPercentage: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  gracePeriod: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AcademicSettingsDto)
  academicSettings?: AcademicSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AttendanceSettingsDto)
  attendanceSettings?: AttendanceSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExamSettingsDto)
  examSettings?: ExamSettingsDto;
}
