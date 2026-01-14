import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ParentDocument = Parent & Document;

@Schema({ timestamps:  true })
export class Parent {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  relationship: string; // father, mother, guardian

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  alternatePhone: string;

  @Prop()
  occupation: string;

  @Prop()
  workplace: string;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    country:  string;
    zipCode: string;
  };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Student' }] })
  children: Types.ObjectId[];

  @Prop({ type:  Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPrimary: boolean; // Primary contact
}

export const ParentSchema = SchemaFactory.createForClass(Parent);