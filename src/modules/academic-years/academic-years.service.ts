import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AcademicYear,
  AcademicYearDocument,
} from '../../database/schemas/academic-year.schema';
import { School, SchoolDocument } from '../../database/schemas/school.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AddTermDto } from './dto/add-term.dto';
import { AddHolidayDto } from './dto/add-holiday.dto';

// Tenant context for multi-tenant operations
export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class AcademicYearsService {
  constructor(
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    @InjectModel(School.name)
    private schoolModel: Model<SchoolDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  /**
   * Get the appropriate model based on tenant context
   */
  private async getModel(context?: TenantContext): Promise<Model<AcademicYearDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AcademicYearDocument>(
        context.schoolCode,
        'AcademicYear',
      );
    }
    return this.academicYearModel;
  }

  async create(
    createAcademicYearDto: CreateAcademicYearDto,
    context?: TenantContext,
  ): Promise<AcademicYear> {
    const model = await this.getModel(context);
    
    // For tenant users, school is derived from context
    const schoolId = createAcademicYearDto.school || context?.schoolId;
    
    if (!schoolId && !context?.isTenantUser) {
      throw new BadRequestException('School ID is required');
    }

    // Check for existing academic year with same name
    const filter: any = { name: createAcademicYearDto.name };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const existing = await model.findOne(filter).exec();

    if (existing) {
      throw new ConflictException(
        'Academic year with this name already exists for this school',
      );
    }

    // If setting as current, unset other current years
    if (createAcademicYearDto.isCurrent) {
      const updateFilter: any = {};
      if (!context?.isTenantUser && schoolId) {
        updateFilter.school = schoolId;
      }
      await model.updateMany(updateFilter, { isCurrent: false }).exec();
    }

    // Create the academic year
    const academicYearData: any = {
      ...createAcademicYearDto,
      startDate: new Date(createAcademicYearDto.startDate),
      endDate: new Date(createAcademicYearDto.endDate),
    };
    
    // Always set school - required by schema
    if (schoolId) {
      academicYearData.school = schoolId;
    }

    const academicYear = new model(academicYearData);
    return academicYear.save();
  }

  async findAll(query?: any, context?: TenantContext) {
    const model = await this.getModel(context);
    const { page = 1, limit = 10, schoolId, isCurrent, isActive } = query || {};

    const filter: any = {};

    // For non-tenant users, filter by school
    if (!context?.isTenantUser && schoolId) {
      filter.school = schoolId;
    }

    if (isCurrent !== undefined) {
      filter.isCurrent = isCurrent === 'true' || isCurrent === true;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model
        .find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      model.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async findById(id: string, context?: TenantContext): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    return academicYear;
  }

  /**
   * Academic Year Dashboard:
   * Returns all classes/sections for this academic year, with:
   * - student count per class/section (from enrollments)
   * - subjects assigned to each class
   * - teachers assigned to each class
   */
  async getDashboard(id: string, context?: TenantContext) {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // We need tenant models for classes, enrollments, subjects, teachers
    if (!context?.schoolCode) {
      throw new BadRequestException('School context required for dashboard');
    }

    const ClassModel = await this.tenantDatabaseService.getTenantModel(
      context.schoolCode,
      'Class',
    );
    const EnrollmentModel = await this.tenantDatabaseService.getTenantModel(
      context.schoolCode,
      'Enrollment',
    );
    const SubjectModel = await this.tenantDatabaseService.getTenantModel(
      context.schoolCode,
      'Subject',
    );
    const ClassTeacherAssignmentModel = await this.tenantDatabaseService.getTenantModel(
      context.schoolCode,
      'ClassTeacherAssignment',
    );

    // Get all active classes
    const classes = await ClassModel.find({ isActive: true })
      .select('name grade sections capacity')
      .sort({ grade: 1, name: 1 })
      .lean();

    // Get enrollment counts per class/section for this academic year
    const enrollmentCounts = await EnrollmentModel.aggregate([
      { $match: { academicYear: new (await import('mongoose')).Types.ObjectId(id), status: 'active' } },
      { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
    ]);

    // Get subjects assigned to classes (subjects may have class references)
    const subjects = await SubjectModel.find({})
      .select('name code class')
      .lean();

    // Get class teacher assignments for this academic year
    let teacherAssignments: any[] = [];
    try {
      teacherAssignments = await ClassTeacherAssignmentModel.find({ academicYear: id })
        .populate('teacher', 'firstName lastName email')
        .populate('class', 'name')
        .lean();
    } catch (_) {
      // ClassTeacherAssignment model may not exist
    }

    // Build dashboard data per class
    const classesData = (classes as any[]).map((cls: any) => {
      const sections = cls.sections && cls.sections.length > 0
        ? cls.sections.map((s: any) => {
            const sectionName = s.name || s;
            const enrollCount = enrollmentCounts.find(
              (ec: any) => ec._id.class?.toString() === cls._id.toString() && ec._id.section === sectionName,
            );
            const sectionTeacher = teacherAssignments.find(
              (ta: any) => ta.class?._id?.toString() === cls._id.toString() && ta.section === sectionName,
            );
            return {
              name: sectionName,
              capacity: s.capacity || 0,
              classTeacher: s.classTeacher || null,
              studentCount: enrollCount?.count || 0,
              teacher: sectionTeacher?.teacher || null,
            };
          })
        : [{
            name: '',
            capacity: cls.capacity || 0,
            studentCount: enrollmentCounts.find(
              (ec: any) => ec._id.class?.toString() === cls._id.toString() && (ec._id.section === '' || !ec._id.section),
            )?.count || 0,
          }];

      const classSubjects = (subjects as any[]).filter(
        (sub: any) => sub.class?.toString() === cls._id.toString(),
      );

      const totalStudents = sections.reduce((sum: number, s: any) => sum + (s.studentCount || 0), 0);

      return {
        _id: cls._id,
        name: cls.name,
        grade: cls.grade,
        sections,
        totalStudents,
        subjects: classSubjects.map((sub: any) => ({
          _id: sub._id,
          name: sub.name,
          code: sub.code,
        })),
      };
    });

    const totalStudents = classesData.reduce((sum: number, c: any) => sum + c.totalStudents, 0);
    const totalClasses = classesData.length;
    const totalSections = classesData.reduce(
      (sum: number, c: any) => sum + (c.sections?.length || 0),
      0,
    );

    return {
      academicYear: {
        _id: (academicYear as any)._id,
        name: (academicYear as any).name,
        startDate: (academicYear as any).startDate,
        endDate: (academicYear as any).endDate,
        isCurrent: (academicYear as any).isCurrent,
      },
      summary: {
        totalClasses,
        totalSections,
        totalStudents,
      },
      classes: classesData,
    };
  }

  async findBySchool(schoolId: string, context?: TenantContext): Promise<AcademicYear[]> {
    const model = await this.getModel(context);
    const filter: any = {};
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }
    return model.find(filter).sort({ startDate: -1 }).exec();
  }

  async getCurrentYear(schoolId: string, context?: TenantContext): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const filter: any = { isCurrent: true };
    if (!context?.isTenantUser && schoolId) {
      filter.school = schoolId;
    }
    
    const academicYear = await model.findOne(filter).exec();

    if (!academicYear) {
      throw new NotFoundException('No current academic year found');
    }

    return academicYear;
  }

  async update(
    id: string,
    updateAcademicYearDto: UpdateAcademicYearDto,
    context?: TenantContext,
  ): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (updateAcademicYearDto.name) {
      const filter: any = {
        name: updateAcademicYearDto.name,
        _id: { $ne: id },
      };
      if (!context?.isTenantUser) {
        filter.school = (academicYear as any).school;
      }
      const existing = await model.findOne(filter).exec();

      if (existing) {
        throw new ConflictException(
          'Academic year with this name already exists for this school',
        );
      }
    }

    if (updateAcademicYearDto.isCurrent) {
      const updateFilter: any = { _id: { $ne: id } };
      if (!context?.isTenantUser) {
        updateFilter.school = (academicYear as any).school;
      }
      await model.updateMany(updateFilter, { isCurrent: false }).exec();
    }

    Object.assign(academicYear, updateAcademicYearDto);
    return academicYear.save();
  }

  async remove(id: string, context?: TenantContext): Promise<void> {
    const model = await this.getModel(context);
    const result = await model.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Academic year not found');
    }
  }

  async setCurrentYear(
    schoolId: string,
    yearId: string,
    context?: TenantContext,
  ): Promise<AcademicYear> {
    const model = await this.getModel(context);
    
    const filter: any = { _id: yearId };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }
    
    const academicYear = await model.findOne(filter).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found for this school');
    }

    const updateFilter: any = {};
    if (!context?.isTenantUser) {
      updateFilter.school = schoolId;
    }
    await model.updateMany(updateFilter, { isCurrent: false }).exec();

    academicYear.isCurrent = true;
    return academicYear.save();
  }

  async addTerm(id: string, addTermDto: AddTermDto, context?: TenantContext): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const termExists = academicYear.terms.some(
      (term) => term.name === addTermDto.name,
    );

    if (termExists) {
      throw new ConflictException('Term with this name already exists');
    }

    academicYear.terms.push(addTermDto as any);
    return academicYear.save();
  }

  async updateTerm(
    id: string,
    termId: string,
    updateTermDto: AddTermDto,
    context?: TenantContext,
  ): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const term = academicYear.terms.find(
      (t: any) => t._id.toString() === termId,
    );

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    Object.assign(term, updateTermDto);
    return academicYear.save();
  }

  async removeTerm(id: string, termId: string, context?: TenantContext): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const termIndex = academicYear.terms.findIndex(
      (t: any) => t._id.toString() === termId,
    );

    if (termIndex === -1) {
      throw new NotFoundException('Term not found');
    }

    academicYear.terms.splice(termIndex, 1);
    return academicYear.save();
  }

  async addHoliday(
    id: string,
    addHolidayDto: AddHolidayDto,
    context?: TenantContext,
  ): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    academicYear.holidays.push(addHolidayDto as any);
    return academicYear.save();
  }

  async updateHoliday(
    id: string,
    holidayId: string,
    updateHolidayDto: AddHolidayDto,
    context?: TenantContext,
  ): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const holiday = academicYear.holidays.find(
      (h: any) => h._id.toString() === holidayId,
    );

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    Object.assign(holiday, updateHolidayDto);
    return academicYear.save();
  }

  async removeHoliday(id: string, holidayId: string, context?: TenantContext): Promise<AcademicYear> {
    const model = await this.getModel(context);
    const academicYear = await model.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const holidayIndex = academicYear.holidays.findIndex(
      (h: any) => h._id.toString() === holidayId,
    );

    if (holidayIndex === -1) {
      throw new NotFoundException('Holiday not found');
    }

    academicYear.holidays.splice(holidayIndex, 1);
    return academicYear.save();
  }
}
