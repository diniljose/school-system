import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Attendance,
  AttendanceDocument,
} from '../../database/schemas/attendance.schema';
import {
  MarkAttendanceDto,
  MarkSubjectAttendanceDto,
  MarkPeriodAttendanceDto,
  MarkStudentAttendanceDto,
} from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus } from '../../common/enums/student-status.enum';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
  ) {}

  async markAttendance(
    dto: MarkAttendanceDto,
    schoolId: string,
    markedBy: string,
  ): Promise<Attendance> {
    const existingAttendance = await this.attendanceModel.findOne({
      school: schoolId,
      class: dto.classId,
      section: dto.section,
      date: dto.date,
      subject: null,
    });

    if (existingAttendance) {
      throw new ConflictException(
        'Attendance already marked for this class on this date',
      );
    }

    const records = dto.attendanceRecords.map((record) => ({
      student: new Types.ObjectId(record.studentId),
      status: record.status,
      inTime: record.inTime,
      outTime: record.outTime,
      remarks: record.remarks,
    }));

    const attendance = new this.attendanceModel({
      school: schoolId,
      academicYear: dto.academicYearId,
      class: dto.classId,
      section: dto.section,
      date: dto.date,
      records,
      markedBy,
    });

    return attendance.save();
  }

  async markStudentAttendance(
    studentId: string,
    date: Date,
    status: AttendanceStatus,
    remarks?: string,
  ): Promise<Attendance> {
    const attendance = await this.attendanceModel.findOne({
      date,
      'records.student': studentId,
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found for this date');
    }

    const studentRecord = attendance.records.find(
      (r: any) => r.student.toString() === studentId,
    );

    if (studentRecord) {
      studentRecord.status = status;
      if (remarks) studentRecord.remarks = remarks;
    }

    return attendance.save();
  }

  async updateAttendance(
    attendanceId: string,
    studentId: string,
    updateDto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    const attendance = await this.attendanceModel.findById(attendanceId);

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    const studentRecord = attendance.records.find(
      (r: any) => r.student.toString() === studentId,
    );

    if (!studentRecord) {
      throw new NotFoundException('Student record not found in attendance');
    }

    if (updateDto.status) studentRecord.status = updateDto.status;
    if (updateDto.remarks !== undefined)
      studentRecord.remarks = updateDto.remarks;
    if (updateDto.inTime) studentRecord.inTime = updateDto.inTime;
    if (updateDto.outTime) studentRecord.outTime = updateDto.outTime;

    return attendance.save();
  }

  async getAttendanceByDate(
    classId: string,
    section: string,
    date: Date,
  ): Promise<Attendance> {
    const attendance = await this.attendanceModel
      .findOne({
        class: classId,
        section,
        date,
      })
      .populate('records.student', 'firstName lastName admissionNumber')
      .populate('markedBy', 'firstName lastName');

    if (!attendance) {
      throw new NotFoundException('Attendance not found for this date');
    }

    return attendance;
  }

  async getStudentAttendance(
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const attendances = await this.attendanceModel
      .find({
        'records.student': studentId,
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .lean();

    return attendances.map((att: any) => {
      const studentRecord = att.records.find(
        (r: any) => r.student.toString() === studentId,
      );
      return {
        date: att.date,
        status: studentRecord?.status,
        inTime: studentRecord?.inTime,
        outTime: studentRecord?.outTime,
        remarks: studentRecord?.remarks,
        subject: att.subject,
        period: att.period,
      };
    });
  }

  async getClassAttendance(
    classId: string,
    section: string,
    month: number,
    year: number,
  ): Promise<Attendance[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.attendanceModel
      .find({
        class: classId,
        section,
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('records.student', 'firstName lastName admissionNumber rollNumber')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: 1 });
  }

  async getAttendanceStatistics(
    classId: string,
    section: string,
    academicYearId: string,
  ): Promise<any> {
    const attendances = await this.attendanceModel
      .find({
        class: classId,
        section,
        academicYear: academicYearId,
      })
      .lean();

    const stats: any = {
      totalDays: attendances.length,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      halfDayCount: 0,
      excusedCount: 0,
      studentStats: new Map(),
    };

    attendances.forEach((att: any) => {
      att.records.forEach((record: any) => {
        const studentId = record.student.toString();

        if (!stats.studentStats.has(studentId)) {
          stats.studentStats.set(studentId, {
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            excused: 0,
          });
        }

        const studentStat = stats.studentStats.get(studentId);

        switch (record.status) {
          case AttendanceStatus.PRESENT:
            stats.presentCount++;
            studentStat.present++;
            break;
          case AttendanceStatus.ABSENT:
            stats.absentCount++;
            studentStat.absent++;
            break;
          case AttendanceStatus.LATE:
            stats.lateCount++;
            studentStat.late++;
            break;
          case AttendanceStatus.HALF_DAY:
            stats.halfDayCount++;
            studentStat.halfDay++;
            break;
          case AttendanceStatus.EXCUSED:
            stats.excusedCount++;
            studentStat.excused++;
            break;
        }
      });
    });

    stats.studentStats = Array.from(stats.studentStats.entries()).map(
      ([studentId, stat]: [string, any]) => ({
        studentId,
        ...stat,
        percentage: ((stat.present / stats.totalDays) * 100).toFixed(2),
      }),
    );

    return stats;
  }

  async getStudentAttendancePercentage(
    studentId: string,
    academicYearId: string,
  ): Promise<any> {
    const attendances = await this.attendanceModel
      .find({
        academicYear: academicYearId,
        'records.student': studentId,
      })
      .lean();

    let presentDays = 0;
    let totalDays = attendances.length;

    attendances.forEach((att: any) => {
      const studentRecord = att.records.find(
        (r: any) => r.student.toString() === studentId,
      );
      if (
        studentRecord &&
        (studentRecord.status === AttendanceStatus.PRESENT ||
          studentRecord.status === AttendanceStatus.LATE)
      ) {
        presentDays++;
      }
    });

    return {
      studentId,
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      percentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
    };
  }

  async getAbsentees(
    classId: string,
    section: string,
    date: Date,
  ): Promise<any[]> {
    const attendance = await this.attendanceModel
      .findOne({
        class: classId,
        section,
        date,
      })
      .populate('records.student', 'firstName lastName admissionNumber rollNumber contact')
      .lean();

    if (!attendance) {
      return [];
    }

    return (attendance as any).records
      .filter((r: any) => r.status === AttendanceStatus.ABSENT)
      .map((r: any) => ({
        student: r.student,
        remarks: r.remarks,
      }));
  }

  async getDefaulters(
    classId: string,
    section: string,
    minimumPercentage: number,
  ): Promise<any[]> {
    const attendances = await this.attendanceModel
      .find({
        class: classId,
        section,
      })
      .lean();

    const studentAttendance = new Map<string, { present: number; total: number }>();

    attendances.forEach((att: any) => {
      att.records.forEach((record: any) => {
        const studentId = record.student.toString();

        if (!studentAttendance.has(studentId)) {
          studentAttendance.set(studentId, { present: 0, total: 0 });
        }

        const stat = studentAttendance.get(studentId);
        stat!.total++;

        if (
          record.status === AttendanceStatus.PRESENT ||
          record.status === AttendanceStatus.LATE
        ) {
          stat!.present++;
        }
      });
    });

    const defaulters: any[] = [];

    studentAttendance.forEach((stat, studentId) => {
      const percentage = (stat.present / stat.total) * 100;
      if (percentage < minimumPercentage) {
        defaulters.push({
          studentId,
          presentDays: stat.present,
          totalDays: stat.total,
          percentage: percentage.toFixed(2),
        });
      }
    });

    return defaulters;
  }

  async markSubjectAttendance(
    dto: MarkSubjectAttendanceDto,
    schoolId: string,
    markedBy: string,
  ): Promise<Attendance> {
    const existingAttendance = await this.attendanceModel.findOne({
      school: schoolId,
      class: dto.classId,
      section: dto.section,
      date: dto.date,
      subject: dto.subjectId,
    });

    if (existingAttendance) {
      throw new ConflictException(
        'Attendance already marked for this subject on this date',
      );
    }

    const records = dto.attendanceRecords.map((record) => ({
      student: new Types.ObjectId(record.studentId),
      status: record.status,
      inTime: record.inTime,
      outTime: record.outTime,
      remarks: record.remarks,
    }));

    const attendance = new this.attendanceModel({
      school: schoolId,
      academicYear: dto.academicYearId,
      class: dto.classId,
      section: dto.section,
      date: dto.date,
      subject: dto.subjectId,
      records,
      markedBy,
    });

    return attendance.save();
  }

  async markPeriodAttendance(
    dto: MarkPeriodAttendanceDto,
    schoolId: string,
    markedBy: string,
  ): Promise<Attendance> {
    const existingAttendance = await this.attendanceModel.findOne({
      school: schoolId,
      class: dto.classId,
      section: dto.section,
      date: dto.date,
      period: dto.period,
    });

    if (existingAttendance) {
      throw new ConflictException(
        'Attendance already marked for this period on this date',
      );
    }

    const records = dto.attendanceRecords.map((record) => ({
      student: new Types.ObjectId(record.studentId),
      status: record.status,
      inTime: record.inTime,
      outTime: record.outTime,
      remarks: record.remarks,
    }));

    const attendance = new this.attendanceModel({
      school: schoolId,
      academicYear: dto.academicYearId,
      class: dto.classId,
      section: dto.section,
      date: dto.date,
      period: dto.period,
      subject: dto.subjectId,
      records,
      markedBy,
    });

    return attendance.save();
  }

  async generateAttendanceReport(
    classId: string,
    section: string,
    month: number,
    year: number,
  ): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await this.attendanceModel
      .find({
        class: classId,
        section,
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('records.student', 'firstName lastName admissionNumber rollNumber')
      .lean();

    const studentMap = new Map<string, any>();

    attendances.forEach((att: any) => {
      att.records.forEach((record: any) => {
        const studentId = record.student._id.toString();

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student: record.student,
            attendance: [],
            summary: {
              present: 0,
              absent: 0,
              late: 0,
              halfDay: 0,
              excused: 0,
              total: 0,
            },
          });
        }

        const studentData = studentMap.get(studentId);
        studentData.attendance.push({
          date: att.date,
          status: record.status,
          remarks: record.remarks,
        });

        studentData.summary.total++;
        switch (record.status) {
          case AttendanceStatus.PRESENT:
            studentData.summary.present++;
            break;
          case AttendanceStatus.ABSENT:
            studentData.summary.absent++;
            break;
          case AttendanceStatus.LATE:
            studentData.summary.late++;
            break;
          case AttendanceStatus.HALF_DAY:
            studentData.summary.halfDay++;
            break;
          case AttendanceStatus.EXCUSED:
            studentData.summary.excused++;
            break;
        }
      });
    });

    const report = Array.from(studentMap.values()).map((data) => ({
      ...data,
      summary: {
        ...data.summary,
        percentage: (
          (data.summary.present / data.summary.total) *
          100
        ).toFixed(2),
      },
    }));

    return {
      classId,
      section,
      month,
      year,
      totalDays: attendances.length,
      students: report,
    };
  }
}
