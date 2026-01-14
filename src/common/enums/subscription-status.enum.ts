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

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus. TRIAL })
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
    billingCycle: string; // monthly, yearly
    nextBillingDate: Date;
    paymentMethod: string;
  };

  @Prop({ type:  [Object], default: [] })
  paymentHistory: {
    amount: number;
    date: Date;
    transactionId: string;
    status: string;
    method: string;
  }[];

  @Prop({ default: false })
  autoRenew: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);