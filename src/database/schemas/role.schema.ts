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
      // Role management
      'role:create', 'role:view', 'role:update', 'role:delete',
      // Dashboard
      'dashboard:view',
      // Student management
      'student:create', 'student:view', 'student:update', 'student:delete', 'student:approve',
      // Teacher management
      'teacher:create', 'teacher:view', 'teacher:update', 'teacher:delete', 'teacher:approve',
      // Parent management
      'parent:create', 'parent:view', 'parent:update', 'parent:delete',
      // Class management
      'class:create', 'class:view', 'class:update', 'class:delete',
      // Subject management
      'subject:create', 'subject:view', 'subject:update', 'subject:delete',
      // Exam management
      'exam:create', 'exam:view', 'exam:update', 'exam:delete',
      // Result management
      'result:create', 'result:view', 'result:update', 'result:delete', 'result:publish',
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
      // Enrollments
      'enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:delete', 'enrollment:bulk',
      // Events
      'event:create', 'event:view', 'event:update', 'event:delete',
      // Class-Teacher Assignments
      'class-assignment:create', 'class-assignment:view', 'class-assignment:update', 'class-assignment:delete',
      // School management
      'school:view', 'school:update',
      // Sections
      'section:create', 'section:view', 'section:update', 'section:delete',
    ],
  },
  {
    name: 'Principal',
    code: 'principal',
    description: 'School principal with full view and limited edit access',
    isSystemRole: true,
    permissions: [
      // User management
      'user:view', 'user:create', 'user:update',
      // Role management
      'role:view', 'role:create', 'role:update', 'role:delete',
      // Dashboard
      'dashboard:view',
      // Student management
      'student:view', 'student:create', 'student:update', 'student:approve',
      // Teacher management
      'teacher:view', 'teacher:create', 'teacher:update', 'teacher:approve',
      // Parent management
      'parent:view', 'parent:create', 'parent:update',
      // Class management
      'class:view', 'class:create', 'class:update',
      // Subject management
      'subject:view', 'subject:create', 'subject:update',
      // Exam management
      'exam:view', 'exam:create', 'exam:update',
      // Result management
      'result:view', 'result:create', 'result:update', 'result:publish',
      // Fee management
      'fee:view', 'fee:create', 'fee:update',
      // Attendance
      'attendance:view', 'attendance:create', 'attendance:update',
      // Timetable
      'timetable:view', 'timetable:create', 'timetable:update',
      // Transport
      'transport:view', 'transport:create', 'transport:update',
      // Academic year
      'academic-year:view', 'academic-year:create', 'academic-year:update',
      // Reports
      'report:view', 'report:export',
      // Settings
      'settings:view', 'settings:update',
      // Notifications
      'notification:create', 'notification:view',
      // Transfers
      'transfer:view', 'transfer:create', 'transfer:update', 'transfer:approve',
      // Promotions
      'promotion:view', 'promotion:create', 'promotion:update', 'promotion:execute',
      // Enrollments
      'enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:bulk',
      // Events
      'event:create', 'event:view', 'event:update', 'event:delete',
      // Class-Teacher Assignments
      'class-assignment:create', 'class-assignment:view', 'class-assignment:update', 'class-assignment:delete',
      // School & Sections
      'school:view', 'school:update',
      'section:create', 'section:view', 'section:update', 'section:delete',
    ],
  },
  {
    name: 'Vice Principal',
    code: 'vice_principal',
    description: 'Vice principal with similar access to principal',
    isSystemRole: true,
    permissions: [
      // User management
      'user:view', 'user:create', 'user:update',
      // Role management
      'role:view', 'role:create', 'role:update',
      // Dashboard
      'dashboard:view',
      // Student management
      'student:view', 'student:create', 'student:update', 'student:approve',
      // Teacher management
      'teacher:view', 'teacher:create', 'teacher:update', 'teacher:approve',
      // Parent management
      'parent:view', 'parent:create', 'parent:update',
      // Class management
      'class:view', 'class:create', 'class:update',
      // Subject management
      'subject:view', 'subject:create', 'subject:update',
      // Exam management
      'exam:view', 'exam:create', 'exam:update',
      // Result management
      'result:view', 'result:create', 'result:update', 'result:publish',
      // Fee management
      'fee:view', 'fee:create', 'fee:update',
      // Attendance
      'attendance:view', 'attendance:create', 'attendance:update',
      // Timetable
      'timetable:view', 'timetable:create', 'timetable:update',
      // Transport
      'transport:view', 'transport:create', 'transport:update',
      // Academic year
      'academic-year:view', 'academic-year:create', 'academic-year:update',
      // Reports
      'report:view', 'report:export',
      // Settings
      'settings:view',
      // Notifications
      'notification:create', 'notification:view',
      // Transfers
      'transfer:view', 'transfer:create', 'transfer:update', 'transfer:approve',
      // Promotions
      'promotion:view', 'promotion:create', 'promotion:update', 'promotion:execute',
      // Enrollments
      'enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:bulk',
      // Events
      'event:create', 'event:view', 'event:update', 'event:delete',
      // Class-Teacher Assignments
      'class-assignment:create', 'class-assignment:view', 'class-assignment:update', 'class-assignment:delete',
      // School & Sections
      'school:view',
      'section:create', 'section:view', 'section:update', 'section:delete',
    ],
  },
  {
    name: 'Class Teacher',
    code: 'class_teacher',
    description: 'Teacher with administrative access to assigned classes',
    isSystemRole: true,
    permissions: [
      'dashboard:view',
      'student:view', 'student:create', 'student:update', 'student:approve', // For assigned classes only
      'parent:view', 'parent:create', 'parent:update',
      'class:view',
      'subject:view',
      'section:view',
      'teacher:view',
      'exam:view',
      'result:view', 'result:create', 'result:update', // For assigned classes only
      'attendance:view', 'attendance:create', 'attendance:update', // For assigned classes only
      'timetable:view',
      'report:view',
      'notification:create', 'notification:view',
      'enrollment:view', 'enrollment:create',
      'event:view',
      'class-assignment:view', 'class-assignment:create', 'class-assignment:update',
    ],
  },
  {
    name: 'Teacher',
    code: 'teacher',
    description: 'Regular teacher with basic access',
    isSystemRole: true,
    permissions: [
      'dashboard:view',
      'student:view',
      'parent:view',
      'class:view',
      'subject:view',
      'section:view',
      'teacher:view',
      'exam:view',
      'result:view', 'result:create', 'result:update',
      'attendance:view', 'attendance:create', 'attendance:update',
      'timetable:view',
      'notification:view',
      'event:view',
      'class-assignment:view',
    ],
  },
  {
    name: 'Subject Teacher',
    code: 'subject_teacher',
    description: 'Teacher with access to assigned subjects',
    isSystemRole: true,
    permissions: [
      'dashboard:view',
      'student:view',
      'class:view',
      'subject:view',
      'section:view',
      'teacher:view',
      'exam:view',
      'result:view', 'result:create', 'result:update', // For assigned subjects only
      'attendance:view', 'attendance:create', 'attendance:update',
      'timetable:view',
      'notification:view',
      'event:view',
      'class-assignment:view',
    ],
  },
  {
    name: 'Accountant',
    code: 'accountant',
    description: 'Financial management access',
    isSystemRole: true,
    permissions: [
      'dashboard:view',
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
      'dashboard:view',
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
      'event:view', // View school events
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
      'event:view', // View school events
    ],
  },
];

/**
 * All available permission codes in the system
 */
export const ALL_PERMISSIONS = [
  // User management
  'user:create', 'user:view', 'user:update', 'user:delete',
  // Role management
  'role:create', 'role:view', 'role:update', 'role:delete',
  // Dashboard
  'dashboard:view',
  // Student management
  'student:create', 'student:view', 'student:update', 'student:delete', 'student:approve',
  // Teacher management
  'teacher:create', 'teacher:view', 'teacher:update', 'teacher:delete', 'teacher:approve',
  // Parent management
  'parent:create', 'parent:view', 'parent:update', 'parent:delete',
  // Class management
  'class:create', 'class:view', 'class:update', 'class:delete',
  // Subject management
  'subject:create', 'subject:view', 'subject:update', 'subject:delete',
  // Exam management
  'exam:create', 'exam:view', 'exam:update', 'exam:delete',
  // Result management
  'result:create', 'result:view', 'result:update', 'result:delete', 'result:publish',
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
  // Enrollments
  'enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:delete', 'enrollment:bulk',
  // Events
  'event:create', 'event:view', 'event:update', 'event:delete',
  // Class-Teacher Assignments
  'class-assignment:create', 'class-assignment:view', 'class-assignment:update', 'class-assignment:delete',
  // School management
  'school:create', 'school:view', 'school:update', 'school:delete',
  // Subscription management
  'subscription:create', 'subscription:view', 'subscription:update', 'subscription:delete',
  // Section management
  'section:create', 'section:view', 'section:update', 'section:delete',
];
