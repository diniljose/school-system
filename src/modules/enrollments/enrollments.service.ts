import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from '../../database/schemas/enrollment.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from '../../database/schemas/academic-year.schema';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Student.name)
    private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name)
    private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getEnrollmentModel(
    context?: TenantContext,
  ): Promise<Model<EnrollmentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<EnrollmentDocument>(
        context.schoolCode,
        'Enrollment',
      );
    }
    return this.enrollmentModel;
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

  private async getClassModel(
    context?: TenantContext,
  ): Promise<Model<ClassDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassDocument>(
        context.schoolCode,
        'Class',
      );
    }
    return this.classModel;
  }

  private async getAcademicYearModel(
    context?: TenantContext,
  ): Promise<Model<AcademicYearDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AcademicYearDocument>(
        context.schoolCode,
        'AcademicYear',
      );
    }
    return this.academicYearModel;
  }

  /**
   * Enroll a single student to a class/section for an academic year
   */
  async enrollStudent(
    dto: CreateEnrollmentDto,
    schoolId: string,
    enrolledBy: string,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);
    const studentModel = await this.getStudentModel(context);
    const classModel = await this.getClassModel(context);
    const academicYearModel = await this.getAcademicYearModel(context);

    // Validate student exists
    const student = await studentModel.findById(dto.studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate academic year exists
    const academicYear = await academicYearModel.findById(dto.academicYearId);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // Validate class exists
    const classData = await classModel.findById(dto.classId);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Validate section if class has sections and section is provided
    const hasSections = classData.sections && classData.sections.length > 0;
    let resolvedSection = dto.section || '';

    if (hasSections) {
      if (!dto.section) {
        // Default to first section if class has sections but none specified
        resolvedSection = classData.sections[0].name;
      }
      const sectionExists = classData.sections.find(
        (s) => s.name.toLowerCase() === resolvedSection.toLowerCase(),
      );
      if (!sectionExists) {
        throw new BadRequestException(
          `Section '${resolvedSection}' does not exist in class '${classData.name}'. Available sections: ${classData.sections.map((s) => s.name).join(', ')}`,
        );
      }

      // Check section capacity
      if (sectionExists.capacity) {
        const currentCount = await enrollmentModel.countDocuments({
          academicYear: new Types.ObjectId(dto.academicYearId),
          class: new Types.ObjectId(dto.classId),
          section: resolvedSection,
          status: EnrollmentStatus.ACTIVE,
        });
        if (currentCount >= sectionExists.capacity) {
          throw new BadRequestException(
            `Section '${resolvedSection}' is full (capacity: ${sectionExists.capacity}, current: ${currentCount})`,
          );
        }
      }
    } else {
      // Class has no sections — section is empty
      resolvedSection = '';
    }

    // Check if student already has an active enrollment for this academic year
    const existingEnrollment = await enrollmentModel.findOne({
      student: new Types.ObjectId(dto.studentId),
      academicYear: new Types.ObjectId(dto.academicYearId),
      status: EnrollmentStatus.ACTIVE,
    });

    // Store previous enrollment info for history tracking
    let previousEnrollment = undefined;
    if (existingEnrollment) {
      previousEnrollment = {
        academicYear: existingEnrollment.academicYear,
        class: existingEnrollment.class,
        section: existingEnrollment.section,
        rollNumber: existingEnrollment.rollNumber,
      };
      // Mark old enrollment as completed (class change within same year)
      existingEnrollment.status = EnrollmentStatus.COMPLETED;
      existingEnrollment.remarks = 'Superseded by new enrollment';
      await existingEnrollment.save();
    }

    // Auto-generate roll number if not provided
    const rollNumber =
      dto.rollNumber ||
      (await this.generateRollNumber(
        dto.classId,
        resolvedSection,
        dto.academicYearId,
        context,
      ));

    // Create enrollment
    const enrollment = new enrollmentModel({
      school: new Types.ObjectId(schoolId),
      student: new Types.ObjectId(dto.studentId),
      academicYear: new Types.ObjectId(dto.academicYearId),
      class: new Types.ObjectId(dto.classId),
      section: resolvedSection,
      rollNumber,
      status: EnrollmentStatus.ACTIVE,
      enrollmentDate: dto.enrollmentDate
        ? new Date(dto.enrollmentDate)
        : new Date(),
      remarks: dto.remarks,
      enrolledBy: new Types.ObjectId(enrolledBy),
      previousEnrollment,
    });

    await enrollment.save();

    // Update student's current class, section, and academic year
    await studentModel.findByIdAndUpdate(dto.studentId, {
      currentClass: new Types.ObjectId(dto.classId),
      currentSection: resolvedSection,
      currentAcademicYear: new Types.ObjectId(dto.academicYearId),
      rollNumber,
      status: 'active',
    });

    // Add to student's academic history
    await studentModel.findByIdAndUpdate(dto.studentId, {
      $push: {
        academicHistory: {
          academicYear: new Types.ObjectId(dto.academicYearId),
          class: new Types.ObjectId(dto.classId),
          section: resolvedSection,
          rollNumber,
          result: 'enrolled',
          remarks: dto.remarks || 'Enrolled',
        },
      },
    });

    this.logger.log(
      `Student ${dto.studentId} enrolled in class ${classData.name}${resolvedSection ? ' section ' + resolvedSection : ''} for academic year ${academicYear.name}`,
    );

    return {
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment,
    };
  }

  /**
   * Bulk enroll multiple students to a class/section
   */
  async bulkEnroll(
    dto: BulkEnrollmentDto,
    schoolId: string,
    enrolledBy: string,
    context?: TenantContext,
  ) {
    const results = {
      total: dto.students.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{
        studentId: string;
        error: string;
      }>,
      enrollments: [] as any[],
    };

    for (const studentItem of dto.students) {
      try {
        const enrollment = await this.enrollStudent(
          {
            studentId: studentItem.studentId,
            academicYearId: dto.academicYearId,
            classId: dto.classId,
            section: studentItem.section || dto.section,
            rollNumber: studentItem.rollNumber,
            enrollmentDate: dto.enrollmentDate,
            remarks: dto.remarks,
          },
          schoolId,
          enrolledBy,
          context,
        );
        results.success++;
        results.enrollments.push(enrollment.data);
      } catch (error) {
        results.failed++;
        results.errors.push({
          studentId: studentItem.studentId,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Bulk enrollment completed: ${results.success} succeeded, ${results.failed} failed`,
      data: results,
    };
  }

  /**
   * Get all enrollments with filters and pagination
   */
  async findAll(
    schoolId: string,
    query: QueryEnrollmentDto,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);

    const filter: any = {};
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (query.academicYearId) {
      filter.academicYear = new Types.ObjectId(query.academicYearId);
    }
    if (query.classId) {
      filter.class = new Types.ObjectId(query.classId);
    }
    if (query.section) {
      filter.section = query.section;
    }
    if (query.studentId) {
      filter.student = new Types.ObjectId(query.studentId);
    }
    if (query.status) {
      filter.status = query.status;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      enrollmentModel
        .find(filter)
        .populate('student', 'firstName lastName admissionNumber gender photo')
        .populate('class', 'name grade')
        .populate('academicYear', 'name startDate endDate isCurrent')
        .populate('enrolledBy', 'firstName lastName')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      enrollmentModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get enrollment by ID
   */
  async findById(id: string, schoolId: string, context?: TenantContext) {
    const enrollmentModel = await this.getEnrollmentModel(context);
    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const enrollment = await enrollmentModel
      .findOne(filter)
      .populate('student', 'firstName lastName admissionNumber gender photo dateOfBirth contact')
      .populate('class', 'name grade sections')
      .populate('academicYear', 'name startDate endDate isCurrent')
      .populate('enrolledBy', 'firstName lastName');

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return { success: true, data: enrollment };
  }

  /**
   * Update enrollment (change section, roll number, etc.)
   */
  async update(
    id: string,
    dto: UpdateEnrollmentDto,
    schoolId: string,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);
    const studentModel = await this.getStudentModel(context);

    const filter: any = { _id: id };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const enrollment = await enrollmentModel.findOne(filter);
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const updateData: any = {};
    if (dto.section) updateData.section = dto.section;
    if (dto.rollNumber) updateData.rollNumber = dto.rollNumber;
    if (dto.status) updateData.status = dto.status;
    if (dto.remarks) updateData.remarks = dto.remarks;
    if (dto.result) updateData.result = dto.result;
    if (dto.percentage !== undefined) updateData.percentage = dto.percentage;
    if (dto.rank !== undefined) updateData.rank = dto.rank;

    if (dto.status === EnrollmentStatus.WITHDRAWN) {
      updateData.withdrawalDate = new Date();
      updateData.withdrawalReason = dto.withdrawalReason;
    }

    const updated = await enrollmentModel.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true },
    );

    // Sync student's current info if section/rollNumber changed
    if (
      enrollment.status === EnrollmentStatus.ACTIVE &&
      (dto.section || dto.rollNumber)
    ) {
      const studentUpdate: any = {};
      if (dto.section) studentUpdate.currentSection = dto.section;
      if (dto.rollNumber) studentUpdate.rollNumber = dto.rollNumber;
      await studentModel.findByIdAndUpdate(enrollment.student, {
        $set: studentUpdate,
      });
    }

    return { success: true, message: 'Enrollment updated', data: updated };
  }

  /**
   * Withdraw a student from enrollment
   */
  async withdrawStudent(
    enrollmentId: string,
    reason: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    return this.update(
      enrollmentId,
      {
        status: EnrollmentStatus.WITHDRAWN,
        withdrawalReason: reason,
      },
      schoolId,
      context,
    );
  }

  /**
   * Get enrollment history for a student across all academic years
   */
  async getStudentEnrollmentHistory(
    studentId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);
    const studentModel = await this.getStudentModel(context);

    const student = await studentModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const filter: any = { student: new Types.ObjectId(studentId) };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const enrollments = await enrollmentModel
      .find(filter)
      .populate('class', 'name grade')
      .populate('academicYear', 'name startDate endDate')
      .sort({ enrollmentDate: -1 });

    return {
      success: true,
      data: {
        student: {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
        },
        enrollments,
        totalEnrollments: enrollments.length,
      },
    };
  }

  /**
   * Get students enrolled in a specific class/section for an academic year
   */
  async getClassEnrollments(
    classId: string,
    section: string,
    academicYearId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);

    const filter: any = {
      class: new Types.ObjectId(classId),
      section,
      academicYear: new Types.ObjectId(academicYearId),
      status: EnrollmentStatus.ACTIVE,
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const enrollments = await enrollmentModel
      .find(filter)
      .populate('student', 'firstName lastName admissionNumber gender photo rollNumber')
      .sort({ rollNumber: 1 });

    return {
      success: true,
      data: enrollments,
      count: enrollments.length,
    };
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats(
    schoolId: string,
    academicYearId?: string,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);

    const baseFilter: any = {};
    if (!context?.isTenantUser) {
      baseFilter.school = new Types.ObjectId(schoolId);
    }
    if (academicYearId) {
      baseFilter.academicYear = new Types.ObjectId(academicYearId);
    }

    const [
      totalEnrollments,
      activeEnrollments,
      withdrawnEnrollments,
      classWiseStats,
    ] = await Promise.all([
      enrollmentModel.countDocuments(baseFilter),
      enrollmentModel.countDocuments({
        ...baseFilter,
        status: EnrollmentStatus.ACTIVE,
      }),
      enrollmentModel.countDocuments({
        ...baseFilter,
        status: EnrollmentStatus.WITHDRAWN,
      }),
      enrollmentModel.aggregate([
        { $match: { ...baseFilter, status: EnrollmentStatus.ACTIVE } },
        {
          $group: {
            _id: { class: '$class', section: '$section' },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'classes',
            localField: '_id.class',
            foreignField: '_id',
            as: 'classInfo',
          },
        },
        { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            classId: '$_id.class',
            className: '$classInfo.name',
            grade: '$classInfo.grade',
            section: '$_id.section',
            count: 1,
          },
        },
        { $sort: { grade: 1, section: 1 } },
      ]),
    ]);

    return {
      success: true,
      data: {
        totalEnrollments,
        activeEnrollments,
        withdrawnEnrollments,
        completedEnrollments:
          totalEnrollments - activeEnrollments - withdrawnEnrollments,
        classWise: classWiseStats,
      },
    };
  }

  /**
   * Get unenrolled students (students without active enrollment for given academic year)
   */
  async getUnenrolledStudents(
    schoolId: string,
    academicYearId: string,
    context?: TenantContext,
  ) {
    const enrollmentModel = await this.getEnrollmentModel(context);
    const studentModel = await this.getStudentModel(context);

    // Get all student IDs with active enrollment for this academic year
    const enrolledStudentIds = await enrollmentModel.distinct('student', {
      academicYear: new Types.ObjectId(academicYearId),
      status: EnrollmentStatus.ACTIVE,
      ...(context?.isTenantUser
        ? {}
        : { school: new Types.ObjectId(schoolId) }),
    });

    // Find students NOT in that list
    const filter: any = {
      _id: { $nin: enrolledStudentIds },
      status: { $in: ['active', 'pending_approval'] },
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    const students = await studentModel
      .find(filter)
      .select('firstName lastName admissionNumber gender currentClass currentSection')
      .populate('currentClass', 'name grade')
      .sort({ firstName: 1 });

    return {
      success: true,
      data: students,
      count: students.length,
    };
  }

  /**
   * Auto-generate roll number
   */
  private async generateRollNumber(
    classId: string,
    section: string,
    academicYearId: string,
    context?: TenantContext,
  ): Promise<string> {
    const enrollmentModel = await this.getEnrollmentModel(context);

    const count = await enrollmentModel.countDocuments({
      class: new Types.ObjectId(classId),
      section,
      academicYear: new Types.ObjectId(academicYearId),
    });

    return String(count + 1).padStart(3, '0');
  }
}
