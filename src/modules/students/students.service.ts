import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { StudentStatus } from '../../common/enums/student-status.enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async create(
    createStudentDto: CreateStudentDto,
    schoolId: string,
  ): Promise<Student> {
    if (!createStudentDto.admissionNumber) {
      createStudentDto.admissionNumber =
        await this.generateAdmissionNumber(schoolId);
    }

    const existing = await this.studentModel.findOne({
      school: schoolId,
      admissionNumber: createStudentDto.admissionNumber,
    });

    if (existing) {
      throw new BadRequestException('Admission number already exists');
    }

    const student = new this.studentModel({
      ...createStudentDto,
      school: schoolId,
    });

    return student.save();
  }

  async findAll(schoolId: string, filters: QueryStudentDto) {
    const query: any = { school: schoolId };

    if (filters.classId) {
      query.currentClass = filters.classId;
    }

    if (filters.section) {
      query.currentSection = filters.section;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.academicYearId) {
      query.currentAcademicYear = filters.academicYearId;
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { admissionNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      this.studentModel
        .find(query)
        .populate('currentClass', 'name grade')
        .populate('currentSection')
        .populate('parents', 'firstName lastName phone relationship')
        .skip(skip)
        .limit(limit)
        .sort({ firstName: 1 }),
      this.studentModel.countDocuments(query),
    ]);

    return {
      data: students,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Student> {
    const student = await this.studentModel
      .findOne({ _id: id, school: schoolId })
      .populate('currentClass')
      .populate('currentSection')
      .populate('currentAcademicYear')
      .populate('parents')
      .populate('user', '-password');

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async findByAdmissionNumber(
    admissionNumber: string,
    schoolId: string,
  ): Promise<Student> {
    const student = await this.studentModel.findOne({
      admissionNumber,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
    schoolId: string,
  ): Promise<Student> {
    const student = await this.studentModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateStudentDto },
      { new: true },
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async remove(id: string, schoolId: string): Promise<Student> {
    return this.updateStatus(id, StudentStatus.INACTIVE, schoolId);
  }

  async updateStatus(
    id: string,
    status: StudentStatus,
    schoolId: string,
  ): Promise<Student> {
    const student = await this.studentModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: { status } },
      { new: true },
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async assignClass(
    studentId: string,
    assignClassDto: AssignClassDto,
    schoolId: string,
  ): Promise<Student> {
    const student = await this.studentModel.findOneAndUpdate(
      { _id: studentId, school: schoolId },
      {
        $set: {
          currentClass: assignClassDto.classId,
          currentSection: assignClassDto.section,
          rollNumber: assignClassDto.rollNumber,
          currentAcademicYear: assignClassDto.academicYearId,
        },
      },
      { new: true },
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getStatistics(schoolId: string) {
    const total = await this.studentModel.countDocuments({ school: schoolId });
    const active = await this.studentModel.countDocuments({
      school: schoolId,
      status: StudentStatus.ACTIVE,
    });

    const statusWise = await this.studentModel.aggregate([
      { $match: { school: new Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const genderWise = await this.studentModel.aggregate([
      {
        $match: {
          school: new Types.ObjectId(schoolId),
          status: StudentStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
        },
      },
    ]);

    const classWise = await this.studentModel.aggregate([
      {
        $match: {
          school: new Types.ObjectId(schoolId),
          status: StudentStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: '$currentClass',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      {
        $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          className: '$classInfo.name',
          grade: '$classInfo.grade',
        },
      },
    ]);

    return {
      total,
      active,
      statusWise,
      genderWise,
      classWise,
    };
  }

  async bulkImport(
    students: CreateStudentDto[],
    schoolId: string,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const studentDto of students) {
      try {
        await this.create(studentDto, schoolId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          student: studentDto,
          error: error.message,
        });
      }
    }

    return results;
  }

  async getAcademicHistory(studentId: string, schoolId: string) {
    const student = await this.studentModel
      .findOne({ _id: studentId, school: schoolId })
      .select('academicHistory firstName lastName admissionNumber')
      .lean();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
      },
      academicHistory: student.academicHistory || [],
    };
  }

  async getTransferHistory(studentId: string, schoolId: string) {
    const student = await this.studentModel
      .findOne({ _id: studentId, school: schoolId })
      .select('transferHistory firstName lastName admissionNumber')
      .lean();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
      },
      transferHistory: student.transferHistory || [],
    };
  }

  async addAcademicHistory(
    studentId: string,
    historyEntry: {
      academicYear: Types.ObjectId;
      class: Types.ObjectId;
      section: Types.ObjectId;
      rollNumber: string;
      result: string;
      percentage: number;
      rank: number;
      remarks: string;
    },
  ): Promise<Student> {
    return this.studentModel.findByIdAndUpdate(
      studentId,
      { $push: { academicHistory: historyEntry } },
      { new: true },
    );
  }

  async addTransferHistory(
    studentId: string,
    transferEntry: {
      type: string;
      date: Date;
      fromSchool: string;
      toSchool: string;
      reason: string;
      transferCertificateNumber: string;
      remarks: string;
    },
  ): Promise<Student> {
    return this.studentModel.findByIdAndUpdate(
      studentId,
      { $push: { transferHistory: transferEntry } },
      { new: true },
    );
  }

  private async generateAdmissionNumber(schoolId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `ADM${currentYear}`;

    const lastStudent = await this.studentModel
      .findOne({
        school: schoolId,
        admissionNumber: { $regex: `^${prefix}` },
      })
      .sort({ admissionNumber: -1 })
      .select('admissionNumber')
      .lean();

    let nextNumber = 1;
    if (lastStudent && lastStudent.admissionNumber) {
      const lastNumber = parseInt(
        lastStudent.admissionNumber.replace(prefix, ''),
        10,
      );
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }
}
