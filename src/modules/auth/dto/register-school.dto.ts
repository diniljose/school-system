import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for self-service school registration.
 * This creates BOTH a school AND a school_admin user in one step.
 * Used by principals/admins signing up for the first time.
 */
export class RegisterSchoolDto {
  @ApiProperty({ example: 'John', description: 'Admin first name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Anderson', description: 'Admin last name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    example: 'john@greenvalley.edu',
    description: 'Admin email (used for login)',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({
    example: 'Green Valley International School',
    description: 'Name of the school to create',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  schoolName: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Admin phone number',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: '123 Education Lane, Springfield',
    description: 'School address',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  schoolAddress?: string;

  @ApiPropertyOptional({
    example: 'contact@greenvalley.edu',
    description: 'School contact email',
  })
  @IsEmail()
  @IsOptional()
  schoolEmail?: string;

  @ApiPropertyOptional({
    example: '+1 555 123 4567',
    description: 'School phone number',
  })
  @IsString()
  @IsOptional()
  schoolPhone?: string;
}
