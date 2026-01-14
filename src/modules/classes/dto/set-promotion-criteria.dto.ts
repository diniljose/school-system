import { IsNumber, IsArray, IsMongoId, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetPromotionCriteriaDto {
  @ApiProperty({ example: 40, description: 'Minimum percentage required for promotion' })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumPercentage: number;

  @ApiProperty({ example: 75, description: 'Minimum attendance percentage required' })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumAttendance: number;

  @ApiPropertyOptional({ 
    type: [String], 
    description: 'Array of mandatory subject IDs',
    example: ['507f1f77bcf86cd799439011']
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  mandatorySubjects?: string[];
}
