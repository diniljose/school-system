import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from '../../database/schemas/student.schema';
import { Teacher, TeacherDocument } from '../../database/schemas/teacher.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { Subject, SubjectDocument } from '../../database/schemas/subject.schema';
import { Attendance, AttendanceDocument } from '../../database/schemas/attendance.schema';
import { Fee, FeeDocument } from '../../database/schemas/fee.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

interface TenantContext {
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Fee.name) private feeModel: Model<FeeDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getStudentModel(context?: TenantContext): Promise<Model<StudentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<StudentDocument>(
        context.schoolCode,
        'Student',
      );
    }
    return this.studentModel;
  }

  private async getTeacherModel(context?: TenantContext): Promise<Model<TeacherDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<TeacherDocument>(
        context.schoolCode,
        'Teacher',
      );
    }
    return this.teacherModel;
  }

  private async getClassModel(context?: TenantContext): Promise<Model<ClassDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassDocument>(
        context.schoolCode,
        'Class',
      );
    }
    return this.classModel;
  }

  private async getSubjectModel(context?: TenantContext): Promise<Model<SubjectDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<SubjectDocument>(
        context.schoolCode,
        'Subject',
      );
    }
    return this.subjectModel;
  }

  private async getAttendanceModel(context?: TenantContext): Promise<Model<AttendanceDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AttendanceDocument>(
        context.schoolCode,
        'Attendance',
      );
    }
    return this.attendanceModel;
  }

  private async getFeeModel(context?: TenantContext): Promise<Model<FeeDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<FeeDocument>(
        context.schoolCode,
        'Fee',
      );
    }
    return this.feeModel;
  }

  async getDashboardStats(
    schoolId: string,
    context?: TenantContext,
    academicYearId?: string,
  ) {
    const studentModel = await this.getStudentModel(context);
    const teacherModel = await this.getTeacherModel(context);
    const classModel = await this.getClassModel(context);
    const subjectModel = await this.getSubjectModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const feeModel = await this.getFeeModel(context);

    const baseFilter: any = {};
    if (!context?.isTenantUser) {
      baseFilter.school = new Types.ObjectId(schoolId);
    }

    // Get counts
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers,
      totalClasses,
      activeClasses,
      totalSubjects,
    ] = await Promise.all([
      studentModel.countDocuments(baseFilter),
      studentModel.countDocuments({ ...baseFilter, status: 'active' }),
      teacherModel.countDocuments(baseFilter),
      teacherModel.countDocuments({ ...baseFilter, status: 'active' }),
      classModel.countDocuments(baseFilter),
      classModel.countDocuments({ ...baseFilter, isActive: true }),
      subjectModel.countDocuments(baseFilter),
    ]);

    // Get today's attendance stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await attendanceModel.aggregate([
      {
        $match: {
          ...baseFilter,
          date: { $gte: today, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const attendanceStats = todayAttendance[0] || {
      present: 0,
      absent: 0,
      late: 0,
    };

    // Calculate attendance percentage
    const totalAttendanceRecords =
      attendanceStats.present + attendanceStats.absent + attendanceStats.late;
    const attendancePercentage =
      totalAttendanceRecords > 0
        ? ((attendanceStats.present / totalAttendanceRecords) * 100).toFixed(2)
        : 0;

    // Get fee collection stats (this month)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const feeStats = await feeModel.aggregate([
      {
        $match: {
          ...baseFilter,
          dueDate: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalFees: { $sum: '$amount' },
          paidFees: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0],
            },
          },
          pendingFees: {
            $sum: {
              $cond: [{ $ne: ['$status', 'paid'] }, '$amount', 0],
            },
          },
        },
      },
    ]);

    const feeCollectionStats = feeStats[0] || {
      totalFees: 0,
      paidFees: 0,
      pendingFees: 0,
    };

    return {
      success: true,
      data: {
        overview: {
          totalStudents,
          activeStudents,
          totalTeachers,
          activeTeachers,
          totalClasses,
          activeClasses,
          totalSubjects,
        },
        attendance: {
          today: {
            present: attendanceStats.present,
            absent: attendanceStats.absent,
            late: attendanceStats.late,
            total: totalAttendanceRecords,
            percentage: attendancePercentage,
          },
        },
        fees: {
          thisMonth: {
            total: feeCollectionStats.totalFees,
            collected: feeCollectionStats.paidFees,
            pending: feeCollectionStats.pendingFees,
            collectionPercentage:
              feeCollectionStats.totalFees > 0
                ? ((feeCollectionStats.paidFees / feeCollectionStats.totalFees) * 100).toFixed(2)
                : 0,
          },
        },
      },
    };
  }
}
