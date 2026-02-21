import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Available student actions for school management
 */
export enum StudentAction {
  // Academic Status Actions
  PROMOTE = 'promote',           // Move to next class/grade
  PASS = 'pass',                 // Mark as passed (same class or graduation)
  FAIL = 'fail',                 // Failed the academic year
  RETAIN = 'retain',             // Held back in same class
  
  // Enrollment Actions  
  ENROLL = 'enroll',             // Enroll in a class/section
  CHANGE_SECTION = 'change_section', // Move to different section
  
  // Administrative Actions
  TRANSFER_OUT = 'transfer_out', // Transfer to another school
  WITHDRAW = 'withdraw',         // Withdrawn from school
  GRADUATE = 'graduate',         // Completed education
  SUSPEND = 'suspend',           // Temporarily suspended
  REINSTATE = 'reinstate',       // Bring back active
  
  // Approval Actions (for pending students)
  APPROVE = 'approve',           // Approve pending admission
  REJECT = 'reject',             // Reject admission
}

export class StudentActionDto {
  @ApiProperty({ enum: StudentAction, description: 'Action to perform on student' })
  @IsEnum(StudentAction)
  @IsNotEmpty()
  action: StudentAction;

  @ApiPropertyOptional({ description: 'Target class ID (for promote/enroll/change actions)' })
  @IsString()
  @IsOptional()
  toClassId?: string;

  @ApiPropertyOptional({ description: 'Target section (for promote/enroll/change actions)' })
  @IsString()
  @IsOptional()
  toSection?: string;

  @ApiPropertyOptional({ description: 'Target academic year ID' })
  @IsString()
  @IsOptional()
  toAcademicYearId?: string;

  @ApiPropertyOptional({ description: 'New roll number' })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @ApiPropertyOptional({ description: 'Result/percentage achieved' })
  @IsNumber()
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ description: 'Rank in class' })
  @IsNumber()
  @IsOptional()
  rank?: number;

  @ApiPropertyOptional({ description: 'Transfer destination school name' })
  @IsString()
  @IsOptional()
  toSchoolName?: string;

  @ApiPropertyOptional({ description: 'Transfer certificate number' })
  @IsString()
  @IsOptional()
  transferCertificateNumber?: string;

  @ApiPropertyOptional({ description: 'Reason for the action' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkStudentActionDto {
  @ApiProperty({ type: [String], description: 'Array of student IDs' })
  @IsString({ each: true })
  @IsNotEmpty()
  studentIds: string[];

  @ApiProperty({ enum: StudentAction, description: 'Action to perform on all students' })
  @IsEnum(StudentAction)
  @IsNotEmpty()
  action: StudentAction;

  @ApiPropertyOptional({ description: 'Target class ID' })
  @IsString()
  @IsOptional()
  toClassId?: string;

  @ApiPropertyOptional({ description: 'Target section' })
  @IsString()
  @IsOptional()
  toSection?: string;

  @ApiPropertyOptional({ description: 'Target academic year ID' })
  @IsString()
  @IsOptional()
  toAcademicYearId?: string;

  @ApiPropertyOptional({ description: 'Reason for the action' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

/**
 * Student action options for frontend dropdown
 */
export interface StudentActionOption {
  action: StudentAction;
  label: string;
  description: string;
  icon: string;
  category: 'academic' | 'enrollment' | 'administrative' | 'approval';
  requiresClass: boolean;
  requiresAcademicYear: boolean;
  applicableStatuses: string[];  // Which student statuses can have this action
  confirmationRequired: boolean;
  color: string;
}

/**
 * All available student actions with metadata
 */
export const STUDENT_ACTION_OPTIONS: StudentActionOption[] = [
  // Academic Actions
  {
    action: StudentAction.PROMOTE,
    label: 'Promote',
    description: 'Move student to next class/grade',
    icon: '⬆️',
    category: 'academic',
    requiresClass: true,
    requiresAcademicYear: true,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#10b981',
  },
  {
    action: StudentAction.PASS,
    label: 'Mark as Passed',
    description: 'Mark student as passed for current year',
    icon: '✅',
    category: 'academic',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#22c55e',
  },
  {
    action: StudentAction.FAIL,
    label: 'Mark as Failed',
    description: 'Student failed the academic year',
    icon: '❌',
    category: 'academic',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#ef4444',
  },
  {
    action: StudentAction.RETAIN,
    label: 'Retain (Detain)',
    description: 'Keep student in same class next year',
    icon: '🔄',
    category: 'academic',
    requiresClass: false,
    requiresAcademicYear: true,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#f59e0b',
  },

  // Enrollment Actions
  {
    action: StudentAction.ENROLL,
    label: 'Enroll in Class',
    description: 'Enroll student to a class and section',
    icon: '📋',
    category: 'enrollment',
    requiresClass: true,
    requiresAcademicYear: true,
    applicableStatuses: ['active', 'inactive'],
    confirmationRequired: false,
    color: '#3b82f6',
  },
  {
    action: StudentAction.CHANGE_SECTION,
    label: 'Change Section',
    description: 'Move student to different section',
    icon: '↔️',
    category: 'enrollment',
    requiresClass: true,
    requiresAcademicYear: false,
    applicableStatuses: ['active'],
    confirmationRequired: false,
    color: '#6366f1',
  },

  // Administrative Actions
  {
    action: StudentAction.TRANSFER_OUT,
    label: 'Transfer Out',
    description: 'Transfer student to another school',
    icon: '🏫',
    category: 'administrative',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#8b5cf6',
  },
  {
    action: StudentAction.WITHDRAW,
    label: 'Withdraw',
    description: 'Withdraw student from school',
    icon: '🚪',
    category: 'administrative',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['active', 'suspended'],
    confirmationRequired: true,
    color: '#f97316',
  },
  {
    action: StudentAction.GRADUATE,
    label: 'Graduate',
    description: 'Mark student as graduated',
    icon: '🎓',
    category: 'administrative',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#14b8a6',
  },
  {
    action: StudentAction.SUSPEND,
    label: 'Suspend',
    description: 'Temporarily suspend student',
    icon: '⏸️',
    category: 'administrative',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['active'],
    confirmationRequired: true,
    color: '#dc2626',
  },
  {
    action: StudentAction.REINSTATE,
    label: 'Reinstate',
    description: 'Bring back suspended/inactive student',
    icon: '▶️',
    category: 'administrative',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['inactive', 'suspended'],
    confirmationRequired: true,
    color: '#059669',
  },

  // Approval Actions
  {
    action: StudentAction.APPROVE,
    label: 'Approve Admission',
    description: 'Approve pending student admission',
    icon: '👍',
    category: 'approval',
    requiresClass: true,
    requiresAcademicYear: true,
    applicableStatuses: ['pending_approval'],
    confirmationRequired: true,
    color: '#10b981',
  },
  {
    action: StudentAction.REJECT,
    label: 'Reject Admission',
    description: 'Reject pending student admission',
    icon: '👎',
    category: 'approval',
    requiresClass: false,
    requiresAcademicYear: false,
    applicableStatuses: ['pending_approval'],
    confirmationRequired: true,
    color: '#ef4444',
  },
];
