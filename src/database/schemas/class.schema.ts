import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g., "Grade 1", "Class 10"

  @Prop({ required: true })
  grade: number; // Numeric grade level for sorting/promotion

  @Prop()
  description: string;

  @Prop({ type:  [Object], default: [] })
  sections: {
    name: string; // A, B, C
    capacity: number;
    classTeacher: Types.ObjectId;
  }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }] })
  subjects: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  nextClass: Types.ObjectId; // For automatic promotion

  @Prop({ type:  Object })
  promotionCriteria: {
    minimumPercentage: number;
    minimumAttendance: number;
    mandatorySubjects: Types.ObjectId[];
  };

  @Prop({ type: Object })
  feeStructure: {
    tuitionFee: number;
    admissionFee: number;
    examFee: number;
    libraryFee: number;
    labFee: number;
    sportsFee: number;
    otherFees: { name: string; amount: number }[];
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const ClassSchema = SchemaFactory.createForClass(Class);

ClassSchema.index({ school: 1, name: 1 }, { unique: true });
ClassSchema.index({ school: 1, grade: 1 });