import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherDocument = Teacher & Document;

@Schema({ _id: false })
class SubjectAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subject: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  class: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  sections: string[];

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear' })
  academicYear?: Types.ObjectId;

  @Prop()
  assignedDate?: Date;

  @Prop()
  startDate?: Date;
}

const SubjectAssignmentSchema = SchemaFactory.createForClass(SubjectAssignment);

@Schema({ timestamps: true })
export class Teacher {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  employeeId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  phone: string;

  @Prop()
  photo: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  gender: string;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Prop()
  joiningDate: Date;

  @Prop()
  designation: string;

  @Prop({ type: String })
  roleCode: string; // Custom role code (e.g., 'senior_teacher', 'subject_teacher', 'hod')

  @Prop()
  department: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }] })
  subjects: Types.ObjectId[]; // Subjects they can teach

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Class' }] })
  assignedClasses: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  classTeacherOf: Types.ObjectId; // If class teacher

  @Prop({ type: String })
  classTeacherSection: string; // Section they are class teacher of (e.g., 'A', 'B')

  @Prop({ type: [SubjectAssignmentSchema], default: [] })
  subjectAssignments: SubjectAssignment[];

  @Prop({ type: [Object], default: [] })
  qualifications: {
    degree: string;
    institution: string;
    year: number;
    grade: string;
  }[];

  @Prop({ type: [Object], default: [] })
  experience: {
    institution: string;
    designation: string;
    fromDate: Date;
    toDate: Date;
    description: string;
  }[];

  @Prop({ type: Object })
  salary: {
    basic: number;
    allowances: number;
    deductions: number;
    bankAccount: string;
    bankName: string;
    ifscCode: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ 
    type: String, 
    enum: ['pending_approval', 'active', 'rejected', 'inactive'],
    default: 'active' 
  })
  status: string;

  @Prop({ type: Object })
  metadata: {
    pendingApproval?: boolean;
    registrationDate?: Date;
    passwordHash?: string;
    registrationMessage?: string;
    rejectedAt?: Date;
    rejectedBy?: string;
    rejectionReason?: string;
  };
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);

TeacherSchema.index({ school: 1, employeeId: 1 }, { unique: true });
