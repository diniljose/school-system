import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeeStructureDocument = FeeStructure & Document;

/**
 * Billing cycle options for fee structures
 */
export enum BillingCycle {
  MONTHLY = 'monthly',         // Every month
  QUARTERLY = 'quarterly',     // Every 3 months (trimester)
  HALF_YEARLY = 'half_yearly', // Every 6 months
  YEARLY = 'yearly',           // Once per year
}

/**
 * Split options when billing cycle is yearly
 */
export enum SplitOption {
  NO_SPLIT = 'no_split',       // Pay full amount
  MONTHLY = 'monthly',         // Split into 12 payments
  QUARTERLY = 'quarterly',     // Split into 4 payments (trimester)
  HALF_YEARLY = 'half_yearly', // Split into 2 payments
}

/**
 * Fee component definition within a structure
 */
export interface FeeComponent {
  name: string;           // e.g., "Tuition Fee", "Lab Fee"
  amount: number;         // Amount for this component
  isOptional: boolean;    // If true, can be excluded for specific students
  description?: string;
}

/**
 * Fee Structure - Defines fee templates for a class/section in an academic year
 * This is the master template from which individual student fees are generated
 */
@Schema({ timestamps: true })
export class FeeStructure {
  @Prop({ type: Types.ObjectId, ref: 'School' })
  school: Types.ObjectId;  // Only for main DB, null for tenant DB

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop()
  section: string;  // Optional - if null, applies to entire class

  @Prop({ required: true })
  name: string;  // e.g., "Standard Fee Structure 2025-26"

  @Prop({ type: String, enum: BillingCycle, default: BillingCycle.QUARTERLY })
  billingCycle: BillingCycle;

  @Prop({ type: String, enum: SplitOption, default: SplitOption.NO_SPLIT })
  splitOption: SplitOption;  // Only applicable if billingCycle is YEARLY

  @Prop({ type: [Object], required: true })
  components: FeeComponent[];

  @Prop({ required: true })
  totalAmount: number;  // Sum of all component amounts

  @Prop({ type: [Number], default: [] })
  dueDays: number[];  // Day of month when fee is due (e.g., [10] for 10th of every billing period)

  @Prop()
  lateFeePenalty: number;  // Percentage of late fee penalty

  @Prop()
  gracePeriodDays: number;  // Days after due date before late fee applies

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const FeeStructureSchema = SchemaFactory.createForClass(FeeStructure);

// Indexes
FeeStructureSchema.index({ school: 1, academicYear: 1, class: 1, section: 1 });
FeeStructureSchema.index({ academicYear: 1, class: 1 });
