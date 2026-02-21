import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StudentStatus } from '../../common/enums/student-status.enum';

export type StudentDocument = Student & Document;

@Schema({ timestamps: true })
export class Student {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  admissionNumber: string; // Unique per school

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  middleName: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  gender: string;

  @Prop()
  bloodGroup: string;

  @Prop()
  nationality: string;

  @Prop()
  religion: string;

  @Prop()
  category: string;

  @Prop()
  photo: string;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Prop({ type: Object })
  contact: {
    email: string;
    phone: string;
    emergencyContact: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'AcademicYear' })
  currentAcademicYear: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  currentClass: Types.ObjectId;

  @Prop({ type: String })
  currentSection: string;

  @Prop()
  rollNumber: string;

  @Prop()
  admissionDate: Date;

  @Prop({ type: String, enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Parent' }] })
  parents: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId; // Associated login

  // Academic History - tracks all class enrollments
  @Prop({ type: [Object], default: [] })
  academicHistory: {
    academicYear: Types.ObjectId;
    class: Types.ObjectId;
    section: string;
    rollNumber: string;
    result: string; // pass, fail, promoted, retained
    percentage: number;
    rank: number;
    remarks: string;
  }[];

  // Transfer History
  @Prop({ type: [Object], default: [] })
  transferHistory: {
    type: string; // in, out
    date: Date;
    fromSchool: string;
    toSchool: string;
    reason: string;
    transferCertificateNumber: string;
    remarks: string;
  }[];

  @Prop()
  previousSchool: string;

  @Prop()
  previousSchoolTC: string; // Transfer certificate number

  @Prop({ type: Object })
  healthInfo: {
    allergies: string[];
    medicalConditions: string[];
    medications: string[];
    doctorName: string;
    doctorPhone: string;
  };

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const StudentSchema = SchemaFactory.createForClass(Student);

// Compound unique index for admission number per school
StudentSchema.index({ school: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ school: 1, currentClass: 1 });
StudentSchema.index({ school: 1, status: 1 });
