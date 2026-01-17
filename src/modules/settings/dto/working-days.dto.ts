import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateWorkingDaysDto {
  @ApiProperty({
    type: [String],
    description: 'Array of working days',
    example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  })
  @IsArray()
  @IsString({ each: true })
  workingDays: string[];
}

export class CalendarEventDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsString()
  endDate: string;

  @ApiProperty()
  @IsString()
  eventType: string; // holiday, exam, event, meeting
}
