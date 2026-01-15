import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class AssignClassDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  setAsClassTeacher?: boolean;
}
