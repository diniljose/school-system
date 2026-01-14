import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AddSectionDto } from './dto/add-section.dto';
import { SetPromotionCriteriaDto } from './dto/set-promotion-criteria.dto';
import { SetFeeStructureDto } from './dto/set-fee-structure.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
  ) {}

  async create(
    createClassDto: CreateClassDto,
    schoolId: string,
  ): Promise<Class> {
    const existing = await this.classModel.findOne({
      school: schoolId,
      name: createClassDto.name,
    });

    if (existing) {
      throw new BadRequestException('Class with this name already exists');
    }

    const classEntity = new this.classModel({
      ...createClassDto,
      school: schoolId,
    });

    return classEntity.save();
  }

  async findAll(
    schoolId: string,
    filters: {
      grade?: number;
      isActive?: boolean;
      search?: string;
    },
    pagination: {
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { school: schoolId };

    if (filters.grade !== undefined) {
      query.grade = filters.grade;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      this.classModel
        .find(query)
        .populate('nextClass', 'name grade')
        .populate('subjects', 'name code')
        .skip(skip)
        .limit(limit)
        .sort({ grade: 1 }),
      this.classModel.countDocuments(query),
    ]);

    return {
      data: classes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Class> {
    const classEntity = await this.classModel
      .findOne({ _id: id, school: schoolId })
      .populate('nextClass', 'name grade')
      .populate('subjects', 'name code')
      .populate('sections.classTeacher', 'firstName lastName');

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async update(
    id: string,
    updateClassDto: UpdateClassDto,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateClassDto },
      { new: true },
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    const result = await this.classModel.deleteOne({
      _id: id,
      school: schoolId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Class not found');
    }
  }

  async addSection(
    classId: string,
    sectionDto: AddSectionDto,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOne({
      _id: classId,
      school: schoolId,
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const sectionExists = classEntity.sections.some(
      (s) => s.name === sectionDto.name,
    );
    if (sectionExists) {
      throw new BadRequestException('Section with this name already exists');
    }

    classEntity.sections.push({
      name: sectionDto.name,
      capacity: sectionDto.capacity,
      classTeacher: null,
    });

    return classEntity.save();
  }

  async updateSection(
    classId: string,
    sectionName: string,
    sectionDto: Partial<AddSectionDto>,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOne({
      _id: classId,
      school: schoolId,
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const section = classEntity.sections.find((s) => s.name === sectionName);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (sectionDto.name && sectionDto.name !== sectionName) {
      const nameExists = classEntity.sections.some(
        (s) => s.name === sectionDto.name,
      );
      if (nameExists) {
        throw new BadRequestException('Section with this name already exists');
      }
      section.name = sectionDto.name;
    }

    if (sectionDto.capacity) {
      section.capacity = sectionDto.capacity;
    }

    return classEntity.save();
  }

  async removeSection(
    classId: string,
    sectionName: string,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOne({
      _id: classId,
      school: schoolId,
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const sectionIndex = classEntity.sections.findIndex(
      (s) => s.name === sectionName,
    );
    if (sectionIndex === -1) {
      throw new NotFoundException('Section not found');
    }

    classEntity.sections.splice(sectionIndex, 1);
    return classEntity.save();
  }

  async assignSubjects(
    classId: string,
    subjectIds: string[],
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel
      .findOneAndUpdate(
        { _id: classId, school: schoolId },
        {
          $addToSet: {
            subjects: { $each: subjectIds.map((id) => new Types.ObjectId(id)) },
          },
        },
        { new: true },
      )
      .populate('subjects', 'name code');

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async removeSubject(
    classId: string,
    subjectId: string,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel
      .findOneAndUpdate(
        { _id: classId, school: schoolId },
        { $pull: { subjects: new Types.ObjectId(subjectId) } },
        { new: true },
      )
      .populate('subjects', 'name code');

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async setClassTeacher(
    classId: string,
    sectionName: string,
    teacherId: string,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOne({
      _id: classId,
      school: schoolId,
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const section = classEntity.sections.find((s) => s.name === sectionName);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    section.classTeacher = new Types.ObjectId(teacherId);
    return classEntity.save();
  }

  async setPromotionCriteria(
    classId: string,
    criteriaDto: SetPromotionCriteriaDto,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOneAndUpdate(
      { _id: classId, school: schoolId },
      {
        $set: {
          promotionCriteria: {
            minimumPercentage: criteriaDto.minimumPercentage,
            minimumAttendance: criteriaDto.minimumAttendance,
            mandatorySubjects:
              criteriaDto.mandatorySubjects?.map(
                (id) => new Types.ObjectId(id),
              ) || [],
          },
        },
      },
      { new: true },
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async setFeeStructure(
    classId: string,
    feeStructureDto: SetFeeStructureDto,
    schoolId: string,
  ): Promise<Class> {
    const classEntity = await this.classModel.findOneAndUpdate(
      { _id: classId, school: schoolId },
      { $set: { feeStructure: feeStructureDto } },
      { new: true },
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async getClassStudents(
    classId: string,
    sectionName: string,
    schoolId: string,
  ) {
    const classEntity = await this.classModel.findOne({
      _id: classId,
      school: schoolId,
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const section = classEntity.sections.find((s) => s.name === sectionName);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return {
      class: classEntity.name,
      section: sectionName,
      capacity: section.capacity,
      students: [],
    };
  }

  async getClassStatistics(classId: string, schoolId: string) {
    const classEntity = await this.classModel
      .findOne({ _id: classId, school: schoolId })
      .populate('subjects', 'name');

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const statistics = {
      class: classEntity.name,
      grade: classEntity.grade,
      totalSections: classEntity.sections.length,
      totalCapacity: classEntity.sections.reduce(
        (sum, s) => sum + s.capacity,
        0,
      ),
      sections: classEntity.sections.map((section) => ({
        name: section.name,
        capacity: section.capacity,
        enrolled: 0,
        classTeacher: section.classTeacher,
      })),
      totalSubjects: classEntity.subjects.length,
      subjects: classEntity.subjects,
      feeStructure: classEntity.feeStructure,
      promotionCriteria: classEntity.promotionCriteria,
    };

    return statistics;
  }
}
