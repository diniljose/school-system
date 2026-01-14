import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransferDocument = Transfer & Document;

@Schema({ timestamps: true })
export class Transfer {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ required: true })
  transferType: string; // 'in' or 'out'

  @Prop({ type: Types.ObjectId, ref: 'School' })
  fromSchool: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'School' })
  toSchool: Types.ObjectId;

  @Prop()
  externalSchoolName: string; // For schools not in system

  @Prop()
  externalSchoolAddress: string;

  @Prop({ required: true })
  transferDate: Date;

  @Prop()
  effectiveDate: Date;

  @Prop()
  reason: string;

  @Prop()
  transferCertificateNumber: string;

  @Prop()
  transferCertificateDate: Date;

  @Prop()
  lastClassAttended: string;

  @Prop()
  lastAttendanceDate: Date;

  @Prop()
  conductCertificate: string;

  @Prop({ type: Object })
  documents: {
    transferCertificate: string;
    marksheet: string;
    characterCertificate: string;
    otherDocuments: string[];
  };

  @Prop()
  remarks: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy: Types.ObjectId;

  @Prop()
  status: string; // pending, approved, completed, cancelled
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);
