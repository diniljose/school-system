import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  IsPhoneNumber,
} from 'class-validator';

export class RegisterStudentDto {
  @ApiProperty({ example: 'John', description: 'Student first name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Student last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'SCHOOL-001', description: 'School code to register with' })
  @IsNotEmpty()
  @IsString()
  schoolCode: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Class ID to enroll in' })
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiProperty({ example: 'A', description: 'Section/Division name' })
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiPropertyOptional({ example: '2010-05-15', description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'male', description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Contact phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St', description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  // Parent/Guardian info for minor students
  @ApiPropertyOptional({ example: 'Jane', description: 'Parent first name' })
  @IsOptional()
  @IsString()
  parentFirstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Parent last name' })
  @IsOptional()
  @IsString()
  parentLastName?: string;

  @ApiPropertyOptional({ example: 'parent@example.com', description: 'Parent email' })
  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Parent phone' })
  @IsOptional()
  @IsString()
  parentPhone?: string;

  @ApiPropertyOptional({ example: 'mother', description: 'Relationship to student' })
  @IsOptional()
  @IsString()
  parentRelation?: string;
}
