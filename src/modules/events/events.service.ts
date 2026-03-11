import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SchoolEvent,
  EventDocument,
  EventStatus,
} from '../../database/schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(SchoolEvent.name)
    private eventModel: Model<EventDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getEventModel(
    context?: TenantContext,
  ): Promise<Model<EventDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<EventDocument>(
        context.schoolCode,
        'SchoolEvent',
      );
    }
    return this.eventModel;
  }

  /**
   * Create a new event
   */
  async create(
    dto: CreateEventDto,
    schoolId: string,
    createdBy: string,
    context?: TenantContext,
  ) {
    const eventModel = await this.getEventModel(context);

    const eventData: any = {
      school: new Types.ObjectId(schoolId),
      title: dto.title,
      description: dto.description,
      type: dto.type,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      startTime: dto.startTime,
      endTime: dto.endTime,
      venue: dto.venue,
      organizer: dto.organizer,
      visibility: dto.visibility || ['all'],
      isHoliday: dto.isHoliday || false,
      isRecurring: dto.isRecurring || false,
      recurringPattern: dto.recurringPattern,
      color: dto.color,
      attachments: dto.attachments || [],
      createdBy: new Types.ObjectId(createdBy),
      isActive: true,
    };

    if (dto.targetClasses && dto.targetClasses.length) {
      eventData.targetClasses = dto.targetClasses.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (dto.academicYearId) {
      eventData.academicYear = new Types.ObjectId(dto.academicYearId);
    }

    // Auto-set status based on dates
    const now = new Date();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (now > endDate) {
      eventData.status = EventStatus.COMPLETED;
    } else if (now >= startDate && now <= endDate) {
      eventData.status = EventStatus.ONGOING;
    } else {
      eventData.status = EventStatus.UPCOMING;
    }

    const event = new eventModel(eventData);
    await event.save();

    this.logger.log(`Event created: ${dto.title} for school ${schoolId}`);

    return { success: true, message: 'Event created successfully', data: event };
  }

  /**
   * Get all events with filters and pagination
   */
  async findAll(
    schoolId: string,
    query: QueryEventDto,
    context?: TenantContext,
  ) {
    const eventModel = await this.getEventModel(context);

    const filter: any = { isActive: true };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.academicYearId) {
      filter.academicYear = new Types.ObjectId(query.academicYearId);
    }

    if (query.fromDate || query.toDate) {
      filter.startDate = {};
      if (query.fromDate) filter.startDate.$gte = new Date(query.fromDate);
      if (query.toDate) filter.startDate.$lte = new Date(query.toDate);
    }

    // Filter for upcoming events only
    if (query.upcoming) {
      filter.startDate = { ...filter.startDate, $gte: new Date() };
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { venue: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      eventModel
        .find(filter)
        .populate('targetClasses', 'name grade')
        .populate('academicYear', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('responsibleTeachers', 'firstName lastName')
        .populate('assignedStudents', 'firstName lastName rollNumber')
        .populate('leaders', 'firstName lastName rollNumber')
        .skip(skip)
        .limit(limit)
        .sort({ startDate: 1 }),
      eventModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get upcoming events (for dashboard and all users)
   */
  async getUpcomingEvents(
    schoolId: string,
    limitCount = 10,
    context?: TenantContext,
  ) {
    const eventModel = await this.getEventModel(context);
    const now = new Date();

    const filter: any = {
      isActive: true,
      startDate: { $gte: now },
      status: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const events = await eventModel
      .find(filter)
      .populate('targetClasses', 'name')
      .sort({ startDate: 1 })
      .limit(limitCount);

    return { success: true, data: events };
  }

  /**
   * Get today's events
   */
  async getTodayEvents(schoolId: string, context?: TenantContext) {
    const eventModel = await this.getEventModel(context);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter: any = {
      isActive: true,
      $or: [
        { startDate: { $gte: today, $lt: tomorrow } },
        {
          startDate: { $lte: today },
          endDate: { $gte: today },
        },
      ],
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const events = await eventModel
      .find(filter)
      .populate('targetClasses', 'name')
      .sort({ startDate: 1 });

    return { success: true, data: events };
  }

  /**
   * Get events for calendar view (month-wise)
   */
  async getCalendarEvents(
    schoolId: string,
    year: number,
    month: number,
    context?: TenantContext,
  ) {
    const eventModel = await this.getEventModel(context);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const filter: any = {
      isActive: true,
      $or: [
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        {
          startDate: { $lte: startOfMonth },
          endDate: { $gte: startOfMonth },
        },
      ],
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const events = await eventModel
      .find(filter)
      .populate('targetClasses', 'name')
      .sort({ startDate: 1 });

    return { success: true, data: events };
  }

  /**
   * Get event by ID
   */
  async findById(id: string, schoolId: string, context?: TenantContext) {
    const eventModel = await this.getEventModel(context);

    const filter: any = { _id: id, isActive: true };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const event = await eventModel
      .findOne(filter)
      .populate('targetClasses', 'name grade')
      .populate('academicYear', 'name startDate endDate')
      .populate('createdBy', 'firstName lastName')
      .populate('responsibleTeachers', 'firstName lastName email employeeId')
      .populate('assignedStudents', 'firstName lastName rollNumber admissionNumber')
      .populate('leaders', 'firstName lastName rollNumber admissionNumber');

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return { success: true, data: event };
  }

  /**
   * Update event
   */
  async update(
    id: string,
    dto: UpdateEventDto,
    schoolId: string,
    context?: TenantContext,
  ) {
    const eventModel = await this.getEventModel(context);

    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.targetClasses) {
      updateData.targetClasses = dto.targetClasses.map(
        (id) => new Types.ObjectId(id),
      );
    }
    // Handle participant arrays - convert to ObjectIds
    if (dto.responsibleTeachers) {
      updateData.responsibleTeachers = dto.responsibleTeachers.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (dto.assignedStudents) {
      updateData.assignedStudents = dto.assignedStudents.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (dto.leaders) {
      updateData.leaders = dto.leaders.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const event = await eventModel.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true },
    );

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return { success: true, message: 'Event updated', data: event };
  }

  /**
   * Delete event (soft delete)
   */
  async remove(id: string, schoolId: string, context?: TenantContext) {
    const eventModel = await this.getEventModel(context);

    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const event = await eventModel.findOneAndUpdate(
      filter,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return { success: true, message: 'Event deleted' };
  }

  /**
   * Cancel an event
   */
  async cancelEvent(id: string, schoolId: string, context?: TenantContext) {
    return this.update(
      id,
      { status: EventStatus.CANCELLED },
      schoolId,
      context,
    );
  }

  /**
   * Get event statistics
   */
  async getEventStats(
    schoolId: string,
    academicYearId?: string,
    context?: TenantContext,
  ) {
    const eventModel = await this.getEventModel(context);

    const filter: any = { isActive: true };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }
    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    const [total, upcoming, ongoing, completed, cancelled, typeWise] =
      await Promise.all([
        eventModel.countDocuments(filter),
        eventModel.countDocuments({
          ...filter,
          status: EventStatus.UPCOMING,
        }),
        eventModel.countDocuments({
          ...filter,
          status: EventStatus.ONGOING,
        }),
        eventModel.countDocuments({
          ...filter,
          status: EventStatus.COMPLETED,
        }),
        eventModel.countDocuments({
          ...filter,
          status: EventStatus.CANCELLED,
        }),
        eventModel.aggregate([
          { $match: filter },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

    return {
      success: true,
      data: {
        total,
        upcoming,
        ongoing,
        completed,
        cancelled,
        typeWise,
      },
    };
  }
}
