import {
  IsNotEmpty,
  IsMongoId,
  IsArray,
  IsNumber,
  IsDate,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class FeeTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;
}

export class GenerateFeesDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  month: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  students: string[];

  @ApiProperty({ type: [FeeTemplateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeTemplateDto)
  feeComponents: FeeTemplateDto[];
}
