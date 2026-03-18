/**
 * Database Module
 * Provides MongoDB connection for the master/platform database
 * and the TenantDatabaseService for per-school database connections
 */
import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MONGODB_URI } from '../../constants';
import { TenantDatabaseService } from '../tenant-database.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: MONGODB_URI,
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    }),
  ],
  providers: [TenantDatabaseService],
  exports: [TenantDatabaseService],
})
export class DatabaseModule {}
