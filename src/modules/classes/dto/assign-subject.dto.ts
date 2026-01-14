import { IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubjectDto {
  @ApiProperty({
    type: [String],
    description: 'Array of subject IDs to assign',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  subjectIds: string[];
}
