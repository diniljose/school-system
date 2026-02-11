import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsArray } from 'class-validator';

export class AssignStudentsDto {
  @ApiProperty({ description: 'Array of student IDs to assign', type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsMongoId({ each: true })
  studentIds: string[];
}
