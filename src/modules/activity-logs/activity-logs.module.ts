import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLoggerService } from './activity-logger.service';
import { AuditLog, AuditLogSchema } from '../../database/schemas/audit-log.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService, ActivityLoggerService, TenantDatabaseService],
  exports: [ActivityLogsService, ActivityLoggerService],
})
export class ActivityLogsModule {}
