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
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getStudentModel(
    context?: TenantContext,
  ): Promise<Model<StudentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<StudentDocument>(
        context.schoolCode,
        'Student',
      );
    }
    return this.studentModel;
  }

  async create(
    createStudentDto: CreateStudentDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);

    if (!createStudentDto.admissionNumber) {
      createStudentDto.admissionNumber = await this.generateAdmissionNumber(
        schoolId,
        context,
      );
    }

    const filter: any = { admissionNumber: createStudentDto.admissionNumber };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const existing = await model.findOne(filter);

    if (existing) {
      throw new BadRequestException('Admission number already exists');
    }

    const studentData: any = { ...createStudentDto };
    // Always set school - required by schema
    studentData.school = schoolId;

    const student = new model(studentData);

    return student.save();
  }

  async findAll(
    schoolId: string,
    filters: QueryStudentDto,
    context?: TenantContext,
  ) {
    const model = await this.getStudentModel(context);
    const query: any = {};

    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

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
      model
        .find(query)
        .populate('currentClass', 'name grade')
        .populate('parents', 'firstName lastName phone relationship')
        .skip(skip)
        .limit(limit)
        .sort({ firstName: 1 }),
      model.countDocuments(query),
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

  async findById(
    id: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model
      .findOne(filter)
      .populate('currentClass')
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
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    const filter: any = { admissionNumber };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model.findOne(filter);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model.findOneAndUpdate(
      filter,
      { $set: updateStudentDto },
      { new: true },
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async remove(
    id: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Student> {
    return this.updateStatus(id, StudentStatus.INACTIVE, schoolId, context);
  }

  async updateStatus(
    id: string,
    status: StudentStatus,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model.findOneAndUpdate(
      filter,
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
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: studentId };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model.findOneAndUpdate(
      filter,
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

  async getStatistics(schoolId: string, context?: TenantContext) {
    const model = await this.getStudentModel(context);
    const baseFilter: any = {};
    if (!context?.isTenantUser) {
      baseFilter.school = schoolId;
    }

    const total = await model.countDocuments(baseFilter);
    const active = await model.countDocuments({
      ...baseFilter,
      status: StudentStatus.ACTIVE,
    });

    const matchFilter: any = {};
    if (!context?.isTenantUser) {
      matchFilter.school = new Types.ObjectId(schoolId);
    }

    const statusWise = await model.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const genderWise = await model.aggregate([
      {
        $match: {
          ...matchFilter,
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

    const classWise = await model.aggregate([
      {
        $match: {
          ...matchFilter,
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
    context?: TenantContext,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const studentDto of students) {
      try {
        await this.create(studentDto, schoolId, context);
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

  async getAcademicHistory(
    studentId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: studentId };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model
      .findOne(filter)
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

  async getTransferHistory(
    studentId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: studentId };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const student = await model
      .findOne(filter)
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
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    return model.findByIdAndUpdate(
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
    context?: TenantContext,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    return model.findByIdAndUpdate(
      studentId,
      { $push: { transferHistory: transferEntry } },
      { new: true },
    );
  }

  private async generateAdmissionNumber(
    schoolId: string,
    context?: TenantContext,
  ): Promise<string> {
    const model = await this.getStudentModel(context);
    const currentYear = new Date().getFullYear();
    const prefix = `ADM${currentYear}`;

    const filter: any = { admissionNumber: { $regex: `^${prefix}` } };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    const lastStudent = await model
      .findOne(filter)
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
