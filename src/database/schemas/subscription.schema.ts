import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionPlan {
  STARTER = 'starter',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionPlan, required: true })
  plan: SubscriptionPlan;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  trialEndsAt: Date;

  @Prop({ type: Object })
  limits: {
    maxStudents: number;
    maxTeachers: number;
    maxClasses: number;
    storageGB: number;
    smsCredits: number;
    emailCredits: number;
  };

  @Prop({ type: [String], default: [] })
  enabledModules: string[];

  @Prop({ type: Object })
  billing: {
    amount: number;
    currency: string;
    billingCycle: string;
    nextBillingDate: Date;
    paymentMethod: string;
    lastPaymentDate: Date;
    lastPaymentAmount: number;
  };

  @Prop({ type: [Object], default: [] })
  paymentHistory: {
    amount: number;
    currency: string;
    date: Date;
    transactionId: string;
    status: string;
    method: string;
    invoiceNumber: string;
    receiptUrl: string;
    remarks: string;
  }[];

  @Prop({ default: false })
  autoRenew: boolean;

  @Prop()
  cancelledAt: Date;

  @Prop()
  cancellationReason: string;

  @Prop({ type: Object })
  usage: {
    studentsCount: number;
    teachersCount: number;
    classesCount: number;
    storageUsedGB: number;
    smsUsed: number;
    emailUsed: number;
    lastUpdated: Date;
  };

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ school: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ plan: 1 });
