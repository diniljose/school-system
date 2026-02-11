/**
 * Create Role DTO
 */
import { IsString, IsArray, IsOptional, IsBoolean, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Display name of the role' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Unique code for the role (lowercase, underscores allowed)' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Role code must start with a letter and contain only lowercase letters, numbers, and underscores',
  })
  code: string;

  @ApiPropertyOptional({ description: 'Description of what this role can do' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ description: 'List of permission codes for this role', type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: 'Whether the role is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
