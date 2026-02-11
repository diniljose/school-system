import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transport, TransportDocument, VehicleStatus } from '../../database/schemas/transport.schema';
import { Student } from '../../database/schemas/student.schema';
import {
  CreateTransportDto,
  UpdateTransportDto,
  QueryTransportDto,
  UpdateLocationDto,
  AssignStudentsDto,
} from './dto';
import { buildPaginatedResult, PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class TransportService {
  constructor(
    @InjectModel(Transport.name) private transportModel: Model<TransportDocument>,
    @InjectModel(Student.name) private studentModel: Model<any>,
  ) {}

  /**
   * Create a new transport vehicle/route
   */
  async create(schoolId: string, dto: CreateTransportDto): Promise<TransportDocument> {
    const existing = await this.transportModel.findOne({
      school: new Types.ObjectId(schoolId),
      vehicleNumber: dto.vehicleNumber,
    });
    if (existing) {
      throw new ConflictException(`Vehicle with number ${dto.vehicleNumber} already exists`);
    }

    const transport = new this.transportModel({
      school: new Types.ObjectId(schoolId),
      ...dto,
    });
    return transport.save();
  }

  /**
   * Find all vehicles/routes for a school with pagination & filters
   */
  async findAll(
    schoolId: string,
    query: QueryTransportDto,
  ): Promise<PaginatedResult<TransportDocument>> {
    const { search, status, routeName, vehicleType, page = 1, limit = 10 } = query;
    const filter: any = { school: new Types.ObjectId(schoolId) };

    if (status) filter.status = status;
    if (routeName) filter.routeName = { $regex: routeName, $options: 'i' };
    if (vehicleType) filter.vehicleType = vehicleType;
    if (search) {
      filter.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { routeName: { $regex: search, $options: 'i' } },
        { 'driver.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.transportModel
        .find(filter)
        .populate('assignedStudents.student', 'firstName lastName admissionNumber class')
        .sort({ routeName: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transportModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(data as any[], total, page, limit);
  }

  /**
   * Find a single vehicle/route by ID
   */
  async findById(schoolId: string, id: string): Promise<TransportDocument> {
    const transport = await this.transportModel
      .findOne({ _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) })
      .populate('assignedStudents.student', 'firstName lastName admissionNumber class phone')
      .exec();

    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  /**
   * Update vehicle/route details
   */
  async update(
    schoolId: string,
    id: string,
    dto: UpdateTransportDto,
  ): Promise<TransportDocument> {
    // Check for duplicate vehicle number if being changed
    if (dto.vehicleNumber) {
      const existing = await this.transportModel.findOne({
        school: new Types.ObjectId(schoolId),
        vehicleNumber: dto.vehicleNumber,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existing) {
        throw new ConflictException(`Vehicle with number ${dto.vehicleNumber} already exists`);
      }
    }

    const transport = await this.transportModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) },
        { $set: dto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  /**
   * Delete a vehicle/route
   */
  async remove(schoolId: string, id: string): Promise<void> {
    const result = await this.transportModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      school: new Types.ObjectId(schoolId),
    });
    if (!result) {
      throw new NotFoundException('Transport vehicle not found');
    }
  }

  /**
   * Update vehicle status
   */
  async updateStatus(
    schoolId: string,
    id: string,
    status: VehicleStatus,
  ): Promise<TransportDocument> {
    const transport = await this.transportModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) },
        { $set: { status } },
        { new: true },
      )
      .exec();
    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  // ————————————————————————————————————————————————————
  // GPS Tracking
  // ————————————————————————————————————————————————————

  /**
   * Update the current GPS location for a vehicle
   */
  async updateLocation(
    schoolId: string,
    id: string,
    dto: UpdateLocationDto,
  ): Promise<TransportDocument> {
    const now = new Date();
    const transport = await this.transportModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) },
        {
          $set: {
            currentLocation: {
              latitude: dto.latitude,
              longitude: dto.longitude,
              speed: dto.speed,
              heading: 0,
              lastUpdated: now,
            },
          },
          $push: {
            trackingHistory: {
              $each: [
                {
                  latitude: dto.latitude,
                  longitude: dto.longitude,
                  speed: dto.speed,
                  timestamp: now,
                },
              ],
              $slice: -500, // Keep last 500 tracking points
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  /**
   * Get the current location of a vehicle
   */
  async getLocation(schoolId: string, id: string) {
    const transport = await this.transportModel
      .findOne(
        { _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) },
        { currentLocation: 1, vehicleNumber: 1, routeName: 1, status: 1 },
      )
      .lean()
      .exec();

    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  /**
   * Get all active vehicle locations for a school (fleet overview)
   */
  async getAllLocations(schoolId: string) {
    return this.transportModel
      .find(
        { school: new Types.ObjectId(schoolId), status: VehicleStatus.ACTIVE },
        {
          vehicleNumber: 1,
          routeName: 1,
          currentLocation: 1,
          'driver.name': 1,
          'driver.phone': 1,
        },
      )
      .lean()
      .exec();
  }

  /**
   * Get tracking history for a vehicle (for route replay)
   */
  async getTrackingHistory(schoolId: string, id: string) {
    const transport = await this.transportModel
      .findOne(
        { _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) },
        { trackingHistory: 1, vehicleNumber: 1 },
      )
      .lean()
      .exec();
    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  // ————————————————————————————————————————————————————
  // Student Assignment
  // ————————————————————————————————————————————————————

  /**
   * Assign students to a vehicle/route
   */
  async assignStudents(
    schoolId: string,
    id: string,
    dto: AssignStudentsDto,
  ): Promise<TransportDocument> {
    const transport = await this.findById(schoolId, id);

    // Check capacity
    const currentCount = transport.assignedStudents?.length || 0;
    if (currentCount + dto.studentIds.length > transport.capacity) {
      throw new BadRequestException(
        `Cannot assign ${dto.studentIds.length} students. Vehicle capacity is ${transport.capacity}, currently ${currentCount} assigned.`,
      );
    }

    // Verify students exist
    const students = await this.studentModel
      .find({
        _id: { $in: dto.studentIds.map((sid) => new Types.ObjectId(sid)) },
        school: new Types.ObjectId(schoolId),
      })
      .select('_id')
      .lean()
      .exec();

    if (students.length !== dto.studentIds.length) {
      throw new BadRequestException('One or more student IDs are invalid');
    }

    // Check if any student is already assigned to another vehicle
    const alreadyAssigned = await this.transportModel
      .find({
        school: new Types.ObjectId(schoolId),
        _id: { $ne: new Types.ObjectId(id) },
        'assignedStudents.student': { $in: dto.studentIds.map((s) => new Types.ObjectId(s)) },
      })
      .select('vehicleNumber assignedStudents.student')
      .lean()
      .exec();

    if (alreadyAssigned.length > 0) {
      throw new ConflictException(
        `Some students are already assigned to vehicle(s): ${alreadyAssigned.map((v) => v.vehicleNumber).join(', ')}`,
      );
    }

    const newAssignments = dto.studentIds.map((sid) => ({
      student: new Types.ObjectId(sid),
      stop: '',
      pickupTime: '',
      dropTime: '',
    }));

    const updated = await this.transportModel
      .findByIdAndUpdate(
        id,
        { $push: { assignedStudents: { $each: newAssignments } } },
        { new: true },
      )
      .populate('assignedStudents.student', 'firstName lastName admissionNumber')
      .exec();

    return updated;
  }

  /**
   * Remove a student from a vehicle/route
   */
  async removeStudent(
    schoolId: string,
    vehicleId: string,
    studentId: string,
  ): Promise<TransportDocument> {
    const transport = await this.transportModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(vehicleId), school: new Types.ObjectId(schoolId) },
        {
          $pull: {
            assignedStudents: { student: new Types.ObjectId(studentId) },
          },
        },
        { new: true },
      )
      .populate('assignedStudents.student', 'firstName lastName admissionNumber')
      .exec();

    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  /**
   * Get a student's transport assignment
   */
  async getStudentTransport(schoolId: string, studentId: string) {
    const transport = await this.transportModel
      .findOne({
        school: new Types.ObjectId(schoolId),
        'assignedStudents.student': new Types.ObjectId(studentId),
      })
      .populate('assignedStudents.student', 'firstName lastName')
      .lean()
      .exec();

    return transport;
  }

  // ————————————————————————————————————————————————————
  // Maintenance
  // ————————————————————————————————————————————————————

  /**
   * Add a maintenance record
   */
  async addMaintenance(
    schoolId: string,
    id: string,
    record: {
      date: Date;
      type: string;
      description: string;
      cost: number;
      vendor: string;
      nextDueDate?: Date;
    },
  ): Promise<TransportDocument> {
    const transport = await this.transportModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), school: new Types.ObjectId(schoolId) },
        { $push: { maintenance: record } },
        { new: true },
      )
      .exec();
    if (!transport) {
      throw new NotFoundException('Transport vehicle not found');
    }
    return transport;
  }

  /**
   * Get vehicles with upcoming maintenance due
   */
  async getUpcomingMaintenance(schoolId: string) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.transportModel
      .find({
        school: new Types.ObjectId(schoolId),
        'maintenance.nextDueDate': { $lte: thirtyDaysFromNow },
      })
      .select('vehicleNumber routeName maintenance')
      .lean()
      .exec();
  }

  // ————————————————————————————————————————————————————
  // Statistics
  // ————————————————————————————————————————————————————

  /**
   * Get transport stats for a school
   */
  async getStats(schoolId: string) {
    const schoolOid = new Types.ObjectId(schoolId);
    const [
      totalVehicles,
      activeVehicles,
      totalStudentsTransported,
      vehiclesByStatus,
    ] = await Promise.all([
      this.transportModel.countDocuments({ school: schoolOid }),
      this.transportModel.countDocuments({ school: schoolOid, status: VehicleStatus.ACTIVE }),
      this.transportModel.aggregate([
        { $match: { school: schoolOid } },
        { $project: { count: { $size: { $ifNull: ['$assignedStudents', []] } } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]),
      this.transportModel.aggregate([
        { $match: { school: schoolOid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      inMaintenance: vehiclesByStatus.find((v) => v._id === VehicleStatus.MAINTENANCE)?.count || 0,
      totalStudentsTransported: totalStudentsTransported[0]?.total || 0,
      vehiclesByStatus: vehiclesByStatus.reduce(
        (acc, v) => ({ ...acc, [v._id]: v.count }),
        {},
      ),
    };
  }
}
