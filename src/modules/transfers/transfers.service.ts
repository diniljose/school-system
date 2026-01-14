import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transfer,
  TransferDocument,
} from '../../database/schemas/transfer.schema';
import { Student, StudentDocument } from '../../database/schemas/student.schema';
import { StudentStatus } from '../../common/enums/student-status.enum';
import { TransferOutDto } from './dto/transfer-out.dto';
import { TransferInDto } from './dto/transfer-in.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(
    @InjectModel(Transfer.name) private transferModel: Model<TransferDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async initiateTransferOut(
    transferOutDto: TransferOutDto,
    schoolId: string,
    userId: string,
  ): Promise<Transfer> {
    const student = await this.studentModel.findOne({
      _id: transferOutDto.student,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.status === StudentStatus.TRANSFERRED_OUT) {
      throw new BadRequestException('Student already transferred out');
    }

    const transferCertificateNumber =
      await this.generateTransferCertificateNumber(schoolId);

    const transfer = new this.transferModel({
      ...transferOutDto,
      transferType: 'out',
      fromSchool: schoolId,
      transferCertificateNumber,
      transferCertificateDate: new Date(),
      processedBy: userId,
      status: 'pending',
    });

    return transfer.save();
  }

  async completeTransferOut(
    transferId: string,
    schoolId: string,
  ): Promise<Transfer> {
    const transfer = await this.transferModel.findOne({
      _id: transferId,
      fromSchool: schoolId,
      transferType: 'out',
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === 'completed') {
      throw new BadRequestException('Transfer already completed');
    }

    transfer.status = 'completed';
    await transfer.save();

    await this.studentModel.findByIdAndUpdate(transfer.student, {
      status: StudentStatus.TRANSFERRED_OUT,
    });

    return transfer;
  }

  async initiateTransferIn(
    transferInDto: TransferInDto,
    schoolId: string,
    userId: string,
  ): Promise<Transfer> {
    const student = await this.studentModel.findById(transferInDto.student);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const transfer = new this.transferModel({
      ...transferInDto,
      transferType: 'in',
      toSchool: schoolId,
      processedBy: userId,
      status: 'pending',
    });

    return transfer.save();
  }

  async completeTransferIn(
    transferId: string,
    schoolId: string,
  ): Promise<Transfer> {
    const transfer = await this.transferModel.findOne({
      _id: transferId,
      toSchool: schoolId,
      transferType: 'in',
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === 'completed') {
      throw new BadRequestException('Transfer already completed');
    }

    transfer.status = 'completed';
    await transfer.save();

    await this.studentModel.findByIdAndUpdate(transfer.student, {
      status: StudentStatus.ACTIVE,
      school: schoolId,
    });

    return transfer;
  }

  async cancelTransfer(transferId: string, schoolId: string): Promise<Transfer> {
    const transfer = await this.transferModel.findOne({
      _id: transferId,
      $or: [{ fromSchool: schoolId }, { toSchool: schoolId }],
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === 'completed') {
      throw new BadRequestException('Cannot cancel completed transfer');
    }

    transfer.status = 'cancelled';
    return transfer.save();
  }

  async getTransferById(id: string, schoolId: string): Promise<Transfer> {
    const transfer = await this.transferModel
      .findOne({
        _id: id,
        $or: [{ fromSchool: schoolId }, { toSchool: schoolId }],
      })
      .populate('student')
      .populate('fromSchool', 'name address')
      .populate('toSchool', 'name address')
      .populate('processedBy', 'firstName lastName');

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async getTransfersBySchool(
    schoolId: string,
    filters: {
      transferType?: 'in' | 'out';
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = {
      $or: [{ fromSchool: schoolId }, { toSchool: schoolId }],
    };

    if (filters.transferType === 'out') {
      query.fromSchool = schoolId;
      query.transferType = 'out';
      delete query.$or;
    } else if (filters.transferType === 'in') {
      query.toSchool = schoolId;
      query.transferType = 'in';
      delete query.$or;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      this.transferModel
        .find(query)
        .populate('student', 'firstName lastName admissionNumber')
        .populate('fromSchool', 'name')
        .populate('toSchool', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.transferModel.countDocuments(query),
    ]);

    return {
      data: transfers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentTransferHistory(studentId: string, schoolId: string) {
    return this.transferModel
      .find({
        student: studentId,
        $or: [{ fromSchool: schoolId }, { toSchool: schoolId }],
      })
      .populate('fromSchool', 'name')
      .populate('toSchool', 'name')
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  async generateTransferCertificate(transferId: string, schoolId: string) {
    const transfer = await this.getTransferById(transferId, schoolId);

    return {
      transfer,
      certificateNumber: transfer.transferCertificateNumber,
      issueDate: transfer.transferCertificateDate || new Date(),
      generatedAt: new Date(),
    };
  }

  async updateTransferDocuments(
    transferId: string,
    updateTransferDto: UpdateTransferDto,
    schoolId: string,
  ): Promise<Transfer> {
    const transfer = await this.transferModel.findOneAndUpdate(
      {
        _id: transferId,
        $or: [{ fromSchool: schoolId }, { toSchool: schoolId }],
      },
      { $set: updateTransferDto },
      { new: true },
    );

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  private async generateTransferCertificateNumber(
    schoolId: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await this.transferModel.countDocuments({
      fromSchool: schoolId,
    });
    return `TC${currentYear}${String(count + 1).padStart(5, '0')}`;
  }
}
