import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/roles.enum';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@school.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'SCH001' })
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @ApiProperty({ example: UserRole.TEACHER, enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
