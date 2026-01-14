import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true, unique: true })
  school: Types.ObjectId;

  @Prop()
  plan: string;

  @Prop()
  status: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: [String] })
  features: string[];

  @Prop({ type: Object })
  limits: {
    maxStudents: number;
    maxTeachers: number;
    maxClasses: number;
    storageGB: number;
  };

  @Prop({ type: Object })
  paymentInfo: {
    amount: number;
    currency: string;
    frequency: string;
    paymentMethod: string;
    lastPaymentDate: Date;
    nextPaymentDate: Date;
  };

  @Prop()
  trialEndsAt: Date;

  @Prop({ default: true })
  autoRenew: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ school: 1 }, { unique: true });
