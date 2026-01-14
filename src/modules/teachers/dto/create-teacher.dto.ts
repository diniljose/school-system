import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsObject,
  ValidateNested,
  IsNumber,
  IsMongoId,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AddressDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  zipCode?: string;
}

class SalaryDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  basic?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  allowances?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  deductions?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ifscCode?: string;
}

export class CreateTeacherDto {
  @ApiProperty({ example: 'John', description: 'Teacher first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Teacher last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@school.com', description: 'Teacher email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({ example: '1985-05-15', description: 'Date of birth' })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({ example: 'Male', description: 'Gender' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ApiProperty({ example: '2024-01-15', description: 'Joining date' })
  @IsDateString()
  @IsNotEmpty()
  joiningDate: string;

  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional({ example: 'Science' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ type: [String], description: 'Subject IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  subjects?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Class IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  assignedClasses?: string[];

  @ApiPropertyOptional({ type: SalaryDto })
  @IsObject()
  @ValidateNested()
  @Type(() => SalaryDto)
  @IsOptional()
  salary?: SalaryDto;

  @ApiPropertyOptional({ description: 'User ID if account exists' })
  @IsMongoId()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
