import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TimetableDocument = Timetable & Document;

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum PeriodType {
  LECTURE = 'lecture',
  LAB = 'lab',
  BREAK = 'break',
  LUNCH = 'lunch',
  ASSEMBLY = 'assembly',
  SPORTS = 'sports',
  LIBRARY = 'library',
  ACTIVITY = 'activity',
}

@Schema({ timestamps: true })
export class Timetable {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ required: true })
  section: string;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  effectiveFrom: Date;

  @Prop()
  effectiveTo: Date;

  @Prop({ type: [Object], required: true })
  schedule: {
    day: DayOfWeek;
    periodNumber: number;
    periodType: PeriodType;
    subject: Types.ObjectId;
    teacher: Types.ObjectId;
    startTime: string;
    endTime: string;
    room: string;
    duration: number;
    notes: string;
  }[];

  @Prop({ type: [Object], default: [] })
  breaks: {
    name: string;
    startTime: string;
    endTime: string;
    duration: number;
    days: DayOfWeek[];
  }[];

  @Prop({ type: Object })
  timings: {
    schoolStartTime: string;
    schoolEndTime: string;
    periodDuration: number;
    breakDuration: number;
    lunchDuration: number;
  };

  @Prop({ type: [String], default: [] })
  workingDays: DayOfWeek[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastModifiedBy: Types.ObjectId;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TimetableSchema = SchemaFactory.createForClass(Timetable);

TimetableSchema.index({ school: 1, class: 1, section: 1, academicYear: 1 });
TimetableSchema.index({ school: 1, academicYear: 1, isActive: 1 });
TimetableSchema.index({ school: 1, 'schedule.teacher': 1 });
TimetableSchema.index({ school: 1, 'schedule.subject': 1 });
