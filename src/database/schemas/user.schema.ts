import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/roles.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop()
  avatar: string;

  @Prop({ type: String, enum: UserRole, required: true })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Types.ObjectId, ref: 'School' })
  school: Types.ObjectId; // null for super_admin

  @Prop({ type: Types.ObjectId, refPath: 'profileModel' })
  profile: Types.ObjectId; // Reference to Student/Teacher/Parent profile

  @Prop({ type:  String, enum: ['Student', 'Teacher', 'Parent'] })
  profileModel: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin: Date;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  @Prop({ type: Object })
  preferences: {
    language: string;
    notifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound indexes
UserSchema.index({ email: 1, school: 1 });
UserSchema.index({ role: 1, school: 1 });
UserSchema.index({ school: 1, isActive: 1 });