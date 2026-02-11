/**
 * Audit Log Schema
 * Tracks all important actions in the system for accountability
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ROLE_CHANGE = 'role_change',
  PERMISSION_CHANGE = 'permission_change',
  FEE_PAYMENT = 'fee_payment',
  ATTENDANCE_MARK = 'attendance_mark',
  RESULT_PUBLISH = 'result_publish',
  PROMOTION = 'promotion',
  TRANSFER = 'transfer',
  NOTIFICATION_SEND = 'notification_send',
  SETTINGS_CHANGE = 'settings_change',
  EXPORT = 'export',
  BULK_OPERATION = 'bulk_operation',
}

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'School' })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: AuditAction, required: true })
  action: AuditAction;

  @Prop({ required: true })
  resource: string; // e.g., 'Student', 'Fee', 'Attendance'

  @Prop({ type: Types.ObjectId })
  resourceId: Types.ObjectId;

  @Prop({ type: Object })
  previousData: Record<string, any>;

  @Prop({ type: Object })
  newData: Record<string, any>;

  @Prop()
  description: string;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ school: 1, createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, school: 1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
// TTL index: auto-delete logs after 1 year
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
