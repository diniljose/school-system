import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectDocument = Subject & Document;

export enum SubjectType {
  CORE = 'core',
  ELECTIVE = 'elective',
  LANGUAGE = 'language',
  PRACTICAL = 'practical',
  THEORY = 'theory',
  LAB = 'lab',
  ACTIVITY = 'activity',
  SPORTS = 'sports',
}

@Schema({ timestamps: true })
export class Subject {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop()
  description: string;

<<<<<<< HEAD
  @Prop({ type: String, enum: SubjectType, required: true })
  type: SubjectType;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  classes: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Teacher' }] })
  teachers: Types.ObjectId[];

  @Prop({ default: 0 })
  credits: number;

  @Prop({ default: 0 })
  passingMarks: number;

  @Prop({ default: 100 })
  maxMarks: number;

  @Prop({ default: 0 })
  theoryMarks: number;

  @Prop({ default: 0 })
  practicalMarks: number;

  @Prop({ default: 0 })
  internalMarks: number;

  @Prop({ default: 0 })
  externalMarks: number;

  @Prop({ type: Object })
  gradingScheme: {
    A: { min: number; max: number; gpa: number };
    B: { min: number; max: number; gpa: number };
    C: { min: number; max: number; gpa: number };
    D: { min: number; max: number; gpa: number };
    F: { min: number; max: number; gpa: number };
  };

  @Prop()
  syllabus: string;

  @Prop({ type: [String], default: [] })
  resources: string[];

  @Prop({ default: 0 })
  hoursPerWeek: number;

  @Prop({ default: true })
  isMandatory: boolean;

  @Prop({ default: true })
  hasAttendance: boolean;

  @Prop({ default: true })
  hasExam: boolean;

  @Prop({ default: false })
  hasLab: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
=======
  @Prop()
  type: string;

  @Prop()
  department: string;

  @Prop()
  credits: number;

  @Prop({ default: true })
  isActive: boolean;
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);

SubjectSchema.index({ school: 1, code: 1 }, { unique: true });
<<<<<<< HEAD
SubjectSchema.index({ school: 1, name: 1 });
SubjectSchema.index({ school: 1, type: 1 });
SubjectSchema.index({ school: 1, isActive: 1 });
=======
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
