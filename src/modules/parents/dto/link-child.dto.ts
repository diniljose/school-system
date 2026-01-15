import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class LinkChildDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  setAsPrimary?: boolean;
}
