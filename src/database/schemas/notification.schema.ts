import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  ANNOUNCEMENT = 'announcement',
  ASSIGNMENT = 'assignment',
  EXAM = 'exam',
  FEE = 'fee',
  ATTENDANCE = 'attendance',
  RESULT = 'result',
  EVENT = 'event',
  HOLIDAY = 'holiday',
  MEETING = 'meeting',
  ALERT = 'alert',
  REMINDER = 'reminder',
  GENERAL = 'general',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RecipientType {
  ALL = 'all',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  PARENTS = 'parents',
  STAFF = 'staff',
  CLASS = 'class',
  SECTION = 'section',
  INDIVIDUAL = 'individual',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

<<<<<<< HEAD
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({
    type: String,
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Prop({
    type: String,
    enum: NotificationStatus,
    default: NotificationStatus.DRAFT,
  })
  status: NotificationStatus;

  @Prop({ type: String, enum: RecipientType, required: true })
  recipientType: RecipientType;

  @Prop({ type: [{ type: Types.ObjectId, refPath: 'recipientModel' }] })
  recipients: Types.ObjectId[];

  @Prop()
  recipientModel: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  targetClasses: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  targetSections: string[];
=======
  @Prop()
  type: string;

  @Prop()
  priority: string;
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

<<<<<<< HEAD
  @Prop({ type: [Object], default: [] })
  channels: {
    type: string;
    enabled: boolean;
    sentAt: Date;
    status: string;
    error: string;
  }[];

  @Prop({ type: [Object], default: [] })
  delivery: {
    recipient: Types.ObjectId;
    recipientType: string;
    channel: string;
    sentAt: Date;
    deliveredAt: Date;
    readAt: Date;
    status: string;
    error: string;
  }[];
=======
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  recipients: Types.ObjectId[];

  @Prop({ type: [String] })
  recipientRoles: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  recipientClasses: Types.ObjectId[];
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)

  @Prop()
  scheduledFor: Date;

  @Prop()
  sentAt: Date;

  @Prop()
<<<<<<< HEAD
  expiresAt: Date;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Object })
  actionRequired: {
    type: string;
    dueDate: Date;
    link: string;
  };

  @Prop({ type: Object })
  statistics: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    lastUpdated: Date;
  };

  @Prop({ default: false })
  requiresAcknowledgement: boolean;

  @Prop({ type: [Object], default: [] })
  acknowledgements: {
    user: Types.ObjectId;
    acknowledgedAt: Date;
    remarks: string;
  }[];

  @Prop({ default: true })
  sendEmail: boolean;

  @Prop({ default: true })
  sendSMS: boolean;

  @Prop({ default: true })
  sendPush: boolean;

  @Prop({ default: true })
  sendInApp: boolean;
=======
  status: string;

  @Prop({ type: [String] })
  channels: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  readBy: Types.ObjectId[];
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

<<<<<<< HEAD
NotificationSchema.index({ school: 1, status: 1 });
NotificationSchema.index({ school: 1, type: 1 });
NotificationSchema.index({ school: 1, recipientType: 1 });
NotificationSchema.index({ school: 1, sender: 1 });
NotificationSchema.index({ recipients: 1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ 'delivery.recipient': 1, 'delivery.readAt': 1 });
=======
NotificationSchema.index({ school: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ sentAt: 1 });
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
