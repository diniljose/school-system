import {
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OtherFeeDto {
  @ApiProperty({ example: 'Transport Fee' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class SetFeeStructureDto {
  @ApiProperty({ example: 5000, description: 'Tuition fee amount' })
  @IsNumber()
  @Min(0)
  tuitionFee: number;

  @ApiProperty({ example: 1000, description: 'Admission fee amount' })
  @IsNumber()
  @Min(0)
  admissionFee: number;

  @ApiProperty({ example: 500, description: 'Exam fee amount' })
  @IsNumber()
  @Min(0)
  examFee: number;

  @ApiProperty({ example: 300, description: 'Library fee amount' })
  @IsNumber()
  @Min(0)
  libraryFee: number;

  @ApiProperty({ example: 400, description: 'Lab fee amount' })
  @IsNumber()
  @Min(0)
  labFee: number;

  @ApiProperty({ example: 200, description: 'Sports fee amount' })
  @IsNumber()
  @Min(0)
  sportsFee: number;

  @ApiPropertyOptional({
    type: [OtherFeeDto],
    description: 'Array of other fees',
    example: [{ name: 'Transport Fee', amount: 500 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherFeeDto)
  @IsOptional()
  otherFees?: OtherFeeDto[];
}
