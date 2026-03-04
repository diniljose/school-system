import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from '../../database/schemas/student.schema';
import { Teacher, TeacherDocument } from '../../database/schemas/teacher.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { Subject, SubjectDocument } from '../../database/schemas/subject.schema';
import { Attendance, AttendanceDocument } from '../../database/schemas/attendance.schema';
import { Fee, FeeDocument } from '../../database/schemas/fee.schema';
import { Enrollment, EnrollmentDocument, EnrollmentStatus } from '../../database/schemas/enrollment.schema';
import { SchoolEvent, EventDocument, EventStatus } from '../../database/schemas/event.schema';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Parent, ParentDocument } from '../../database/schemas/parent.schema';
import { Result, ResultDocument } from '../../database/schemas/result.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import { FeeStatus } from '../../common/enums/student-status.enum';

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
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(SchoolEvent.name) private eventModel: Model<EventDocument>,
    @InjectModel(Exam.name) private examModel: Model<ExamDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Parent.name) private parentModel: Model<ParentDocument>,
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
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

  private async getEnrollmentModel(context?: TenantContext): Promise<Model<EnrollmentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<EnrollmentDocument>(
        context.schoolCode,
        'Enrollment',
      );
    }
    return this.enrollmentModel;
  }

  private async getEventModel(context?: TenantContext): Promise<Model<EventDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<EventDocument>(
        context.schoolCode,
        'SchoolEvent',
      );
    }
    return this.eventModel;
  }

  private async getExamModel(context?: TenantContext): Promise<Model<ExamDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ExamDocument>(
        context.schoolCode,
        'Exam',
      );
    }
    return this.examModel;
  }

  private async getResultModel(context?: TenantContext): Promise<Model<ResultDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ResultDocument>(
        context.schoolCode,
        'Result',
      );
    }
    return this.resultModel;
  }

  private async getParentModel(context?: TenantContext): Promise<Model<ParentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ParentDocument>(
        context.schoolCode,
        'Parent',
      );
    }
    return this.parentModel;
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

    // Get enrollment stats
    const enrollmentModel = await this.getEnrollmentModel(context);
    const enrollmentFilter: any = { ...baseFilter, status: EnrollmentStatus.ACTIVE };
    const totalEnrollments = await enrollmentModel.countDocuments(enrollmentFilter);

    const enrollmentClassWise = await enrollmentModel.aggregate([
      { $match: enrollmentFilter },
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id.class',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          className: '$classInfo.name',
          section: '$_id.section',
          count: 1,
        },
      },
      { $sort: { className: 1, section: 1 } },
    ]);

    // Get upcoming events
    const eventModel = await this.getEventModel(context);
    const now = new Date();
    const upcomingEventsFilter: any = {
      ...baseFilter,
      isActive: true,
      startDate: { $gte: now },
      status: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
    };

    const upcomingEvents = await eventModel
      .find(upcomingEventsFilter)
      .populate('targetClasses', 'name')
      .sort({ startDate: 1 })
      .limit(5);

    // Get today's events
    const todayEventsFilter: any = {
      ...baseFilter,
      isActive: true,
      $or: [
        { startDate: { $gte: today, $lt: todayEnd } },
        { startDate: { $lte: today }, endDate: { $gte: today } },
      ],
    };
    const todayEvents = await eventModel
      .find(todayEventsFilter)
      .sort({ startDate: 1 });

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
          totalEnrollments,
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
        enrollments: {
          totalActive: totalEnrollments,
          classWise: enrollmentClassWise,
        },
        events: {
          upcoming: upcomingEvents,
          today: todayEvents,
          todayCount: todayEvents.length,
          upcomingCount: upcomingEvents.length,
        },
      },
    };
  }

  /**
   * Get recent activities for dashboard
   */
  async getRecentActivities(
    schoolId: string,
    context?: TenantContext,
    limit: number = 10,
  ) {
    const studentModel = await this.getStudentModel(context);
    const teacherModel = await this.getTeacherModel(context);
    const enrollmentModel = await this.getEnrollmentModel(context);
    const eventModel = await this.getEventModel(context);

    const baseFilter: any = {};
    if (!context?.isTenantUser) {
      baseFilter.school = new Types.ObjectId(schoolId);
    }

    const activities: any[] = [];

    // Get recent student registrations
    const recentStudents = await studentModel
      .find({ ...baseFilter, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName createdAt');

    recentStudents.forEach((student) => {
      activities.push({
        type: 'student_registered',
        title: 'New Student Registered',
        description: `${student.firstName} ${student.lastName} was registered`,
        timestamp: student['createdAt'],
        icon: 'person_add',
      });
    });

    // Get recent enrollments
    const recentEnrollments = await enrollmentModel
      .find({ ...baseFilter, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'firstName lastName')
      .populate('class', 'name grade');

    recentEnrollments.forEach((enrollment: any) => {
      if (enrollment.student) {
        activities.push({
          type: 'enrollment',
          title: 'Student Enrolled',
          description: `${enrollment.student?.firstName} ${enrollment.student?.lastName} enrolled in ${enrollment.class?.name || 'a class'}`,
          timestamp: enrollment['createdAt'],
          icon: 'school',
        });
      }
    });

    // Get recent events
    const recentEvents = await eventModel
      .find({ ...baseFilter, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type createdAt');

    recentEvents.forEach((event) => {
      activities.push({
        type: 'event_created',
        title: 'Event Created',
        description: `${event.title}`,
        timestamp: event['createdAt'],
        icon: 'event',
      });
    });

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, limit);

    return {
      success: true,
      data: limitedActivities,
    };
  }

  /**
   * Get student dashboard data
   * Returns attendance rate, current grade, upcoming exams count, fee status, and pending fee amount
   */
  async getStudentDashboard(
    schoolId: string,
    profileId: string,
    profileModel: string,
    context?: TenantContext,
  ) {
    // Only process if user is a student
    if (profileModel !== 'Student' || !profileId) {
      return {
        success: true,
        data: {
          attendanceRate: null,
          currentGrade: null,
          upcomingExams: 0,
          feeStatus: 'N/A',
          pendingFeeAmount: 0,
        },
      };
    }

    const studentModel = await this.getStudentModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const feeModel = await this.getFeeModel(context);
    const examModel = await this.getExamModel(context);
    const resultModel = await this.getResultModel(context);
    const enrollmentModel = await this.getEnrollmentModel(context);

    const studentId = new Types.ObjectId(profileId);

    // Get student details with current class
    const student = await studentModel.findById(studentId).populate('currentClass');
    if (!student) {
      return { success: false, message: 'Student not found' };
    }

    // Get current enrollment
    const enrollment = await enrollmentModel.findOne({
      student: studentId,
      status: EnrollmentStatus.ACTIVE,
      isActive: true,
    }).populate('class');

    const classId = enrollment?.class?._id || student.currentClass;
    const section = enrollment?.section || (student as any).currentSection;

    // Calculate attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceRecords = await attendanceModel.find({
      student: studentId,
      date: { $gte: thirtyDaysAgo },
    });

    let attendanceRate: number | null = null;
    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter(
        (a: any) => a.status === 'present' || a.status === 'late'
      ).length;
      attendanceRate = Math.round((presentCount / attendanceRecords.length) * 100);
    }

    // Get current grade from latest result
    let currentGrade: string | null = null;
    const latestResult = await resultModel
      .findOne({ student: studentId })
      .sort({ createdAt: -1 })
      .select('grade percentage');
    
    if (latestResult) {
      currentGrade = (latestResult as any).grade || 
        (latestResult as any).percentage ? `${Math.round((latestResult as any).percentage)}%` : null;
    }

    // Count upcoming exams for student's class
    const now = new Date();
    const upcomingExamsFilter: any = {
      startDate: { $gte: now },
      status: { $in: ['scheduled', 'upcoming'] },
      isActive: true,
    };
    
    if (classId) {
      upcomingExamsFilter.$or = [
        { classes: classId },
        { 'schedule.class': classId },
      ];
    }

    const upcomingExams = await examModel.countDocuments(upcomingExamsFilter);

    // Get fee status and pending amount
    const fees = await feeModel.find({
      student: studentId,
      status: { $in: [FeeStatus.PENDING, FeeStatus.PARTIAL, FeeStatus.OVERDUE] },
    });

    let feeStatus = 'Paid';
    let pendingFeeAmount = 0;

    if (fees.length > 0) {
      const hasOverdue = fees.some((f: any) => f.status === FeeStatus.OVERDUE);
      pendingFeeAmount = fees.reduce((sum: number, f: any) => sum + (f.dueAmount || f.balanceAmount || 0), 0);
      
      if (hasOverdue) {
        feeStatus = 'Overdue';
      } else {
        feeStatus = 'Pending';
      }
    }

    return {
      success: true,
      data: {
        attendanceRate,
        currentGrade,
        upcomingExams,
        feeStatus,
        pendingFeeAmount,
        studentId: profileId,
        className: (enrollment?.class as any)?.name || null,
        section,
      },
    };
  }

  /**
   * Get teacher dashboard data
   */
  async getTeacherDashboard(
    schoolId: string,
    profileId: string,
    profileModel: string,
    context?: TenantContext,
  ) {
    if (profileModel !== 'Teacher' || !profileId) {
      return {
        success: true,
        data: {
          classCount: 0,
          totalStudents: 0,
          subjectCount: 0,
          todayAttendance: null,
          presentToday: 0,
          pendingEvaluations: 0,
          pendingApprovals: 0,
        },
      };
    }

    const teacherModel = await this.getTeacherModel(context);
    const classModel = await this.getClassModel(context);
    const studentModel = await this.getStudentModel(context);
    const attendanceModel = await this.getAttendanceModel(context);

    const teacherId = new Types.ObjectId(profileId);

    // Get teacher with assigned classes
    const teacher = await teacherModel.findById(teacherId);
    if (!teacher) {
      return { success: false, message: 'Teacher not found' };
    }

    // Count classes where teacher is assigned
    const assignedClasses = await classModel.find({
      $or: [
        { classTeacher: teacherId },
        { 'sections.classTeacher': teacherId },
        { teachers: teacherId },
      ],
    });

    const classCount = assignedClasses.length;
    const classIds = assignedClasses.map(c => c._id);

    // Count students in teacher's classes
    let totalStudents = 0;
    if (classIds.length > 0) {
      totalStudents = await studentModel.countDocuments({
        currentClass: { $in: classIds },
        status: 'active',
      });
    }

    // Get subject count (assuming teacher has subjects field)
    const subjectCount = (teacher as any).subjects?.length || 0;

    // Get today's attendance for teacher's classes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    let todayAttendance: number | null = null;
    let presentToday = 0;

    if (classIds.length > 0) {
      const todayAttendanceRecords = await attendanceModel.find({
        class: { $in: classIds },
        date: { $gte: today, $lte: todayEnd },
      });

      if (todayAttendanceRecords.length > 0) {
        presentToday = todayAttendanceRecords.filter(
          (a: any) => a.status === 'present' || a.status === 'late'
        ).length;
        todayAttendance = Math.round((presentToday / todayAttendanceRecords.length) * 100);
      }
    }

    // Count pending student approvals (for class teachers)
    const pendingApprovals = await studentModel.countDocuments({
      currentClass: { $in: classIds },
      status: 'pending',
    });

    return {
      success: true,
      data: {
        classCount,
        totalStudents,
        subjectCount,
        todayAttendance,
        presentToday,
        pendingEvaluations: 0, // Would need result module integration
        pendingApprovals,
        schedule: [], // Would need timetable integration
      },
    };
  }

  /**
   * Get parent dashboard data
   */
  async getParentDashboard(
    schoolId: string,
    profileId: string,
    profileModel: string,
    context?: TenantContext,
  ) {
    if (profileModel !== 'Parent' || !profileId) {
      return {
        success: true,
        data: {
          children: [],
          totalDue: 0,
          totalPaid: 0,
          pending: 0,
        },
      };
    }

    const parentModel = await this.getParentModel(context);
    const studentModel = await this.getStudentModel(context);
    const feeModel = await this.getFeeModel(context);
    const attendanceModel = await this.getAttendanceModel(context);
    const resultModel = await this.getResultModel(context);

    const parentId = new Types.ObjectId(profileId);

    // Get parent with children
    const parent = await parentModel.findById(parentId).populate('children');
    if (!parent) {
      return { success: false, message: 'Parent not found' };
    }

    const childrenIds = (parent as any).children?.map((c: any) => c._id || c) || [];

    // Get children details with their stats
    const children = await Promise.all(
      childrenIds.map(async (childId: Types.ObjectId) => {
        const student = await studentModel
          .findById(childId)
          .populate('currentClass')
          .select('firstName lastName currentClass currentSection');

        if (!student) return null;

        // Get attendance rate
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const attendanceRecords = await attendanceModel.find({
          student: childId,
          date: { $gte: thirtyDaysAgo },
        });

        let attendance = 0;
        if (attendanceRecords.length > 0) {
          const presentCount = attendanceRecords.filter(
            (a: any) => a.status === 'present' || a.status === 'late'
          ).length;
          attendance = Math.round((presentCount / attendanceRecords.length) * 100);
        }

        // Get latest grade
        const latestResult = await resultModel
          .findOne({ student: childId })
          .sort({ createdAt: -1 })
          .select('grade percentage rank');

        return {
          id: (student as any)._id.toString(),
          name: `${student.firstName} ${student.lastName}`,
          class: (student.currentClass as any)?.name || 'N/A',
          section: (student as any).currentSection || '',
          attendance,
          grade: (latestResult as any)?.grade || '-',
          rank: (latestResult as any)?.rank || '-',
        };
      })
    );

    // Calculate fee totals
    let totalDue = 0;
    let totalPaid = 0;

    if (childrenIds.length > 0) {
      const allFees = await feeModel.find({
        student: { $in: childrenIds },
      });

      allFees.forEach((fee: any) => {
        totalDue += fee.netAmount || fee.totalAmount || 0;
        totalPaid += fee.paidAmount || 0;
      });
    }

    return {
      success: true,
      data: {
        children: children.filter(Boolean),
        totalDue,
        totalPaid,
        pending: totalDue - totalPaid,
      },
    };
  }
}