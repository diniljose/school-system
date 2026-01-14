<<<<<<< HEAD
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDate,
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
=======
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsDate, 
  IsEnum, 
  IsEmail, 
  IsArray, 
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '../../../common/enums/student-status.enum';

class AddressDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  zipCode?: string;
}

class ContactDto {
<<<<<<< HEAD
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
=======
  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  emergencyContact?: string;
}

class HealthInfoDto {
  @ApiPropertyOptional({ type: [String] })
<<<<<<< HEAD
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
=======
  @IsArray()
  @IsOptional()
  allergies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  medicalConditions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  medications?: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  doctorName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  doctorPhone?: string;
}

export class CreateStudentDto {
<<<<<<< HEAD
  @ApiPropertyOptional({ description: 'Auto-generated if not provided' })
  @IsOptional()
  @IsString()
  admissionNumber?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  dateOfBirth: Date;

  @ApiProperty({ enum: ['male', 'female', 'other'] })
  @IsNotEmpty()
  @IsString()
  gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: ContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentAcademicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentSection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  admissionDate: Date;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parents?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousSchool?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousSchoolTC?: string;

  @ApiPropertyOptional({ type: HealthInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HealthInfoDto)
  healthInfo?: HealthInfoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
=======
  @ApiProperty({ example: 'ADM001' })
  @IsString()
  @IsNotEmpty()
  admissionNumber: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: 'Michael' })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({ example: '2010-05-15' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dateOfBirth: Date;

  @ApiProperty({ example: 'Male' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: 'American' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ example: 'Christianity' })
  @IsString()
  @IsOptional()
  religion?: string;

  @ApiPropertyOptional({ example: 'General' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ApiPropertyOptional({ type: ContactDto })
  @ValidateNested()
  @Type(() => ContactDto)
  @IsOptional()
  contact?: ContactDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentAcademicYear?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentClass?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentSection?: string;

  @ApiPropertyOptional({ example: 'ROLL001' })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @ApiProperty({ example: '2024-01-15' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  admissionDate: Date;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  parents?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional({ example: 'Springfield High School' })
  @IsString()
  @IsOptional()
  previousSchool?: string;

  @ApiPropertyOptional({ example: 'TC001' })
  @IsString()
  @IsOptional()
  previousSchoolTC?: string;

  @ApiPropertyOptional({ type: HealthInfoDto })
  @ValidateNested()
  @Type(() => HealthInfoDto)
  @IsOptional()
  healthInfo?: HealthInfoDto;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  metadata?: Record<string, any>;
}
