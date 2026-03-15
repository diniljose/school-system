/**
 * Audit Log Interceptor
 * Automatically logs CRUD operations to the audit log
 * Use with @AuditLog() decorator to specify resource and action
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ActivityLogsService } from '../../modules/activity-logs/activity-logs.service';
import { AuditAction } from '../../database/schemas/audit-log.schema';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  resource: string;
  action: AuditAction;
  description?: string;
  getResourceId?: (data: any) => string;
  getDescription?: (data: any, req: any) => string;
  getPreviousData?: (req: any) => any;
  getNewData?: (data: any) => any;
  skipLogging?: (data: any, req: any) => boolean;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private reflector: Reflector,
    private activityLogsService: ActivityLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    // Store previous data if available (for updates)
    const previousData = auditOptions.getPreviousData?.(request);

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // Check if we should skip logging
            if (auditOptions.skipLogging?.(response, request)) {
              return;
            }

            const responseData = response?.data;

            // Extract resource ID
            const resourceId = auditOptions.getResourceId
              ? auditOptions.getResourceId(responseData)
              : responseData?._id?.toString() || responseData?.id?.toString();

            // Generate description
            const description = auditOptions.getDescription
              ? auditOptions.getDescription(responseData, request)
              : auditOptions.description || `${auditOptions.action} ${auditOptions.resource}`;

            // Get new data
            const newData = auditOptions.getNewData
              ? auditOptions.getNewData(responseData)
              : this.extractRelevantData(responseData);

            await this.activityLogsService.create(
              {
                action: auditOptions.action,
                resource: auditOptions.resource,
                resourceId,
                previousData,
                newData,
                description,
                metadata: {
                  endpoint: request.url,
                  method: request.method,
                },
              },
              user?.schoolId || '',
              user?.userId || user?.id,
              ip,
              userAgent,
              {
                schoolCode: user?.schoolCode,
                isTenantUser: user?.isTenantUser,
              },
            );
          } catch (error) {
            // Don't let audit logging errors break the main request
            this.logger.error(`Failed to create audit log: ${error.message}`);
          }
        },
      }),
    );
  }

  private extractRelevantData(data: any): any {
    if (!data) return null;
    
    // Remove sensitive fields
    const { password, passwordHash, token, refreshToken, ...safeData } = data;
    return safeData;
  }
}
