/**
 * Class Teacher Assignment Schema
 * Links teachers to classes they can manage
 * Stored in each tenant database for school-specific assignments
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassTeacherAssignmentDocument = ClassTeacherAssignment & Document;

@Schema({
  timestamps: true,
  collection: 'class_teacher_assignments',
})
export class ClassTeacherAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacher: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear', required: true })
  academicYear: Types.ObjectId;

  @Prop({ default: true })
  isClassTeacher: boolean; // true = class teacher with full admin rights for this class

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy?: Types.ObjectId;

  @Prop()
  assignedAt?: Date;

  @Prop()
  notes?: string;
}

export const ClassTeacherAssignmentSchema = SchemaFactory.createForClass(ClassTeacherAssignment);

// Unique constraint: A teacher can only have one assignment per class per academic year
ClassTeacherAssignmentSchema.index(
  { teacher: 1, class: 1, academicYear: 1 },
  { unique: true },
);

// Index for quick lookups
ClassTeacherAssignmentSchema.index({ teacher: 1, isActive: 1 });
ClassTeacherAssignmentSchema.index({ class: 1, isClassTeacher: 1, isActive: 1 });
