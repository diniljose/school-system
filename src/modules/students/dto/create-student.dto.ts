import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StudentStatus } from '../../../common/enums/student-status.enum';

class AddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
}

class ContactDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

class HealthInfoDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) medicalConditions?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) medications?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroup?: string;
}

export class CreateStudentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() admissionNumber?: string;

  @ApiProperty() @IsNotEmpty() @IsString() @MinLength(2) @MaxLength(100) firstName: string;
  @ApiProperty() @IsNotEmpty() @IsString() @MinLength(2) @MaxLength(100) lastName: string;

  @ApiPropertyOptional() @IsOptional() @IsString() middleName?: string;

  @ApiPropertyOptional({ description: 'Date of birth (ISO string)' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: ContactDto, description: 'Contact info (nested object accepted)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;

  @ApiPropertyOptional({ type: ContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  emergencyContact?: ContactDto;

  @ApiPropertyOptional() @IsOptional() @IsString() guardianName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianRelation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() guardianEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() religion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caste?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() motherTongue?: string;

  @ApiPropertyOptional({ type: HealthInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HealthInfoDto)
  healthInfo?: HealthInfoDto;

  @ApiPropertyOptional() @IsOptional() @IsString() previousSchool?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() previousClass?: string;

  @ApiPropertyOptional({ description: 'Admission date (ISO string)' })
  @IsOptional()
  @IsString()
  admissionDate?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() photo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birthCertificate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transferCertificate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  // Fields that frontend sends for class assignment
  @ApiPropertyOptional({ description: 'Current class ID' })
  @IsOptional()
  @IsString()
  currentClass?: string;

  @ApiPropertyOptional({ description: 'Current section' })
  @IsOptional()
  @IsString()
  currentSection?: string;

  @ApiPropertyOptional({ description: 'Current academic year ID' })
  @IsOptional()
  @IsString()
  currentAcademicYear?: string;

  @ApiPropertyOptional({ description: 'Roll number' })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}
