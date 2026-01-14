export enum UserRole {
    SUPER_ADMIN = 'super_admin',      // Platform admin
    SCHOOL_ADMIN = 'school_admin',    // School owner/admin
    PRINCIPAL = 'principal',
    VICE_PRINCIPAL = 'vice_principal',
    TEACHER = 'teacher',
    CLASS_TEACHER = 'class_teacher',
    PARENT = 'parent',
    STUDENT = 'student',
    ACCOUNTANT = 'accountant',
    LIBRARIAN = 'librarian',
    RECEPTIONIST = 'receptionist',
  }
  
  export enum Permission {
    // Student Management
    CREATE_STUDENT = 'create_student',
    READ_STUDENT = 'read_student',
    UPDATE_STUDENT = 'update_student',
    DELETE_STUDENT = 'delete_student',
    
    // Fee Management
    CREATE_FEE = 'create_fee',
    READ_FEE = 'read_fee',
    UPDATE_FEE = 'update_fee',
    COLLECT_FEE = 'collect_fee',
    
    // Attendance
    MARK_ATTENDANCE = 'mark_attendance',
    VIEW_ATTENDANCE = 'view_attendance',
    
    // Results
    CREATE_RESULT = 'create_result',
    VIEW_RESULT = 'view_result',
    PUBLISH_RESULT = 'publish_result',
    
    // Reports
    VIEW_REPORTS = 'view_reports',
    EXPORT_REPORTS = 'export_reports',
    
    // Settings
    MANAGE_SETTINGS = 'manage_settings',
    MANAGE_USERS = 'manage_users',
    MANAGE_ROLES = 'manage_roles',
  }