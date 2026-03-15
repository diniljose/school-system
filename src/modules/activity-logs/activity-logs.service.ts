/**
 * Activity Logs Service
 * Manages audit logging with role-based access control
 * 
 * Role Access Hierarchy:
 * - platform_admin: Can see all activities across all schools
 * - principal: Can see all activities in their school, can configure visibility for other roles
 * - vice_principal: Can see configured modules' activities
 * - Other roles: Can see their own activities and configured visible modules
 */
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
} from '../../database/schemas/audit-log.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import { QueryActivityLogDto, CreateActivityLogDto } from './dto';
import { UserRole } from '../../common/enums/roles.enum';

export interface TenantContext {
  schoolCode?: string;
  isTenantUser?: boolean;
  userId?: string;
}

export interface UserContext {
  userId: string;
  schoolId: string;
  role: UserRole;
  permissions?: string[];
}

// Resources that each role can view logs for
const ROLE_VISIBLE_RESOURCES: Record<string, string[]> = {
  [UserRole.PLATFORM_ADMIN]: ['*'], // All resources
  [UserRole.PRINCIPAL]: ['*'], // All resources in their school
  [UserRole.VICE_PRINCIPAL]: [
    'Student', 'Teacher', 'Class', 'Section', 'Subject', 'Exam', 'Result',
    'Attendance', 'Event', 'Notification', 'Timetable', 'Enrollment', 'Promotion'
  ],
  [UserRole.ACCOUNTANT]: ['Fee', 'Payment', 'FeeStructure', 'Subscription'],
  [UserRole.CLASS_TEACHER]: ['Student', 'Attendance', 'Result', 'Parent', 'Enrollment'],
  [UserRole.TEACHER]: ['Attendance', 'Result', 'Subject'],
  [UserRole.LIBRARIAN]: ['Library', 'Book', 'BookIssue'],
  [UserRole.RECEPTIONIST]: ['Student', 'Parent', 'Visitor', 'Enquiry'],
  [UserRole.PARENT]: [], // Can only see their own activities
  [UserRole.STUDENT]: [], // Can only see their own activities
};

// Actions visible to each role
const ROLE_VISIBLE_ACTIONS: Record<string, AuditAction[]> = {
  [UserRole.PLATFORM_ADMIN]: Object.values(AuditAction),
  [UserRole.PRINCIPAL]: Object.values(AuditAction),
  [UserRole.VICE_PRINCIPAL]: [
    AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE,
    AuditAction.RESULT_PUBLISH, AuditAction.PROMOTION, AuditAction.ATTENDANCE_MARK
  ],
  [UserRole.ACCOUNTANT]: [
    AuditAction.CREATE, AuditAction.UPDATE, AuditAction.FEE_PAYMENT
  ],
  [UserRole.CLASS_TEACHER]: [
    AuditAction.CREATE, AuditAction.UPDATE, AuditAction.ATTENDANCE_MARK, AuditAction.RESULT_PUBLISH
  ],
  [UserRole.TEACHER]: [AuditAction.ATTENDANCE_MARK, AuditAction.RESULT_PUBLISH],
  [UserRole.LIBRARIAN]: [AuditAction.CREATE, AuditAction.UPDATE],
  [UserRole.RECEPTIONIST]: [AuditAction.CREATE, AuditAction.UPDATE],
  [UserRole.PARENT]: [AuditAction.FEE_PAYMENT],
  [UserRole.STUDENT]: [],
};

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getAuditLogModel(
    context?: TenantContext,
  ): Promise<Model<AuditLogDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AuditLogDocument>(
        context.schoolCode,
        'AuditLog',
      );
    }
    return this.auditLogModel;
  }

  /**
   * Create a new activity log entry
   */
  async create(
    dto: CreateActivityLogDto,
    schoolId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    context?: TenantContext,
  ) {
    const model = await this.getAuditLogModel(context);

    const logEntry = new model({
      school: schoolId ? new Types.ObjectId(schoolId) : null,
      user: new Types.ObjectId(userId),
      action: dto.action,
      resource: dto.resource,
      resourceId: dto.resourceId ? new Types.ObjectId(dto.resourceId) : null,
      previousData: dto.previousData,
      newData: dto.newData,
      description: dto.description,
      ipAddress,
      userAgent,
      metadata: dto.metadata,
    });

    await logEntry.save();
    this.logger.debug(`Activity logged: ${dto.action} on ${dto.resource}`);

    return { success: true, data: logEntry };
  }

  /**
   * Get activity logs with role-based filtering
   */
  async findAll(
    query: QueryActivityLogDto,
    userContext: UserContext,
    tenantContext?: TenantContext,
  ) {
    const model = await this.getAuditLogModel(tenantContext);
    const filter = this.buildRoleBasedFilter(query, userContext, tenantContext);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email role profileImage')
        .lean(),
      model.countDocuments(filter),
    ]);

    // Group by date if requested
    let data = logs;
    if (query.groupByDate) {
      data = this.groupLogsByDate(logs);
    }

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get recent activities for dashboard (simplified view)
   */
  async getRecentActivities(
    userContext: UserContext,
    limit: number = 10,
    tenantContext?: TenantContext,
  ) {
    const model = await this.getAuditLogModel(tenantContext);
    const filter = this.buildRoleBasedFilter({}, userContext, tenantContext);

    const logs = await model
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'firstName lastName email role profileImage')
      .lean();

    // Transform to dashboard-friendly format
    const activities = logs.map((log: any) => ({
      id: log._id,
      type: this.getActivityType(log.action, log.resource),
      title: this.getActivityTitle(log.action, log.resource),
      description: log.description || this.generateDescription(log),
      timestamp: log.createdAt,
      icon: this.getActivityIcon(log.action, log.resource),
      user: log.user ? {
        id: log.user._id,
        name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email,
        avatar: log.user.profileImage,
        role: log.user.role,
      } : null,
      resource: log.resource,
      action: log.action,
      resourceId: log.resourceId,
    }));

    return {
      success: true,
      data: activities,
    };
  }

  /**
   * Get activity statistics
   */
  async getStats(
    userContext: UserContext,
    fromDate?: string,
    toDate?: string,
    tenantContext?: TenantContext,
  ) {
    const model = await this.getAuditLogModel(tenantContext);
    const baseFilter = this.buildRoleBasedFilter({}, userContext, tenantContext);

    // Add date filters
    if (fromDate || toDate) {
      baseFilter.createdAt = {};
      if (fromDate) baseFilter.createdAt.$gte = new Date(fromDate);
      if (toDate) baseFilter.createdAt.$lte = new Date(toDate);
    }

    const [
      totalCount,
      actionStats,
      resourceStats,
      hourlyStats,
      topUsers,
    ] = await Promise.all([
      // Total count
      model.countDocuments(baseFilter),
      
      // Stats by action type
      model.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Stats by resource
      model.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Hourly distribution (last 24 hours)
      model.aggregate([
        {
          $match: {
            ...baseFilter,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top active users (platform_admin and principal only)
      [UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL].includes(userContext.role)
        ? model.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userDetails',
              },
            },
            { $unwind: '$userDetails' },
            {
              $project: {
                count: 1,
                user: {
                  _id: '$userDetails._id',
                  firstName: '$userDetails.firstName',
                  lastName: '$userDetails.lastName',
                  email: '$userDetails.email',
                  role: '$userDetails.role',
                },
              },
            },
          ])
        : [],
    ]);

    return {
      success: true,
      data: {
        total: totalCount,
        byAction: actionStats.map((s: any) => ({ action: s._id, count: s.count })),
        byResource: resourceStats.map((s: any) => ({ resource: s._id, count: s.count })),
        hourlyDistribution: hourlyStats.map((s: any) => ({ hour: s._id, count: s.count })),
        topUsers: topUsers.map((s: any) => ({
          user: s.user,
          activityCount: s.count,
        })),
      },
    };
  }

  /**
   * Get available filter options based on role
   */
  async getFilterOptions(
    userContext: UserContext,
    tenantContext?: TenantContext,
  ) {
    const visibleResources = ROLE_VISIBLE_RESOURCES[userContext.role] || [];
    const visibleActions = ROLE_VISIBLE_ACTIONS[userContext.role] || [];

    // Get users who have activities (for admin/principal only)
    let users: any[] = [];
    if ([UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL].includes(userContext.role)) {
      const model = await this.getAuditLogModel(tenantContext);
      const baseFilter: any = {};
      
      if (userContext.role !== UserRole.PLATFORM_ADMIN && userContext.schoolId) {
        baseFilter.school = new Types.ObjectId(userContext.schoolId);
      }

      users = await model.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$user' } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            _id: '$userDetails._id',
            name: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] },
            email: '$userDetails.email',
            role: '$userDetails.role',
          },
        },
        { $limit: 100 },
      ]);
    }

    return {
      success: true,
      data: {
        resources: visibleResources[0] === '*' 
          ? this.getAllResources() 
          : visibleResources,
        actions: visibleActions,
        users,
        canViewAllUsers: [UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL].includes(userContext.role),
        canExport: [UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL].includes(userContext.role),
      },
    };
  }

  /**
   * Get activity log by ID
   */
  async findOne(
    id: string,
    userContext: UserContext,
    tenantContext?: TenantContext,
  ) {
    const model = await this.getAuditLogModel(tenantContext);
    
    const log = await model
      .findById(id)
      .populate('user', 'firstName lastName email role profileImage')
      .lean();

    if (!log) {
      return { success: false, message: 'Activity log not found' };
    }

    // Check if user has permission to view this log
    if (!this.canViewLog(log as any, userContext)) {
      return { success: false, message: 'Access denied' };
    }

    return { success: true, data: log };
  }

  /**
   * Build filter based on user role and query parameters
   */
  private buildRoleBasedFilter(
    query: QueryActivityLogDto,
    userContext: UserContext,
    tenantContext?: TenantContext,
  ): any {
    const filter: any = {};

    // School filter
    if (userContext.role !== UserRole.PLATFORM_ADMIN && userContext.schoolId) {
      if (!tenantContext?.isTenantUser) {
        filter.school = new Types.ObjectId(userContext.schoolId);
      }
    }

    // Role-based resource filtering
    const visibleResources = ROLE_VISIBLE_RESOURCES[userContext.role] || [];
    const visibleActions = ROLE_VISIBLE_ACTIONS[userContext.role] || [];

    if (visibleResources.length === 0) {
      // User can only see their own activities
      filter.user = new Types.ObjectId(userContext.userId);
    } else if (visibleResources[0] !== '*') {
      // User can see specific resources
      filter.$or = [
        { resource: { $in: visibleResources } },
        { user: new Types.ObjectId(userContext.userId) }, // Always include own activities
      ];
    }

    // Action filter (respect role visibility)
    if (query.action) {
      if (visibleActions.includes(query.action) || visibleResources[0] === '*') {
        filter.action = query.action;
      }
    }

    // Resource filter
    if (query.resource) {
      if (visibleResources[0] === '*' || visibleResources.includes(query.resource)) {
        filter.resource = query.resource;
      }
    }

    // User filter (only for admins)
    if (query.userId && [UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL].includes(userContext.role)) {
      filter.user = new Types.ObjectId(query.userId);
    }

    // Date filters
    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
      if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
    }

    // Search filter
    if (query.search) {
      filter.$or = [
        ...(filter.$or || []),
        { description: { $regex: query.search, $options: 'i' } },
        { resource: { $regex: query.search, $options: 'i' } },
      ];
    }

    return filter;
  }

  /**
   * Check if user can view a specific log entry
   */
  private canViewLog(log: AuditLog & { user: any }, userContext: UserContext): boolean {
    // Platform admin can see all
    if (userContext.role === UserRole.PLATFORM_ADMIN) return true;

    // Check school match
    if (log.school && log.school.toString() !== userContext.schoolId) return false;

    // Principal can see all in their school
    if (userContext.role === UserRole.PRINCIPAL) return true;

    // Check if user's own activity
    if (log.user._id?.toString() === userContext.userId) return true;

    // Check resource visibility
    const visibleResources = ROLE_VISIBLE_RESOURCES[userContext.role] || [];
    if (visibleResources[0] === '*' || visibleResources.includes(log.resource)) {
      return true;
    }

    return false;
  }

  /**
   * Group logs by date
   */
  private groupLogsByDate(logs: any[]): any[] {
    const grouped: Record<string, any[]> = {};

    logs.forEach((log) => {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({
        ...log,
        icon: this.getActivityIcon(log.action, log.resource),
        title: this.getActivityTitle(log.action, log.resource),
      });
    });

    return Object.entries(grouped).map(([date, activities]) => ({
      date,
      label: this.getDateLabel(date),
      activities,
    }));
  }

  /**
   * Get human-readable date label
   */
  private getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Get activity type for UI categorization
   */
  private getActivityType(action: AuditAction, resource: string): string {
    if ([AuditAction.LOGIN, AuditAction.LOGOUT].includes(action)) return 'auth';
    if ([AuditAction.FEE_PAYMENT].includes(action)) return 'payment';
    if ([AuditAction.ATTENDANCE_MARK].includes(action)) return 'attendance';
    if ([AuditAction.RESULT_PUBLISH].includes(action)) return 'academic';
    return `${action}_${resource.toLowerCase()}`;
  }

  /**
   * Get activity title
   */
  private getActivityTitle(action: AuditAction, resource: string): string {
    const actionTitles: Record<AuditAction, string> = {
      [AuditAction.CREATE]: `New ${resource} Created`,
      [AuditAction.UPDATE]: `${resource} Updated`,
      [AuditAction.DELETE]: `${resource} Deleted`,
      [AuditAction.LOGIN]: 'User Logged In',
      [AuditAction.LOGOUT]: 'User Logged Out',
      [AuditAction.PASSWORD_CHANGE]: 'Password Changed',
      [AuditAction.PASSWORD_RESET]: 'Password Reset',
      [AuditAction.ROLE_CHANGE]: 'Role Changed',
      [AuditAction.PERMISSION_CHANGE]: 'Permissions Updated',
      [AuditAction.FEE_PAYMENT]: 'Fee Payment Received',
      [AuditAction.ATTENDANCE_MARK]: 'Attendance Marked',
      [AuditAction.RESULT_PUBLISH]: 'Results Published',
      [AuditAction.PROMOTION]: 'Student Promotion',
      [AuditAction.TRANSFER]: 'Student Transfer',
      [AuditAction.NOTIFICATION_SEND]: 'Notification Sent',
      [AuditAction.SETTINGS_CHANGE]: 'Settings Changed',
      [AuditAction.EXPORT]: 'Data Exported',
      [AuditAction.BULK_OPERATION]: 'Bulk Operation Performed',
    };
    
    return actionTitles[action] || `${action} on ${resource}`;
  }

  /**
   * Get icon for activity
   */
  private getActivityIcon(action: AuditAction, resource: string): string {
    const actionIcons: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'add_circle',
      [AuditAction.UPDATE]: 'edit',
      [AuditAction.DELETE]: 'delete',
      [AuditAction.LOGIN]: 'login',
      [AuditAction.LOGOUT]: 'logout',
      [AuditAction.PASSWORD_CHANGE]: 'lock',
      [AuditAction.PASSWORD_RESET]: 'lock_reset',
      [AuditAction.ROLE_CHANGE]: 'admin_panel_settings',
      [AuditAction.PERMISSION_CHANGE]: 'security',
      [AuditAction.FEE_PAYMENT]: 'payments',
      [AuditAction.ATTENDANCE_MARK]: 'fact_check',
      [AuditAction.RESULT_PUBLISH]: 'grade',
      [AuditAction.PROMOTION]: 'moving',
      [AuditAction.TRANSFER]: 'swap_horiz',
      [AuditAction.NOTIFICATION_SEND]: 'notifications',
      [AuditAction.SETTINGS_CHANGE]: 'settings',
      [AuditAction.EXPORT]: 'download',
      [AuditAction.BULK_OPERATION]: 'dynamic_feed',
    };

    const resourceIcons: Record<string, string> = {
      'Student': 'school',
      'Teacher': 'person',
      'Parent': 'family_restroom',
      'Fee': 'payments',
      'Attendance': 'fact_check',
      'Class': 'class',
      'Subject': 'menu_book',
      'Exam': 'quiz',
      'Result': 'grade',
      'Event': 'event',
      'Notification': 'notifications',
    };

    return actionIcons[action] || resourceIcons[resource] || 'history';
  }

  /**
   * Generate description from log data
   */
  private generateDescription(log: any): string {
    const userName = log.user 
      ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email
      : 'Someone';

    const actionVerbs: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'created',
      [AuditAction.UPDATE]: 'updated',
      [AuditAction.DELETE]: 'deleted',
      [AuditAction.LOGIN]: 'logged in',
      [AuditAction.LOGOUT]: 'logged out',
      [AuditAction.PASSWORD_CHANGE]: 'changed password',
      [AuditAction.PASSWORD_RESET]: 'reset password',
      [AuditAction.ROLE_CHANGE]: 'changed role',
      [AuditAction.PERMISSION_CHANGE]: 'updated permissions',
      [AuditAction.FEE_PAYMENT]: 'received payment',
      [AuditAction.ATTENDANCE_MARK]: 'marked attendance',
      [AuditAction.RESULT_PUBLISH]: 'published results',
      [AuditAction.PROMOTION]: 'promoted student',
      [AuditAction.TRANSFER]: 'transferred student',
      [AuditAction.NOTIFICATION_SEND]: 'sent notification',
      [AuditAction.SETTINGS_CHANGE]: 'changed settings',
      [AuditAction.EXPORT]: 'exported data',
      [AuditAction.BULK_OPERATION]: 'performed bulk operation',
    };

    const verb = actionVerbs[log.action as AuditAction] || log.action;
    return `${userName} ${verb} ${log.resource.toLowerCase()}`;
  }

  /**
   * Get all available resources
   */
  private getAllResources(): string[] {
    return [
      'Student', 'Teacher', 'Parent', 'User', 'Class', 'Section', 'Subject',
      'Exam', 'Result', 'Attendance', 'Fee', 'Payment', 'FeeStructure',
      'Event', 'Notification', 'Timetable', 'Transport', 'AcademicYear',
      'Enrollment', 'Promotion', 'Transfer', 'Settings', 'Role', 'Permission'
    ];
  }
}
