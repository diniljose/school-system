import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TimetableDocument = Timetable & Document;

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

  @Prop({ required: true })
  effectiveFrom: Date;

  @Prop()
  effectiveTo: Date;

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

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  modifiedBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const TimetableSchema = SchemaFactory.createForClass(Timetable);

TimetableSchema.index({ school: 1, academicYear: 1, class: 1, section: 1 }, { unique: true });
