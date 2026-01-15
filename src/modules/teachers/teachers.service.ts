import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Teacher,
  TeacherDocument,
} from '../../database/schemas/teacher.schema';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { AssignClassDto } from './dto/assign-class.dto';

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
  ) {}

  async create(
    createTeacherDto: CreateTeacherDto,
    schoolId: string,
  ): Promise<Teacher> {
    if (!createTeacherDto.employeeId) {
      createTeacherDto.employeeId = await this.generateEmployeeId(schoolId);
    }

    const existing = await this.teacherModel.findOne({
      school: schoolId,
      employeeId: createTeacherDto.employeeId,
    });

    if (existing) {
      throw new BadRequestException('Employee ID already exists');
    }

    const emailExists = await this.teacherModel.findOne({
      school: schoolId,
      email: createTeacherDto.email,
    });

    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    const teacher = new this.teacherModel({
      ...createTeacherDto,
      school: schoolId,
      subjects: [],
      assignedClasses: [],
    });

    return teacher.save();
  }

  async findAll(schoolId: string, filters: QueryTeacherDto) {
    const query: any = { school: schoolId };

    if (filters.department) {
      query.department = filters.department;
    }

    if (filters.designation) {
      query.designation = filters.designation;
    }

    if (filters.subjectId) {
      query.subjects = filters.subjectId;
    }

    if (filters.classId) {
      query.assignedClasses = filters.classId;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { employeeId: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      this.teacherModel
        .find(query)
        .populate('subjects', 'name code')
        .populate('assignedClasses', 'name grade')
        .populate('classTeacherOf', 'name grade')
        .skip(skip)
        .limit(limit)
        .sort({ firstName: 1 }),
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

  async findOne(id: string, schoolId: string): Promise<Teacher> {
    const teacher = await this.teacherModel
      .findOne({ _id: id, school: schoolId })
      .populate('subjects', 'name code')
      .populate('assignedClasses', 'name grade')
      .populate('classTeacherOf', 'name grade')
      .populate('user', '-password');

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async findByEmployeeId(
    employeeId: string,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({
      employeeId,
      school: schoolId,
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async update(
    id: string,
    updateTeacherDto: UpdateTeacherDto,
    schoolId: string,
  ): Promise<Teacher> {
    if (updateTeacherDto.email) {
      const emailExists = await this.teacherModel.findOne({
        school: schoolId,
        email: updateTeacherDto.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        throw new BadRequestException('Email already exists');
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

  async remove(id: string, schoolId: string): Promise<Teacher> {
    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async assignSubject(
    teacherId: string,
    assignSubjectDto: AssignSubjectDto,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({
      _id: teacherId,
      school: schoolId,
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const subjectId = new Types.ObjectId(assignSubjectDto.subjectId);

    const subject = await this.subjectModel.findOne({
      _id: subjectId,
      school: schoolId,
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (teacher.subjects.some((s) => s.equals(subjectId))) {
      throw new BadRequestException('Subject already assigned to teacher');
    }

    teacher.subjects.push(subjectId);
    return teacher.save();
  }

  async removeSubject(
    teacherId: string,
    subjectId: string,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOneAndUpdate(
      { _id: teacherId, school: schoolId },
      { $pull: { subjects: new Types.ObjectId(subjectId) } },
      { new: true },
    );

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async assignClass(
    teacherId: string,
    assignClassDto: AssignClassDto,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({
      _id: teacherId,
      school: schoolId,
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const classId = new Types.ObjectId(assignClassDto.classId);

    const classExists = await this.classModel.findOne({
      _id: classId,
      school: schoolId,
    });

    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    if (teacher.assignedClasses.some((c) => c.equals(classId))) {
      throw new BadRequestException('Class already assigned to teacher');
    }

    const updateData: {
      $push: { assignedClasses: Types.ObjectId };
      $set?: { classTeacherOf: Types.ObjectId };
    } = {
      $push: { assignedClasses: classId },
    };

    if (assignClassDto.setAsClassTeacher) {
      if (teacher.classTeacherOf) {
        throw new BadRequestException(
          'Teacher is already a class teacher of another class',
        );
      }
      updateData.$set = { classTeacherOf: classId };
    }

    return this.teacherModel.findOneAndUpdate(
      { _id: teacherId, school: schoolId },
      updateData,
      { new: true },
    );
  }

  async removeClass(
    teacherId: string,
    classId: string,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({
      _id: teacherId,
      school: schoolId,
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const classObjectId = new Types.ObjectId(classId);
    const updateData: {
      $pull: { assignedClasses: Types.ObjectId };
      $unset?: { classTeacherOf: number };
    } = {
      $pull: { assignedClasses: classObjectId },
    };

    if (teacher.classTeacherOf?.equals(classObjectId)) {
      updateData.$unset = { classTeacherOf: 1 };
    }

    return this.teacherModel.findOneAndUpdate(
      { _id: teacherId, school: schoolId },
      updateData,
      { new: true },
    );
  }

  async setAsClassTeacher(
    teacherId: string,
    classId: string,
    schoolId: string,
  ): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({
      _id: teacherId,
      school: schoolId,
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.classTeacherOf) {
      throw new BadRequestException(
        'Teacher is already a class teacher of another class',
      );
    }

    const classObjectId = new Types.ObjectId(classId);

    if (!teacher.assignedClasses.some((c) => c.equals(classObjectId))) {
      throw new BadRequestException(
        'Teacher must be assigned to the class first',
      );
    }

    teacher.classTeacherOf = classObjectId;
    return teacher.save();
  }

  async getSchedule(teacherId: string, schoolId: string) {
    const teacher = await this.teacherModel
      .findOne({ _id: teacherId, school: schoolId })
      .populate('subjects', 'name code')
      .populate('assignedClasses', 'name grade')
      .populate('classTeacherOf', 'name grade')
      .lean();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        employeeId: teacher.employeeId,
      },
      subjects: teacher.subjects || [],
      assignedClasses: teacher.assignedClasses || [],
      classTeacherOf: teacher.classTeacherOf || null,
    };
  }

  async getStatistics(teacherId: string, schoolId: string) {
    const teacher = await this.teacherModel
      .findOne({ _id: teacherId, school: schoolId })
      .lean();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const totalSubjects = teacher.subjects?.length || 0;
    const totalClasses = teacher.assignedClasses?.length || 0;
    const isClassTeacher = !!teacher.classTeacherOf;
    const totalQualifications = teacher.qualifications?.length || 0;
    const totalExperience = teacher.experience?.length || 0;

    let yearsOfExperience = 0;
    if (teacher.joiningDate) {
      const today = new Date();
      const joiningDate = new Date(teacher.joiningDate);
      // Calculate years more accurately by comparing year/month/day differences
      let years = today.getFullYear() - joiningDate.getFullYear();
      const monthDiff = today.getMonth() - joiningDate.getMonth();
      const dayDiff = today.getDate() - joiningDate.getDate();

      // Adjust if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        years--;
      }

      // Add fractional year based on months
      const additionalMonths =
        monthDiff >= 0 ? monthDiff : 12 + monthDiff;
      yearsOfExperience = years + additionalMonths / 12;
      yearsOfExperience = Math.floor(yearsOfExperience * 10) / 10;
    }

    return {
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        employeeId: teacher.employeeId,
        designation: teacher.designation,
        department: teacher.department,
      },
      statistics: {
        totalSubjects,
        totalClasses,
        isClassTeacher,
        totalQualifications,
        totalExperience,
        yearsOfExperience,
      },
    };
  }

  private async generateEmployeeId(schoolId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `EMP${currentYear}`;

    // Find the last teacher with an employeeId starting with this year's prefix
    // Note: This query uses the compound index (school, employeeId) efficiently
    // The sort works correctly because we use zero-padded numbers (00001, 00002, etc.)
    // which sort lexicographically in the same order as numerically
    const lastTeacher = await this.teacherModel
      .findOne({
        school: schoolId,
        employeeId: { $regex: `^${prefix}` },
      })
      .sort({ employeeId: -1 })
      .select('employeeId')
      .lean();

    let nextNumber = 1;
    if (lastTeacher && lastTeacher.employeeId) {
      const lastNumber = parseInt(
        lastTeacher.employeeId.replace(prefix, ''),
        10,
      );
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }
}
