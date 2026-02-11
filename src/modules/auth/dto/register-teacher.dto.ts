import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTeacherDto {
  @ApiProperty({ example: 'TS-1270' })
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'male', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: 'Senior Teacher', required: false })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiProperty({ example: 'Mathematics', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: ['M.Ed', 'B.Sc Math'], required: false })
  @IsArray()
  @IsOptional()
  qualifications?: string[];

  @ApiProperty({ example: 'subject_teacher', required: false, description: 'Role code from roles list' })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiProperty({ example: 'Looking forward to teaching at this school', required: false })
  @IsString()
  @IsOptional()
  message?: string;
}
