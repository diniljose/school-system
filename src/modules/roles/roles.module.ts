/**
 * Roles Module
 * Provides dynamic role management per school
 * Each school can customize roles and permissions
 * Uses TenantDatabaseService for multi-tenant isolation
 */
import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, TenantDatabaseService],
  exports: [RolesService],
})
export class RolesModule {}
