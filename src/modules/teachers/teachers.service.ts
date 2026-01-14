import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Teacher, TeacherDocument } from '../../database/schemas/teacher.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AddQualificationDto } from './dto/add-qualification.dto';
import { AddExperienceDto } from './dto/add-experience.dto';

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
  ) {}

  private generateEmployeeId(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `EMP${year}${random}`;
  }

  async create(createTeacherDto: CreateTeacherDto, schoolId: string): Promise<Teacher> {
    const emailExists = await this.teacherModel.findOne({
      school: schoolId,
      email: createTeacherDto.email,
    });

    if (emailExists) {
      throw new BadRequestException('Teacher with this email already exists');
    }

    let employeeId: string;
    let isUnique = false;

    while (!isUnique) {
      employeeId = this.generateEmployeeId();
      const existing = await this.teacherModel.findOne({
        school: schoolId,
        employeeId,
      });
      if (!existing) {
        isUnique = true;
      }
    }

    const teacher = new this.teacherModel({
      ...createTeacherDto,
      school: schoolId,
      employeeId,
    });

    return teacher.save();
  }

  async findAll(
    schoolId: string,
    filters: {
      department?: string;
      designation?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination: {
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { school: schoolId };

    if (filters.department) {
      query.department = filters.department;
    }

    if (filters.designation) {
      query.designation = filters.designation;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { employeeId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      this.teacherModel
        .find(query)
        .populate('subjects', 'name code')
        .populate('assignedClasses', 'name grade')
        .populate('classTeacherOf', 'name grade')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.teacherModel.countDocuments(query),
    ]);

    return {
      data: teachers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Teacher> {
    const teacher = await this.teacherModel
      .findOne({ _id: id, school: schoolId })
      .populate('subjects', 'name code')
      .populate('assignedClasses', 'name grade')
      .populate('classTeacherOf', 'name grade')
      .populate('user', 'email username');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto, schoolId: string): Promise<Teacher> {
    if (updateTeacherDto.email) {
      const emailExists = await this.teacherModel.findOne({
        school: schoolId,
        email: updateTeacherDto.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        throw new BadRequestException('Teacher with this email already exists');
      }
    }

    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateTeacherDto },
      { new: true },
    );

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    const result = await this.teacherModel.deleteOne({ _id: id, school: schoolId });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Teacher not found');
    }
  }

  async addQualification(
    teacherId: string,
    qualificationDto: AddQualificationDto,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({ _id: teacherId, school: schoolId });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    teacher.qualifications.push({
      degree: qualificationDto.degree,
      institution: qualificationDto.institution,
      year: qualificationDto.year,
      grade: qualificationDto.grade,
    });

    return teacher.save();
  }

  async removeQualification(
    teacherId: string,
    qualificationIndex: number,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({ _id: teacherId, school: schoolId });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (qualificationIndex < 0 || qualificationIndex >= teacher.qualifications.length) {
      throw new BadRequestException('Invalid qualification index');
    }

    teacher.qualifications.splice(qualificationIndex, 1);
    return teacher.save();
  }

  async addExperience(
    teacherId: string,
    experienceDto: AddExperienceDto,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({ _id: teacherId, school: schoolId });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    teacher.experience.push({
      institution: experienceDto.institution,
      designation: experienceDto.designation,
      fromDate: new Date(experienceDto.fromDate),
      toDate: experienceDto.toDate ? new Date(experienceDto.toDate) : undefined,
      description: experienceDto.description || '',
    });

    return teacher.save();
  }

  async removeExperience(
    teacherId: string,
    experienceIndex: number,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({ _id: teacherId, school: schoolId });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (experienceIndex < 0 || experienceIndex >= teacher.experience.length) {
      throw new BadRequestException('Invalid experience index');
    }

    teacher.experience.splice(experienceIndex, 1);
    return teacher.save();
  }

  async assignSubjects(
    teacherId: string,
    subjectIds: string[],
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: teacherId, school: schoolId },
      { $addToSet: { subjects: { $each: subjectIds.map(id => new Types.ObjectId(id)) } } },
      { new: true },
    ).populate('subjects', 'name code');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async assignClasses(
    teacherId: string,
    classIds: string[],
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: teacherId, school: schoolId },
      { $addToSet: { assignedClasses: { $each: classIds.map(id => new Types.ObjectId(id)) } } },
      { new: true },
    ).populate('assignedClasses', 'name grade');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async setAsClassTeacher(
    teacherId: string,
    classId: string,
    sectionName: string,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({ _id: teacherId, school: schoolId });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    teacher.classTeacherOf = new Types.ObjectId(classId);
    await teacher.save();

    return this.teacherModel
      .findById(teacherId)
      .populate('classTeacherOf', 'name grade')
      .exec();
  }

  async getTeacherSchedule(teacherId: string, schoolId: string) {
    const teacher = await this.teacherModel
      .findOne({ _id: teacherId, school: schoolId })
      .populate('subjects', 'name code')
      .populate('assignedClasses', 'name grade sections');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      teacher: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        employeeId: teacher.employeeId,
      },
      subjects: teacher.subjects,
      classes: teacher.assignedClasses,
      classTeacherOf: teacher.classTeacherOf,
      schedule: [],
    };
  }

  async getTeacherClasses(teacherId: string, schoolId: string) {
    const teacher = await this.teacherModel
      .findOne({ _id: teacherId, school: schoolId })
      .populate('assignedClasses', 'name grade sections')
      .populate('classTeacherOf', 'name grade sections');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      teacher: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        employeeId: teacher.employeeId,
      },
      assignedClasses: teacher.assignedClasses,
      classTeacherOf: teacher.classTeacherOf,
    };
  }

  async getTeacherStatistics(schoolId: string) {
    const [
      totalTeachers,
      activeTeachers,
      departmentStats,
      designationStats,
    ] = await Promise.all([
      this.teacherModel.countDocuments({ school: schoolId }),
      this.teacherModel.countDocuments({ school: schoolId, isActive: true }),
      this.teacherModel.aggregate([
        { $match: { school: new Types.ObjectId(schoolId) } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.teacherModel.aggregate([
        { $match: { school: new Types.ObjectId(schoolId) } },
        { $group: { _id: '$designation', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      totalTeachers,
      activeTeachers,
      inactiveTeachers: totalTeachers - activeTeachers,
      byDepartment: departmentStats.map(stat => ({
        department: stat._id || 'Not Assigned',
        count: stat.count,
      })),
      byDesignation: designationStats.map(stat => ({
        designation: stat._id || 'Not Assigned',
        count: stat.count,
      })),
    };
  }
}
