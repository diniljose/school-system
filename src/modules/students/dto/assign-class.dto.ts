import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignClassDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  classId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty({ example: 'ROLL001' })
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  academicYearId: string;
}
