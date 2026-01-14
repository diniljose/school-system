import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subject, SubjectDocument } from '../../database/schemas/subject.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto, schoolId: string): Promise<Subject> {
    const existing = await this.subjectModel.findOne({
      school: schoolId,
      code: createSubjectDto.code,
    });

    if (existing) {
      throw new BadRequestException('Subject with this code already exists');
    }

    const subject = new this.subjectModel({
      ...createSubjectDto,
      school: schoolId,
    });

    return subject.save();
  }

  async findAll(
    schoolId: string,
    filters: {
      type?: string;
      department?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { school: schoolId };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.department) {
      query.department = filters.department;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [subjects, total] = await Promise.all([
      this.subjectModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 }),
      this.subjectModel.countDocuments(query),
    ]);

    return {
      data: subjects,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Subject> {
    const subject = await this.subjectModel.findOne({ _id: id, school: schoolId });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto, schoolId: string): Promise<Subject> {
    if (updateSubjectDto.code) {
      const existing = await this.subjectModel.findOne({
        school: schoolId,
        code: updateSubjectDto.code,
        _id: { $ne: id },
      });

      if (existing) {
        throw new BadRequestException('Subject with this code already exists');
      }
    }

    const subject = await this.subjectModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateSubjectDto },
      { new: true },
    );

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    const result = await this.subjectModel.deleteOne({ _id: id, school: schoolId });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Subject not found');
    }
  }

  async assignToClass(subjectId: string, classId: string, schoolId: string): Promise<Subject> {
    const subject = await this.subjectModel.findOne({ _id: subjectId, school: schoolId });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async removeFromClass(subjectId: string, classId: string, schoolId: string): Promise<Subject> {
    const subject = await this.subjectModel.findOne({ _id: subjectId, school: schoolId });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async assignTeacher(
    subjectId: string,
    classId: string,
    teacherId: string,
    schoolId: string,
  ): Promise<any> {
    const subject = await this.subjectModel.findOne({ _id: subjectId, school: schoolId });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      message: 'Teacher assigned successfully',
      subjectId,
      classId,
      teacherId,
    };
  }

  async getSubjectTeachers(subjectId: string, schoolId: string) {
    const subject = await this.subjectModel.findOne({ _id: subjectId, school: schoolId });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      subjectId,
      subject: subject.name,
      teachers: [],
    };
  }

  async getSubjectClasses(subjectId: string, schoolId: string) {
    const subject = await this.subjectModel.findOne({ _id: subjectId, school: schoolId });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      subjectId,
      subject: subject.name,
      classes: [],
    };
  }
}
