import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignSubjectDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  subjectId: string;
}
