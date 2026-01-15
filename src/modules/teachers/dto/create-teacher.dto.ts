import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  zipCode?: string;
}

class QualificationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  degree: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  institution: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  year: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;
}

class ExperienceDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  institution: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  designation: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  fromDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

class SalaryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  basic: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  allowances?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ifscCode?: string;
}

export class CreateTeacherDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  dateOfBirth: Date;

  @ApiProperty({ enum: ['male', 'female', 'other'] })
  @IsNotEmpty()
  @IsString()
  gender: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  joiningDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ type: [QualificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationDto)
  qualifications?: QualificationDto[];

  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ApiPropertyOptional({ type: SalaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SalaryDto)
  salary?: SalaryDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
