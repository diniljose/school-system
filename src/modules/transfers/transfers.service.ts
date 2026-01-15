import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transfer,
  TransferDocument,
} from '../../database/schemas/transfer.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { School, SchoolDocument } from '../../database/schemas/school.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { TransferOutDto } from './dto/transfer-out.dto';
import { TransferInDto } from './dto/transfer-in.dto';
import { TransferType, TransferStatus } from './dto/query-transfer.dto';
import { StudentStatus } from '../../common/enums/student-status.enum';

@Injectable()
export class TransfersService {
  constructor(
    @InjectModel(Transfer.name)
    private transferModel: Model<TransferDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
  ) {}

  async initiateTransferOut(dto: TransferOutDto, processedBy: string) {
    const student = await this.studentModel.findById(dto.studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.status === StudentStatus.TRANSFERRED_OUT) {
      throw new ConflictException('Student already transferred out');
    }

    if (!dto.toSchool && !dto.externalSchoolName) {
      throw new BadRequestException(
        'Either toSchool or externalSchoolName must be provided',
      );
    }

    let toSchool: School | null = null;
    if (dto.toSchool) {
      toSchool = await this.schoolModel.findById(dto.toSchool);
      if (!toSchool) {
        throw new NotFoundException('Destination school not found');
      }
    }

    const existingPendingTransfer = await this.transferModel.findOne({
      student: new Types.ObjectId(dto.studentId),
      transferType: TransferType.OUT,
      status: { $in: [TransferStatus.PENDING, TransferStatus.APPROVED] },
    });

    if (existingPendingTransfer) {
      throw new ConflictException(
        'Student already has a pending transfer out request',
      );
    }

    const transfer = await this.transferModel.create({
      student: new Types.ObjectId(dto.studentId),
      transferType: TransferType.OUT,
      fromSchool: student.school,
      toSchool: dto.toSchool ? new Types.ObjectId(dto.toSchool) : undefined,
      externalSchoolName: dto.externalSchoolName,
      externalSchoolAddress: dto.externalSchoolAddress,
      transferDate: new Date(dto.transferDate),
      effectiveDate: dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : undefined,
      reason: dto.reason,
      lastClassAttended: dto.lastClassAttended,
      lastAttendanceDate: dto.lastAttendanceDate
        ? new Date(dto.lastAttendanceDate)
        : undefined,
      conductCertificate: dto.conductCertificate,
      documents: dto.documents,
      remarks: dto.remarks,
      processedBy: new Types.ObjectId(processedBy),
      status: TransferStatus.PENDING,
    });

    return transfer;
  }

  async completeTransferOut(transferId: string, processedBy: string) {
    const transfer = await this.transferModel
      .findById(transferId)
      .populate('student');
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.transferType !== TransferType.OUT) {
      throw new BadRequestException('Not a transfer out request');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new ConflictException('Transfer already completed');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled transfer');
    }

    const tcNumber = await this.generateTCNumber();
    const tcDate = new Date();

    transfer.status = TransferStatus.COMPLETED;
    transfer.transferCertificateNumber = tcNumber;
    transfer.transferCertificateDate = tcDate;
    transfer.processedBy = new Types.ObjectId(processedBy);
    await transfer.save();

    const student = await this.studentModel.findById(transfer.student);
    if (student) {
      student.status = StudentStatus.TRANSFERRED_OUT;

      const schoolName = transfer.toSchool
        ? (await this.schoolModel.findById(transfer.toSchool))?.name
        : transfer.externalSchoolName;

      student.transferHistory.push({
        type: TransferType.OUT,
        date: transfer.transferDate,
        fromSchool:
          (await this.schoolModel.findById(student.school))?.name || '',
        toSchool: schoolName || '',
        reason: transfer.reason,
        transferCertificateNumber: tcNumber,
        remarks: transfer.remarks,
      });

      await student.save();
    }

    return transfer;
  }

  async initiateTransferIn(dto: TransferInDto, processedBy: string) {
    const student = await this.studentModel.findById(dto.studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    let fromSchool: School | null = null;
    if (dto.fromSchool) {
      fromSchool = await this.schoolModel.findById(dto.fromSchool);
      if (!fromSchool) {
        throw new NotFoundException('Source school not found');
      }
    }

    const existingPendingTransfer = await this.transferModel.findOne({
      student: new Types.ObjectId(dto.studentId),
      transferType: TransferType.IN,
      status: { $in: [TransferStatus.PENDING, TransferStatus.APPROVED] },
    });

    if (existingPendingTransfer) {
      throw new ConflictException(
        'Student already has a pending transfer in request',
      );
    }

    const transfer = await this.transferModel.create({
      student: new Types.ObjectId(dto.studentId),
      transferType: TransferType.IN,
      fromSchool: dto.fromSchool
        ? new Types.ObjectId(dto.fromSchool)
        : undefined,
      toSchool: student.school,
      externalSchoolName: dto.externalSchoolName,
      externalSchoolAddress: dto.externalSchoolAddress,
      transferDate: new Date(dto.transferDate),
      effectiveDate: dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : undefined,
      reason: dto.reason,
      documents: dto.documents,
      remarks: dto.remarks,
      processedBy: new Types.ObjectId(processedBy),
      status: TransferStatus.PENDING,
    });

    if (dto.previousSchoolTC) {
      student.previousSchoolTC = dto.previousSchoolTC;
      await student.save();
    }

    return transfer;
  }

  async completeTransferIn(
    transferId: string,
    studentData: Partial<Student>,
    processedBy: string,
  ) {
    const transfer = await this.transferModel
      .findById(transferId)
      .populate('student');
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.transferType !== TransferType.IN) {
      throw new BadRequestException('Not a transfer in request');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new ConflictException('Transfer already completed');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled transfer');
    }

    transfer.status = TransferStatus.COMPLETED;
    transfer.processedBy = new Types.ObjectId(processedBy);
    await transfer.save();

    const student = await this.studentModel.findById(transfer.student);
    if (student) {
      Object.assign(student, studentData);
      student.status = StudentStatus.TRANSFERRED_IN;

      const schoolName = transfer.fromSchool
        ? (await this.schoolModel.findById(transfer.fromSchool))?.name
        : transfer.externalSchoolName;

      student.transferHistory.push({
        type: TransferType.IN,
        date: transfer.transferDate,
        fromSchool: schoolName || '',
        toSchool: (await this.schoolModel.findById(student.school))?.name || '',
        reason: transfer.reason,
        transferCertificateNumber: '',
        remarks: transfer.remarks,
      });

      await student.save();
    }

    return transfer;
  }

  async cancelTransfer(transferId: string, reason: string) {
    const transfer = await this.transferModel.findById(transferId);
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed transfer');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new ConflictException('Transfer already cancelled');
    }

    transfer.status = TransferStatus.CANCELLED;
    transfer.remarks = transfer.remarks
      ? `${transfer.remarks}\nCancellation reason: ${reason}`
      : `Cancellation reason: ${reason}`;
    await transfer.save();

    return transfer;
  }

  async getTransferById(id: string) {
    const transfer = await this.transferModel
      .findById(id)
      .populate('student')
      .populate('fromSchool')
      .populate('toSchool')
      .populate('processedBy')
      .exec();

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async getTransfersBySchool(
    schoolId?: string,
    type?: TransferType,
    status?: TransferStatus,
    page = 1,
    limit = 20,
  ) {
    const query: any = {};

    if (schoolId) {
      query.$or = [
        { fromSchool: new Types.ObjectId(schoolId) },
        { toSchool: new Types.ObjectId(schoolId) },
      ];
    }

    if (type) {
      query.transferType = type;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      this.transferModel
        .find(query)
        .populate('student')
        .populate('fromSchool')
        .populate('toSchool')
        .populate('processedBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transferModel.countDocuments(query),
    ]);

    return {
      data: transfers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStudentTransferHistory(studentId: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const transfers = await this.transferModel
      .find({ student: new Types.ObjectId(studentId) })
      .populate('fromSchool')
      .populate('toSchool')
      .populate('processedBy')
      .sort({ createdAt: -1 })
      .exec();

    return {
      studentId,
      transferHistory: student.transferHistory,
      transfers,
    };
  }

  async generateTransferCertificate(transferId: string) {
    const transfer = await this.transferModel
      .findById(transferId)
      .populate('student')
      .populate('fromSchool')
      .populate('toSchool')
      .exec();

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.transferType !== TransferType.OUT) {
      throw new BadRequestException(
        'Transfer certificate only available for transfer out',
      );
    }

    if (transfer.status !== TransferStatus.COMPLETED) {
      throw new BadRequestException(
        'Transfer certificate only available for completed transfers',
      );
    }

    const student = transfer.student as any;
    const fromSchool = transfer.fromSchool as any;
    const toSchool = transfer.toSchool as any;

    return {
      certificateNumber: transfer.transferCertificateNumber,
      certificateDate: transfer.transferCertificateDate,
      student: {
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth,
        class: transfer.lastClassAttended,
      },
      fromSchool: {
        name: fromSchool?.name || '',
        address: fromSchool?.address || '',
      },
      toSchool: {
        name: toSchool?.name || transfer.externalSchoolName || '',
        address: toSchool?.address || transfer.externalSchoolAddress || '',
      },
      transferDate: transfer.transferDate,
      lastAttendanceDate: transfer.lastAttendanceDate,
      conductCertificate: transfer.conductCertificate,
      reason: transfer.reason,
      remarks: transfer.remarks,
    };
  }

  async updateTransferDocuments(transferId: string, documents: any) {
    const transfer = await this.transferModel.findById(transferId);
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    transfer.documents = {
      ...transfer.documents,
      ...documents,
    };

    await transfer.save();
    return transfer;
  }

  private async generateTCNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const count = await this.transferModel.countDocuments({
      transferType: TransferType.OUT,
      transferCertificateDate: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `TC-${dateStr}-${sequence}`;
  }
}
