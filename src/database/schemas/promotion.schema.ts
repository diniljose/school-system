import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PromotionStatus } from '../../common/enums/student-status.enum';

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  fromAcademicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  toAcademicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  fromClass: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  toClass: Types.ObjectId;

  @Prop({ required: true })
  fromSection: string;

  @Prop({ required: true })
  toSection: string;

  @Prop({
    type: String,
    enum: PromotionStatus,
    default: PromotionStatus.PENDING,
  })
  status: PromotionStatus;

  @Prop()
  previousPercentage: number;

  @Prop()
  previousAttendance: number;

  @Prop()
  remarks: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  promotedBy: Types.ObjectId;

  @Prop()
  promotedAt: Date;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
