import { IsNotEmpty, IsString, IsArray, IsMongoId, IsOptional, IsDateString } from 'class-validator';
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

  @ApiProperty({ description: 'Academic Year ID', required: false })
  @IsMongoId()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({ description: 'Start date for this assignment', required: false, example: '2026-02-22' })
  @IsDateString()
  @IsOptional()
  startDate?: string;
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
