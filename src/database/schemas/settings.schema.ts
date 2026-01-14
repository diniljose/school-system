import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ timestamps: true })
export class Settings {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true, unique: true })
  school: Types.ObjectId;

  @Prop({ type: Object })
  academicSettings: {
    sessionStartMonth: number;
    sessionEndMonth: number;
    workingDays: string[];
    periodsPerDay: number;
    periodDuration: number;
  };

  @Prop({ type: [Object], default: [] })
  gradingSystem: {
    grade: string;
    minPercentage: number;
    maxPercentage: number;
    gpa: number;
    description: string;
  }[];

  @Prop({ type: Object })
  attendanceSettings: {
    minimumRequired: number;
    absentDaysBeforeAlert: number;
    trackSubjectWise: boolean;
  };

  @Prop({ type: [Object], default: [] })
  feeTemplates: {
    name: string;
    amount: number;
    frequency: string;
    category: string;
    isActive: boolean;
  }[];

  @Prop({ type: Object })
  notificationSettings: {
    enableEmail: boolean;
    enableSMS: boolean;
    enablePush: boolean;
  };

  @Prop({ type: Object })
  examSettings: {
    passPercentage: number;
    gracePeriod: number;
  };
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);

SettingsSchema.index({ school: 1 }, { unique: true });
