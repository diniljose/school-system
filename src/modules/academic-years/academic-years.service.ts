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
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AddTermDto } from './dto/add-term.dto';
import { AddHolidayDto } from './dto/add-holiday.dto';

@Injectable()
export class AcademicYearsService {
  constructor(
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    @InjectModel(School.name)
    private schoolModel: Model<SchoolDocument>,
  ) {}

  async create(
    createAcademicYearDto: CreateAcademicYearDto,
  ): Promise<AcademicYear> {
    const school = await this.schoolModel
      .findById(createAcademicYearDto.school)
      .exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const existing = await this.academicYearModel
      .findOne({
        school: createAcademicYearDto.school,
        name: createAcademicYearDto.name,
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        'Academic year with this name already exists for this school',
      );
    }

    if (createAcademicYearDto.isCurrent) {
      await this.academicYearModel
        .updateMany(
          { school: createAcademicYearDto.school },
          { isCurrent: false },
        )
        .exec();
    }

    const academicYear = new this.academicYearModel(createAcademicYearDto);
    return academicYear.save();
  }

  async findAll(query?: any) {
    const { page = 1, limit = 10, schoolId, isCurrent, isActive } = query || {};

    const filter: any = {};

    if (schoolId) {
      filter.school = schoolId;
    }

    if (isCurrent !== undefined) {
      filter.isCurrent = isCurrent;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.academicYearModel
        .find(filter)
        .populate('school')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.academicYearModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel
      .findById(id)
      .populate('school')
      .exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    return academicYear;
  }

  async findBySchool(schoolId: string): Promise<AcademicYear[]> {
    return this.academicYearModel
      .find({ school: schoolId })
      .sort({ startDate: -1 })
      .exec();
  }

  async update(
    id: string,
    updateAcademicYearDto: UpdateAcademicYearDto,
  ): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (updateAcademicYearDto.name) {
      const existing = await this.academicYearModel
        .findOne({
          school: academicYear.school,
          name: updateAcademicYearDto.name,
          _id: { $ne: id },
        })
        .exec();

      if (existing) {
        throw new ConflictException(
          'Academic year with this name already exists for this school',
        );
      }
    }

    if (updateAcademicYearDto.isCurrent) {
      await this.academicYearModel
        .updateMany(
          { school: academicYear.school, _id: { $ne: id } },
          { isCurrent: false },
        )
        .exec();
    }

    Object.assign(academicYear, updateAcademicYearDto);
    return academicYear.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.academicYearModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Academic year not found');
    }
  }

  async setCurrentYear(
    schoolId: string,
    yearId: string,
  ): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel
      .findOne({ _id: yearId, school: schoolId })
      .exec();

    if (!academicYear) {
      throw new NotFoundException('Academic year not found for this school');
    }

    await this.academicYearModel
      .updateMany({ school: schoolId }, { isCurrent: false })
      .exec();

    academicYear.isCurrent = true;
    return academicYear.save();
  }

  async getCurrentYear(schoolId: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel
      .findOne({ school: schoolId, isCurrent: true })
      .exec();

    if (!academicYear) {
      throw new NotFoundException(
        'No current academic year found for this school',
      );
    }

    return academicYear;
  }

  async addTerm(id: string, addTermDto: AddTermDto): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

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
  ): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

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

  async removeTerm(id: string, termId: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

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
  ): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

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
  ): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

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

  async removeHoliday(id: string, holidayId: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearModel.findById(id).exec();

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
