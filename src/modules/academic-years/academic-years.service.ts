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
