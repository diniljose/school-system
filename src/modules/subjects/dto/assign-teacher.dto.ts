import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTeacherDto {
  @ApiProperty({ description: 'Teacher ID' })
  @IsMongoId()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'Class ID' })
  @IsMongoId()
  @IsNotEmpty()
  classId: string;
}
