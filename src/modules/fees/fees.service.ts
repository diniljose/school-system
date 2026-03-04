import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fee, FeeDocument, FeePeriodType } from '../../database/schemas/fee.schema';
import { FeeStructure, FeeStructureDocument, BillingCycle, SplitOption } from '../../database/schemas/fee-structure.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from '../../database/schemas/academic-year.schema';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { ApplyFineDto } from './dto/apply-fine.dto';
import { GenerateFeesDto } from './dto/generate-fees.dto';
import { QueryFeeDto } from './dto/query-fee.dto';
import { CreateFeeStructureDto, UpdateFeeStructureDto } from './dto/fee-structure.dto';
import { GenerateFeesFromStructureDto, BulkMarkPaidDto, MarkFeeAsPaidDto, CreateIndividualFeeDto, QueryFeeStructureDto } from './dto/fee-operations.dto';
import { FeeStatus } from '../../common/enums/student-status.enum';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);
  
  constructor(
    @InjectModel(Fee.name) private feeModel: Model<FeeDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  async create(createFeeDto: CreateFeeDto, schoolId: string) {
    try {
      const existingFee = await this.feeModel.findOne({
        school: new Types.ObjectId(schoolId),
        student: new Types.ObjectId(createFeeDto.student),
        month: createFeeDto.month,
        year: createFeeDto.year,
      });

      if (existingFee) {
        throw new ConflictException('Fee already exists for this month');
      }

      const totalAmount = createFeeDto.feeComponents.reduce(
        (sum, comp) => sum + comp.amount,
        0,
      );
      const discount = createFeeDto.feeComponents.reduce(
        (sum, comp) => sum + (comp.discount || 0),
        0,
      );
      const fine = createFeeDto.feeComponents.reduce(
        (sum, comp) => sum + (comp.fine || 0),
        0,
      );
      const netAmount = totalAmount - discount + fine;

      const feeData = {
        ...createFeeDto,
        school: new Types.ObjectId(schoolId),
        student: new Types.ObjectId(createFeeDto.student),
        academicYear: new Types.ObjectId(createFeeDto.academicYear),
        totalAmount,
        discount,
        fine,
        netAmount,
        paidAmount: 0,
        balanceAmount: netAmount,
        status: FeeStatus.PENDING,
      };

      const newFee = new this.feeModel(feeData);
      await newFee.save();

      return newFee;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create fee: ' + error.message);
    }
  }

  async generateMonthlyFees(
    generateFeesDto: GenerateFeesDto,
    schoolId: string,
  ) {
    try {
      const classData = await this.classModel
        .findOne({
          _id: new Types.ObjectId(generateFeesDto.classId),
          school: new Types.ObjectId(schoolId),
        })
        .exec();

      if (!classData) {
        throw new NotFoundException('Class not found');
      }

      if (!classData.feeStructure) {
        throw new BadRequestException(
          'Fee structure not defined for this class',
        );
      }

      const students = await this.studentModel
        .find({
          currentClass: new Types.ObjectId(generateFeesDto.classId),
          school: new Types.ObjectId(schoolId),
        })
        .exec();

      if (students.length === 0) {
        throw new BadRequestException('No students found in this class');
      }

      const currentAcademicYear = await this.academicYearModel
        .findOne({
          school: new Types.ObjectId(schoolId),
          isCurrent: true,
        })
        .exec();

      if (!currentAcademicYear) {
        throw new BadRequestException('No active academic year found');
      }

      const createdFees = [];
      const errors = [];

      for (const student of students) {
        try {
          const existingFee = await this.feeModel.findOne({
            school: new Types.ObjectId(schoolId),
            student: student._id,
            month: generateFeesDto.month,
            year: generateFeesDto.year,
          });

          if (existingFee) {
            errors.push({
              studentId: student._id,
              studentName: `${student.firstName} ${student.lastName}`,
              error: 'Fee already exists',
            });
            continue;
          }

          const feeComponents = [];
          const feeStructure = classData.feeStructure;

          feeComponents.push({
            name: 'Tuition Fee',
            amount: feeStructure.tuitionFee,
            dueDate: generateFeesDto.dueDate,
            discount: 0,
            fine: 0,
          });

          if (feeStructure.admissionFee) {
            feeComponents.push({
              name: 'Admission Fee',
              amount: feeStructure.admissionFee,
              dueDate: generateFeesDto.dueDate,
              discount: 0,
              fine: 0,
            });
          }

          if (feeStructure.examFee) {
            feeComponents.push({
              name: 'Exam Fee',
              amount: feeStructure.examFee,
              dueDate: generateFeesDto.dueDate,
              discount: 0,
              fine: 0,
            });
          }

          if (feeStructure.libraryFee) {
            feeComponents.push({
              name: 'Library Fee',
              amount: feeStructure.libraryFee,
              dueDate: generateFeesDto.dueDate,
              discount: 0,
              fine: 0,
            });
          }

          if (feeStructure.labFee) {
            feeComponents.push({
              name: 'Lab Fee',
              amount: feeStructure.labFee,
              dueDate: generateFeesDto.dueDate,
              discount: 0,
              fine: 0,
            });
          }

          if (feeStructure.sportsFee) {
            feeComponents.push({
              name: 'Sports Fee',
              amount: feeStructure.sportsFee,
              dueDate: generateFeesDto.dueDate,
              discount: 0,
              fine: 0,
            });
          }

          if (feeStructure.otherFees) {
            for (const otherFee of feeStructure.otherFees) {
              feeComponents.push({
                name: otherFee.name,
                amount: otherFee.amount,
                dueDate: generateFeesDto.dueDate,
                discount: 0,
                fine: 0,
              });
            }
          }

          const totalAmount = feeComponents.reduce(
            (sum, comp) => sum + comp.amount,
            0,
          );

          const newFee = new this.feeModel({
            school: new Types.ObjectId(schoolId),
            academicYear: currentAcademicYear._id,
            student: student._id,
            month: generateFeesDto.month,
            year: generateFeesDto.year,
            feeComponents,
            totalAmount,
            discount: 0,
            fine: 0,
            netAmount: totalAmount,
            paidAmount: 0,
            balanceAmount: totalAmount,
            status: FeeStatus.PENDING,
            dueDate: generateFeesDto.dueDate,
            remarks: generateFeesDto.remarks,
          });

          await newFee.save();
          createdFees.push(newFee);
        } catch (error) {
          errors.push({
            studentId: student._id,
            studentName: `${student.firstName} ${student.lastName}`,
            error: error.message,
          });
        }
      }

      return {
        success: createdFees.length,
        failed: errors.length,
        totalStudents: students.length,
        createdFees: createdFees.map((f) => f._id),
        errors,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to generate fees: ' + error.message,
      );
    }
  }

  async findAll(schoolCode: string, query: QueryFeeDto) {
    const {
      studentId,
      academicYearId,
      classId,
      section,
      status,
      periodType,
      month,
      year,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    // Use tenant-specific database
    const FeeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
      schoolCode,
      'Fee',
    );
    const StudentModel = await this.tenantDatabaseService.getTenantModel<StudentDocument>(
      schoolCode,
      'Student',
    );

    const filter: any = {};

    if (studentId) {
      filter.student = new Types.ObjectId(studentId);
    }

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    if (status) {
      filter.status = status;
    }

    if (periodType) {
      filter.periodType = periodType;
    }

    if (month !== undefined) {
      filter.month = month;
    }

    if (year !== undefined) {
      filter.year = year;
    }

    // Filter by class and optionally section
    if (classId) {
      const studentFilter: any = {
        currentClass: new Types.ObjectId(classId),
      };
      
      if (section) {
        studentFilter.currentSection = section;
      }

      const students = await StudentModel
        .find(studentFilter)
        .select('_id')
        .exec();

      filter.student = { $in: students.map((s) => s._id) };
    }

    const [fees, total] = await Promise.all([
      FeeModel
        .find(filter)
        .populate('student', 'firstName lastName admissionNumber rollNumber currentClass currentSection')
        .populate('academicYear', 'name year')
        .sort({ year: -1, month: -1, dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      FeeModel.countDocuments(filter),
    ]);

    return {
      data: fees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get fees for the currently logged-in student
   */
  async getMyFees(
    profileId: string,
    profileModel: string,
    schoolCode: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    // Only allow students to access their own fees
    if (profileModel !== 'Student' || !profileId) {
      return {
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        summary: { pending: 0, collected: 0, overdue: 0, total: 0 },
      };
    }

    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const studentId = new Types.ObjectId(profileId);

    // Get fee model (tenant-aware if needed)
    let feeModel = this.feeModel;
    if (schoolCode) {
      try {
        feeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
          schoolCode,
          'Fee',
        );
      } catch {
        // Fall back to main model
      }
    }

    const filter: any = { student: studentId };
    if (status) {
      filter.status = status;
    }

    const [fees, total] = await Promise.all([
      feeModel
        .find(filter)
        .populate('student', 'firstName lastName admissionNumber')
        .populate('class', 'name')
        .populate('academicYear', 'name year')
        .sort({ year: -1, periodNumber: -1, dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      feeModel.countDocuments(filter),
    ]);

    // Calculate summary
    const allFees = await feeModel.find({ student: studentId });
    let pending = 0, collected = 0, overdue = 0, totalAmount = 0;
    
    allFees.forEach((f: any) => {
      totalAmount += f.totalAmount || 0;
      collected += f.paidAmount || 0;
      if (f.status === 'overdue') {
        overdue += f.dueAmount || f.balanceAmount || 0;
      } else if (f.status === 'pending' || f.status === 'partial') {
        pending += f.dueAmount || f.balanceAmount || 0;
      }
    });

    return {
      success: true,
      data: fees,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      summary: { pending, collected, overdue, total: totalAmount },
    };
  }

  async findById(id: string, schoolId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid fee ID');
    }

    const fee = await this.feeModel
      .findOne({
        _id: new Types.ObjectId(id),
        school: new Types.ObjectId(schoolId),
      })
      .populate(
        'student',
        'firstName lastName admissionNumber rollNumber contact',
      )
      .populate('academicYear', 'name year')
      .exec();

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    return fee;
  }

  async findByStudent(studentId: string, academicYearId: string) {
    if (
      !Types.ObjectId.isValid(studentId) ||
      !Types.ObjectId.isValid(academicYearId)
    ) {
      throw new BadRequestException('Invalid student or academic year ID');
    }

    const fees = await this.feeModel
      .find({
        student: new Types.ObjectId(studentId),
        academicYear: new Types.ObjectId(academicYearId),
      })
      .populate('academicYear', 'name year')
      .sort({ year: 1, month: 1 })
      .exec();

    return fees;
  }

  async update(id: string, updateFeeDto: UpdateFeeDto, schoolId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid fee ID');
    }

    const existingFee = await this.feeModel.findOne({
      _id: new Types.ObjectId(id),
      school: new Types.ObjectId(schoolId),
    });

    if (!existingFee) {
      throw new NotFoundException('Fee not found');
    }

    if (existingFee.paidAmount > 0) {
      throw new BadRequestException('Cannot update fee with existing payments');
    }

    const updateData: any = { ...updateFeeDto };

    if (updateFeeDto.feeComponents) {
      const totalAmount = updateFeeDto.feeComponents.reduce(
        (sum, comp) => sum + comp.amount,
        0,
      );
      const discount = updateFeeDto.feeComponents.reduce(
        (sum, comp) => sum + (comp.discount || 0),
        0,
      );
      const fine = updateFeeDto.feeComponents.reduce(
        (sum, comp) => sum + (comp.fine || 0),
        0,
      );
      const netAmount = totalAmount - discount + fine;

      updateData.totalAmount = totalAmount;
      updateData.discount = discount;
      updateData.fine = fine;
      updateData.netAmount = netAmount;
      updateData.balanceAmount = netAmount;
    }

    if (updateFeeDto.student) {
      updateData.student = new Types.ObjectId(updateFeeDto.student);
    }

    if (updateFeeDto.academicYear) {
      updateData.academicYear = new Types.ObjectId(updateFeeDto.academicYear);
    }

    const updatedFee = await this.feeModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('student', 'firstName lastName admissionNumber')
      .populate('academicYear', 'name year')
      .exec();

    return updatedFee;
  }

  async recordPayment(
    feeId: string,
    paymentDto: RecordPaymentDto,
    receivedBy: string,
    schoolCode: string,
  ) {
    if (!Types.ObjectId.isValid(feeId)) {
      throw new BadRequestException('Invalid fee ID');
    }

    // Use tenant-specific database
    const FeeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
      schoolCode,
      'Fee',
    );

    const fee = await FeeModel.findById(feeId).exec();

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (fee.status === FeeStatus.PAID) {
      throw new BadRequestException('Fee is already fully paid');
    }

    if (paymentDto.amount > fee.balanceAmount) {
      throw new BadRequestException(
        `Payment amount (${paymentDto.amount}) exceeds balance amount (${fee.balanceAmount})`,
      );
    }

    const receiptNumber = await this.generateReceiptNumber();

    const payment = {
      amount: paymentDto.amount,
      date: paymentDto.date ? new Date(paymentDto.date) : new Date(),
      method: paymentDto.method,
      transactionId: paymentDto.transactionId || '',
      receiptNumber,
      receivedBy: new Types.ObjectId(receivedBy),
      remarks: paymentDto.remarks || '',
    };

    fee.payments.push(payment);
    fee.paidAmount += paymentDto.amount;
    fee.balanceAmount = fee.netAmount - fee.paidAmount;

    if (fee.balanceAmount === 0) {
      fee.status = FeeStatus.PAID;
    } else if (fee.paidAmount > 0) {
      fee.status = FeeStatus.PARTIAL;
    }

    await fee.save();

    return {
      fee,
      payment,
      receiptNumber,
    };
  }

  async applyDiscount(feeId: string, discountDto: ApplyDiscountDto) {
    if (!Types.ObjectId.isValid(feeId)) {
      throw new BadRequestException('Invalid fee ID');
    }

    const fee = await this.feeModel.findById(feeId).exec();

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (fee.status === FeeStatus.PAID) {
      throw new BadRequestException('Cannot apply discount to fully paid fee');
    }

    fee.discount += discountDto.amount;
    fee.netAmount = fee.totalAmount - fee.discount + fee.fine;
    fee.balanceAmount = fee.netAmount - fee.paidAmount;

    if (fee.balanceAmount < 0) {
      fee.balanceAmount = 0;
    }

    if (fee.balanceAmount === 0 && fee.paidAmount > 0) {
      fee.status = FeeStatus.PAID;
    }

    await fee.save();

    return fee;
  }

  async applyFine(feeId: string, fineDto: ApplyFineDto) {
    if (!Types.ObjectId.isValid(feeId)) {
      throw new BadRequestException('Invalid fee ID');
    }

    const fee = await this.feeModel.findById(feeId).exec();

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (fee.status === FeeStatus.PAID) {
      throw new BadRequestException('Cannot apply fine to fully paid fee');
    }

    fee.fine += fineDto.amount;
    fee.netAmount = fee.totalAmount - fee.discount + fee.fine;
    fee.balanceAmount = fee.netAmount - fee.paidAmount;

    if (fee.status === FeeStatus.PENDING && fee.balanceAmount > 0) {
      const today = new Date();
      if (fee.dueDate < today) {
        fee.status = FeeStatus.OVERDUE;
      }
    }

    await fee.save();

    return fee;
  }

  async waiveFee(feeId: string, reason: string) {
    if (!Types.ObjectId.isValid(feeId)) {
      throw new BadRequestException('Invalid fee ID');
    }

    const fee = await this.feeModel.findById(feeId).exec();

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (fee.status === FeeStatus.PAID) {
      throw new BadRequestException('Cannot waive fully paid fee');
    }

    fee.status = FeeStatus.WAIVED;
    fee.balanceAmount = 0;
    fee.remarks = reason;

    await fee.save();

    return fee;
  }

  async getPaymentHistory(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }

    const fees = await this.feeModel
      .find({
        student: new Types.ObjectId(studentId),
        'payments.0': { $exists: true },
      })
      .populate('academicYear', 'name year')
      .sort({ 'payments.date': -1 })
      .exec();

    const payments = [];
    for (const fee of fees) {
      for (const payment of fee.payments) {
        payments.push({
          feeId: fee._id,
          month: fee.month,
          year: fee.year,
          ...payment,
        });
      }
    }

    return payments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async getPendingFees(schoolId: string, query: QueryFeeDto) {
    const filter: any = {
      school: new Types.ObjectId(schoolId),
      status: { $in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
    };

    if (query.classId) {
      const students = await this.studentModel
        .find({
          currentClass: new Types.ObjectId(query.classId),
          school: new Types.ObjectId(schoolId),
        })
        .select('_id')
        .exec();

      filter.student = { $in: students.map((s) => s._id) };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [fees, total] = await Promise.all([
      this.feeModel
        .find(filter)
        .populate('student', 'firstName lastName admissionNumber rollNumber')
        .populate('academicYear', 'name year')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.feeModel.countDocuments(filter),
    ]);

    return {
      data: fees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOverdueFees(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fees = await this.feeModel
      .find({
        school: new Types.ObjectId(schoolId),
        status: {
          $in: [FeeStatus.PENDING, FeeStatus.PARTIAL, FeeStatus.OVERDUE],
        },
        dueDate: { $lt: today },
      })
      .populate(
        'student',
        'firstName lastName admissionNumber rollNumber contact',
      )
      .populate('academicYear', 'name year')
      .sort({ dueDate: 1 })
      .exec();

    for (const fee of fees) {
      if (fee.status !== FeeStatus.OVERDUE) {
        fee.status = FeeStatus.OVERDUE;
        await fee.save();
      }
    }

    return fees;
  }

  async getDefaulters(schoolId: string, classId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter: any = {
      school: new Types.ObjectId(schoolId),
      status: {
        $in: [FeeStatus.PENDING, FeeStatus.PARTIAL, FeeStatus.OVERDUE],
      },
      dueDate: { $lt: today },
    };

    if (classId) {
      const students = await this.studentModel
        .find({
          currentClass: new Types.ObjectId(classId),
          school: new Types.ObjectId(schoolId),
        })
        .select('_id')
        .exec();

      filter.student = { $in: students.map((s) => s._id) };
    }

    const fees = await this.feeModel
      .find(filter)
      .populate(
        'student',
        'firstName lastName admissionNumber rollNumber contact',
      )
      .exec();

    const defaultersMap = new Map();

    for (const fee of fees) {
      const studentId = fee.student._id.toString();
      if (!defaultersMap.has(studentId)) {
        defaultersMap.set(studentId, {
          student: fee.student,
          totalPending: 0,
          pendingCount: 0,
          fees: [],
        });
      }

      const defaulter = defaultersMap.get(studentId);
      defaulter.totalPending += fee.balanceAmount;
      defaulter.pendingCount += 1;
      defaulter.fees.push({
        feeId: fee._id,
        month: fee.month,
        year: fee.year,
        balanceAmount: fee.balanceAmount,
        dueDate: fee.dueDate,
      });
    }

    return Array.from(defaultersMap.values());
  }

  async getFeeStatistics(schoolId: string, month?: number, year?: number) {
    const filter: any = { school: new Types.ObjectId(schoolId) };

    if (month !== undefined) {
      filter.month = month;
    }

    if (year !== undefined) {
      filter.year = year;
    }

    const fees = await this.feeModel.find(filter).exec();

    const totalExpected = fees.reduce((sum, fee) => sum + fee.netAmount, 0);
    const totalCollected = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
    const totalPending = fees.reduce((sum, fee) => sum + fee.balanceAmount, 0);

    const statusBreakdown = {
      pending: fees.filter((f) => f.status === FeeStatus.PENDING).length,
      partial: fees.filter((f) => f.status === FeeStatus.PARTIAL).length,
      paid: fees.filter((f) => f.status === FeeStatus.PAID).length,
      overdue: fees.filter((f) => f.status === FeeStatus.OVERDUE).length,
      waived: fees.filter((f) => f.status === FeeStatus.WAIVED).length,
    };

    return {
      totalFees: fees.length,
      totalExpected,
      totalCollected,
      totalPending,
      collectionRate:
        totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
      statusBreakdown,
    };
  }

  async getCollectionReport(schoolId: string, startDate: Date, endDate: Date) {
    const fees = await this.feeModel
      .find({
        school: new Types.ObjectId(schoolId),
        'payments.date': {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .populate('student', 'firstName lastName admissionNumber')
      .exec();

    const collections = [];
    let totalCollection = 0;

    for (const fee of fees) {
      for (const payment of fee.payments) {
        const paymentDate = new Date(payment.date);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          collections.push({
            date: payment.date,
            receiptNumber: payment.receiptNumber,
            student: fee.student,
            amount: payment.amount,
            method: payment.method,
            transactionId: payment.transactionId,
          });
          totalCollection += payment.amount;
        }
      }
    }

    const methodBreakdown = collections.reduce((acc, c) => {
      acc[c.method] = (acc[c.method] || 0) + c.amount;
      return acc;
    }, {});

    return {
      startDate,
      endDate,
      totalCollection,
      transactionCount: collections.length,
      methodBreakdown,
      collections: collections.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  }

  async getStudentFeeStatement(studentId: string, academicYearId: string) {
    if (
      !Types.ObjectId.isValid(studentId) ||
      !Types.ObjectId.isValid(academicYearId)
    ) {
      throw new BadRequestException('Invalid student or academic year ID');
    }

    const student = await this.studentModel.findById(studentId).exec();
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const fees = await this.feeModel
      .find({
        student: new Types.ObjectId(studentId),
        academicYear: new Types.ObjectId(academicYearId),
      })
      .populate('academicYear', 'name year')
      .sort({ year: 1, month: 1 })
      .exec();

    const totalExpected = fees.reduce((sum, fee) => sum + fee.netAmount, 0);
    const totalPaid = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
    const totalPending = fees.reduce((sum, fee) => sum + fee.balanceAmount, 0);

    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
      },
      academicYear: fees[0]?.academicYear,
      summary: {
        totalExpected,
        totalPaid,
        totalPending,
        totalFees: fees.length,
      },
      fees: fees.map((fee) => ({
        id: fee._id,
        month: fee.month,
        year: fee.year,
        totalAmount: fee.totalAmount,
        discount: fee.discount,
        fine: fee.fine,
        netAmount: fee.netAmount,
        paidAmount: fee.paidAmount,
        balanceAmount: fee.balanceAmount,
        status: fee.status,
        dueDate: fee.dueDate,
        payments: fee.payments,
      })),
    };
  }

  private async generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const lastReceipt = await this.feeModel
      .findOne({
        'payments.receiptNumber': { $regex: `^FEE-${dateStr}` },
      })
      .sort({ 'payments.date': -1 })
      .exec();

    let sequence = 1;
    if (lastReceipt && lastReceipt.payments.length > 0) {
      const lastReceiptNumber =
        lastReceipt.payments[lastReceipt.payments.length - 1].receiptNumber;
      const lastSequence = parseInt(lastReceiptNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `FEE-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  // =====================================================
  // FEE STRUCTURE METHODS (New)
  // =====================================================

  /**
   * Create a new fee structure for a class/section
   */
  async createFeeStructure(
    dto: CreateFeeStructureDto,
    schoolCode: string,
    userId: string,
  ) {
    const FeeStructureModel = await this.tenantDatabaseService.getTenantModel<FeeStructureDocument>(
      schoolCode,
      'FeeStructure',
    );

    // Calculate total amount
    const totalAmount = dto.components.reduce((sum, comp) => sum + comp.amount, 0);

    const structure = new FeeStructureModel({
      academicYear: new Types.ObjectId(dto.academicYear),
      class: new Types.ObjectId(dto.class),
      section: dto.section || null,
      name: dto.name,
      billingCycle: dto.billingCycle,
      splitOption: dto.billingCycle === BillingCycle.YEARLY ? dto.splitOption : SplitOption.NO_SPLIT,
      components: dto.components,
      totalAmount,
      dueDays: dto.dueDays || [10],
      lateFeePenalty: dto.lateFeePenalty || 0,
      gracePeriodDays: dto.gracePeriodDays || 5,
      description: dto.description,
      isActive: true,
      createdBy: new Types.ObjectId(userId),
    });

    await structure.save();
    this.logger.log(`Created fee structure ${dto.name} for class ${dto.class}`);
    return structure;
  }

  /**
   * Get all fee structures for a school
   */
  async getFeeStructures(schoolCode: string, query: QueryFeeStructureDto) {
    const FeeStructureModel = await this.tenantDatabaseService.getTenantModel<FeeStructureDocument>(
      schoolCode,
      'FeeStructure',
    );

    const filter: any = {};
    if (query.academicYear) filter.academicYear = new Types.ObjectId(query.academicYear);
    if (query.classId) filter.class = new Types.ObjectId(query.classId);
    if (query.section) filter.section = query.section;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    const structures = await FeeStructureModel.find(filter)
      .populate('academicYear', 'name year')
      .populate('class', 'name grade')
      .sort({ createdAt: -1 })
      .exec();

    return structures;
  }

  /**
   * Get fee structure by ID
   */
  async getFeeStructureById(id: string, schoolCode: string) {
    const FeeStructureModel = await this.tenantDatabaseService.getTenantModel<FeeStructureDocument>(
      schoolCode,
      'FeeStructure',
    );

    const structure = await FeeStructureModel.findById(id)
      .populate('academicYear', 'name year')
      .populate('class', 'name grade')
      .exec();

    if (!structure) {
      throw new NotFoundException('Fee structure not found');
    }

    return structure;
  }

  /**
   * Update fee structure
   */
  async updateFeeStructure(
    id: string,
    dto: UpdateFeeStructureDto,
    schoolCode: string,
  ) {
    const FeeStructureModel = await this.tenantDatabaseService.getTenantModel<FeeStructureDocument>(
      schoolCode,
      'FeeStructure',
    );

    const updateData: any = { ...dto };
    if (dto.components) {
      updateData.totalAmount = dto.components.reduce((sum, comp) => sum + comp.amount, 0);
    }

    const structure = await FeeStructureModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('academicYear', 'name year')
      .populate('class', 'name grade')
      .exec();

    if (!structure) {
      throw new NotFoundException('Fee structure not found');
    }

    return structure;
  }

  /**
   * Delete fee structure
   */
  async deleteFeeStructure(id: string, schoolCode: string) {
    const FeeStructureModel = await this.tenantDatabaseService.getTenantModel<FeeStructureDocument>(
      schoolCode,
      'FeeStructure',
    );

    const result = await FeeStructureModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Fee structure not found');
    }
    return { message: 'Fee structure deleted successfully' };
  }

  /**
   * Generate fees for all students in a class/section from a fee structure
   */
  async generateFeesFromStructure(
    dto: GenerateFeesFromStructureDto,
    schoolCode: string,
    userId: string,
  ) {
    const FeeStructureModel = await this.tenantDatabaseService.getTenantModel<FeeStructureDocument>(
      schoolCode,
      'FeeStructure',
    );
    const FeeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
      schoolCode,
      'Fee',
    );
    const StudentModel = await this.tenantDatabaseService.getTenantModel<StudentDocument>(
      schoolCode,
      'Student',
    );

    // Get the fee structure
    const structure = await FeeStructureModel.findById(dto.feeStructureId).exec();
    if (!structure) {
      throw new NotFoundException('Fee structure not found');
    }

    // Get students in this class/section
    const studentFilter: any = { currentClass: structure.class };
    if (structure.section) {
      studentFilter.currentSection = structure.section;
    }
    const students = await StudentModel.find(studentFilter).exec();

    if (students.length === 0) {
      throw new BadRequestException('No students found in this class/section');
    }

    // Determine which periods to generate
    const periodsToGenerate: number[] = [];
    if (dto.generateAllPeriods) {
      const periodsCount = this.getPeriodsCountForType(dto.periodType);
      for (let i = 1; i <= periodsCount; i++) {
        periodsToGenerate.push(i);
      }
    } else {
      periodsToGenerate.push(dto.periodNumber);
    }

    const totalCreated: any[] = [];
    const totalErrors: any[] = [];

    for (const periodNumber of periodsToGenerate) {
      // Generate period label if not provided
      const periodLabel = this.generatePeriodLabel(dto.periodType, periodNumber, dto.year);

      // Calculate due date
      const dueDate = this.calculateDueDate(dto.periodType, periodNumber, dto.year, structure.dueDays[0] || 10);

      for (const student of students) {
        try {
          // Check if fee already exists for this period
          const existingFee = await FeeModel.findOne({
            student: student._id,
            periodType: dto.periodType,
            periodNumber: periodNumber,
            year: dto.year,
          }).exec();

          if (existingFee) {
            totalErrors.push({
              studentId: student._id.toString(),
              studentName: `${student.firstName} ${student.lastName}`,
              periodNumber,
              error: 'Fee already exists for this period',
            });
            continue;
          }

          // Create fee components from structure
          const feeComponents = structure.components.map((comp: any) => ({
            name: comp.name,
            amount: comp.amount,
            dueDate,
            discount: 0,
            discountReason: '',
            fine: 0,
            fineReason: '',
          }));

          const totalAmount = structure.totalAmount;
          const netAmount = totalAmount;

          const fee = new FeeModel({
            academicYear: structure.academicYear,
            student: student._id,
            class: structure.class,
            section: structure.section,
            feeStructure: structure._id,
            periodType: dto.periodType,
            periodNumber: periodNumber,
            periodLabel,
            month: this.getPeriodStartMonth(dto.periodType, periodNumber),
            year: dto.year,
            feeComponents,
            totalAmount,
            discount: 0,
            fine: 0,
            netAmount,
            paidAmount: 0,
            balanceAmount: netAmount,
            status: FeeStatus.PENDING,
            dueDate,
            remarks: dto.remarks || '',
            isCustom: false,
          });

          await fee.save();
          totalCreated.push(fee);
        } catch (error) {
          totalErrors.push({
            studentId: student._id.toString(),
            studentName: `${student.firstName} ${student.lastName}`,
            periodNumber,
            error: error.message,
          });
        }
      }
    }

    this.logger.log(`Generated ${totalCreated.length} fees from structure ${structure.name} for ${periodsToGenerate.length} period(s)`);
    return {
      success: totalCreated.length,
      totalSuccess: totalCreated.length,
      failed: totalErrors.length,
      totalStudents: students.length,
      periodsGenerated: periodsToGenerate.length,
      errors: totalErrors,
    };
  }

  /**
   * Get the number of periods for a given period type
   */
  private getPeriodsCountForType(periodType: FeePeriodType): number {
    switch (periodType) {
      case FeePeriodType.MONTHLY:
        return 12;
      case FeePeriodType.QUARTERLY:
        return 4;
      case FeePeriodType.HALF_YEARLY:
        return 2;
      case FeePeriodType.YEARLY:
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Create individual fee for a specific student
   */
  async createIndividualFee(
    dto: CreateIndividualFeeDto,
    schoolCode: string,
    userId: string,
  ) {
    const FeeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
      schoolCode,
      'Fee',
    );
    const StudentModel = await this.tenantDatabaseService.getTenantModel<StudentDocument>(
      schoolCode,
      'Student',
    );

    // Verify student exists
    const student = await StudentModel.findById(dto.studentId).exec();
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check for existing fee
    const existingFee = await FeeModel.findOne({
      student: new Types.ObjectId(dto.studentId),
      periodType: dto.periodType,
      periodNumber: dto.periodNumber,
      year: dto.year,
    }).exec();

    if (existingFee) {
      throw new ConflictException('Fee already exists for this student and period');
    }

    const periodLabel = dto.periodLabel || this.generatePeriodLabel(dto.periodType, dto.periodNumber, dto.year);
    const dueDate = this.calculateDueDate(dto.periodType, dto.periodNumber, dto.year, 10);

    const feeComponents = dto.components.map((comp) => ({
      name: comp.name,
      amount: comp.amount,
      dueDate,
      discount: 0,
      discountReason: '',
      fine: 0,
      fineReason: '',
    }));

    const totalAmount = dto.components.reduce((sum, c) => sum + c.amount, 0);
    const discount = dto.discount || 0;
    const netAmount = totalAmount - discount;

    const fee = new FeeModel({
      academicYear: new Types.ObjectId(dto.academicYear),
      student: new Types.ObjectId(dto.studentId),
      class: student.currentClass,
      section: student.currentSection,
      periodType: dto.periodType,
      periodNumber: dto.periodNumber,
      periodLabel,
      month: this.getPeriodStartMonth(dto.periodType, dto.periodNumber),
      year: dto.year,
      feeComponents,
      totalAmount,
      discount,
      fine: 0,
      netAmount,
      paidAmount: 0,
      balanceAmount: netAmount,
      status: FeeStatus.PENDING,
      dueDate,
      remarks: dto.remarks || dto.discountReason || '',
      isCustom: true,
    });

    await fee.save();
    return fee;
  }

  /**
   * Mark a fee as paid (partial or full)
   */
  async markFeeAsPaid(
    feeId: string,
    dto: MarkFeeAsPaidDto,
    schoolCode: string,
    userId: string,
  ) {
    const FeeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
      schoolCode,
      'Fee',
    );

    const fee = await FeeModel.findById(feeId).exec();
    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (fee.status === FeeStatus.PAID) {
      throw new BadRequestException('Fee is already fully paid');
    }

    const amount = dto.markFullyPaid ? fee.balanceAmount : dto.amount;
    
    if (amount > fee.balanceAmount) {
      throw new BadRequestException(`Amount exceeds balance (${fee.balanceAmount})`);
    }

    const receiptNumber = await this.generateReceiptNumber();

    const payment = {
      amount,
      date: new Date(),
      method: dto.paymentMethod,
      transactionId: dto.transactionId || '',
      receiptNumber,
      receivedBy: new Types.ObjectId(userId),
      remarks: dto.remarks || '',
    };

    fee.payments.push(payment);
    fee.paidAmount += amount;
    fee.balanceAmount = fee.netAmount - fee.paidAmount;
    fee.markedPaidBy = new Types.ObjectId(userId);
    fee.markedPaidAt = new Date();

    if (fee.balanceAmount <= 0) {
      fee.status = FeeStatus.PAID;
      fee.balanceAmount = 0;
    } else if (fee.paidAmount > 0) {
      fee.status = FeeStatus.PARTIAL;
    }

    await fee.save();

    return fee.populate('student', 'firstName lastName admissionNumber');
  }

  /**
   * Bulk mark fees as paid
   */
  async bulkMarkPaid(
    dto: BulkMarkPaidDto,
    schoolCode: string,
    userId: string,
  ) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const feeId of dto.feeIds) {
      try {
        await this.markFeeAsPaid(
          feeId,
          {
            amount: 0,
            paymentMethod: dto.paymentMethod,
            transactionId: dto.transactionId,
            remarks: dto.remarks,
            markFullyPaid: true,
          },
          schoolCode,
          userId,
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ feeId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get fees for a class/section with filters
   */
  async getClassFees(
    schoolCode: string,
    query: {
      academicYear?: string;
      classId?: string;
      section?: string;
      periodType?: FeePeriodType;
      periodNumber?: number;
      year?: number;
      status?: FeeStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const FeeModel = await this.tenantDatabaseService.getTenantModel<FeeDocument>(
      schoolCode,
      'Fee',
    );

    const filter: any = {};
    if (query.academicYear) filter.academicYear = new Types.ObjectId(query.academicYear);
    if (query.classId) filter.class = new Types.ObjectId(query.classId);
    if (query.section) filter.section = query.section;
    if (query.periodType) filter.periodType = query.periodType;
    if (query.periodNumber) filter.periodNumber = query.periodNumber;
    if (query.year) filter.year = query.year;
    if (query.status) filter.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [fees, total] = await Promise.all([
      FeeModel.find(filter)
        .populate('student', 'firstName lastName admissionNumber rollNumber')
        .populate('class', 'name grade')
        .sort({ 'student.firstName': 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      FeeModel.countDocuments(filter),
    ]);

    // Calculate summary
    const allFees = await FeeModel.find(filter).exec();
    const summary = {
      totalStudents: allFees.length,
      totalAmount: allFees.reduce((sum, f) => sum + f.netAmount, 0),
      totalPaid: allFees.reduce((sum, f) => sum + f.paidAmount, 0),
      totalPending: allFees.reduce((sum, f) => sum + f.balanceAmount, 0),
      paidCount: allFees.filter(f => f.status === FeeStatus.PAID).length,
      partialCount: allFees.filter(f => f.status === FeeStatus.PARTIAL).length,
      pendingCount: allFees.filter(f => f.status === FeeStatus.PENDING).length,
      overdueCount: allFees.filter(f => f.status === FeeStatus.OVERDUE).length,
    };

    return {
      data: fees,
      summary,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Helper methods
  private generatePeriodLabel(periodType: FeePeriodType, periodNumber: number, year: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    switch (periodType) {
      case FeePeriodType.MONTHLY:
        return `${months[periodNumber - 1]} ${year}`;
      case FeePeriodType.QUARTERLY:
        const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
        return `${quarterNames[periodNumber - 1]} ${year}`;
      case FeePeriodType.HALF_YEARLY:
        return periodNumber === 1 ? `H1 (Jan-Jun) ${year}` : `H2 (Jul-Dec) ${year}`;
      case FeePeriodType.YEARLY:
        return `${year}-${(year + 1).toString().slice(-2)}`;
      default:
        return `${periodNumber}/${year}`;
    }
  }

  private calculateDueDate(periodType: FeePeriodType, periodNumber: number, year: number, dueDay: number): Date {
    let month: number;
    
    switch (periodType) {
      case FeePeriodType.MONTHLY:
        month = periodNumber - 1; // 0-indexed
        break;
      case FeePeriodType.QUARTERLY:
        month = (periodNumber - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
        break;
      case FeePeriodType.HALF_YEARLY:
        month = periodNumber === 1 ? 0 : 6;
        break;
      case FeePeriodType.YEARLY:
        month = 3; // April (start of academic year typically)
        break;
      default:
        month = 0;
    }
    
    return new Date(year, month, Math.min(dueDay, 28));
  }

  private getPeriodStartMonth(periodType: FeePeriodType, periodNumber: number): number {
    switch (periodType) {
      case FeePeriodType.MONTHLY:
        return periodNumber;
      case FeePeriodType.QUARTERLY:
        return (periodNumber - 1) * 3 + 1;
      case FeePeriodType.HALF_YEARLY:
        return periodNumber === 1 ? 1 : 7;
      case FeePeriodType.YEARLY:
        return 1;
      default:
        return 1;
    }
  }
}
