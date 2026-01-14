import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AcademicYearDocument = AcademicYear & Document;

@Schema({ timestamps: true })
export class AcademicYear {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g., "2024-2025"

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: false })
  isCurrent: boolean;

  @Prop({ type: [Object], default: [] })
  terms: {
    name: string;
    startDate: Date;
    endDate: Date;
    examStartDate: Date;
    examEndDate: Date;
  }[];

  @Prop({ type: [Object], default: [] })
  holidays: {
    name: string;
    date: Date;
    description: string;
  }[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AcademicYearSchema = SchemaFactory.createForClass(AcademicYear);

AcademicYearSchema.index({ school: 1, name: 1 }, { unique: true });
