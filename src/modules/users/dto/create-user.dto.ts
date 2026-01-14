import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsMongoId,
  IsArray,
  IsBoolean,
  Matches,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../common/enums/roles.enum';

class PreferencesDto {
  @ApiPropertyOptional({
    example: 'en',
    description: 'User language preference',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable notifications' })
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable SMS notifications',
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'User password (min 8 characters, must include uppercase, lowercase, number, and special character)',
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  password: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'User phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.TEACHER,
    description: 'User role',
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    example: ['read_student', 'create_student'],
    description: 'User permissions',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'School ID (not required for super_admin)',
  })
  @IsOptional()
  @IsMongoId()
  school?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439012',
    description: 'Profile ID (Student/Teacher/Parent)',
  })
  @IsOptional()
  @IsMongoId()
  profile?: string;

  @ApiPropertyOptional({
    enum: ['Student', 'Teacher', 'Parent'],
    example: 'Teacher',
    description: 'Profile model type',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['Student', 'Teacher', 'Parent'])
  profileModel?: string;

  @ApiPropertyOptional({ example: true, description: 'User active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: PreferencesDto,
    description: 'User preferences',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}
