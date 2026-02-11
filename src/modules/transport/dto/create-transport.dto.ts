import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsBoolean,
  Min,
  IsObject,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleStatus } from '../../../database/schemas/transport.schema';

class StopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  pickupTime: string;

  @ApiProperty()
  @IsString()
  dropTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty()
  @IsNumber()
  order: number;
}

class DriverDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  licenseNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;
}

class AttendantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  phone: string;
}

export class CreateTransportDto {
  @ApiProperty({ description: 'Vehicle registration number' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiProperty({ description: 'Type of vehicle', example: 'bus' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty({ description: 'Seating capacity' })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiProperty({ description: 'Route name' })
  @IsString()
  @IsNotEmpty()
  routeName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeNumber?: string;

  @ApiPropertyOptional({ type: [StopDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopDto)
  stops?: StopDto[];

  @ApiPropertyOptional({ type: DriverDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DriverDto)
  driver?: DriverDto;

  @ApiPropertyOptional({ type: AttendantDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttendantDto)
  attendant?: AttendantDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;
}
