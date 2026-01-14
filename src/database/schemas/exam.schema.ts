import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamDocument = Exam & Document;

@Schema({ timestamps: true })
export class Exam {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g., "First Term Exam", "Mid Term"

  @Prop()
  description: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  classes: Types.ObjectId[];

  @Prop({ type:  [Object], default: [] })
  schedule: {
    class: Types.ObjectId;
    subject: Types.ObjectId;
    date: Date;
    startTime: string;
    endTime: string;
    maxMarks: number;
    passingMarks: number;
    room: string;
  }[];

  @Prop()
  examType: string; // written, practical, oral

  @Prop({ default: false })
  resultsPublished: boolean;

  @Prop()
  resultPublishDate: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const ExamSchema = SchemaFactory.createForClass(Exam);