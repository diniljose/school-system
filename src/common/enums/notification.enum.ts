export enum NotificationType {
  ANNOUNCEMENT = 'announcement',
  ASSIGNMENT = 'assignment',
  EXAM = 'exam',
  FEE = 'fee',
  ATTENDANCE = 'attendance',
  RESULT = 'result',
  EVENT = 'event',
  HOLIDAY = 'holiday',
  MEETING = 'meeting',
  ALERT = 'alert',
  REMINDER = 'reminder',
  GENERAL = 'general',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RecipientType {
  ALL = 'all',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  PARENTS = 'parents',
  STAFF = 'staff',
  CLASS = 'class',
  SECTION = 'section',
  INDIVIDUAL = 'individual',
}
