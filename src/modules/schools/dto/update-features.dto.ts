import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateFeaturesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  attendance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fees?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  exams?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  library?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  transport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hostel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canteen?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  parentPortal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  studentPortal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlinePayment?: boolean;
}
