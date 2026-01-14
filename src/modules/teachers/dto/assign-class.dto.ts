import { IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignClassDto {
  @ApiProperty({ type: [String], description: 'Array of class IDs to assign' })
  @IsArray()
  @IsMongoId({ each: true })
  classIds: string[];
}
