import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  // Helper methods to get tenant-aware models
  private async getAttendanceModel(context?: TenantContext): Promise<Model<AttendanceDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AttendanceDocument>(
        context.schoolCode,
        'Attendance',
      );
    }
    return this.attendanceModel;
  }

  private async getStudentModel(context?: TenantContext): Promise<Model<StudentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<StudentDocument>(
        context.schoolCode,
        'Student',
      );
    }
    return this.studentModel;
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

  private async getAcademicYearModel(context?: TenantContext): Promise<Model<AcademicYearDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<AcademicYearDocument>(
        context.schoolCode,
        'AcademicYear',
      );
    }
    return this.academicYearModel;
  }

  async markClassAttendance(
    markAttendanceDto: MarkAttendanceDto,
    schoolId: string,
    userId: string,
    context?: TenantContext,
  ) {
    const { classId, section, date, records, subjectId, period } =
      markAttendanceDto;

    const classModel = await this.getClassModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const academicYearModel = await this.getAcademicYearModel(context);

    this.logger.debug(`Querying class with ID: ${classId}, School: ${schoolId}, Context: ${JSON.stringify(context)}`);

    // Build class query - don't filter by school for tenant users (tenant DB is already school-specific)
    const classQuery: any = { _id: new Types.ObjectId(classId) };
    if (!context?.isTenantUser) {
      classQuery.school = new Types.ObjectId(schoolId);
    }

    const classDoc = await classModel.findOne(classQuery);

    if (!classDoc) {
      this.logger.error(`Class not found for ID: ${classId}, School: ${schoolId}`);
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

    // Build attendance filter - don't filter by school for tenant users
    const filter: any = {
      class: new Types.ObjectId(classId),
      date: attendanceDate,
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }
    if (section) {
      filter.section = section;
    }

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    const existingAttendance = await attendanceModel.findOne(filter);

    const attendanceRecords = records.map((record) => ({
      student: new Types.ObjectId(record.student || record.studentId),
      status: record.status,
      inTime: record.inTime || '',
      outTime: record.outTime || '',
      remarks: record.remarks || record.note || '',
    }));

    // Build academic year query - don't filter by school for tenant users
    const academicYearQuery: any = { isCurrent: true };
    if (!context?.isTenantUser) {
      academicYearQuery.school = schoolId;
    }
    const currentAcademicYear = await academicYearModel.findOne(academicYearQuery);

    this.logger.debug(`Academic year query - School: ${schoolId}, Result: ${currentAcademicYear ? 'FOUND' : 'NOT FOUND'}, Context: ${JSON.stringify(context)}`);

    if (!currentAcademicYear) {
      throw new NotFoundException('No current academic year found for this school');
    }

    const attendanceData: any = {
      academicYear: currentAcademicYear._id,
      class: new Types.ObjectId(classId),
      section: section || 'A',
      date: attendanceDate,
      records: attendanceRecords,
      markedBy: new Types.ObjectId(userId),
      ...(subjectId && { subject: new Types.ObjectId(subjectId) }),
      ...(period != null && { period: typeof period === 'number' ? period : parseInt(period, 10) }),
    };
    if (!context?.isTenantUser) {
      attendanceData.school = new Types.ObjectId(schoolId);
    }

    if (existingAttendance) {
      Object.assign(existingAttendance, attendanceData);
      await existingAttendance.save();
      return existingAttendance;
    }

    const attendance = new attendanceModel(attendanceData);
    await attendance.save();
    return attendance;
  }

  async markIndividualAttendance(
    markIndividualDto: MarkIndividualAttendanceDto,
    schoolId: string,
    userId: string,
    context?: TenantContext,
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

    const studentModel = await this.getStudentModel(context);
    const classModel = await this.getClassModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const academicYearModel = await this.getAcademicYearModel(context);

    // Build queries - don't filter by school for tenant users
    const studentQuery: any = { _id: new Types.ObjectId(studentId) };
    const classQuery: any = { _id: new Types.ObjectId(classId) };
    if (!context?.isTenantUser) {
      studentQuery.school = new Types.ObjectId(schoolId);
      classQuery.school = new Types.ObjectId(schoolId);
    }

    const [student, classDoc] = await Promise.all([
      studentModel.findOne(studentQuery),
      classModel.findOne(classQuery),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!classDoc) {
      throw new NotFoundException('Class not found');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Build attendance filter - don't filter by school for tenant users
    const filter: any = {
      class: new Types.ObjectId(classId),
      section,
      date: attendanceDate,
    };
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (subjectId) {
      filter.subject = new Types.ObjectId(subjectId);
    }

    let attendance = await attendanceModel.findOne(filter);

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
      // Build academic year query - don't filter by school for tenant users
      const academicYearQuery: any = { isCurrent: true };
      if (!context?.isTenantUser) {
        academicYearQuery.school = new Types.ObjectId(schoolId);
      }
      const currentAcademicYear = await academicYearModel.findOne(academicYearQuery);

      if (!currentAcademicYear) {
        throw new NotFoundException('No current academic year found for this school');
      }

      const attendanceData: any = {
        academicYear: currentAcademicYear._id,
        class: new Types.ObjectId(classId),
        section,
        date: attendanceDate,
        records: [studentRecord],
        markedBy: new Types.ObjectId(userId),
        ...(subjectId && { subject: new Types.ObjectId(subjectId) }),
        ...(period != null && { period: typeof period === 'number' ? period : parseInt(period, 10) }),
      };
      if (!context?.isTenantUser) {
        attendanceData.school = new Types.ObjectId(schoolId);
      }

      attendance = new attendanceModel(attendanceData);
      await attendance.save();
    }

    return attendance;
  }

  async getStudentAttendance(studentId: string, query: QueryAttendanceDto, context?: TenantContext) {
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

    const attendanceModel = await this.getAttendanceModel(context);

    const attendanceRecords = await attendanceModel
      .find(filter)
      .populate('class', 'name grade')
      .populate('subject', 'name code')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await attendanceModel.countDocuments(filter);

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

  async getClassAttendance(classId: string, section: string, date: string, context?: TenantContext) {
    // Get the correct model based on tenant context
    const classModel = await this.getClassModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const studentModel = await this.getStudentModel(context);

    // Validate that class exists
    const classExists = await classModel.findById(new Types.ObjectId(classId));
    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const filter: any = {
      class: new Types.ObjectId(classId),
      date: attendanceDate,
    };
    if (section) {
      filter.section = section;
    }

    const attendance = await attendanceModel
      .find(filter)
      .populate('subject', 'name code')
      .lean()
      .exec();

    if (!attendance || attendance.length === 0) {
      return { success: true, data: [] };
    }

    // Manually populate student data for tenant databases
    const studentIds = new Set<string>();
    attendance.forEach((att: any) => {
      if (att.records && Array.isArray(att.records)) {
        att.records.forEach((rec: any) => {
          if (rec.student) {
            studentIds.add(rec.student.toString());
          }
        });
      }
    });

    const students = await studentModel
      .find({ _id: { $in: Array.from(studentIds).map(id => new Types.ObjectId(id)) } })
      .select('firstName lastName rollNumber admissionNumber')
      .lean()
      .exec();

    const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));

    // Populate student refs in attendance records
    const populatedAttendance = attendance.map((att: any) => ({
      ...att,
      records: (att.records || []).map((rec: any) => ({
        ...rec,
        student: studentMap.get(rec.student?.toString()) || rec.student,
      })),
    }));

    return { success: true, data: populatedAttendance };
  }

  async getClassAttendanceRange(
    classId: string,
    section: string | null,
    fromDate: string,
    toDate: string,
    context?: TenantContext,
  ) {
    const classModel = await this.getClassModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const studentModel = await this.getStudentModel(context);

    const classExists = await classModel.findById(new Types.ObjectId(classId));
    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    const startDateObj = new Date(fromDate);
    startDateObj.setHours(0, 0, 0, 0);
    const endDateObj = new Date(toDate);
    endDateObj.setHours(23, 59, 59, 999);

    const filter: any = {
      class: new Types.ObjectId(classId),
      date: { $gte: startDateObj, $lte: endDateObj },
    };
    if (section) {
      filter.section = section;
    }

    const attendance = await attendanceModel
      .find(filter)
      .populate('subject', 'name code')
      .sort({ date: 1 })
      .lean()
      .exec();

    if (!attendance || attendance.length === 0) {
      return { success: true, data: [] };
    }

    const studentIds = new Set<string>();
    attendance.forEach((att: any) => {
      if (att.records && Array.isArray(att.records)) {
        att.records.forEach((rec: any) => {
          if (rec.student) {
            studentIds.add(rec.student.toString());
          }
        });
      }
    });

    const students = await studentModel
      .find({ _id: { $in: Array.from(studentIds).map(id => new Types.ObjectId(id)) } })
      .select('firstName lastName rollNumber admissionNumber')
      .lean()
      .exec();

    const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));

    const populatedAttendance = attendance.map((att: any) => ({
      ...att,
      records: (att.records || []).map((rec: any) => ({
        ...rec,
        student: studentMap.get(rec.student?.toString()) || rec.student,
      })),
    }));

    return { success: true, data: populatedAttendance };
  }

  async getAttendanceStatistics(
    studentId: string,
    startDate?: string,
    endDate?: string,
    context?: TenantContext,
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

    const attendanceModel = await this.getAttendanceModel(context);
    const attendanceRecords = await attendanceModel.find(filter).exec();

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

  async getAbsentees(classId: string, section: string, date: string, context?: TenantContext) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendanceModel = await this.getAttendanceModel(context);

    const attendance = await attendanceModel
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
    context?: TenantContext,
  ) {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const studentModel = await this.getStudentModel(context);

    const students = await studentModel
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
        context,
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
    context?: TenantContext,
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

    const attendanceModel = await this.getAttendanceModel(context);

    const attendanceRecords = await attendanceModel
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

  async getYearlyReport(studentId: string, year: number, subjectId?: string, context?: TenantContext) {
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

    const attendanceModel = await this.getAttendanceModel(context);

    const attendanceRecords = await attendanceModel
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

  /**
   * Get daily attendance summary for dashboard chart
   * Returns attendance counts for each day in the date range
   */
  async getDailySummary(
    schoolId: string,
    fromDate: string,
    toDate: string,
    classId?: string,
    section?: string,
    context?: TenantContext,
  ) {
    const attendanceModel = await this.getAttendanceModel(context);

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    // Build base filter
    const baseFilter: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    
    if (!context?.isTenantUser && schoolId) {
      baseFilter.school = new Types.ObjectId(schoolId);
    }

    // Add class filter if provided
    if (classId) {
      baseFilter.class = new Types.ObjectId(classId);
    }

    // Add section filter if provided
    if (section) {
      baseFilter.section = section;
    }

    // Aggregate attendance by date - unwind records array to count individual student statuses
    const dailyStats = await attendanceModel.aggregate([
      { $match: baseFilter },
      // Unwind the records array to get individual student attendance
      { $unwind: '$records' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: {
            $sum: {
              $cond: [
                { $in: ['$records.status', [AttendanceStatus.PRESENT, AttendanceStatus.LATE]] },
                1,
                0,
              ],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$records.status', AttendanceStatus.ABSENT] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$records.status', AttendanceStatus.LATE] }, 1, 0],
            },
          },
          halfDay: {
            $sum: {
              $cond: [{ $eq: ['$records.status', AttendanceStatus.HALF_DAY] }, 1, 0],
            },
          },
          excused: {
            $sum: {
              $cond: [{ $eq: ['$records.status', AttendanceStatus.EXCUSED] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Transform to desired format
    const data = dailyStats.map((day) => ({
      date: day._id,
      present: day.present,
      absent: day.absent,
      late: day.late,
      halfDay: day.halfDay,
      excused: day.excused,
      total: day.total,
      presentPercentage: day.total > 0 ? parseFloat(((day.present / day.total) * 100).toFixed(1)) : 0,
    }));

    return {
      success: true,
      data,
      meta: {
        fromDate,
        toDate,
        totalDays: data.length,
      },
    };
  }
}
