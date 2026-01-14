import { IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkChildDto {
  @ApiProperty({ description: 'Student ID to link/unlink' })
  @IsMongoId()
  @IsNotEmpty()
  studentId: string;
}
