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
    // Generate admission number if not provided
    if (!createStudentDto.admissionNumber) {
      createStudentDto.admissionNumber =
        await this.generateAdmissionNumber(schoolId);
    }

    // Check if admission number already exists
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

  async findAll(
    schoolId: string,
    filters: {
      classId?: string;
      section?: string;
      status?: StudentStatus;
      academicYearId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
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

  async updateStatus(
    id: string,
    status: StudentStatus,
    schoolId: string,
  ): Promise<Student> {
    return this.update(id, { status } as UpdateStudentDto, schoolId);
  }

  async assignToClass(
    studentId: string,
    classId: string,
    section: string,
    rollNumber: string,
    academicYearId: string,
    schoolId: string,
  ): Promise<Student> {
    const student = await this.studentModel.findOneAndUpdate(
      { _id: studentId, school: schoolId },
      {
        $set: {
          currentClass: classId,
          currentSection: section,
          rollNumber: rollNumber,
          currentAcademicYear: academicYearId,
        },
      },
      { new: true },
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
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

  async getAcademicHistory(studentId: string, schoolId: string) {
    const student = await this.studentModel
      .findOne({ _id: studentId, school: schoolId })
      .populate('academicHistory. academicYear', 'name')
      .populate('academicHistory.class', 'name grade')
      .select('academicHistory');

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student.academicHistory;
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
    const count = await this.studentModel.countDocuments({ school: schoolId });
    return `ADM${currentYear}${String(count + 1).padStart(5, '0')}`;
  }

  async getStudentStats(schoolId: string) {
    const stats = await this.studentModel.aggregate([
      { $match: { school: new Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const genderStats = await this.studentModel.aggregate([
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

    const classWiseStats = await this.studentModel.aggregate([
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
    ]);

    return {
      statusWise: stats,
      genderWise: genderStats,
      classWise: classWiseStats,
    };
  }
}
