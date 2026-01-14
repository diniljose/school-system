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

<<<<<<< HEAD
  @Prop()
  name: string;

  @Prop()
  description: string;

=======
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  @Prop({ required: true })
  effectiveFrom: Date;

  @Prop()
  effectiveTo: Date;

<<<<<<< HEAD
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

=======
  @Prop({ type: Object })
  schedule: {
    monday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
    tuesday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
    wednesday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
    thursday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
    friday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
    saturday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
    sunday: {
      period: number;
      startTime: string;
      endTime: string;
      subject: Types.ObjectId;
      teacher: Types.ObjectId;
      room: string;
    }[];
  };

>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
<<<<<<< HEAD
  lastModifiedBy: Types.ObjectId;

  @Prop({ type: Object })
  metadata: Record<string, any>;
=======
  modifiedBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
}

export const TimetableSchema = SchemaFactory.createForClass(Timetable);

<<<<<<< HEAD
TimetableSchema.index({ school: 1, class: 1, section: 1, academicYear: 1 });
TimetableSchema.index({ school: 1, academicYear: 1, isActive: 1 });
TimetableSchema.index({ school: 1, 'schedule.teacher': 1 });
TimetableSchema.index({ school: 1, 'schedule.subject': 1 });
=======
TimetableSchema.index({ school: 1, academicYear: 1, class: 1, section: 1 }, { unique: true });
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
