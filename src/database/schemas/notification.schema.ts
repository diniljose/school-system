import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  type: string;

  @Prop()
  priority: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  recipients: Types.ObjectId[];

  @Prop({ type: [String] })
  recipientRoles: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  recipientClasses: Types.ObjectId[];

  @Prop()
  scheduledFor: Date;

  @Prop()
  sentAt: Date;

  @Prop()
  status: string;

  @Prop({ type: [String] })
  channels: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  readBy: Types.ObjectId[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ school: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ sentAt: 1 });
