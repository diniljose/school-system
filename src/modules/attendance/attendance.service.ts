import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Attendance,
  AttendanceDocument,
} from '../../database/schemas/attendance.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from '../../database/schemas/academic-year.schema';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { MarkIndividualAttendanceDto } from './dto/mark-individual-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceStatus } from '../../common/enums/student-status.enum';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
  ) {}

  async markClassAttendance(
    markAttendanceDto: MarkAttendanceDto,
    schoolId: string,
    userId: string,
  ) {
    const { classId, section, date, records, subjectId, period } =
      markAttendanceDto;

    const classDoc = await this.classModel.findOne({
      _id: new Types.ObjectId(classId),
      school: new Types.ObjectId(schoolId),
    });

    if (!classDoc) {
      throw new NotFoundException('Class not found');
    }

    // Section is optional — only validate if provided
    if (section) {
      const sectionExists = classDoc.sections?.some((s) => s.name === section);
      if (classDoc.sections?.length > 0 && !sectionExists) {
        throw new NotFoundException(`Section ${section} not found in this class`);
      }
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const filter: any = {
      school: new Types.ObjectId(schoolId),
      class: new Types.ObjectId(classId),
      date: attendanceDate,
    };
    if (section) {
      filter.section = section;
    }

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    const existingAttendance = await this.attendanceModel.findOne(filter);

    const attendanceRecords = records.map((record) => ({
      student: new Types.ObjectId(record.student || record.studentId),
      status: record.status,
      inTime: record.inTime || '',
      outTime: record.outTime || '',
      remarks: record.remarks || record.note || '',
    }));

    const currentAcademicYear = await this.academicYearModel.findOne({
      school: new Types.ObjectId(schoolId),
      isCurrent: true,
    });

    if (!currentAcademicYear) {
      throw new NotFoundException('No current academic year found for this school');
    }

    const attendanceData = {
      school: new Types.ObjectId(schoolId),
      academicYear: currentAcademicYear._id,
      class: new Types.ObjectId(classId),
      section: section || 'A',
      date: attendanceDate,
      records: attendanceRecords,
      markedBy: new Types.ObjectId(userId),
      ...(subjectId && { subject: new Types.ObjectId(subjectId) }),
      ...(period != null && { period: typeof period === 'number' ? period : parseInt(period, 10) }),
    };

    if (existingAttendance) {
      Object.assign(existingAttendance, attendanceData);
      await existingAttendance.save();
      return existingAttendance;
    }

    const attendance = new this.attendanceModel(attendanceData);
    await attendance.save();
    return attendance;
  }

  async markIndividualAttendance(
    markIndividualDto: MarkIndividualAttendanceDto,
    schoolId: string,
    userId: string,
  ) {
    const {
      studentId,
      classId,
      section,
      date,
      status,
      inTime,
      outTime,
      remarks,
      subjectId,
      period,
    } = markIndividualDto;

    const [student, classDoc] = await Promise.all([
      this.studentModel.findOne({
        _id: new Types.ObjectId(studentId),
        school: new Types.ObjectId(schoolId),
      }),
      this.classModel.findOne({
        _id: new Types.ObjectId(classId),
        school: new Types.ObjectId(schoolId),
      }),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!classDoc) {
      throw new NotFoundException('Class not found');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const filter: any = {
      school: new Types.ObjectId(schoolId),
      class: new Types.ObjectId(classId),
      section,
      date: attendanceDate,
    };

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    let attendance = await this.attendanceModel.findOne(filter);

    const studentRecord = {
      student: new Types.ObjectId(studentId),
      status,
      inTime: inTime || '',
      outTime: outTime || '',
      remarks: remarks || '',
    };

    if (attendance) {
      const recordIndex = attendance.records.findIndex(
        (r) => r.student.toString() === studentId,
      );

      if (recordIndex !== -1) {
        attendance.records[recordIndex] = studentRecord;
      } else {
        attendance.records.push(studentRecord);
      }

      attendance.markedBy = new Types.ObjectId(userId);
      await attendance.save();
    } else {
      const currentAcademicYear = await this.academicYearModel.findOne({
        school: new Types.ObjectId(schoolId),
        isCurrent: true,
      });

      if (!currentAcademicYear) {
        throw new NotFoundException('No current academic year found for this school');
      }

      attendance = new this.attendanceModel({
        school: new Types.ObjectId(schoolId),
        academicYear: currentAcademicYear._id,
        class: new Types.ObjectId(classId),
        section,
        date: attendanceDate,
        records: [studentRecord],
        markedBy: new Types.ObjectId(userId),
        ...(subjectId && { subject: new Types.ObjectId(subjectId) }),
        ...(period != null && { period: typeof period === 'number' ? period : parseInt(period, 10) }),
      });
      await attendance.save();
    }

    return attendance;
  }

  async getStudentAttendance(studentId: string, query: QueryAttendanceDto) {
    const {
      startDate,
      endDate,
      status,
      subjectId,
      period,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      'records.student': new Types.ObjectId(studentId),
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    if (period !== undefined) {
      filter.period = period;
    }

    const attendanceRecords = await this.attendanceModel
      .find(filter)
      .populate('class', 'name grade')
      .populate('subject', 'name code')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.attendanceModel.countDocuments(filter);

    const data = attendanceRecords
      .map((record) => {
        const studentRecord = record.records.find(
          (r) => r.student.toString() === studentId,
        );

        if (status && studentRecord?.status !== status) {
          return null;
        }

        return {
          date: record.date,
          class: record.class,
          section: record.section,
          subject: record.subject,
          period: record.period,
          status: studentRecord?.status,
          inTime: studentRecord?.inTime,
          outTime: studentRecord?.outTime,
          remarks: studentRecord?.remarks,
        };
      })
      .filter(Boolean);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClassAttendance(classId: string, section: string, date: string) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const filter: any = {
      class: new Types.ObjectId(classId),
      date: attendanceDate,
    };
    if (section) {
      filter.section = section;
    }

    const attendance = await this.attendanceModel
      .find(filter)
      .populate('subject', 'name code')
      .populate({
        path: 'records.student',
        select: 'firstName lastName rollNumber admissionNumber',
      })
      .exec();

    if (!attendance || attendance.length === 0) {
      return { data: [] };
    }

    return attendance;
  }

  async getAttendanceStatistics(
    studentId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const filter: any = {
      'records.student': new Types.ObjectId(studentId),
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const attendanceRecords = await this.attendanceModel.find(filter).exec();

    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let excusedDays = 0;

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r) => r.student.toString() === studentId,
      );

      if (studentRecord) {
        totalDays++;
        switch (studentRecord.status) {
          case AttendanceStatus.PRESENT:
            presentDays++;
            break;
          case AttendanceStatus.ABSENT:
            absentDays++;
            break;
          case AttendanceStatus.LATE:
            lateDays++;
            presentDays++;
            break;
          case AttendanceStatus.HALF_DAY:
            halfDays++;
            presentDays += 0.5;
            break;
          case AttendanceStatus.EXCUSED:
            excusedDays++;
            break;
        }
      }
    });

    const attendancePercentage =
      totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      excusedDays,
      attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
    };
  }

  async getAbsentees(classId: string, section: string, date: string) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceModel
      .findOne({
        class: new Types.ObjectId(classId),
        section,
        date: attendanceDate,
      })
      .populate({
        path: 'records.student',
        select: 'firstName lastName rollNumber admissionNumber contact',
      })
      .exec();

    if (!attendance) {
      throw new NotFoundException('No attendance record found for this date');
    }

    const absentees = attendance.records
      .filter((record) => record.status === AttendanceStatus.ABSENT)
      .map((record) => ({
        student: record.student,
        remarks: record.remarks,
      }));

    return {
      date: attendance.date,
      class: classId,
      section,
      totalAbsent: absentees.length,
      absentees,
    };
  }

  async getDefaulters(
    classId: string,
    section: string,
    date: string,
    threshold: number = 75,
  ) {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const students = await this.studentModel
      .find({
        currentClass: new Types.ObjectId(classId),
      })
      .select('firstName lastName rollNumber admissionNumber')
      .exec();

    const defaulters = [];

    for (const student of students) {
      const stats = await this.getAttendanceStatistics(
        student._id.toString(),
        undefined,
        date,
      );

      if (stats.attendancePercentage < threshold) {
        defaulters.push({
          student: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            rollNumber: student.rollNumber,
            admissionNumber: student.admissionNumber,
          },
          attendancePercentage: stats.attendancePercentage,
          totalDays: stats.totalDays,
          presentDays: stats.presentDays,
          absentDays: stats.absentDays,
        });
      }
    }

    defaulters.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    return {
      threshold,
      totalDefaulters: defaulters.length,
      defaulters,
    };
  }

  async getMonthlyReport(
    studentId: string,
    month: number,
    year: number,
    subjectId?: string,
  ) {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const filter: any = {
      'records.student': new Types.ObjectId(studentId),
      date: { $gte: startDate, $lte: endDate },
    };

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    const attendanceRecords = await this.attendanceModel
      .find(filter)
      .populate('subject', 'name code')
      .sort({ date: 1 })
      .exec();

    const dailyRecords = [];
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let excusedDays = 0;

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r) => r.student.toString() === studentId,
      );

      if (studentRecord) {
        totalDays++;
        dailyRecords.push({
          date: record.date,
          status: studentRecord.status,
          subject: record.subject,
          period: record.period,
          inTime: studentRecord.inTime,
          outTime: studentRecord.outTime,
          remarks: studentRecord.remarks,
        });

        switch (studentRecord.status) {
          case AttendanceStatus.PRESENT:
            presentDays++;
            break;
          case AttendanceStatus.ABSENT:
            absentDays++;
            break;
          case AttendanceStatus.LATE:
            lateDays++;
            presentDays++;
            break;
          case AttendanceStatus.HALF_DAY:
            halfDays++;
            presentDays += 0.5;
            break;
          case AttendanceStatus.EXCUSED:
            excusedDays++;
            break;
        }
      }
    });

    const attendancePercentage =
      totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      month,
      year,
      subject: subjectId,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        excusedDays,
        attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
      },
      dailyRecords,
    };
  }

  async getYearlyReport(studentId: string, year: number, subjectId?: string) {
    const startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);

    const filter: any = {
      'records.student': new Types.ObjectId(studentId),
      date: { $gte: startDate, $lte: endDate },
    };

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    const attendanceRecords = await this.attendanceModel
      .find(filter)
      .populate('subject', 'name code')
      .exec();

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      halfDays: 0,
      excusedDays: 0,
      attendancePercentage: 0,
    }));

    let yearTotalDays = 0;
    let yearPresentDays = 0;
    let yearAbsentDays = 0;
    let yearLateDays = 0;
    let yearHalfDays = 0;
    let yearExcusedDays = 0;

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r) => r.student.toString() === studentId,
      );

      if (studentRecord) {
        const monthIndex = record.date.getMonth();
        const monthData = monthlyData[monthIndex];

        monthData.totalDays++;
        yearTotalDays++;

        switch (studentRecord.status) {
          case AttendanceStatus.PRESENT:
            monthData.presentDays++;
            yearPresentDays++;
            break;
          case AttendanceStatus.ABSENT:
            monthData.absentDays++;
            yearAbsentDays++;
            break;
          case AttendanceStatus.LATE:
            monthData.lateDays++;
            monthData.presentDays++;
            yearLateDays++;
            yearPresentDays++;
            break;
          case AttendanceStatus.HALF_DAY:
            monthData.halfDays++;
            monthData.presentDays += 0.5;
            yearHalfDays++;
            yearPresentDays += 0.5;
            break;
          case AttendanceStatus.EXCUSED:
            monthData.excusedDays++;
            yearExcusedDays++;
            break;
        }
      }
    });

    monthlyData.forEach((month) => {
      month.attendancePercentage =
        month.totalDays > 0
          ? parseFloat(((month.presentDays / month.totalDays) * 100).toFixed(2))
          : 0;
    });

    const yearAttendancePercentage =
      yearTotalDays > 0 ? (yearPresentDays / yearTotalDays) * 100 : 0;

    return {
      year,
      subject: subjectId,
      summary: {
        totalDays: yearTotalDays,
        presentDays: yearPresentDays,
        absentDays: yearAbsentDays,
        lateDays: yearLateDays,
        halfDays: yearHalfDays,
        excusedDays: yearExcusedDays,
        attendancePercentage: parseFloat(yearAttendancePercentage.toFixed(2)),
      },
      monthlyData,
    };
  }
}
