import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeeStatus } from '../../common/enums/student-status.enum';
import { BillingCycle } from './fee-structure.schema';

export type FeeDocument = Fee & Document;

/**
 * Period types for fee billing
 */
export enum FeePeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',     // Q1, Q2, Q3, Q4
  HALF_YEARLY = 'half_yearly', // H1, H2
  YEARLY = 'yearly',
}

@Schema({ timestamps: true })
export class Fee {
  @Prop({ type: Types.ObjectId, ref: 'School' })
  school: Types.ObjectId;  // Only for main DB

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  class: Types.ObjectId;

  @Prop()
  section: string;

  @Prop({ type: Types.ObjectId, ref: 'FeeStructure' })
  feeStructure: Types.ObjectId;  // Reference to the template used

  @Prop({ type: String, enum: FeePeriodType, default: FeePeriodType.MONTHLY })
  periodType: FeePeriodType;

  @Prop({ required: true })
  periodNumber: number;  // 1-12 for monthly, 1-4 for quarterly, 1-2 for half-yearly, 1 for yearly

  @Prop()
  periodLabel: string;  // Human readable: "January 2025", "Q1 2025", "H1 2025", "2025-26"

  @Prop()
  month: number; // 1-12 (kept for backward compatibility)

  @Prop({ required: true })
  year: number;

  @Prop({ type: [Object], required: true })
  feeComponents: {
    name: string;
    amount: number;
    dueDate: Date;
    discount: number;
    discountReason: string;
    fine: number;
    fineReason: string;
  }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  fine: number;

  @Prop({ required: true })
  netAmount: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop()
  balanceAmount: number;

  @Prop({ type: String, enum: FeeStatus, default: FeeStatus.PENDING })
  status: FeeStatus;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ type: [Object], default: [] })
  payments: {
    amount: number;
    date: Date;
    method: string; // cash, card, online, cheque
    transactionId: string;
    receiptNumber: string;
    receivedBy: Types.ObjectId;
    remarks: string;
  }[];

  @Prop()
  remarks: string;

  @Prop({ default: false })
  isCustom: boolean;  // True if this is a custom fee for individual student (not from template)

  @Prop({ type: Types.ObjectId, ref: 'User' })
  markedPaidBy: Types.ObjectId;  // Who marked this as paid

  @Prop()
  markedPaidAt: Date;
}

export const FeeSchema = SchemaFactory.createForClass(Fee);

// Updated indexes for new period-based system
FeeSchema.index({ student: 1, periodType: 1, periodNumber: 1, year: 1 }, { unique: true });
FeeSchema.index({ school: 1, student: 1, month: 1, year: 1 });  // Backward compatible
FeeSchema.index({ school: 1, status: 1 });
FeeSchema.index({ school: 1, dueDate: 1 });
FeeSchema.index({ class: 1, section: 1, academicYear: 1 });
FeeSchema.index({ feeStructure: 1 });
