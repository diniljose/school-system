import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../../common/enums/student-status.enum';

class StudentAttendanceRecordDto {
  @ApiProperty({ description: 'Student ID' })
  @IsNotEmpty()
  @IsMongoId()
  student: string;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceStatus,
  })
  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'In time (HH:mm format)' })
  @IsOptional()
  @IsString()
  inTime?: string;

  @ApiPropertyOptional({ description: 'Out time (HH:mm format)' })
  @IsOptional()
  @IsString()
  outTime?: string;

  @ApiPropertyOptional({ description: 'Remarks for attendance' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ description: 'Class ID' })
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiProperty({ description: 'Section name (e.g., A, B, C)' })
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiProperty({ description: 'Attendance date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Array of student attendance records',
    type: [StudentAttendanceRecordDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceRecordDto)
  records: StudentAttendanceRecordDto[];

  @ApiPropertyOptional({
    description: 'Subject ID for subject-wise attendance',
  })
  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Period number for period-wise attendance',
  })
  @IsOptional()
  @IsString()
  period?: string;
}
