import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateTransportDto } from './create-transport.dto';
import { IsOptional, IsArray, IsMongoId } from 'class-validator';

export class UpdateTransportDto extends PartialType(CreateTransportDto) {
  @ApiPropertyOptional({ description: 'Array of student IDs assigned to this vehicle' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  assignedStudents?: string[];
}
