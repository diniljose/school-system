import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsEnum,
  IsEmail,
  IsArray,
  ValidateNested,
  IsObject,
  IsMongoId,
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
  zipCode?: string;
}

class ContactDto {
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
  emergencyContact?: string;
}

class HealthInfoDto {
  @ApiPropertyOptional({ type: [String] })
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
  doctorPhone?: string;
}

export class CreateStudentDto {
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
  @IsMongoId()
  @IsOptional()
  currentAcademicYear?: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  currentClass?: string;

  @ApiPropertyOptional()
  @IsMongoId()
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
  @IsMongoId({ each: true })
  @IsOptional()
  parents?: string[];

  @ApiPropertyOptional()
  @IsMongoId()
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
  metadata?: Record<string, any>;
}
