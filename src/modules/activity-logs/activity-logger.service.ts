/**
 * ActivityLoggerService - Production-optimized centralized logging
 * 
 * Features:
 * - Non-blocking async logging (doesn't impact API response time)
 * - Batch writing for high-throughput scenarios
 * - Automatic retry on failure
 * - Memory-efficient queue management
 * - Graceful shutdown handling
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
} from '../../database/schemas/audit-log.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface LogActivityOptions {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  schoolId: string;
  userId: string;
  schoolCode?: string;
  isTenantUser?: boolean;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface QueuedLog {
  data: LogActivityOptions;
  retryCount: number;
}

@Injectable()
export class ActivityLoggerService implements OnModuleDestroy {
  private readonly logger = new Logger(ActivityLoggerService.name);
  private readonly logQueue: QueuedLog[] = [];
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {
    this.startFlushTimer();
  }

  onModuleDestroy() {
    this.stopFlushTimer();
    // Flush remaining logs on shutdown
    this.flushLogs().catch((err) =>
      this.logger.error('Error flushing logs on shutdown', err),
    );
  }

  /**
   * Log an activity - non-blocking, queued for batch processing
   * This is the main method to call from other services
   */
  log(options: LogActivityOptions): void {
    // Don't block - add to queue and return immediately
    if (this.logQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn('Activity log queue full, dropping oldest entry');
      this.logQueue.shift();
    }

    this.logQueue.push({ data: options, retryCount: 0 });

    // If queue reaches batch size, trigger immediate flush
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flushLogs().catch((err) =>
        this.logger.error('Error in batch flush', err),
      );
    }
  }

  /**
   * Synchronous logging for critical operations (login, logout, etc.)
   * Use sparingly - prefer log() for most cases
   */
  async logSync(options: LogActivityOptions): Promise<void> {
    try {
      await this.writeLog(options);
    } catch (error) {
      this.logger.error('Failed to write sync log', error.stack);
      // Add to queue for retry
      this.logQueue.push({ data: options, retryCount: 0 });
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushLogs().catch((err) =>
        this.logger.error('Error in scheduled flush', err),
      );
    }, this.FLUSH_INTERVAL);
  }

  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, this.BATCH_SIZE);
      const failedLogs: QueuedLog[] = [];

      // Group logs by schoolCode for efficient batch writes
      const groupedLogs = this.groupBySchool(batch);

      for (const [schoolCode, logs] of Object.entries(groupedLogs)) {
        try {
          await this.writeBatch(schoolCode, logs);
        } catch (error) {
          this.logger.error(`Failed to write batch for ${schoolCode}`, error);
          // Add failed logs back to queue with retry count
          for (const log of logs) {
            if (log.retryCount < this.MAX_RETRIES) {
              failedLogs.push({ ...log, retryCount: log.retryCount + 1 });
            } else {
              this.logger.error('Max retries exceeded for log', log.data);
            }
          }
        }
      }

      // Re-add failed logs to queue
      this.logQueue.unshift(...failedLogs);
    } finally {
      this.isProcessing = false;
    }
  }

  private groupBySchool(
    logs: QueuedLog[],
  ): Record<string, QueuedLog[]> {
    return logs.reduce(
      (acc, log) => {
        const key = log.data.isTenantUser && log.data.schoolCode
          ? log.data.schoolCode
          : 'main';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(log);
        return acc;
      },
      {} as Record<string, QueuedLog[]>,
    );
  }

  private async writeBatch(
    schoolCode: string,
    logs: QueuedLog[],
  ): Promise<void> {
    const model =
      schoolCode !== 'main'
        ? await this.tenantDatabaseService.getTenantModel<AuditLogDocument>(
            schoolCode,
            'AuditLog',
          )
        : this.auditLogModel;

    const documents = logs.map((log) => this.createDocument(log.data));

    // Use insertMany for batch efficiency
    await model.insertMany(documents, { ordered: false });

    this.logger.debug(`Wrote ${logs.length} activity logs to ${schoolCode}`);
  }

  private async writeLog(options: LogActivityOptions): Promise<void> {
    this.logger.debug(`writeLog: isTenantUser=${options.isTenantUser}, schoolCode=${options.schoolCode}, userId=${options.userId}`);
    
    const model =
      options.isTenantUser && options.schoolCode
        ? await this.tenantDatabaseService.getTenantModel<AuditLogDocument>(
            options.schoolCode,
            'AuditLog',
          )
        : this.auditLogModel;

    const doc = this.createDocument(options);
    this.logger.debug(`Creating doc in ${options.schoolCode || 'main'} DB: ${JSON.stringify(doc)}`);
    
    const saved = await model.create(doc);
    this.logger.debug(`Saved audit log: ${saved._id}`);
  }

  private createDocument(options: LogActivityOptions): any {
    return {
      school: options.schoolId ? new Types.ObjectId(options.schoolId) : null,
      user: options.userId ? new Types.ObjectId(options.userId) : null,
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId
        ? new Types.ObjectId(options.resourceId)
        : null,
      description: options.description,
      previousData: options.previousData,
      newData: options.newData,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
      createdAt: new Date(),
    };
  }

  /**
   * Helper method to create log options for CRUD operations
   * Now writes synchronously for immediate visibility
   */
  crud(
    action: 'create' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    context: {
      schoolId: string;
      userId: string;
      schoolCode?: string;
      isTenantUser?: boolean;
    },
    options?: {
      resourceName?: string;
      previousData?: any;
      newData?: any;
    },
  ): void {
    const actionMap = {
      create: AuditAction.CREATE,
      update: AuditAction.UPDATE,
      delete: AuditAction.DELETE,
    };

    const descriptions = {
      create: `Created ${resource}${options?.resourceName ? `: ${options.resourceName}` : ''}`,
      update: `Updated ${resource}${options?.resourceName ? `: ${options.resourceName}` : ''}`,
      delete: `Deleted ${resource}${options?.resourceName ? `: ${options.resourceName}` : ''}`,
    };

    const logOptions: LogActivityOptions = {
      action: actionMap[action],
      resource,
      resourceId,
      description: descriptions[action],
      schoolId: context.schoolId,
      userId: context.userId,
      schoolCode: context.schoolCode,
      isTenantUser: context.isTenantUser,
      previousData: options?.previousData,
      newData: options?.newData,
    };

    // Log synchronously to ensure immediate write
    this.logger.debug(`Logging ${action} on ${resource}: ${resourceId}`);
    this.logSync(logOptions).catch(err => {
      this.logger.error(`Failed to log ${action} on ${resource}`, err);
    });
  }
}
