import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = SchoolEvent & Document;

export enum EventType {
  ACADEMIC = 'academic',
  CULTURAL = 'cultural',
  SPORTS = 'sports',
  HOLIDAY = 'holiday',
  EXAM = 'exam',
  MEETING = 'meeting',
  CELEBRATION = 'celebration',
  OTHER = 'other',
}

export enum EventStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EventVisibility {
  ALL = 'all',
  TEACHERS = 'teachers',
  STUDENTS = 'students',
  PARENTS = 'parents',
  STAFF = 'staff',
}

@Schema({ timestamps: true })
export class SchoolEvent {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: String, enum: EventType, default: EventType.OTHER })
  type: EventType;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  startTime: string;

  @Prop()
  endTime: string;

  @Prop()
  venue: string;

  @Prop()
  organizer: string;

  @Prop({
    type: String,
    enum: EventStatus,
    default: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @Prop({
    type: [String],
    enum: EventVisibility,
    default: [EventVisibility.ALL],
  })
  visibility: EventVisibility[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  targetClasses: Types.ObjectId[];

  @Prop({ default: false })
  isHoliday: boolean;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop()
  recurringPattern: string; // e.g., 'weekly', 'monthly', 'yearly'

  @Prop()
  color: string; // For calendar display

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear' })
  academicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const EventSchema = SchemaFactory.createForClass(SchoolEvent);

EventSchema.index({ school: 1, startDate: 1 });
EventSchema.index({ school: 1, type: 1 });
EventSchema.index({ school: 1, status: 1 });
EventSchema.index({ school: 1, academicYear: 1 });
