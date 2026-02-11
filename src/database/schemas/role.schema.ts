/**
 * Role Schema
 * Dynamic, per-school role definitions
 * Stored in each tenant database for school-specific customization
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({
  timestamps: true,
  collection: 'roles',
})
export class Role {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  permissions: string[]; // Array of permission codes like 'student:create', 'student:view'

  @Prop({ default: false })
  isSystemRole: boolean; // Prevents deletion of core roles

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Ensure unique code within school (collection is per-tenant DB)
RoleSchema.index({ code: 1 }, { unique: true });

/**
 * Default roles to be created for each school
 */
export const DEFAULT_SCHOOL_ROLES = [
  {
    name: 'School Administrator',
    code: 'school_admin',
    description: 'Full administrative access to the school',
    isSystemRole: true,
    permissions: [
      // User management
      'user:create', 'user:view', 'user:update', 'user:delete',
      // Student management
      'student:create', 'student:view', 'student:update', 'student:delete',
      // Teacher management
      'teacher:create', 'teacher:view', 'teacher:update', 'teacher:delete',
      // Parent management
      'parent:create', 'parent:view', 'parent:update', 'parent:delete',
      // Class management
      'class:create', 'class:view', 'class:update', 'class:delete',
      // Subject management
      'subject:create', 'subject:view', 'subject:update', 'subject:delete',
      // Exam management
      'exam:create', 'exam:view', 'exam:update', 'exam:delete',
      // Result management
      'result:create', 'result:view', 'result:update', 'result:delete',
      // Fee management
      'fee:create', 'fee:view', 'fee:update', 'fee:delete',
      // Attendance
      'attendance:create', 'attendance:view', 'attendance:update', 'attendance:delete',
      // Timetable
      'timetable:create', 'timetable:view', 'timetable:update', 'timetable:delete',
      // Academic year
      'academic-year:create', 'academic-year:view', 'academic-year:update', 'academic-year:delete',
      // Reports
      'report:view', 'report:export',
      // Settings
      'settings:view', 'settings:update',
      // Notifications
      'notification:create', 'notification:view',
    ],
  },
  {
    name: 'Principal',
    code: 'principal',
    description: 'School principal with full view and limited edit access',
    isSystemRole: true,
    permissions: [
      'user:view',
      'student:view', 'student:create', 'student:update',
      'teacher:view', 'teacher:create', 'teacher:update',
      'parent:view',
      'class:view', 'class:create', 'class:update',
      'subject:view', 'subject:create', 'subject:update',
      'exam:view', 'exam:create', 'exam:update',
      'result:view',
      'fee:view',
      'attendance:view',
      'timetable:view', 'timetable:create', 'timetable:update',
      'academic-year:view', 'academic-year:create', 'academic-year:update',
      'report:view', 'report:export',
      'settings:view',
      'notification:create', 'notification:view',
    ],
  },
  {
    name: 'Class Teacher',
    code: 'class_teacher',
    description: 'Teacher with administrative access to assigned classes',
    isSystemRole: true,
    permissions: [
      'student:view', 'student:create', 'student:update', // For assigned classes only
      'parent:view', 'parent:create', 'parent:update',
      'class:view',
      'subject:view',
      'exam:view',
      'result:view', 'result:create', 'result:update', // For assigned classes only
      'attendance:view', 'attendance:create', 'attendance:update', // For assigned classes only
      'timetable:view',
      'report:view',
      'notification:create', 'notification:view',
    ],
  },
  {
    name: 'Subject Teacher',
    code: 'subject_teacher',
    description: 'Teacher with access to assigned subjects',
    isSystemRole: true,
    permissions: [
      'student:view',
      'class:view',
      'subject:view',
      'exam:view',
      'result:view', 'result:create', 'result:update', // For assigned subjects only
      'attendance:view', 'attendance:create', 'attendance:update',
      'timetable:view',
      'notification:view',
    ],
  },
  {
    name: 'Accountant',
    code: 'accountant',
    description: 'Financial management access',
    isSystemRole: true,
    permissions: [
      'student:view',
      'parent:view',
      'fee:create', 'fee:view', 'fee:update', 'fee:delete',
      'report:view', 'report:export',
    ],
  },
  {
    name: 'Librarian',
    code: 'librarian',
    description: 'Library management access',
    isSystemRole: true,
    permissions: [
      'student:view',
      'teacher:view',
      'class:view',
    ],
  },
  {
    name: 'Parent',
    code: 'parent',
    description: 'Parent with view access to their children only',
    isSystemRole: true,
    permissions: [
      'student:view', // Own children only
      'result:view',  // Own children only
      'attendance:view', // Own children only
      'fee:view', // Own children only
      'notification:view',
    ],
  },
  {
    name: 'Student',
    code: 'student',
    description: 'Student with view access to own data',
    isSystemRole: true,
    permissions: [
      'result:view', // Own only
      'attendance:view', // Own only
      'timetable:view',
      'subject:view',
      'notification:view',
    ],
  },
];

/**
 * All available permission codes in the system
 */
export const ALL_PERMISSIONS = [
  // User management
  'user:create', 'user:view', 'user:update', 'user:delete',
  // Student management
  'student:create', 'student:view', 'student:update', 'student:delete',
  // Teacher management
  'teacher:create', 'teacher:view', 'teacher:update', 'teacher:delete',
  // Parent management
  'parent:create', 'parent:view', 'parent:update', 'parent:delete',
  // Class management
  'class:create', 'class:view', 'class:update', 'class:delete',
  // Subject management
  'subject:create', 'subject:view', 'subject:update', 'subject:delete',
  // Exam management
  'exam:create', 'exam:view', 'exam:update', 'exam:delete',
  // Result management
  'result:create', 'result:view', 'result:update', 'result:delete',
  // Fee management
  'fee:create', 'fee:view', 'fee:update', 'fee:delete',
  // Attendance
  'attendance:create', 'attendance:view', 'attendance:update', 'attendance:delete',
  // Timetable
  'timetable:create', 'timetable:view', 'timetable:update', 'timetable:delete',
  // Transport
  'transport:create', 'transport:view', 'transport:update', 'transport:delete',
  // Academic year
  'academic-year:create', 'academic-year:view', 'academic-year:update', 'academic-year:delete',
  // Reports
  'report:view', 'report:export',
  // Settings
  'settings:view', 'settings:update',
  // Notifications
  'notification:create', 'notification:view', 'notification:delete',
  // Transfers
  'transfer:create', 'transfer:view', 'transfer:update', 'transfer:approve',
  // Promotions
  'promotion:create', 'promotion:view', 'promotion:update', 'promotion:execute',
];
