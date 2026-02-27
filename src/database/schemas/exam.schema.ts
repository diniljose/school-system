import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamDocument = Exam & Document;

// Schema for individual exam schedule items (per class/section/subject)
@Schema({ _id: true })
export class ExamScheduleItem {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ type: String }) // Denormalized class name for display
  className?: string;

  @Prop({ type: String }) // Optional - if null, applies to all sections of the class
  section?: string;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subject: Types.ObjectId;

  @Prop({ type: String }) // Denormalized subject name for display
  subjectName?: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string; // HH:MM format

  @Prop({ required: true })
  endTime: string; // HH:MM format

  @Prop({ required: true, default: 100 })
  maxMarks: number;

  @Prop({ required: true, default: 40 })
  passingMarks: number;

  @Prop()
  room?: string;

  @Prop()
  instructions?: string;

  @Prop({ default: 'scheduled', enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'] })
  status: string;

  @Prop()
  supervisor?: string; // Teacher ID or name who supervises
}

export const ExamScheduleItemSchema = SchemaFactory.createForClass(ExamScheduleItem);

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

  // Sections - if empty, exam applies to all sections of assigned classes
  @Prop({ type: [String], default: [] })
  sections: string[];

  // Detailed schedule - customizable per class/section/subject/day
  @Prop({ type: [ExamScheduleItemSchema], default: [] })
  schedule: ExamScheduleItem[];

  @Prop()
  examType: string; // unit_test, midterm, final, quarterly, half_yearly, monthly, weekly, practical, oral, project

  @Prop({ default: 'scheduled', enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'] })
  status: string;

  @Prop({ default: false })
  resultsPublished: boolean;

  @Prop()
  resultPublishDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  // Study leave days - dates where no exam is scheduled but it's part of exam period
  @Prop({ type: [Date], default: [] })
  studyLeaveDays: Date[];
}

export const ExamSchema = SchemaFactory.createForClass(Exam);

// Indexes for efficient queries
ExamSchema.index({ school: 1, academicYear: 1 });
ExamSchema.index({ school: 1, startDate: 1 });
ExamSchema.index({ school: 1, classes: 1 });
ExamSchema.index({ 'schedule.class': 1, 'schedule.section': 1, 'schedule.date': 1 });
