import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeeStatus } from '../../common/enums/student-status.enum';

export type FeeDocument = Fee & Document;

@Schema({ timestamps: true })
export class Fee {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ required: true })
  month: number; // 1-12

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
}

export const FeeSchema = SchemaFactory.createForClass(Fee);

FeeSchema.index({ school: 1, student: 1, month: 1, year: 1 }, { unique: true });
FeeSchema.index({ school: 1, status: 1 });
FeeSchema.index({ school: 1, dueDate: 1 });