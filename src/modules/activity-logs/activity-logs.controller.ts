/**
 * Activity Logs Controller
 * Provides endpoints for activity log management with role-based access
 */
import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActivityLogsService, UserContext } from './activity-logs.service';
import { ActivityLoggerService } from './activity-logger.service';
import { QueryActivityLogDto, CreateActivityLogDto, ActivityLogStatsDto } from './dto';
import { UserRole } from '../../common/enums/roles.enum';
import { AuditAction } from '../../database/schemas/audit-log.schema';

interface RequestWithUser {
  user: {
    sub: string;
    id: string;
    email: string;
    role: UserRole;
    school?: string;
    schoolId?: string;
    schoolCode?: string;
    isTenantUser?: boolean;
    permissions?: string[];
  };
  ip?: string;
  headers: {
    'user-agent'?: string;
  };
}

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  private readonly logger = new Logger(ActivityLogsController.name);
  
  constructor(
    private readonly activityLogsService: ActivityLogsService,
    private readonly activityLoggerService: ActivityLoggerService,
  ) {}

  /**
   * DEBUG: Test endpoint to verify audit logging works
   * Creates a test entry and returns the result
   */
  @Get('debug-test')
  async debugTest(@Req() req: RequestWithUser) {
    this.logger.debug('Debug test endpoint called');
    this.logger.debug(`User: ${JSON.stringify(req.user)}`);
    
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };
    
    this.logger.debug(`Tenant context: ${JSON.stringify(tenantContext)}`);
    
    // Try creating a test log entry
    try {
      const result = await this.activityLogsService.create(
        {
          action: AuditAction.CREATE,
          resource: 'DebugTest',
          description: `Debug test at ${new Date().toISOString()}`,
        },
        req.user.school || req.user.schoolId || '',
        req.user.sub || req.user.id,
        req.ip,
        req.headers['user-agent'],
        tenantContext,
      );
      
      this.logger.debug(`Test log created: ${JSON.stringify(result)}`);
      
      return {
        success: true,
        message: 'Debug test log created',
        user: {
          sub: req.user.sub,
          school: req.user.school,
          schoolCode: req.user.schoolCode,
          isTenantUser: req.user.isTenantUser,
        },
        result,
      };
    } catch (error) {
      this.logger.error(`Debug test failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        user: req.user,
      };
    }
  }

  /**
   * Get activity logs with filtering and pagination
   * Access: All authenticated users (filtered by role)
   */
  @Get()
  async findAll(
    @Query() query: QueryActivityLogDto,
    @Req() req: RequestWithUser,
  ) {
    const userContext = this.buildUserContext(req);
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };

    return this.activityLogsService.findAll(query, userContext, tenantContext);
  }

  /**
   * Get recent activities for dashboard widget
   * Access: All authenticated users (filtered by role)
   */
  @Get('recent')
  async getRecentActivities(
    @Query('limit') limit: number = 10,
    @Req() req: RequestWithUser,
  ) {
    const userContext = this.buildUserContext(req);
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };

    return this.activityLogsService.getRecentActivities(userContext, limit, tenantContext);
  }

  /**
   * Get activity statistics
   * Access: All authenticated users (stats filtered by role)
   */
  @Get('stats')
  async getStats(
    @Query() query: ActivityLogStatsDto,
    @Req() req: RequestWithUser,
  ) {
    const userContext = this.buildUserContext(req);
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };

    return this.activityLogsService.getStats(
      userContext,
      query.fromDate,
      query.toDate,
      tenantContext,
    );
  }

  /**
   * Get available filter options based on user's role
   * Access: All authenticated users
   */
  @Get('filter-options')
  async getFilterOptions(@Req() req: RequestWithUser) {
    const userContext = this.buildUserContext(req);
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };

    return this.activityLogsService.getFilterOptions(userContext, tenantContext);
  }

  /**
   * Get single activity log detail
   * Access: All authenticated users (if they have permission to view)
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const userContext = this.buildUserContext(req);
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };

    return this.activityLogsService.findOne(id, userContext, tenantContext);
  }

  /**
   * Manually create an activity log entry
   * Access: Used internally by services
   */
  @Post()
  async create(
    @Body() dto: CreateActivityLogDto,
    @Req() req: RequestWithUser,
  ) {
    const tenantContext = {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    };

    return this.activityLogsService.create(
      dto,
      req.user.school || req.user.schoolId || '',
      req.user.sub || req.user.id,
      req.ip,
      req.headers['user-agent'],
      tenantContext,
    );
  }

  /**
   * Build user context from request
   */
  private buildUserContext(req: RequestWithUser): UserContext {
    return {
      userId: req.user.sub || req.user.id,
      schoolId: req.user.school || req.user.schoolId || '',
      role: req.user.role,
      permissions: req.user.permissions,
    };
  }
}
