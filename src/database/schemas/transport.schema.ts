/**
 * Transport Schema
 * School bus and transport management
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransportDocument = Transport & Document;

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

@Schema({ timestamps: true })
export class Transport {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  school: Types.ObjectId;

  // Vehicle Information
  @Prop({ required: true })
  vehicleNumber: string;

  @Prop({ required: true })
  vehicleType: string; // bus, van, minibus

  @Prop()
  make: string;

  @Prop()
  model: string;

  @Prop()
  year: number;

  @Prop({ required: true })
  capacity: number;

  @Prop({ type: String, enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  // Route Information
  @Prop({ required: true })
  routeName: string;

  @Prop()
  routeNumber: string;

  @Prop({ type: [Object], default: [] })
  stops: {
    name: string;
    pickupTime: string;
    dropTime: string;
    latitude: number;
    longitude: number;
    order: number;
  }[];

  // Driver Information
  @Prop({ type: Object })
  driver: {
    name: string;
    phone: string;
    licenseNumber: string;
    licenseExpiry: Date;
    address: string;
    photo: string;
  };

  // Conductor/Attendant
  @Prop({ type: Object })
  attendant: {
    name: string;
    phone: string;
  };

  // Assigned Students
  @Prop({
    type: [
      {
        student: { type: Types.ObjectId, ref: 'Student' },
        stop: String,
        pickupTime: String,
        dropTime: String,
      },
    ],
    default: [],
  })
  assignedStudents: {
    student: Types.ObjectId;
    stop: string;
    pickupTime: string;
    dropTime: string;
  }[];

  // GPS Tracking
  @Prop({ type: Object })
  currentLocation: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    lastUpdated: Date;
  };

  @Prop({ type: [Object], default: [] })
  trackingHistory: {
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: Date;
  }[];

  // Maintenance Records
  @Prop({ type: [Object], default: [] })
  maintenance: {
    date: Date;
    type: string;
    description: string;
    cost: number;
    vendor: string;
    nextDueDate: Date;
  }[];

  // Insurance
  @Prop({ type: Object })
  insurance: {
    provider: string;
    policyNumber: string;
    startDate: Date;
    endDate: Date;
    premium: number;
  };

  // Fee
  @Prop({ default: 0 })
  monthlyFee: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TransportSchema = SchemaFactory.createForClass(Transport);

TransportSchema.index(
  { school: 1, vehicleNumber: 1 },
  { unique: true },
);
TransportSchema.index({ school: 1, routeName: 1 });
TransportSchema.index({ school: 1, status: 1 });
TransportSchema.index({ 'assignedStudents.student': 1 });
