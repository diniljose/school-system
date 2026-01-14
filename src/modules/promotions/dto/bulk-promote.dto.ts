import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PromoteStudentDto } from './promote-student.dto';

export class BulkPromoteDto {
  @ApiProperty({ type: [PromoteStudentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromoteStudentDto)
  promotions: PromoteStudentDto[];
}
