import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  WITHDRAWN = 'withdrawn',
  TRANSFERRED = 'transferred',
  PROMOTED = 'promoted',
  PASSED = 'passed',
  FAILED = 'failed',
  RETAINED = 'retained',
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ default: '' })
  section: string;

  @Prop()
  rollNumber: string;

  @Prop({
    type: String,
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Prop()
  enrollmentDate: Date;

  @Prop()
  withdrawalDate: Date;

  @Prop()
  withdrawalReason: string;

  @Prop()
  remarks: string;

  @Prop({ type: String, enum: ['pass', 'fail', 'promoted', 'retained', 'pending'] })
  result: string;

  @Prop()
  percentage: number;

  @Prop()
  rank: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  enrolledBy: Types.ObjectId;

  @Prop({ type: Object })
  previousEnrollment: {
    academicYear: Types.ObjectId;
    class: Types.ObjectId;
    section: string;
    rollNumber: string;
  };
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

// Unique: one student can only have one active enrollment per academic year
EnrollmentSchema.index(
  { student: 1, academicYear: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  },
);

EnrollmentSchema.index({ school: 1, academicYear: 1, class: 1, section: 1 });
EnrollmentSchema.index({ student: 1, academicYear: 1 });
EnrollmentSchema.index({ school: 1, status: 1 });
