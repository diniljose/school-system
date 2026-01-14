export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  GRADUATED = 'graduated',
  TRANSFERRED_OUT = 'transferred_out',
  TRANSFERRED_IN = 'transferred_in',
  DROPPED = 'dropped',
  SUSPENDED = 'suspended',
}

export enum PromotionStatus {
  PROMOTED = 'promoted',
  RETAINED = 'retained',
  PENDING = 'pending',
}

export enum FeeStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WAIVED = 'waived',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  EXCUSED = 'excused',
}