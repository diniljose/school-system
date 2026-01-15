import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Promotion,
  PromotionDocument,
} from '../../database/schemas/promotion.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from '../../database/schemas/academic-year.schema';
import { Result, ResultDocument } from '../../database/schemas/result.schema';
import {
  Attendance,
  AttendanceDocument,
} from '../../database/schemas/attendance.schema';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { RetainStudentDto } from './dto/retain-student.dto';
import { BulkPromoteDto } from './dto/bulk-promote.dto';
import {
  PromotionStatus,
  StudentStatus,
  AttendanceStatus,
} from '../../common/enums/student-status.enum';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name)
    private promotionModel: Model<PromotionDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
  ) {}

  async checkEligibility(studentId: string, fromAcademicYear: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const academicYear =
      await this.academicYearModel.findById(fromAcademicYear);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const classData = await this.classModel.findById(student.currentClass);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const results = await this.resultModel
      .find({
        student: new Types.ObjectId(studentId),
        academicYear: new Types.ObjectId(fromAcademicYear),
      })
      .exec();

    let totalPercentage = 0;
    let resultCount = 0;

    if (results.length > 0) {
      totalPercentage = results.reduce(
        (sum, result) => sum + (result.percentage || 0),
        0,
      );
      resultCount = results.length;
    }

    const averagePercentage =
      resultCount > 0 ? totalPercentage / resultCount : 0;

    const attendanceRecords = await this.attendanceModel
      .find({
        academicYear: new Types.ObjectId(fromAcademicYear),
        class: student.currentClass,
      })
      .exec();

    let totalDays = 0;
    let presentDays = 0;

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r: any) => r.student.toString() === studentId,
      );
      if (studentRecord) {
        totalDays++;
        if (
          studentRecord.status === AttendanceStatus.PRESENT ||
          studentRecord.status === AttendanceStatus.LATE ||
          studentRecord.status === AttendanceStatus.HALF_DAY
        ) {
          presentDays++;
        }
      }
    });

    const attendancePercentage =
      totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    const promotionCriteria = classData.promotionCriteria || {
      minimumPercentage: 40,
      minimumAttendance: 75,
    };

    const isEligible =
      averagePercentage >= promotionCriteria.minimumPercentage &&
      attendancePercentage >= promotionCriteria.minimumAttendance;

    return {
      studentId,
      student: student,
      isEligible,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      totalDays,
      presentDays,
      requiredPercentage: promotionCriteria.minimumPercentage,
      requiredAttendance: promotionCriteria.minimumAttendance,
      results: results.length,
    };
  }

  async promoteStudent(dto: PromoteStudentDto, promotedBy: string) {
    const student = await this.studentModel.findById(dto.studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [fromClass, toClass, fromAcademicYear, toAcademicYear] =
      await Promise.all([
        this.classModel.findById(dto.fromClass),
        this.classModel.findById(dto.toClass),
        this.academicYearModel.findById(dto.fromAcademicYear),
        this.academicYearModel.findById(dto.toAcademicYear),
      ]);

    if (!fromClass) {
      throw new NotFoundException('From class not found');
    }
    if (!toClass) {
      throw new NotFoundException('To class not found');
    }
    if (!fromAcademicYear) {
      throw new NotFoundException('From academic year not found');
    }
    if (!toAcademicYear) {
      throw new NotFoundException('To academic year not found');
    }

    const existingPromotion = await this.promotionModel.findOne({
      student: new Types.ObjectId(dto.studentId),
      fromAcademicYear: new Types.ObjectId(dto.fromAcademicYear),
      status: PromotionStatus.PROMOTED,
    });

    if (existingPromotion) {
      throw new ConflictException(
        'Student already promoted for this academic year',
      );
    }

    const eligibility = await this.checkEligibility(
      dto.studentId,
      dto.fromAcademicYear,
    );

    const promotionData = {
      school: student.school,
      fromAcademicYear: new Types.ObjectId(dto.fromAcademicYear),
      toAcademicYear: new Types.ObjectId(dto.toAcademicYear),
      student: new Types.ObjectId(dto.studentId),
      fromClass: new Types.ObjectId(dto.fromClass),
      toClass: new Types.ObjectId(dto.toClass),
      fromSection: dto.fromSection,
      toSection: dto.toSection,
      status: PromotionStatus.PROMOTED,
      previousPercentage: eligibility.averagePercentage,
      previousAttendance: eligibility.attendancePercentage,
      remarks: dto.remarks,
      promotedBy: new Types.ObjectId(promotedBy),
      promotedAt: new Date(),
    };

    const promotion = new this.promotionModel(promotionData);
    await promotion.save();

    await this.studentModel.findByIdAndUpdate(dto.studentId, {
      currentClass: new Types.ObjectId(dto.toClass),
      currentAcademicYear: new Types.ObjectId(dto.toAcademicYear),
    });

    return promotion;
  }

  async retainStudent(dto: RetainStudentDto, retainedBy: string) {
    const student = await this.studentModel.findById(dto.studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [classData, academicYear] = await Promise.all([
      this.classModel.findById(dto.classId),
      this.academicYearModel.findById(dto.academicYear),
    ]);

    if (!classData) {
      throw new NotFoundException('Class not found');
    }
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    const eligibility = await this.checkEligibility(
      dto.studentId,
      dto.academicYear,
    );

    const promotionData = {
      school: student.school,
      fromAcademicYear: new Types.ObjectId(dto.academicYear),
      toAcademicYear: new Types.ObjectId(dto.academicYear),
      student: new Types.ObjectId(dto.studentId),
      fromClass: new Types.ObjectId(dto.classId),
      toClass: new Types.ObjectId(dto.classId),
      fromSection: dto.section,
      toSection: dto.section,
      status: PromotionStatus.RETAINED,
      previousPercentage: eligibility.averagePercentage,
      previousAttendance: eligibility.attendancePercentage,
      remarks: dto.remarks,
      promotedBy: new Types.ObjectId(retainedBy),
      promotedAt: new Date(),
    };

    const retention = new this.promotionModel(promotionData);
    await retention.save();

    return retention;
  }

  async bulkPromote(dto: BulkPromoteDto, promotedBy: string) {
    const [fromClass, toClass, fromAcademicYear, toAcademicYear] =
      await Promise.all([
        this.classModel.findById(dto.classId),
        this.classModel.findById(dto.toClassId),
        this.academicYearModel.findById(dto.fromAcademicYear),
        this.academicYearModel.findById(dto.toAcademicYear),
      ]);

    if (!fromClass) {
      throw new NotFoundException('From class not found');
    }
    if (!toClass) {
      throw new NotFoundException('To class not found');
    }
    if (!fromAcademicYear) {
      throw new NotFoundException('From academic year not found');
    }
    if (!toAcademicYear) {
      throw new NotFoundException('To academic year not found');
    }

    const students = await this.studentModel
      .find({
        school: fromClass.school,
        currentClass: new Types.ObjectId(dto.classId),
        currentAcademicYear: new Types.ObjectId(dto.fromAcademicYear),
        status: StudentStatus.ACTIVE,
      })
      .exec();

    if (students.length === 0) {
      throw new NotFoundException(
        'No students found in the specified class and section',
      );
    }

    const results = {
      total: students.length,
      promoted: 0,
      failed: [],
    };

    for (const student of students) {
      try {
        const eligibility = await this.checkEligibility(
          student._id.toString(),
          dto.fromAcademicYear,
        );

        const existingPromotion = await this.promotionModel.findOne({
          student: student._id,
          fromAcademicYear: new Types.ObjectId(dto.fromAcademicYear),
          status: PromotionStatus.PROMOTED,
        });

        if (existingPromotion) {
          results.failed.push({
            studentId: student._id,
            name: `${student.firstName} ${student.lastName}`,
            reason: 'Already promoted',
          });
          continue;
        }

        const promotionData = {
          school: student.school,
          fromAcademicYear: new Types.ObjectId(dto.fromAcademicYear),
          toAcademicYear: new Types.ObjectId(dto.toAcademicYear),
          student: student._id,
          fromClass: new Types.ObjectId(dto.classId),
          toClass: new Types.ObjectId(dto.toClassId),
          fromSection: dto.section,
          toSection: dto.toSection,
          status: PromotionStatus.PROMOTED,
          previousPercentage: eligibility.averagePercentage,
          previousAttendance: eligibility.attendancePercentage,
          remarks: dto.remarks,
          promotedBy: new Types.ObjectId(promotedBy),
          promotedAt: new Date(),
        };

        await this.promotionModel.create(promotionData);

        await this.studentModel.findByIdAndUpdate(student._id, {
          currentClass: new Types.ObjectId(dto.toClassId),
          currentAcademicYear: new Types.ObjectId(dto.toAcademicYear),
        });

        results.promoted++;
      } catch (error) {
        results.failed.push({
          studentId: student._id,
          name: `${student.firstName} ${student.lastName}`,
          reason: error.message,
        });
      }
    }

    return results;
  }

  async bulkCheckEligibility(
    classId: string,
    section: string,
    academicYearId: string,
  ) {
    const classData = await this.classModel.findById(classId);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const students = await this.studentModel
      .find({
        currentClass: new Types.ObjectId(classId),
        currentAcademicYear: new Types.ObjectId(academicYearId),
        status: StudentStatus.ACTIVE,
      })
      .exec();

    if (students.length === 0) {
      throw new NotFoundException(
        'No students found in the specified class and section',
      );
    }

    const eligibilityResults = [];

    for (const student of students) {
      const eligibility = await this.checkEligibility(
        student._id.toString(),
        academicYearId,
      );
      eligibilityResults.push({
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        ...eligibility,
      });
    }

    const eligible = eligibilityResults.filter((r) => r.isEligible).length;
    const notEligible = eligibilityResults.length - eligible;

    return {
      total: students.length,
      eligible,
      notEligible,
      students: eligibilityResults,
    };
  }

  async getPromotionHistory(studentId: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const promotions = await this.promotionModel
      .find({ student: new Types.ObjectId(studentId) })
      .populate('fromClass', 'name grade')
      .populate('toClass', 'name grade')
      .populate('fromAcademicYear', 'name startDate endDate')
      .populate('toAcademicYear', 'name startDate endDate')
      .populate('promotedBy', 'firstName lastName')
      .sort({ promotedAt: -1 })
      .exec();

    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
      },
      promotions,
    };
  }

  async getPendingPromotions(schoolId: string, academicYearId: string) {
    const promotions = await this.promotionModel
      .find({
        school: new Types.ObjectId(schoolId),
        fromAcademicYear: new Types.ObjectId(academicYearId),
        status: PromotionStatus.PENDING,
      })
      .populate('student', 'firstName lastName admissionNumber')
      .populate('fromClass', 'name grade')
      .populate('toClass', 'name grade')
      .exec();

    return promotions;
  }

  async getPromotionStatistics(schoolId: string, academicYearId: string) {
    const promotions = await this.promotionModel
      .find({
        school: new Types.ObjectId(schoolId),
        fromAcademicYear: new Types.ObjectId(academicYearId),
      })
      .exec();

    const total = promotions.length;
    const promoted = promotions.filter(
      (p) => p.status === PromotionStatus.PROMOTED,
    ).length;
    const retained = promotions.filter(
      (p) => p.status === PromotionStatus.RETAINED,
    ).length;
    const pending = promotions.filter(
      (p) => p.status === PromotionStatus.PENDING,
    ).length;

    const averagePercentage =
      promotions.length > 0
        ? promotions.reduce((sum, p) => sum + (p.previousPercentage || 0), 0) /
          promotions.length
        : 0;

    const averageAttendance =
      promotions.length > 0
        ? promotions.reduce((sum, p) => sum + (p.previousAttendance || 0), 0) /
          promotions.length
        : 0;

    return {
      total,
      promoted,
      retained,
      pending,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      averageAttendance: Math.round(averageAttendance * 100) / 100,
    };
  }

  async undoPromotion(promotionId: string) {
    const promotion = await this.promotionModel.findById(promotionId);
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (promotion.status !== PromotionStatus.PROMOTED) {
      throw new BadRequestException('Can only undo promoted students');
    }

    await this.studentModel.findByIdAndUpdate(promotion.student, {
      currentClass: promotion.fromClass,
      currentAcademicYear: promotion.fromAcademicYear,
    });

    await this.promotionModel.findByIdAndDelete(promotionId);

    return { message: 'Promotion undone successfully' };
  }
}
