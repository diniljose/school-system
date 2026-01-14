import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResultDocument = Result & Document;

@Schema({ timestamps: true })
export class Result {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Exam', required: true })
  exam: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ type: [Object], required: true })
  subjects: {
    subject: Types.ObjectId;
    maxMarks: number;
    obtainedMarks: number;
    grade: string;
    remarks: string;
    isPassed: boolean;
  }[];

  @Prop()
  totalMarks: number;

  @Prop()
  obtainedMarks: number;

  @Prop()
  percentage: number;

  @Prop()
  grade: string;

  @Prop()
  rank: number;

  @Prop()
  remarks: string;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  enteredBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy: Types.ObjectId;
}

export const ResultSchema = SchemaFactory.createForClass(Result);

ResultSchema.index({ school: 1, exam: 1, student: 1 }, { unique: true });
