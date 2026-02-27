import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import {
  Attendance,
  AttendanceDocument,
} from '../../database/schemas/attendance.schema';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { ExamScheduleDto } from './dto/exam-schedule.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(Exam.name)
    private examModel: Model<ExamDocument>,
    @InjectModel(Class.name)
    private classModel: Model<ClassDocument>,
    @InjectModel(Subject.name)
    private subjectModel: Model<SubjectDocument>,
    @InjectModel(Student.name)
    private studentModel: Model<StudentDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getStudentModel(
    context?: TenantContext,
  ): Promise<Model<StudentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<StudentDocument>(
        context.schoolCode,
        'Student',
      );
    }
    return this.studentModel;
  }

  private async getClassModel(
    context?: TenantContext,
  ): Promise<Model<ClassDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassDocument>(
        context.schoolCode,
        'Class',
      );
    }
    return this.classModel;
  }

  private async getSubjectModel(
    context?: TenantContext,
  ): Promise<Model<SubjectDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<SubjectDocument>(
        context.schoolCode,
        'Subject',
      );
    }
    return this.subjectModel;
  }

  async create(createExamDto: CreateExamDto, schoolId: string, context?: TenantContext) {
    const startDate = new Date(createExamDto.startDate);
    const endDate = new Date(createExamDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const examData: any = {
      school: new Types.ObjectId(schoolId),
      academicYear: new Types.ObjectId(createExamDto.academicYear),
      name: createExamDto.name,
      examType: createExamDto.examType,
      startDate,
      endDate,
      description: createExamDto.description,
      status: createExamDto.status || 'scheduled',
      resultsPublished: createExamDto.resultsPublished || false,
      isActive:
        createExamDto.isActive !== undefined ? createExamDto.isActive : true,
    };

    if (createExamDto.classes && createExamDto.classes.length > 0) {
      examData.classes = createExamDto.classes.map(
        (classId) => new Types.ObjectId(classId),
      );
    }

    // Support sections
    if (createExamDto.sections && createExamDto.sections.length > 0) {
      examData.sections = createExamDto.sections;
    }

    // Support study leave days
    if (createExamDto.studyLeaveDays && createExamDto.studyLeaveDays.length > 0) {
      examData.studyLeaveDays = createExamDto.studyLeaveDays.map(d => new Date(d));
    }

    if (createExamDto.schedule && createExamDto.schedule.length > 0) {
      // Use tenant models for lookup
      const classModelToUse = await this.getClassModel(context);
      const subjectModelToUse = await this.getSubjectModel(context);
      
      // Look up class and subject names for denormalization
      const classIds = [...new Set(createExamDto.schedule.map(s => s.class).filter(Boolean))];
      const subjectIds = [...new Set(createExamDto.schedule.map(s => s.subject).filter(Boolean))];
      
      const classes = classIds.length > 0 
        ? await classModelToUse.find({ _id: { $in: classIds.map(id => new Types.ObjectId(id)) } }).exec()
        : [];
      const subjects = subjectIds.length > 0
        ? await subjectModelToUse.find({ _id: { $in: subjectIds.map(id => new Types.ObjectId(id)) } }).exec()
        : [];
      
      const classMap = new Map(classes.map(c => [c._id.toString(), c.name]));
      const subjectMap = new Map(subjects.map(s => [s._id.toString(), s.name]));

      examData.schedule = createExamDto.schedule.map((item) => ({
        class: item.class ? new Types.ObjectId(item.class) : null,
        className: classMap.get(item.class) || '',
        section: item.section || null,
        subject: item.subject ? new Types.ObjectId(item.subject) : null,
        subjectName: subjectMap.get(item.subject) || '',
        date: new Date(item.date),
        startTime: item.startTime,
        endTime: item.endTime,
        maxMarks: item.maxMarks,
        passingMarks: item.passingMarks,
        room: item.room || '',
        instructions: item.instructions || '',
        status: item.status || 'scheduled',
        supervisor: item.supervisor || '',
      }));
    }

    if (createExamDto.resultPublishDate) {
      examData.resultPublishDate = new Date(createExamDto.resultPublishDate);
    }

    const exam = new this.examModel(examData);
    return exam.save();
  }

  async findAll(queryDto: QueryExamDto, schoolId: string) {
    const {
      page = 1,
      limit = 20,
      examType,
      academicYear,
      classId,
      startDate,
      endDate,
    } = queryDto;

    const filter: any = { school: new Types.ObjectId(schoolId) };

    if (examType) {
      filter.examType = examType;
    }

    if (academicYear) {
      filter.academicYear = new Types.ObjectId(academicYear);
    }

    if (classId) {
      filter.classes = new Types.ObjectId(classId);
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
      this.examModel
        .find(filter)
        .populate('academicYear', 'name year')
        // Note: Don't populate schedule.class and schedule.subject as they're in tenant DBs
        // Use denormalized className and subjectName fields instead
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.examModel.countDocuments(filter).exec(),
    ]);

    return {
      data: exams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, schoolId: string) {
    const exam = await this.examModel
      .findOne({
        _id: new Types.ObjectId(id),
        school: new Types.ObjectId(schoolId),
      })
      .populate('academicYear', 'name year')
      // Note: Don't populate schedule.class and schedule.subject - use denormalized fields
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto, schoolId: string, context?: TenantContext) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(id),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (updateExamDto.startDate && updateExamDto.endDate) {
      const startDate = new Date(updateExamDto.startDate);
      const endDate = new Date(updateExamDto.endDate);
      if (endDate < startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updateData: any = {};

    if (updateExamDto.name) updateData.name = updateExamDto.name;
    if (updateExamDto.description !== undefined)
      updateData.description = updateExamDto.description;
    if (updateExamDto.examType) updateData.examType = updateExamDto.examType;
    if (updateExamDto.academicYear)
      updateData.academicYear = new Types.ObjectId(updateExamDto.academicYear);
    if (updateExamDto.startDate)
      updateData.startDate = new Date(updateExamDto.startDate);
    if (updateExamDto.endDate)
      updateData.endDate = new Date(updateExamDto.endDate);
    if (updateExamDto.resultsPublished !== undefined)
      updateData.resultsPublished = updateExamDto.resultsPublished;
    if (updateExamDto.isActive !== undefined)
      updateData.isActive = updateExamDto.isActive;
    if (updateExamDto.resultPublishDate)
      updateData.resultPublishDate = new Date(updateExamDto.resultPublishDate);
    if (updateExamDto.status)
      updateData.status = updateExamDto.status;

    if (updateExamDto.classes) {
      updateData.classes = updateExamDto.classes.map(
        (classId) => new Types.ObjectId(classId),
      );
    }

    // Handle sections
    if (updateExamDto.sections !== undefined) {
      updateData.sections = updateExamDto.sections;
    }

    // Handle study leave days
    if (updateExamDto.studyLeaveDays) {
      updateData.studyLeaveDays = updateExamDto.studyLeaveDays.map(d => new Date(d));
    }

    if (updateExamDto.schedule) {
      // Use tenant models for lookup
      const classModelToUse = await this.getClassModel(context);
      const subjectModelToUse = await this.getSubjectModel(context);
      
      // Look up class and subject names for denormalization
      const classIds = [...new Set(updateExamDto.schedule.map(s => s.class).filter(Boolean))];
      const subjectIds = [...new Set(updateExamDto.schedule.map(s => s.subject).filter(Boolean))];
      
      const classes = classIds.length > 0
        ? await classModelToUse.find({ _id: { $in: classIds.map(id => new Types.ObjectId(id)) } }).exec()
        : [];
      const subjects = subjectIds.length > 0
        ? await subjectModelToUse.find({ _id: { $in: subjectIds.map(id => new Types.ObjectId(id)) } }).exec()
        : [];
      
      const classMap = new Map(classes.map(c => [c._id.toString(), c.name]));
      const subjectMap = new Map(subjects.map(s => [s._id.toString(), s.name]));

      updateData.schedule = updateExamDto.schedule.map((item) => ({
        class: item.class ? new Types.ObjectId(item.class) : null,
        className: classMap.get(item.class) || '',
        section: item.section || null,
        subject: item.subject ? new Types.ObjectId(item.subject) : null,
        subjectName: subjectMap.get(item.subject) || '',
        date: new Date(item.date),
        startTime: item.startTime,
        endTime: item.endTime,
        maxMarks: item.maxMarks,
        passingMarks: item.passingMarks,
        room: item.room || '',
        instructions: item.instructions || '',
        status: item.status || 'scheduled',
        supervisor: item.supervisor || '',
      }));
    }

    return this.examModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      .exec();
  }

  async remove(id: string, schoolId: string) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(id),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    await this.examModel.findByIdAndDelete(id).exec();
    return { message: 'Exam deleted successfully' };
  }

  async assignToClass(examId: string, classId: string, schoolId: string) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const classDoc = await this.classModel.findOne({
      _id: new Types.ObjectId(classId),
      school: new Types.ObjectId(schoolId),
    });

    if (!classDoc) {
      throw new NotFoundException('Class not found');
    }

    const classObjectId = new Types.ObjectId(classId);

    if (exam.classes.some((c) => c.toString() === classId)) {
      throw new BadRequestException('Class already assigned to this exam');
    }

    exam.classes.push(classObjectId);
    await exam.save();

    return { message: 'Class assigned successfully', exam };
  }

  async removeFromClass(examId: string, classId: string, schoolId: string) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const classIndex = exam.classes.findIndex((c) => c.toString() === classId);

    if (classIndex === -1) {
      throw new NotFoundException('Class not assigned to this exam');
    }

    exam.classes.splice(classIndex, 1);
    exam.schedule = exam.schedule.filter(
      (s: any) => s.class.toString() !== classId,
    );
    await exam.save();

    return { message: 'Class removed successfully', exam };
  }

  async addSchedule(
    examId: string,
    scheduleDto: ExamScheduleDto,
    schoolId: string,
    context?: TenantContext,
  ) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Allow any valid MongoDB ObjectId for class (multi-tenant classes may be different)
    let classObjectId: Types.ObjectId | null = null;
    if (scheduleDto.class) {
      try {
        classObjectId = new Types.ObjectId(scheduleDto.class);
      } catch {
        throw new BadRequestException('Invalid class ID format');
      }
    }

    let subjectObjectId: Types.ObjectId | null = null;
    if (scheduleDto.subject) {
      try {
        subjectObjectId = new Types.ObjectId(scheduleDto.subject);
      } catch {
        throw new BadRequestException('Invalid subject ID format');
      }
    }

    // Use tenant models for lookup
    const classModelToUse = await this.getClassModel(context);
    const subjectModelToUse = await this.getSubjectModel(context);

    // Look up class and subject names for denormalization
    const classDoc = classObjectId ? await classModelToUse.findById(classObjectId).exec() : null;
    const subjectDoc = subjectObjectId ? await subjectModelToUse.findById(subjectObjectId).exec() : null;

    const scheduleItem: any = {
      class: classObjectId,
      className: classDoc?.name || '',
      section: scheduleDto.section || null,
      subject: subjectObjectId,
      subjectName: subjectDoc?.name || '',
      date: new Date(scheduleDto.date),
      startTime: scheduleDto.startTime,
      endTime: scheduleDto.endTime,
      maxMarks: scheduleDto.maxMarks,
      passingMarks: scheduleDto.passingMarks,
      room: scheduleDto.room || '',
      instructions: scheduleDto.instructions || '',
      status: scheduleDto.status || 'scheduled',
      supervisor: scheduleDto.supervisor || '',
    };

    exam.schedule.push(scheduleItem);
    await exam.save();

    return { message: 'Schedule added successfully', exam };
  }

  async updateSchedule(
    examId: string,
    scheduleId: string,
    scheduleDto: ExamScheduleDto,
    schoolId: string,
  ) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const scheduleIndex = exam.schedule.findIndex(
      (s: any) => s._id?.toString() === scheduleId,
    );

    if (scheduleIndex === -1) {
      throw new NotFoundException('Schedule item not found');
    }

    exam.schedule[scheduleIndex] = {
      ...exam.schedule[scheduleIndex],
      class: new Types.ObjectId(scheduleDto.class),
      subject: new Types.ObjectId(scheduleDto.subject),
      date: new Date(scheduleDto.date),
      startTime: scheduleDto.startTime,
      endTime: scheduleDto.endTime,
      maxMarks: scheduleDto.maxMarks,
      passingMarks: scheduleDto.passingMarks,
      room: scheduleDto.room || '',
    };

    await exam.save();

    return { message: 'Schedule updated successfully', exam };
  }

  async removeSchedule(examId: string, scheduleId: string, schoolId: string) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const scheduleIndex = exam.schedule.findIndex(
      (s: any) => s._id?.toString() === scheduleId,
    );

    if (scheduleIndex === -1) {
      throw new NotFoundException('Schedule item not found');
    }

    exam.schedule.splice(scheduleIndex, 1);
    await exam.save();

    return { message: 'Schedule removed successfully', exam };
  }

  async getExamSchedule(examId: string, schoolId: string) {
    const exam = await this.examModel
      .findOne({
        _id: new Types.ObjectId(examId),
        school: new Types.ObjectId(schoolId),
      })
      /* schedule.class and schedule.subject not populated - using denormalized fields */
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam.schedule;
  }

  async getExamTimetable(examId: string, schoolId: string) {
    const exam = await this.examModel
      .findOne({
        _id: new Types.ObjectId(examId),
        school: new Types.ObjectId(schoolId),
      })
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      /* schedule.class and schedule.subject not populated - using denormalized fields */
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const sortedSchedule = exam.schedule.sort((a: any, b: any) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return {
      exam: {
        id: exam._id,
        name: exam.name,
        examType: exam.examType,
        startDate: exam.startDate,
        endDate: exam.endDate,
        academicYear: exam.academicYear,
      },
      timetable: sortedSchedule,
    };
  }

  async getExamsByClass(classId: string, schoolId: string) {
    const exams = await this.examModel
      .find({
        school: new Types.ObjectId(schoolId),
        classes: new Types.ObjectId(classId),
        isActive: true,
      })
      .populate('academicYear', 'name year')
      .sort({ startDate: -1 })
      .exec();

    return exams;
  }

  async getUpcomingExams(schoolId: string, days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const exams = await this.examModel
      .find({
        school: new Types.ObjectId(schoolId),
        isActive: true,
        startDate: {
          $gte: today,
          $lte: futureDate,
        },
      })
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      .sort({ startDate: 1 })
      .exec();

    return exams;
  }

  // Get exams for a specific class and section
  async getExamsByClassSection(
    classId: string,
    section: string,
    schoolId: string,
    academicYearId?: string,
  ) {
    const filter: any = {
      school: new Types.ObjectId(schoolId),
      isActive: true,
      classes: new Types.ObjectId(classId),
      $or: [
        { sections: { $size: 0 } }, // No sections specified = all sections
        { sections: section },
        { 'schedule.class': new Types.ObjectId(classId), 'schedule.section': section },
        { 'schedule.class': new Types.ObjectId(classId), 'schedule.section': null },
      ],
    };

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    const exams = await this.examModel
      .find(filter)
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      /* schedule.class and schedule.subject not populated - using denormalized fields */
      .sort({ startDate: -1 })
      .exec();

    // Filter schedule items to only include relevant class/section
    return exams.map((exam) => {
      const examObj = exam.toObject();
      examObj.schedule = examObj.schedule.filter(
        (s: any) =>
          s.class?._id?.toString() === classId &&
          (!s.section || s.section === section),
      );
      return examObj;
    });
  }

  // Get exams for a student based on their class and section
  async getStudentExams(studentId: string, schoolId: string, context?: TenantContext) {
    const model = await this.getStudentModel(context);
    
    const filter: any = { _id: new Types.ObjectId(studentId) };
    // Only filter by school if not using tenant DB (tenant DB already scoped)
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }
    
    const student = await model.findOne(filter);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const classId = student.currentClass?.toString();
    const section = student.currentSection;

    if (!classId) {
      return { upcoming: [], completed: [], ongoing: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allExams = await this.getExamsByClassSection(
      classId,
      section,
      schoolId,
    );

    const upcoming = allExams.filter(
      (e) => new Date(e.startDate) > today,
    );
    const ongoing = allExams.filter(
      (e) =>
        new Date(e.startDate) <= today && new Date(e.endDate) >= today,
    );
    const completed = allExams.filter(
      (e) => new Date(e.endDate) < today,
    );

    return { upcoming, ongoing, completed };
  }

  // Get detailed exam schedule for a class/section (timetable view)
  async getClassExamTimetable(
    classId: string,
    section: string,
    examId: string,
    schoolId: string,
  ) {
    const exam = await this.examModel
      .findOne({
        _id: new Types.ObjectId(examId),
        school: new Types.ObjectId(schoolId),
        classes: new Types.ObjectId(classId),
      })
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      /* schedule.class and schedule.subject not populated - using denormalized fields */
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found for this class');
    }

    // Filter schedule for this class/section
    const filteredSchedule = exam.schedule.filter(
      (s: any) =>
        s.class?._id?.toString() === classId &&
        (!s.section || s.section === section),
    );

    // Group by date for timetable view
    const timetableByDate: { [date: string]: any[] } = {};
    filteredSchedule.forEach((s: any) => {
      const dateKey = new Date(s.date).toISOString().split('T')[0];
      if (!timetableByDate[dateKey]) {
        timetableByDate[dateKey] = [];
      }
      timetableByDate[dateKey].push(s);
    });

    // Sort each day's exams by start time
    Object.values(timetableByDate).forEach((dayExams) => {
      dayExams.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    // Mark study leave days
    const studyLeaveDays = exam.studyLeaveDays.map((d: Date) =>
      d.toISOString().split('T')[0],
    );

    return {
      exam: {
        id: exam._id,
        name: exam.name,
        examType: exam.examType,
        startDate: exam.startDate,
        endDate: exam.endDate,
        status: exam.status,
        description: exam.description,
      },
      timetable: timetableByDate,
      studyLeaveDays,
    };
  }

  // Get student's exam attendance (were they present on exam days)
  async getStudentExamAttendance(
    studentId: string,
    examId: string,
    schoolId: string,
  ) {
    const student = await this.studentModel.findOne({
      _id: new Types.ObjectId(studentId),
      school: new Types.ObjectId(schoolId),
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const exam = await this.examModel
      .findOne({
        _id: new Types.ObjectId(examId),
        school: new Types.ObjectId(schoolId),
      })
      /* schedule.subject not populated - using denormalized subjectName field */
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Get relevant schedule items for this student's class/section
    const relevantSchedule = exam.schedule.filter(
      (s: any) =>
        s.class?.toString() === student.currentClass?.toString() &&
        (!s.section || s.section === student.currentSection),
    );

    // Get attendance for each exam date
    const examDates = [...new Set(relevantSchedule.map((s: any) =>
      new Date(s.date).toISOString().split('T')[0]
    ))];

    const attendanceRecords = await Promise.all(
      examDates.map(async (dateStr) => {
        const date = new Date(dateStr);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const attendance = await this.attendanceModel.findOne({
          school: new Types.ObjectId(schoolId),
          class: student.currentClass,
          section: student.currentSection,
          date: { $gte: date, $lt: nextDay },
        });

        if (!attendance) {
          return { date: dateStr, status: 'not_marked', subjects: [] };
        }

        const studentRecord = attendance.records.find(
          (r: any) => r.student?.toString() === studentId,
        );

        const subjectsOnDate = relevantSchedule
          .filter((s: any) =>
            new Date(s.date).toISOString().split('T')[0] === dateStr,
          )
          .map((s: any) => ({
            subject: (s.subject as any)?.name || 'Unknown',
            startTime: s.startTime,
            endTime: s.endTime,
          }));

        return {
          date: dateStr,
          status: studentRecord?.status || 'not_marked',
          remarks: studentRecord?.remarks || '',
          subjects: subjectsOnDate,
        };
      }),
    );

    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        rollNumber: student.rollNumber,
      },
      exam: {
        id: exam._id,
        name: exam.name,
      },
      attendance: attendanceRecords,
    };
  }

  // Get all exams summary for dashboard
  async getExamsDashboard(schoolId: string, academicYearId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter: any = {
      school: new Types.ObjectId(schoolId),
      isActive: true,
    };

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    const exams = await this.examModel
      .find(filter)
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      .sort({ startDate: -1 })
      .exec();

    const upcoming = exams.filter((e) => new Date(e.startDate) > today).slice(0, 5);
    const ongoing = exams.filter(
      (e) => new Date(e.startDate) <= today && new Date(e.endDate) >= today,
    );
    const recent = exams
      .filter((e) => new Date(e.endDate) < today)
      .slice(0, 5);

    return {
      totalExams: exams.length,
      upcomingCount: exams.filter((e) => new Date(e.startDate) > today).length,
      ongoingCount: ongoing.length,
      completedCount: exams.filter((e) => new Date(e.endDate) < today).length,
      upcoming,
      ongoing,
      recent,
    };
  }
}

