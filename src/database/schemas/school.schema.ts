import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SchoolDocument = School & Document;

@Schema({ timestamps: true })
export class School {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string; // Unique school code

  @Prop({ required: true, unique: true })
  slug: string; // URL-friendly identifier

  @Prop()
  logo: string;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  country: string;

  @Prop()
  zipCode: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  website: string;

  @Prop({ type: Object })
  settings: {
    academicYearStart: number; // Month (1-12)
    academicYearEnd: number;
    gradingSystem: string;
    attendanceType: string;
    feeStructure: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    workingDays: string[];
  };

  @Prop({ type: Object })
  features: {
    attendance: boolean;
    fees: boolean;
    exams: boolean;
    library: boolean;
    transport: boolean;
    hostel: boolean;
    canteen: boolean;
    notifications: boolean;
    parentPortal: boolean;
    studentPortal: boolean;
    onlinePayment: boolean;
  };

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscription: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const SchoolSchema = SchemaFactory.createForClass(School);

// Indexes for better query performance
SchoolSchema.index({ code: 1 });
SchoolSchema.index({ slug: 1 });
SchoolSchema.index({ isActive: 1 });
