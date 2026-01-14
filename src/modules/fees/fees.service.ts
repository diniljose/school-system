import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fee, FeeDocument } from '../../database/schemas/fee.schema';
import { FeeStatus } from '../../common/enums/student-status.enum';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { ApplyFineDto } from './dto/apply-fine.dto';
import { GenerateFeesDto } from './dto/generate-fees.dto';

@Injectable()
export class FeesService {
  constructor(@InjectModel(Fee.name) private feeModel: Model<FeeDocument>) {}

  async create(createFeeDto: CreateFeeDto, schoolId: string): Promise<Fee> {
    const existing = await this.feeModel.findOne({
      school: schoolId,
      student: createFeeDto.student,
      month: createFeeDto.month,
      year: createFeeDto.year,
    });

    if (existing) {
      throw new BadRequestException('Fee already exists for this month');
    }

    const totalAmount = createFeeDto.feeComponents.reduce(
      (sum, c) => sum + c.amount,
      0,
    );
    const discount = createFeeDto.feeComponents.reduce(
      (sum, c) => sum + (c.discount || 0),
      0,
    );
    const fine = createFeeDto.feeComponents.reduce(
      (sum, c) => sum + (c.fine || 0),
      0,
    );
    const netAmount = totalAmount - discount + fine;

    const fee = new this.feeModel({
      ...createFeeDto,
      school: schoolId,
      totalAmount,
      discount,
      fine,
      netAmount,
      balanceAmount: netAmount,
    });

    return fee.save();
  }

  async generateMonthlyFees(
    generateFeesDto: GenerateFeesDto,
    schoolId: string,
  ): Promise<{ created: number; failed: any[] }> {
    const created = [];
    const failed = [];

    for (const studentId of generateFeesDto.students) {
      try {
        const feeComponents = generateFeesDto.feeComponents.map((comp) => ({
          name: comp.name,
          amount: comp.amount,
          dueDate: generateFeesDto.dueDate,
          discount: 0,
          discountReason: '',
          fine: 0,
          fineReason: '',
        }));

        const fee = await this.create(
          {
            academicYear: generateFeesDto.academicYear,
            student: studentId,
            month: generateFeesDto.month,
            year: generateFeesDto.year,
            feeComponents,
            dueDate: generateFeesDto.dueDate,
          },
          schoolId,
        );
        created.push(fee);
      } catch (error) {
        failed.push({ student: studentId, error: error.message });
      }
    }

    return { created: created.length, failed };
  }

  async findAll(
    schoolId: string,
    filters: {
      academicYearId?: string;
      studentId?: string;
      status?: FeeStatus;
      month?: number;
      year?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { school: schoolId };

    if (filters.academicYearId) query.academicYear = filters.academicYearId;
    if (filters.studentId) query.student = filters.studentId;
    if (filters.status) query.status = filters.status;
    if (filters.month) query.month = filters.month;
    if (filters.year) query.year = filters.year;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [fees, total] = await Promise.all([
      this.feeModel
        .find(query)
        .populate('student', 'firstName lastName admissionNumber')
        .populate('academicYear', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ year: -1, month: -1 }),
      this.feeModel.countDocuments(query),
    ]);

    return {
      data: fees,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Fee> {
    const fee = await this.feeModel
      .findOne({ _id: id, school: schoolId })
      .populate('student')
      .populate('academicYear')
      .populate('payments.receivedBy', 'firstName lastName');

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    return fee;
  }

  async findByStudent(
    studentId: string,
    schoolId: string,
    filters?: { academicYearId?: string; status?: FeeStatus },
  ) {
    const query: any = { school: schoolId, student: studentId };
    if (filters?.academicYearId) query.academicYear = filters.academicYearId;
    if (filters?.status) query.status = filters.status;

    return this.feeModel
      .find(query)
      .populate('academicYear', 'name')
      .sort({ year: -1, month: -1 });
  }

  async update(
    id: string,
    updateFeeDto: UpdateFeeDto,
    schoolId: string,
  ): Promise<Fee> {
    const fee = await this.feeModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateFeeDto },
      { new: true },
    );

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    return fee;
  }

  async recordPayment(
    feeId: string,
    recordPaymentDto: RecordPaymentDto,
    schoolId: string,
    userId: string,
  ): Promise<Fee> {
    const fee = await this.feeModel.findOne({ _id: feeId, school: schoolId });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (fee.status === FeeStatus.PAID) {
      throw new BadRequestException('Fee is already paid');
    }

    const receiptNumber = await this.generateReceiptNumber(schoolId);

    const payment = {
      amount: recordPaymentDto.amount,
      date: recordPaymentDto.date,
      method: recordPaymentDto.method,
      transactionId: recordPaymentDto.transactionId || '',
      receiptNumber,
      receivedBy: new Types.ObjectId(userId),
      remarks: recordPaymentDto.remarks || '',
    };

    const newPaidAmount = fee.paidAmount + recordPaymentDto.amount;
    const newBalanceAmount = fee.netAmount - newPaidAmount;

    let status = FeeStatus.PARTIAL;
    if (newBalanceAmount <= 0) {
      status = FeeStatus.PAID;
    } else if (new Date() > fee.dueDate) {
      status = FeeStatus.OVERDUE;
    }

    fee.payments.push(payment);
    fee.paidAmount = newPaidAmount;
    fee.balanceAmount = newBalanceAmount;
    fee.status = status;

    return fee.save();
  }

  async applyDiscount(
    feeId: string,
    applyDiscountDto: ApplyDiscountDto,
    schoolId: string,
  ): Promise<Fee> {
    const fee = await this.feeModel.findOne({ _id: feeId, school: schoolId });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    fee.discount = (fee.discount || 0) + applyDiscountDto.amount;
    fee.netAmount = fee.totalAmount - fee.discount + (fee.fine || 0);
    fee.balanceAmount = fee.netAmount - fee.paidAmount;

    if (fee.balanceAmount <= 0) {
      fee.status = FeeStatus.PAID;
    }

    return fee.save();
  }

  async applyFine(
    feeId: string,
    applyFineDto: ApplyFineDto,
    schoolId: string,
  ): Promise<Fee> {
    const fee = await this.feeModel.findOne({ _id: feeId, school: schoolId });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    fee.fine = (fee.fine || 0) + applyFineDto.amount;
    fee.netAmount = fee.totalAmount - (fee.discount || 0) + fee.fine;
    fee.balanceAmount = fee.netAmount - fee.paidAmount;
    fee.status = FeeStatus.OVERDUE;

    return fee.save();
  }

  async waiveFee(feeId: string, schoolId: string): Promise<Fee> {
    const fee = await this.feeModel.findOne({ _id: feeId, school: schoolId });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    fee.status = FeeStatus.WAIVED;
    fee.balanceAmount = 0;

    return fee.save();
  }

  async getPaymentHistory(studentId: string, schoolId: string) {
    const fees = await this.feeModel
      .find({ school: schoolId, student: studentId })
      .populate('academicYear', 'name')
      .sort({ year: -1, month: -1 });

    const payments = [];
    fees.forEach((fee) => {
      fee.payments.forEach((payment: any) => {
        payments.push({
          fee: fee._id,
          month: fee.month,
          year: fee.year,
          ...payment,
        });
      });
    });

    return payments;
  }

  async getPendingFees(schoolId: string) {
    return this.feeModel
      .find({
        school: schoolId,
        status: { $in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
      })
      .populate('student', 'firstName lastName admissionNumber')
      .sort({ dueDate: 1 });
  }

  async getOverdueFees(schoolId: string) {
    return this.feeModel
      .find({
        school: schoolId,
        status: FeeStatus.OVERDUE,
      })
      .populate('student', 'firstName lastName admissionNumber')
      .sort({ dueDate: 1 });
  }

  async getDefaulters(schoolId: string, daysOverdue: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

    return this.feeModel
      .find({
        school: schoolId,
        status: { $in: [FeeStatus.PENDING, FeeStatus.PARTIAL, FeeStatus.OVERDUE] },
        dueDate: { $lt: cutoffDate },
      })
      .populate('student', 'firstName lastName admissionNumber phone')
      .sort({ balanceAmount: -1 });
  }

  async generateReceipt(feeId: string, schoolId: string) {
    const fee = await this.findById(feeId, schoolId);
    return {
      fee,
      generatedAt: new Date(),
    };
  }

  async getFeeStatistics(schoolId: string, filters?: { month?: number; year?: number }) {
    const query: any = { school: new Types.ObjectId(schoolId) };
    if (filters?.month) query.month = filters.month;
    if (filters?.year) query.year = filters.year;

    const stats = await this.feeModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' },
        },
      },
    ]);

    const summary = await this.feeModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalFees: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$paidAmount' },
          totalPending: { $sum: '$balanceAmount' },
          totalDiscount: { $sum: '$discount' },
          totalFine: { $sum: '$fine' },
        },
      },
    ]);

    return {
      statusWise: stats,
      summary: summary[0] || {},
    };
  }

  async getCollectionReport(
    schoolId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const fees = await this.feeModel.find({
      school: schoolId,
      'payments.date': { $gte: startDate, $lte: endDate },
    }).populate('student', 'firstName lastName admissionNumber');

    const report = [];
    fees.forEach((fee) => {
      fee.payments.forEach((payment: any) => {
        if (payment.date >= startDate && payment.date <= endDate) {
          report.push({
            student: fee.student,
            month: fee.month,
            year: fee.year,
            ...payment,
          });
        }
      });
    });

    const total = report.reduce((sum, p) => sum + p.amount, 0);

    return { report, total };
  }

  async getStudentFeeStatement(studentId: string, schoolId: string) {
    const fees = await this.feeModel
      .find({ school: schoolId, student: studentId })
      .populate('academicYear', 'name')
      .sort({ year: -1, month: -1 });

    const totalDue = fees.reduce((sum, f) => sum + f.netAmount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
    const totalBalance = fees.reduce((sum, f) => sum + f.balanceAmount, 0);

    return {
      fees,
      summary: {
        totalDue,
        totalPaid,
        totalBalance,
      },
    };
  }

  private async generateReceiptNumber(schoolId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await this.feeModel.countDocuments({ school: schoolId });
    return `RCP${currentYear}${String(count + 1).padStart(6, '0')}`;
  }
}
