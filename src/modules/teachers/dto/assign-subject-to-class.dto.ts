import { IsNotEmpty, IsString, IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubjectToClassDto {
  @ApiProperty({ description: 'Subject ID to assign' })
  @IsMongoId()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: 'Class ID where teacher will teach this subject' })
  @IsMongoId()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ description: 'Sections where teacher will teach (e.g., ["A", "B"])', example: ['A', 'B'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  sections: string[];
}

export class RemoveSubjectFromClassDto {
  @ApiProperty({ description: 'Subject ID to remove' })
  @IsMongoId()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: 'Class ID to remove subject from' })
  @IsMongoId()
  @IsNotEmpty()
  classId: string;
}
