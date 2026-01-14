import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddSectionDto {
  @ApiProperty({ example: 'A', description: 'Section name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 40, description: 'Maximum student capacity' })
  @IsNumber()
  @IsPositive()
  capacity: number;
}
