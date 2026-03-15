import { IsString, IsEnum, IsOptional, IsMongoId, IsObject } from 'class-validator';
import { AuditAction } from '../../../database/schemas/audit-log.schema';

export class CreateActivityLogDto {
  @IsEnum(AuditAction)
  action: AuditAction;

  @IsString()
  resource: string;

  @IsOptional()
  @IsMongoId()
  resourceId?: string;

  @IsOptional()
  @IsObject()
  previousData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  newData?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
