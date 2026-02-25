import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Timetable,
  TimetableDocument,
  DayOfWeek,
} from '../../database/schemas/timetable.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  Teacher,
  TeacherDocument,
} from '../../database/schemas/teacher.schema';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from '../../database/schemas/academic-year.schema';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { AddPeriodDto } from './dto/add-period.dto';
import { QueryTimetableDto } from './dto/query-timetable.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    @InjectModel(Timetable.name)
    private timetableModel: Model<TimetableDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  // Helper methods to get tenant-aware models
  private async getTimetableModel(context?: TenantContext): Promise<Model<TimetableDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<TimetableDocument>(
        context.schoolCode,
        'Timetable',
      );
    }
    return this.timetableModel;
  }

  private async getClassModel(context?: TenantContext): Promise<Model<ClassDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassDocument>(
        context.schoolCode,
        'Class',
      );
    }
    return this.classModel;
  }

  private async getTeacherModel(context?: TenantContext): Promise<Model<TeacherDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<TeacherDocument>(
        context.schoolCode,
        'Teacher',
      );
    }
    return this.teacherModel;
  }

  private async getSubjectModel(context?: TenantContext): Promise<Model<SubjectDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<SubjectDocument>(
        context.schoolCode,
        'Subject',
      );
    }
    return this.subjectModel;
  }

  private async getAcademicYearModel(context?: TenantContext): Promise<Model<AcademicYearDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AcademicYearDocument>(
        context.schoolCode,
        'AcademicYear',
      );
    }
    return this.academicYearModel;
  }

  async create(
    createTimetableDto: CreateTimetableDto,
    schoolId: string,
    createdBy: string,
    context?: TenantContext,
  ) {
    try {
      const classModel = await this.getClassModel(context);
      const academicYearModel = await this.getAcademicYearModel(context);
      const timetableModel = await this.getTimetableModel(context);

      // For tenant users, don't filter by school (tenant DB is school-specific)
      const classQuery: any = { _id: new Types.ObjectId(createTimetableDto.class) };
      if (!context?.isTenantUser) {
        classQuery.school = new Types.ObjectId(schoolId);
      }
      
      const classExists = await classModel.findOne(classQuery);

      if (!classExists) {
        throw new NotFoundException('Class not found');
      }

      const academicYearQuery: any = { _id: new Types.ObjectId(createTimetableDto.academicYear) };
      if (!context?.isTenantUser) {
        academicYearQuery.school = new Types.ObjectId(schoolId);
      }

      const academicYearExists = await academicYearModel.findOne(academicYearQuery);

      if (!academicYearExists) {
        throw new NotFoundException('Academic year not found');
      }

      const existingFilter: any = {
        class: new Types.ObjectId(createTimetableDto.class),
        section: createTimetableDto.section,
        academicYear: new Types.ObjectId(createTimetableDto.academicYear),
        isActive: true,
      };
      if (!context?.isTenantUser) {
        existingFilter.school = new Types.ObjectId(schoolId);
      }

      const existingTimetable = await timetableModel.findOne(existingFilter);

      if (existingTimetable) {
        throw new ConflictException(
          'Active timetable already exists for this class and section',
        );
      }

      const schedule = createTimetableDto.schedule.map((period) => ({
        day: period.day,
        periodNumber: period.periodNumber,
        periodType: period.periodType,
        subject: period.subject
          ? new Types.ObjectId(period.subject)
          : undefined,
        teacher: period.teacher
          ? new Types.ObjectId(period.teacher)
          : undefined,
        startTime: period.startTime,
        endTime: period.endTime,
        room: period.room,
        duration: period.duration,
        notes: period.notes,
      }));

      const timetableData: any = {
        ...createTimetableDto,
        school: new Types.ObjectId(schoolId),
        class: new Types.ObjectId(createTimetableDto.class),
        academicYear: new Types.ObjectId(createTimetableDto.academicYear),
        schedule,
        createdBy: new Types.ObjectId(createdBy),
      };

      const newTimetable = new timetableModel(timetableData);
      await newTimetable.save();

      return newTimetable;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create timetable: ' + error.message,
      );
    }
  }

  async findAll(schoolId: string, query: QueryTimetableDto, context?: TenantContext) {
    const {
      academicYearId,
      classId,
      section,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const timetableModel = await this.getTimetableModel(context);
    
    const filter: any = {};
    
    // Only filter by school for non-tenant users
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    if (classId) {
      filter.class = new Types.ObjectId(classId);
    }

    if (section) {
      filter.section = section;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [timetables, total] = await Promise.all([
      timetableModel
        .find(filter)
        .populate('class', 'name grade')
        .populate('academicYear', 'name startDate endDate')
        .populate('schedule.subject', 'name code')
        .populate('schedule.teacher', 'firstName lastName email')
        .sort({ effectiveFrom: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      timetableModel.countDocuments(filter),
    ]);

    return {
      data: timetables,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, schoolId: string) {
    const timetable = await this.timetableModel
      .findOne({
        _id: new Types.ObjectId(id),
        school: new Types.ObjectId(schoolId),
      })
      .populate('class', 'name grade')
      .populate('academicYear', 'name startDate endDate')
      .populate('schedule.subject', 'name code')
      .populate('schedule.teacher', 'firstName lastName email')
      .exec();

    if (!timetable) {
      throw new NotFoundException('Timetable not found');
    }

    return timetable;
  }

  async findByClass(classId: string, section: string, academicYearId: string) {
    const timetable = await this.timetableModel
      .findOne({
        class: new Types.ObjectId(classId),
        section,
        academicYear: new Types.ObjectId(academicYearId),
        isActive: true,
      })
      .populate('class', 'name grade')
      .populate('academicYear', 'name startDate endDate')
      .populate('schedule.subject', 'name code')
      .populate('schedule.teacher', 'firstName lastName email')
      .exec();

    if (!timetable) {
      throw new NotFoundException('Timetable not found for this class');
    }

    return timetable;
  }

  async update(
    id: string,
    updateTimetableDto: UpdateTimetableDto,
    schoolId: string,
    modifiedBy: string,
  ) {
    try {
      const timetable = await this.timetableModel.findOne({
        _id: new Types.ObjectId(id),
        school: new Types.ObjectId(schoolId),
      });

      if (!timetable) {
        throw new NotFoundException('Timetable not found');
      }

      if (updateTimetableDto.class) {
        const classExists = await this.classModel.findOne({
          _id: new Types.ObjectId(updateTimetableDto.class),
          school: new Types.ObjectId(schoolId),
        });

        if (!classExists) {
          throw new NotFoundException('Class not found');
        }
      }

      if (updateTimetableDto.academicYear) {
        const academicYearExists = await this.academicYearModel.findOne({
          _id: new Types.ObjectId(updateTimetableDto.academicYear),
          school: new Types.ObjectId(schoolId),
        });

        if (!academicYearExists) {
          throw new NotFoundException('Academic year not found');
        }
      }

      const updateData: any = {
        ...updateTimetableDto,
        lastModifiedBy: new Types.ObjectId(modifiedBy),
      };

      if (updateTimetableDto.class) {
        updateData.class = new Types.ObjectId(updateTimetableDto.class);
      }

      if (updateTimetableDto.academicYear) {
        updateData.academicYear = new Types.ObjectId(
          updateTimetableDto.academicYear,
        );
      }

      if (updateTimetableDto.schedule) {
        updateData.schedule = updateTimetableDto.schedule.map((period) => ({
          day: period.day,
          periodNumber: period.periodNumber,
          periodType: period.periodType,
          subject: period.subject
            ? new Types.ObjectId(period.subject)
            : undefined,
          teacher: period.teacher
            ? new Types.ObjectId(period.teacher)
            : undefined,
          startTime: period.startTime,
          endTime: period.endTime,
          room: period.room,
          duration: period.duration,
          notes: period.notes,
        }));
      }

      const updatedTimetable = await this.timetableModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate('class', 'name grade')
        .populate('academicYear', 'name startDate endDate')
        .populate('schedule.subject', 'name code')
        .populate('schedule.teacher', 'firstName lastName email')
        .exec();

      return updatedTimetable;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update timetable: ' + error.message,
      );
    }
  }

  async delete(id: string, schoolId: string) {
    const timetable = await this.timetableModel.findOne({
      _id: new Types.ObjectId(id),
      school: new Types.ObjectId(schoolId),
    });

    if (!timetable) {
      throw new NotFoundException('Timetable not found');
    }

    await this.timetableModel.findByIdAndDelete(id);

    return { message: 'Timetable deleted successfully' };
  }

  async addPeriod(
    timetableId: string,
    day: DayOfWeek,
    periodDto: AddPeriodDto,
  ) {
    try {
      const timetable = await this.timetableModel.findById(
        new Types.ObjectId(timetableId),
      );

      if (!timetable) {
        throw new NotFoundException('Timetable not found');
      }

      const newPeriod = {
        day,
        periodNumber: periodDto.periodNumber,
        periodType: periodDto.periodType,
        subject: periodDto.subject
          ? new Types.ObjectId(periodDto.subject)
          : undefined,
        teacher: periodDto.teacher
          ? new Types.ObjectId(periodDto.teacher)
          : undefined,
        startTime: periodDto.startTime,
        endTime: periodDto.endTime,
        room: periodDto.room,
        duration: periodDto.duration,
        notes: periodDto.notes,
      };

      timetable.schedule.push(newPeriod as any);
      await timetable.save();

      return await this.timetableModel
        .findById(timetableId)
        .populate('schedule.subject', 'name code')
        .populate('schedule.teacher', 'firstName lastName email')
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to add period: ' + error.message);
    }
  }

  async updatePeriod(
    timetableId: string,
    day: DayOfWeek,
    periodIndex: number,
    periodDto: AddPeriodDto,
  ) {
    try {
      const timetable = await this.timetableModel.findById(
        new Types.ObjectId(timetableId),
      );

      if (!timetable) {
        throw new NotFoundException('Timetable not found');
      }

      const periodToUpdate = timetable.schedule.find(
        (p, index) => p.day === day && index === periodIndex,
      );

      if (!periodToUpdate) {
        throw new NotFoundException('Period not found');
      }

      const updatedPeriod = {
        day,
        periodNumber: periodDto.periodNumber,
        periodType: periodDto.periodType,
        subject: periodDto.subject
          ? new Types.ObjectId(periodDto.subject)
          : undefined,
        teacher: periodDto.teacher
          ? new Types.ObjectId(periodDto.teacher)
          : undefined,
        startTime: periodDto.startTime,
        endTime: periodDto.endTime,
        room: periodDto.room,
        duration: periodDto.duration,
        notes: periodDto.notes,
      };

      timetable.schedule[periodIndex] = updatedPeriod as any;
      await timetable.save();

      return await this.timetableModel
        .findById(timetableId)
        .populate('schedule.subject', 'name code')
        .populate('schedule.teacher', 'firstName lastName email')
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update period: ' + error.message,
      );
    }
  }

  async removePeriod(timetableId: string, day: DayOfWeek, periodIndex: number) {
    try {
      const timetable = await this.timetableModel.findById(
        new Types.ObjectId(timetableId),
      );

      if (!timetable) {
        throw new NotFoundException('Timetable not found');
      }

      const periodToRemove = timetable.schedule.find(
        (p, index) => p.day === day && index === periodIndex,
      );

      if (!periodToRemove) {
        throw new NotFoundException('Period not found');
      }

      timetable.schedule.splice(periodIndex, 1);
      await timetable.save();

      return await this.timetableModel
        .findById(timetableId)
        .populate('schedule.subject', 'name code')
        .populate('schedule.teacher', 'firstName lastName email')
        .exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to remove period: ' + error.message,
      );
    }
  }

  async getTeacherTimetable(teacherId: string, academicYearId: string) {
    const timetables = await this.timetableModel
      .find({
        'schedule.teacher': new Types.ObjectId(teacherId),
        academicYear: new Types.ObjectId(academicYearId),
        isActive: true,
      })
      .populate('class', 'name grade')
      .populate('academicYear', 'name startDate endDate')
      .populate('schedule.subject', 'name code')
      .exec();

    const teacherSchedule = timetables.flatMap((timetable) => {
      return timetable.schedule
        .filter((period) => period.teacher?.toString() === teacherId.toString())
        .map((period) => ({
          timetableId: timetable._id,
          class: timetable.class,
          section: timetable.section,
          day: period.day,
          periodNumber: period.periodNumber,
          periodType: period.periodType,
          subject: period.subject,
          startTime: period.startTime,
          endTime: period.endTime,
          room: period.room,
          duration: period.duration,
          notes: period.notes,
        }));
    });

    return {
      teacherId,
      academicYearId,
      schedule: teacherSchedule,
    };
  }

  async checkConflicts(timetableId: string) {
    const timetable = await this.timetableModel.findById(
      new Types.ObjectId(timetableId),
    );

    if (!timetable) {
      throw new NotFoundException('Timetable not found');
    }

    const conflicts: any[] = [];

    for (const period of timetable.schedule) {
      if (period.teacher) {
        const teacherConflicts = await this.timetableModel
          .find({
            _id: { $ne: timetable._id },
            school: timetable.school,
            academicYear: timetable.academicYear,
            isActive: true,
            'schedule.teacher': period.teacher,
            'schedule.day': period.day,
          })
          .populate('class', 'name grade')
          .exec();

        for (const conflictTimetable of teacherConflicts) {
          const conflictPeriods = conflictTimetable.schedule.filter(
            (p) =>
              p.teacher?.toString() === period.teacher?.toString() &&
              p.day === period.day &&
              this.isTimeOverlap(
                period.startTime,
                period.endTime,
                p.startTime,
                p.endTime,
              ),
          );

          if (conflictPeriods.length > 0) {
            conflicts.push({
              type: 'teacher',
              teacher: period.teacher,
              day: period.day,
              time: `${period.startTime} - ${period.endTime}`,
              conflictingClass: conflictTimetable.class,
              conflictingSection: conflictTimetable.section,
            });
          }
        }
      }

      if (period.room) {
        const roomConflicts = await this.timetableModel
          .find({
            _id: { $ne: timetable._id },
            school: timetable.school,
            academicYear: timetable.academicYear,
            isActive: true,
            'schedule.room': period.room,
            'schedule.day': period.day,
          })
          .populate('class', 'name grade')
          .exec();

        for (const conflictTimetable of roomConflicts) {
          const conflictPeriods = conflictTimetable.schedule.filter(
            (p) =>
              p.room === period.room &&
              p.day === period.day &&
              this.isTimeOverlap(
                period.startTime,
                period.endTime,
                p.startTime,
                p.endTime,
              ),
          );

          if (conflictPeriods.length > 0) {
            conflicts.push({
              type: 'room',
              room: period.room,
              day: period.day,
              time: `${period.startTime} - ${period.endTime}`,
              conflictingClass: conflictTimetable.class,
              conflictingSection: conflictTimetable.section,
            });
          }
        }
      }
    }

    return {
      timetableId,
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  async getAvailableTeachers(
    day: DayOfWeek,
    periodTime: string,
    schoolId: string,
  ) {
    const [startTime, endTime] = periodTime.split('-').map((t) => t.trim());

    const allTeachers = await this.teacherModel
      .find({
        school: new Types.ObjectId(schoolId),
        status: 'active',
      })
      .select('firstName lastName email employeeId')
      .exec();

    const busyTeachers = await this.timetableModel
      .find({
        school: new Types.ObjectId(schoolId),
        isActive: true,
        'schedule.day': day,
      })
      .exec();

    const busyTeacherIds = new Set();

    for (const timetable of busyTeachers) {
      for (const period of timetable.schedule) {
        if (
          period.day === day &&
          period.teacher &&
          this.isTimeOverlap(
            startTime,
            endTime,
            period.startTime,
            period.endTime,
          )
        ) {
          busyTeacherIds.add(period.teacher.toString());
        }
      }
    }

    const availableTeachers = allTeachers.filter(
      (teacher) => !busyTeacherIds.has(teacher._id.toString()),
    );

    return {
      day,
      periodTime,
      availableTeachers,
      totalAvailable: availableTeachers.length,
    };
  }

  async getAvailableRooms(
    day: DayOfWeek,
    periodTime: string,
    schoolId: string,
  ) {
    const [startTime, endTime] = periodTime.split('-').map((t) => t.trim());

    const allTimetables = await this.timetableModel
      .find({
        school: new Types.ObjectId(schoolId),
        isActive: true,
        'schedule.day': day,
      })
      .exec();

    const allRooms = new Set<string>();
    const busyRooms = new Set<string>();

    for (const timetable of allTimetables) {
      for (const period of timetable.schedule) {
        if (period.room) {
          allRooms.add(period.room);

          if (
            period.day === day &&
            this.isTimeOverlap(
              startTime,
              endTime,
              period.startTime,
              period.endTime,
            )
          ) {
            busyRooms.add(period.room);
          }
        }
      }
    }

    const availableRooms = Array.from(allRooms).filter(
      (room) => !busyRooms.has(room),
    );

    return {
      day,
      periodTime,
      availableRooms,
      totalAvailable: availableRooms.length,
    };
  }

  private isTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Minutes = parseTime(start1);
    const end1Minutes = parseTime(end1);
    const start2Minutes = parseTime(start2);
    const end2Minutes = parseTime(end2);

    return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
  }
}
