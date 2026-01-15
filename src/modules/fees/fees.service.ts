import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fee, FeeDocument } from '../../database/schemas/fee.schema';
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
import { FeeStatus } from '../../common/enums/student-status.enum';

@Injectable()
export class FeesService {
  constructor(
    @InjectModel(Fee.name) private feeModel: Model<FeeDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
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

  async findAll(schoolId: string, query: QueryFeeDto) {
    const {
      studentId,
      academicYearId,
      classId,
      status,
      month,
      year,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { school: new Types.ObjectId(schoolId) };

    if (studentId) {
      filter.student = new Types.ObjectId(studentId);
    }

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    if (status) {
      filter.status = status;
    }

    if (month !== undefined) {
      filter.month = month;
    }

    if (year !== undefined) {
      filter.year = year;
    }

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

    const [fees, total] = await Promise.all([
      this.feeModel
        .find(filter)
        .populate('student', 'firstName lastName admissionNumber rollNumber')
        .populate('academicYear', 'name year')
        .sort({ year: -1, month: -1, dueDate: -1 })
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
  ) {
    if (!Types.ObjectId.isValid(feeId)) {
      throw new BadRequestException('Invalid fee ID');
    }

    const fee = await this.feeModel.findById(feeId).exec();

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
}
