import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SeedPlatformAdminDto {
  @ApiPropertyOptional({ description: 'Platform admin email', default: 'admin@schoolplatform.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Platform admin password', default: 'Admin@123' })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Platform admin first name', default: 'Platform' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Platform admin last name', default: 'Admin' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Platform admin phone number', default: '+91-9999999999' })
  @IsString()
  @IsOptional()
  phone?: string;
}
