/**
 * Update Class Teacher Assignment DTO
 */
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClassTeacherAssignmentDto } from './create-class-teacher-assignment.dto';

export class UpdateClassTeacherAssignmentDto extends PartialType(
  OmitType(CreateClassTeacherAssignmentDto, ['teacher', 'class', 'academicYear'] as const),
) {}
