import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AttendanceStatus } from '../../common/enums/student-status.enum';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'School' })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ required: true })
  section: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: [Object], required: true })
  records: {
    student: Types.ObjectId;
    status: AttendanceStatus;
    inTime: string;
    outTime: string;
    remarks: string;
  }[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  markedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject' })
  subject: Types.ObjectId; // For subject-wise attendance

  @Prop()
  period: number; // Period number if period-wise
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Create two unique indexes - one for multi-tenant (with school), one for single-tenant (without school)
// This allows both deployment modes to work correctly
AttendanceSchema.index(
  { school: 1, class: 1, section: 1, date: 1, subject: 1 },
  { unique: true, sparse: true }, // sparse: true allows null values
);
AttendanceSchema.index(
  { class: 1, section: 1, date: 1, subject: 1 },
  { unique: true, sparse: true },
);
