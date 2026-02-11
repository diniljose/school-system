import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@school.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'SCH001', required: false })
  @IsString()
  @IsOptional()
  schoolCode?: string; // Required for non-super-admin users

  @ApiProperty({ example: 'teacher', required: false, description: 'Selected role when user has multiple roles' })
  @IsString()
  @IsOptional()
  selectedRole?: string;

  @ApiProperty({ example: 'user-id', required: false, description: 'Selected user ID when user has multiple personas' })
  @IsString()
  @IsOptional()
  selectedUserId?: string;
}
