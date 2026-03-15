/**
 * AuditLog Decorator
 * Mark endpoints for automatic audit logging
 * 
 * Usage:
 * @AuditLog({ resource: 'Student', action: AuditAction.CREATE })
 * @Post()
 * createStudent(...) { ... }
 */
import { SetMetadata } from '@nestjs/common';
import { AuditLogOptions, AUDIT_LOG_KEY } from '../interceptors/audit-log.interceptor';

export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);
