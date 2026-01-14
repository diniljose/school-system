import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  ValidateNested,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddressDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  zipCode?: string;
}

export class CreateParentDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'father',
    description: 'Relationship type: father, mother, guardian',
  })
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: '+0987654321' })
  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ example: 'Tech Corp' })
  @IsString()
  @IsOptional()
  workplace?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ApiPropertyOptional({ type: [String], description: 'Array of student IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  children?: string[];

  @ApiPropertyOptional({ description: 'Associated user ID' })
  @IsMongoId()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
