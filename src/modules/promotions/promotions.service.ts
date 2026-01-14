import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Promotion,
  PromotionDocument,
} from '../../database/schemas/promotion.schema';
import { Student, StudentDocument } from '../../database/schemas/student.schema';
import { PromotionStatus } from '../../common/enums/student-status.enum';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { BulkPromoteDto } from './dto/bulk-promote.dto';
import { RetainStudentDto } from './dto/retain-student.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name)
    private promotionModel: Model<PromotionDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async checkEligibility(
    studentId: string,
    academicYearId: string,
    schoolId: string,
  ) {
    const student = await this.studentModel.findOne({
      _id: studentId,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      eligible: true,
      student: studentId,
      currentClass: student.currentClass,
      currentSection: student.currentSection,
      remarks: 'Student is eligible for promotion',
    };
  }

  async promoteStudent(
    promoteStudentDto: PromoteStudentDto,
    schoolId: string,
    userId: string,
  ): Promise<Promotion> {
    const student = await this.studentModel.findOne({
      _id: promoteStudentDto.student,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existing = await this.promotionModel.findOne({
      school: schoolId,
      student: promoteStudentDto.student,
      fromAcademicYear: promoteStudentDto.fromAcademicYear,
    });

    if (existing && existing.status === PromotionStatus.PROMOTED) {
      throw new BadRequestException('Student already promoted');
    }

    const promotion = new this.promotionModel({
      ...promoteStudentDto,
      school: schoolId,
      status: PromotionStatus.PROMOTED,
      promotedBy: userId,
      promotedAt: new Date(),
    });

    await promotion.save();

    await this.studentModel.findByIdAndUpdate(promoteStudentDto.student, {
      currentClass: promoteStudentDto.toClass,
      currentSection: promoteStudentDto.toSection,
      currentAcademicYear: promoteStudentDto.toAcademicYear,
    });

    return promotion;
  }

  async retainStudent(
    retainStudentDto: RetainStudentDto,
    schoolId: string,
    userId: string,
  ): Promise<Promotion> {
    const student = await this.studentModel.findOne({
      _id: retainStudentDto.student,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const promotion = new this.promotionModel({
      school: schoolId,
      student: retainStudentDto.student,
      fromAcademicYear: retainStudentDto.academicYear,
      toAcademicYear: retainStudentDto.academicYear,
      fromClass: retainStudentDto.class,
      toClass: retainStudentDto.class,
      fromSection: retainStudentDto.section,
      toSection: retainStudentDto.section,
      status: PromotionStatus.RETAINED,
      remarks: retainStudentDto.reason,
      promotedBy: userId,
      promotedAt: new Date(),
    });

    return promotion.save();
  }

  async bulkPromote(
    bulkPromoteDto: BulkPromoteDto,
    schoolId: string,
    userId: string,
  ): Promise<{ promoted: number; failed: any[] }> {
    const promoted = [];
    const failed = [];

    for (const promotionDto of bulkPromoteDto.promotions) {
      try {
        const promotion = await this.promoteStudent(
          promotionDto,
          schoolId,
          userId,
        );
        promoted.push(promotion);
      } catch (error) {
        failed.push({ data: promotionDto, error: error.message });
      }
    }

    return { promoted: promoted.length, failed };
  }

  async bulkCheckEligibility(
    studentIds: string[],
    academicYearId: string,
    schoolId: string,
  ) {
    const results = [];

    for (const studentId of studentIds) {
      try {
        const eligibility = await this.checkEligibility(
          studentId,
          academicYearId,
          schoolId,
        );
        results.push(eligibility);
      } catch (error) {
        results.push({
          eligible: false,
          student: studentId,
          remarks: error.message,
        });
      }
    }

    return results;
  }

  async getPromotionHistory(studentId: string, schoolId: string) {
    return this.promotionModel
      .find({ school: schoolId, student: studentId })
      .populate('fromClass', 'name grade')
      .populate('toClass', 'name grade')
      .populate('fromAcademicYear', 'name')
      .populate('toAcademicYear', 'name')
      .populate('promotedBy', 'firstName lastName')
      .sort({ promotedAt: -1 });
  }

  async getPendingPromotions(schoolId: string, academicYearId?: string) {
    const query: any = { school: schoolId, status: PromotionStatus.PENDING };
    if (academicYearId) query.fromAcademicYear = academicYearId;

    return this.promotionModel
      .find(query)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('fromClass', 'name')
      .sort({ createdAt: -1 });
  }

  async getPromotionStatistics(schoolId: string, academicYearId: string) {
    const stats = await this.promotionModel.aggregate([
      {
        $match: {
          school: new Types.ObjectId(schoolId),
          fromAcademicYear: new Types.ObjectId(academicYearId),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const classWise = await this.promotionModel.aggregate([
      {
        $match: {
          school: new Types.ObjectId(schoolId),
          fromAcademicYear: new Types.ObjectId(academicYearId),
        },
      },
      {
        $group: {
          _id: { fromClass: '$fromClass', status: '$status' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id.fromClass',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
    ]);

    return {
      overall: stats,
      classWise,
    };
  }

  async undoPromotion(promotionId: string, schoolId: string) {
    const promotion = await this.promotionModel.findOne({
      _id: promotionId,
      school: schoolId,
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (promotion.status !== PromotionStatus.PROMOTED) {
      throw new BadRequestException('Can only undo promoted students');
    }

    await this.studentModel.findByIdAndUpdate(promotion.student, {
      currentClass: promotion.fromClass,
      currentSection: promotion.fromSection,
      currentAcademicYear: promotion.fromAcademicYear,
    });

    promotion.status = PromotionStatus.PENDING;
    await promotion.save();

    return { message: 'Promotion undone successfully' };
  }
}
