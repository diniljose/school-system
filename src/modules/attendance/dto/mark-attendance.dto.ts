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
  @ApiPropertyOptional({ description: 'Student ID (alias: studentId)' })
  @IsOptional()
  @IsString()
  student?: string;

  @ApiPropertyOptional({ description: 'Student ID (alias for student)' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Student name (for display, ignored by backend)' })
  @IsOptional()
  @IsString()
  studentName?: string;

  @ApiProperty({ description: 'Attendance status', enum: AttendanceStatus })
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

  @ApiPropertyOptional({ description: 'Note (alias for remarks)' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ description: 'Class ID' })
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiPropertyOptional({ description: 'Section name (e.g., A, B, C)' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ description: 'Attendance date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ description: 'Array of student attendance records', type: [StudentAttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceRecordDto)
  records: StudentAttendanceRecordDto[];

  @ApiPropertyOptional({ description: 'Subject ID for subject-wise attendance' })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Period number for period-wise attendance' })
  @IsOptional()
  @IsString()
  period?: string;
}
