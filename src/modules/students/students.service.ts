import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
import {
  StudentAction,
  StudentActionDto,
  BulkStudentActionDto,
  STUDENT_ACTION_OPTIONS,
} from './dto/student-action.dto';
import { EnrollmentStatus } from '../../database/schemas/enrollment.schema';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
} from '../../database/schemas/audit-log.schema';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async logActivity(
    action: AuditAction,
    resourceId: string,
    description: string,
    schoolId: string,
    userId: string,
    context?: TenantContext,
    previousData?: any,
    newData?: any,
  ) {
    try {
      const logData = {
        school: new Types.ObjectId(schoolId),
        user: new Types.ObjectId(userId),
        action,
        resource: 'Student',
        resourceId: new Types.ObjectId(resourceId),
        description,
        previousData,
        newData,
      };

      if (context?.isTenantUser && context?.schoolCode) {
        const auditModel = await this.tenantDatabaseService.getTenantModel(
          context.schoolCode,
          'AuditLog',
        );
        await auditModel.create(logData);
      } else {
        await this.auditLogModel.create(logData);
      }
    } catch (error) {
      this.logger.error('Failed to log activity', error.stack);
    }
  }

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
    userId?: string,
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
    const saved = await student.save();

    // Log activity
    if (userId) {
      await this.logActivity(
        AuditAction.CREATE,
        saved._id.toString(),
        `Student ${createStudentDto.firstName} ${createStudentDto.lastName} registered`,
        schoolId,
        userId,
        context,
        null,
        { firstName: createStudentDto.firstName, lastName: createStudentDto.lastName, admissionNumber: createStudentDto.admissionNumber },
      );
    }

    return saved;
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
      query.currentClass = new Types.ObjectId(filters.classId);
    }

    if (filters.section) {
      query.currentSection = filters.section;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.academicYearId) {
      query.currentAcademicYear = new Types.ObjectId(filters.academicYearId);
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
      items: students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      pages: Math.ceil(total / limit),
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
    userId?: string,
  ): Promise<Student> {
    const model = await this.getStudentModel(context);
    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = schoolId;
    }

    // Get previous data for audit log
    const previousStudent = await model.findOne(filter).lean();

    const student = await model.findOneAndUpdate(
      filter,
      { $set: updateStudentDto },
      { new: true },
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Log activity
    if (userId) {
      await this.logActivity(
        AuditAction.UPDATE,
        id,
        `Student ${student.firstName} ${student.lastName} updated`,
        schoolId,
        userId,
        context,
        previousStudent,
        updateStudentDto,
      );
    }

    return student;
  }

  async remove(
    id: string,
    schoolId: string,
    context?: TenantContext,
    userId?: string,
  ): Promise<Student> {
    return this.updateStatus(id, StudentStatus.INACTIVE, schoolId, context, userId, true);
  }

  async updateStatus(
    id: string,
    status: StudentStatus,
    schoolId: string,
    context?: TenantContext,
    userId?: string,
    isDelete?: boolean,
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

    // Log activity
    if (userId) {
      await this.logActivity(
        isDelete ? AuditAction.DELETE : AuditAction.UPDATE,
        id,
        isDelete
          ? `Student ${student.firstName} ${student.lastName} deactivated`
          : `Student ${student.firstName} ${student.lastName} status changed to ${status}`,
        schoolId,
        userId,
        context,
      );
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

  /**
   * Get available student action options filtered by student status
   */
  getActionOptions(studentStatus?: string) {
    if (!studentStatus) {
      return { data: STUDENT_ACTION_OPTIONS };
    }
    
    const filteredOptions = STUDENT_ACTION_OPTIONS.filter(option =>
      option.applicableStatuses.includes(studentStatus)
    );
    
    return { data: filteredOptions };
  }

  /**
   * Perform an action on a student (promote, fail, transfer, etc.)
   */
  async performAction(
    studentId: string,
    dto: StudentActionDto,
    schoolId: string,
    performedBy: string,
    context?: TenantContext,
  ) {
    const studentModel = await this.getStudentModel(context);
    
    const student = await studentModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate action is applicable for current status
    const actionOption = STUDENT_ACTION_OPTIONS.find(o => o.action === dto.action);
    if (!actionOption) {
      throw new BadRequestException(`Invalid action: ${dto.action}`);
    }
    
    if (!actionOption.applicableStatuses.includes(student.status)) {
      throw new BadRequestException(
        `Action '${dto.action}' cannot be performed on student with status '${student.status}'`
      );
    }

    // Get enrollment model for updating enrollment status
    const enrollmentModel = await this.tenantDatabaseService.getTenantModel(
      context.schoolCode,
      'Enrollment',
    );

    // Get class model if needed
    let classModel;
    if (actionOption.requiresClass) {
      classModel = await this.tenantDatabaseService.getTenantModel(
        context.schoolCode,
        'Class',
      );
    }

    const now = new Date();
    let result: any = { success: true };

    switch (dto.action) {
      case StudentAction.PROMOTE: {
        if (!dto.toClassId || !dto.toAcademicYearId) {
          throw new BadRequestException('Target class and academic year are required for promotion');
        }

        // Close current enrollment if exists
        if (student.currentAcademicYear && student.currentClass) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.PROMOTED,
              result: 'promoted',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Promoted to next class',
            }
          );
        }

        // Add to academic history
        await studentModel.findByIdAndUpdate(studentId, {
          $push: {
            academicHistory: {
              academicYear: student.currentAcademicYear,
              class: student.currentClass,
              section: student.currentSection,
              rollNumber: student.rollNumber,
              result: 'promoted',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Promoted',
            },
          },
        });

        // Update student's current class
        await studentModel.findByIdAndUpdate(studentId, {
          currentClass: new Types.ObjectId(dto.toClassId),
          currentSection: dto.toSection || '',
          currentAcademicYear: new Types.ObjectId(dto.toAcademicYearId),
          rollNumber: dto.rollNumber || '',
        });

        // Create new enrollment
        await enrollmentModel.create({
          school: student.school,
          student: student._id,
          academicYear: new Types.ObjectId(dto.toAcademicYearId),
          class: new Types.ObjectId(dto.toClassId),
          section: dto.toSection || '',
          rollNumber: dto.rollNumber || '',
          status: EnrollmentStatus.ACTIVE,
          enrollmentDate: now,
          enrolledBy: new Types.ObjectId(performedBy),
          previousEnrollment: {
            academicYear: student.currentAcademicYear,
            class: student.currentClass,
            section: student.currentSection,
            rollNumber: student.rollNumber,
          },
          remarks: dto.remarks || 'Promoted from previous class',
        });

        result.message = 'Student promoted successfully';
        break;
      }

      case StudentAction.PASS: {
        // Mark as passed without changing class
        if (student.currentAcademicYear) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.PASSED,
              result: 'pass',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Passed the academic year',
            }
          );
        }

        await studentModel.findByIdAndUpdate(studentId, {
          $push: {
            academicHistory: {
              academicYear: student.currentAcademicYear,
              class: student.currentClass,
              section: student.currentSection,
              rollNumber: student.rollNumber,
              result: 'pass',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Passed',
            },
          },
        });

        result.message = 'Student marked as passed';
        break;
      }

      case StudentAction.FAIL: {
        // Mark as failed
        if (student.currentAcademicYear) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.FAILED,
              result: 'fail',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Failed the academic year',
            }
          );
        }

        await studentModel.findByIdAndUpdate(studentId, {
          $push: {
            academicHistory: {
              academicYear: student.currentAcademicYear,
              class: student.currentClass,
              section: student.currentSection,
              rollNumber: student.rollNumber,
              result: 'fail',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Failed',
            },
          },
        });

        result.message = 'Student marked as failed';
        break;
      }

      case StudentAction.RETAIN: {
        if (!dto.toAcademicYearId) {
          throw new BadRequestException('Target academic year is required for retention');
        }

        // Close current enrollment
        if (student.currentAcademicYear) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.RETAINED,
              result: 'retained',
              percentage: dto.percentage,
              remarks: dto.remarks || 'Retained in same class',
            }
          );
        }

        // Add to academic history
        await studentModel.findByIdAndUpdate(studentId, {
          $push: {
            academicHistory: {
              academicYear: student.currentAcademicYear,
              class: student.currentClass,
              section: student.currentSection,
              rollNumber: student.rollNumber,
              result: 'retained',
              percentage: dto.percentage,
              remarks: dto.remarks || 'Retained',
            },
          },
        });

        // Create new enrollment in same class for next year
        await enrollmentModel.create({
          school: student.school,
          student: student._id,
          academicYear: new Types.ObjectId(dto.toAcademicYearId),
          class: student.currentClass,
          section: dto.toSection || student.currentSection,
          rollNumber: dto.rollNumber || '',
          status: EnrollmentStatus.ACTIVE,
          enrollmentDate: now,
          enrolledBy: new Types.ObjectId(performedBy),
          remarks: dto.remarks || 'Retained from previous year',
        });

        // Update academic year
        await studentModel.findByIdAndUpdate(studentId, {
          currentAcademicYear: new Types.ObjectId(dto.toAcademicYearId),
          currentSection: dto.toSection || student.currentSection,
          rollNumber: dto.rollNumber || '',
        });

        result.message = 'Student retained in same class';
        break;
      }

      case StudentAction.ENROLL: {
        if (!dto.toClassId || !dto.toAcademicYearId) {
          throw new BadRequestException('Class and academic year are required for enrollment');
        }

        // Create enrollment
        await enrollmentModel.create({
          school: student.school,
          student: student._id,
          academicYear: new Types.ObjectId(dto.toAcademicYearId),
          class: new Types.ObjectId(dto.toClassId),
          section: dto.toSection || '',
          rollNumber: dto.rollNumber || '',
          status: EnrollmentStatus.ACTIVE,
          enrollmentDate: now,
          enrolledBy: new Types.ObjectId(performedBy),
          remarks: dto.remarks,
        });

        await studentModel.findByIdAndUpdate(studentId, {
          currentClass: new Types.ObjectId(dto.toClassId),
          currentSection: dto.toSection || '',
          currentAcademicYear: new Types.ObjectId(dto.toAcademicYearId),
          rollNumber: dto.rollNumber || '',
          status: StudentStatus.ACTIVE,
        });

        result.message = 'Student enrolled successfully';
        break;
      }

      case StudentAction.CHANGE_SECTION: {
        if (!dto.toSection) {
          throw new BadRequestException('Target section is required');
        }

        await enrollmentModel.findOneAndUpdate(
          {
            student: student._id,
            academicYear: student.currentAcademicYear,
            status: EnrollmentStatus.ACTIVE,
          },
          {
            section: dto.toSection,
            rollNumber: dto.rollNumber || student.rollNumber,
            remarks: dto.remarks || 'Section changed',
          }
        );

        await studentModel.findByIdAndUpdate(studentId, {
          currentSection: dto.toSection,
          rollNumber: dto.rollNumber || student.rollNumber,
        });

        result.message = 'Section changed successfully';
        break;
      }

      case StudentAction.TRANSFER_OUT: {
        // Close current enrollment
        if (student.currentAcademicYear) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.TRANSFERRED,
              withdrawalDate: now,
              withdrawalReason: dto.reason || 'Transferred to another school',
              remarks: dto.remarks,
            }
          );
        }

        // Add transfer history
        await studentModel.findByIdAndUpdate(studentId, {
          status: StudentStatus.TRANSFERRED_OUT,
          $push: {
            transferHistory: {
              type: 'out',
              date: now,
              toSchool: dto.toSchoolName || '',
              reason: dto.reason || 'Transfer',
              transferCertificateNumber: dto.transferCertificateNumber || '',
              remarks: dto.remarks,
            },
          },
        });

        result.message = 'Student transferred out successfully';
        break;
      }

      case StudentAction.WITHDRAW: {
        // Close current enrollment
        if (student.currentAcademicYear) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.WITHDRAWN,
              withdrawalDate: now,
              withdrawalReason: dto.reason || 'Withdrawn from school',
              remarks: dto.remarks,
            }
          );
        }

        await studentModel.findByIdAndUpdate(studentId, {
          status: StudentStatus.DROPPED,
        });

        result.message = 'Student withdrawn successfully';
        break;
      }

      case StudentAction.GRADUATE: {
        // Close current enrollment
        if (student.currentAcademicYear) {
          await enrollmentModel.findOneAndUpdate(
            {
              student: student._id,
              academicYear: student.currentAcademicYear,
              status: EnrollmentStatus.ACTIVE,
            },
            {
              status: EnrollmentStatus.COMPLETED,
              result: 'graduated',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Graduated',
            }
          );
        }

        // Add to academic history
        await studentModel.findByIdAndUpdate(studentId, {
          status: StudentStatus.GRADUATED,
          $push: {
            academicHistory: {
              academicYear: student.currentAcademicYear,
              class: student.currentClass,
              section: student.currentSection,
              rollNumber: student.rollNumber,
              result: 'graduated',
              percentage: dto.percentage,
              rank: dto.rank,
              remarks: dto.remarks || 'Graduated',
            },
          },
        });

        result.message = 'Student graduated successfully';
        break;
      }

      case StudentAction.SUSPEND: {
        await studentModel.findByIdAndUpdate(studentId, {
          status: StudentStatus.SUSPENDED,
        });

        result.message = 'Student suspended';
        break;
      }

      case StudentAction.REINSTATE: {
        await studentModel.findByIdAndUpdate(studentId, {
          status: StudentStatus.ACTIVE,
        });

        result.message = 'Student reinstated';
        break;
      }

      case StudentAction.APPROVE: {
        if (!dto.toClassId || !dto.toAcademicYearId) {
          throw new BadRequestException('Class and academic year are required for approval');
        }

        // Create enrollment
        await enrollmentModel.create({
          school: student.school,
          student: student._id,
          academicYear: new Types.ObjectId(dto.toAcademicYearId),
          class: new Types.ObjectId(dto.toClassId),
          section: dto.toSection || '',
          rollNumber: dto.rollNumber || '',
          status: EnrollmentStatus.ACTIVE,
          enrollmentDate: now,
          enrolledBy: new Types.ObjectId(performedBy),
          remarks: 'Admission approved',
        });

        await studentModel.findByIdAndUpdate(studentId, {
          currentClass: new Types.ObjectId(dto.toClassId),
          currentSection: dto.toSection || '',
          currentAcademicYear: new Types.ObjectId(dto.toAcademicYearId),
          rollNumber: dto.rollNumber || '',
          status: StudentStatus.ACTIVE,
        });

        result.message = 'Student admission approved';
        break;
      }

      case StudentAction.REJECT: {
        await studentModel.findByIdAndUpdate(studentId, {
          status: StudentStatus.REJECTED,
        });

        result.message = 'Student admission rejected';
        break;
      }

      default:
        throw new BadRequestException(`Unknown action: ${dto.action}`);
    }

    // Get updated student
    const updatedStudent = await studentModel
      .findById(studentId)
      .populate('currentClass', 'name grade');

    result.data = updatedStudent;
    return result;
  }

  /**
   * Perform bulk action on multiple students
   */
  async performBulkAction(
    dto: BulkStudentActionDto,
    schoolId: string,
    performedBy: string,
    context?: TenantContext,
  ) {
    const results = {
      total: dto.studentIds.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ studentId: string; error: string }>,
    };

    for (const studentId of dto.studentIds) {
      try {
        await this.performAction(
          studentId,
          {
            action: dto.action,
            toClassId: dto.toClassId,
            toSection: dto.toSection,
            toAcademicYearId: dto.toAcademicYearId,
            reason: dto.reason,
            remarks: dto.remarks,
          },
          schoolId,
          performedBy,
          context,
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          studentId,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Bulk action completed: ${results.success} succeeded, ${results.failed} failed`,
      data: results,
    };
  }
}
