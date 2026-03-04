import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Result, ResultDocument } from '../../database/schemas/result.schema';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import {
  Settings,
  SettingsDocument,
} from '../../database/schemas/settings.schema';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
    @InjectModel(Exam.name) private examModel: Model<ExamDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
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

  async create(
    createResultDto: CreateResultDto,
    schoolId: string,
    enteredBy: string,
    context?: TenantContext,
  ) {
    try {
      const existingResult = await this.resultModel.findOne({
        school: new Types.ObjectId(schoolId),
        exam: new Types.ObjectId(createResultDto.exam),
        student: new Types.ObjectId(createResultDto.student),
      });

      if (existingResult) {
        throw new ConflictException(
          'Result for this student and exam already exists',
        );
      }

      // Use tenant-aware model for students
      const studentModel = await this.getStudentModel(context);
      const [exam, student] = await Promise.all([
        this.examModel.findById(createResultDto.exam),
        studentModel.findById(createResultDto.student),
      ]);

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const totalMarks = createResultDto.subjects.reduce(
        (sum, sub) => sum + sub.maxMarks,
        0,
      );
      const obtainedMarks = createResultDto.subjects.reduce(
        (sum, sub) => sum + sub.obtainedMarks,
        0,
      );
      const percentage =
        totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

      const settings = await this.settingsModel.findOne({
        school: new Types.ObjectId(schoolId),
      });
      const grade = this.calculateGradeFromPercentage(percentage, settings);

      const resultData = {
        ...createResultDto,
        school: new Types.ObjectId(schoolId),
        academicYear: new Types.ObjectId(createResultDto.academicYear),
        exam: new Types.ObjectId(createResultDto.exam),
        student: new Types.ObjectId(createResultDto.student),
        class: new Types.ObjectId(createResultDto.class),
        subjects: createResultDto.subjects.map((sub) => ({
          ...sub,
          subject: new Types.ObjectId(sub.subject),
        })),
        totalMarks,
        obtainedMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        enteredBy: new Types.ObjectId(enteredBy),
      };

      const newResult = new this.resultModel(resultData);
      await newResult.save();

      return newResult;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create result: ' + error.message,
      );
    }
  }

  async bulkCreate(
    resultsArray: CreateResultDto[],
    schoolId: string,
    enteredBy: string,
  ) {
    const promises = resultsArray.map(async (resultDto, index) => {
      try {
        const result = await this.create(resultDto, schoolId, enteredBy);
        return { success: true, result, index };
      } catch (error) {
        return {
          success: false,
          index,
          student: resultDto.student,
          error: error.message,
        };
      }
    });

    const results = await Promise.allSettled(promises);

    const createdResults = [];
    const errors = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          createdResults.push(result.value.result);
        } else {
          errors.push({
            index: result.value.index,
            student: result.value.student,
            error: result.value.error,
          });
        }
      } else {
        errors.push({
          index: -1,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return {
      success: createdResults.length,
      failed: errors.length,
      results: createdResults,
      errors,
    };
  }

  async findAll(
    examId?: string,
    classId?: string,
    schoolId?: string,
    options?: {
      page?: number;
      limit?: number;
      studentId?: string;
      academicYearId?: string;
      isPublished?: boolean;
    },
    context?: TenantContext,
  ) {
    const { page = 1, limit = 20, studentId, academicYearId, isPublished } = options || {};
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (schoolId) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (examId) {
      filter.exam = new Types.ObjectId(examId);
    }

    if (classId) {
      filter.class = new Types.ObjectId(classId);
    }

    if (studentId) {
      filter.student = new Types.ObjectId(studentId);
    }

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    if (isPublished !== undefined) {
      filter.isPublished = isPublished;
    }

    const [results, total] = await Promise.all([
      this.resultModel
        .find(filter)
        .populate('exam', 'name examType')
        .populate('subjects.subject', 'name code')
        .sort({ percentage: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.resultModel.countDocuments(filter),
    ]);

    // Manually populate student and class from tenant database
    if (context?.isTenantUser && context?.schoolCode && results.length > 0) {
      const studentModel = await this.getStudentModel(context);
      const classModel = await this.getClassModel(context);

      // Get unique student and class IDs
      const studentIds = [...new Set(results.map((r: any) => r.student?.toString()).filter(Boolean))];
      const classIds = [...new Set(results.map((r: any) => r.class?.toString()).filter(Boolean))];

      // Fetch students and classes in bulk
      const [students, classes] = await Promise.all([
        studentModel.find({ _id: { $in: studentIds } }).select('firstName lastName admissionNumber rollNumber').lean(),
        classModel.find({ _id: { $in: classIds } }).select('name grade').lean(),
      ]);

      // Create lookup maps
      const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));
      const classMap = new Map(classes.map((c: any) => [c._id.toString(), c]));

      // Attach student and class data to results
      for (const result of results as any[]) {
        result.student = result.student ? studentMap.get(result.student.toString()) || null : null;
        result.class = result.class ? classMap.get(result.class.toString()) || null : null;
      }
    }

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, schoolId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid result ID');
    }

    const result = await this.resultModel
      .findOne({ _id: id, school: new Types.ObjectId(schoolId) })
      .populate(
        'student',
        'firstName lastName admissionNumber rollNumber photo',
      )
      .populate('exam', 'name examType startDate endDate')
      .populate('class', 'name grade')
      .populate('academicYear', 'name startDate endDate')
      .populate('subjects.subject', 'name code type')
      .populate('enteredBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .exec();

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return result;
  }

  async findByStudent(studentId: string, academicYearId?: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }

    const filter: any = { student: new Types.ObjectId(studentId) };

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    const results = await this.resultModel
      .find(filter)
      .populate('exam', 'name examType startDate endDate')
      .populate('class', 'name grade')
      .populate('academicYear', 'name')
      .populate('subjects.subject', 'name code')
      .sort({ 'exam.startDate': -1 })
      .exec();

    return results;
  }

  async update(id: string, updateResultDto: UpdateResultDto, schoolId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid result ID');
    }

    const existingResult = await this.resultModel.findOne({
      _id: id,
      school: new Types.ObjectId(schoolId),
    });

    if (!existingResult) {
      throw new NotFoundException('Result not found');
    }

    const updateData: any = { ...updateResultDto };

    if (updateResultDto.subjects) {
      updateData.subjects = updateResultDto.subjects.map((sub) => ({
        ...sub,
        subject: new Types.ObjectId(sub.subject),
      }));

      const totalMarks = updateResultDto.subjects.reduce(
        (sum, sub) => sum + sub.maxMarks,
        0,
      );
      const obtainedMarks = updateResultDto.subjects.reduce(
        (sum, sub) => sum + sub.obtainedMarks,
        0,
      );
      const percentage =
        totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

      const settings = await this.settingsModel.findOne({
        school: new Types.ObjectId(schoolId),
      });
      const grade = this.calculateGradeFromPercentage(percentage, settings);

      updateData.totalMarks = totalMarks;
      updateData.obtainedMarks = obtainedMarks;
      updateData.percentage = Math.round(percentage * 100) / 100;
      updateData.grade = grade;
    }

    const updatedResult = await this.resultModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('student', 'firstName lastName admissionNumber rollNumber')
      .populate('exam', 'name examType')
      .populate('class', 'name grade')
      .populate('subjects.subject', 'name code')
      .exec();

    return updatedResult;
  }

  async delete(id: string, schoolId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid result ID');
    }

    const result = await this.resultModel.findOne({
      _id: id,
      school: new Types.ObjectId(schoolId),
    });

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    await this.resultModel.findByIdAndDelete(id);

    return { message: 'Result deleted successfully' };
  }

  async calculateGrades(resultId: string) {
    if (!Types.ObjectId.isValid(resultId)) {
      throw new BadRequestException('Invalid result ID');
    }

    const result = await this.resultModel.findById(resultId);

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    const settings = await this.settingsModel.findOne({
      school: result.school,
    });

    result.subjects = result.subjects.map((sub) => {
      const percentage =
        sub.maxMarks > 0 ? (sub.obtainedMarks / sub.maxMarks) * 100 : 0;
      const grade = this.calculateGradeFromPercentage(percentage, settings);
      const isPassed =
        percentage >= (settings?.examSettings?.passPercentage || 40);

      return {
        ...sub,
        grade,
        isPassed,
      };
    });

    const overallGrade = this.calculateGradeFromPercentage(
      result.percentage,
      settings,
    );
    result.grade = overallGrade;

    await result.save();

    return result;
  }

  async calculateRanks(examId: string, classId: string) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const results = await this.resultModel
      .find({
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
      })
      .sort({ percentage: -1 })
      .exec();

    let currentRank = 1;
    let previousPercentage: number | null = null;

    const bulkOps = [];

    for (let i = 0; i < results.length; i++) {
      if (
        previousPercentage !== null &&
        results[i].percentage < previousPercentage
      ) {
        currentRank = i + 1;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: results[i]._id },
          update: { $set: { rank: currentRank } },
        },
      });

      previousPercentage = results[i].percentage;
    }

    if (bulkOps.length > 0) {
      await this.resultModel.bulkWrite(bulkOps);
    }

    return {
      message: 'Ranks calculated successfully',
      totalResults: results.length,
    };
  }

  async publishResults(examId: string, classId: string) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const exam = await this.examModel.findById(examId);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    await this.calculateRanks(examId, classId);

    const updateResult = await this.resultModel.updateMany(
      {
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
      },
      {
        $set: { isPublished: true },
      },
    );

    exam.resultsPublished = true;
    exam.resultPublishDate = new Date();
    await exam.save();

    return {
      message: 'Results published successfully',
      resultsPublished: updateResult.modifiedCount,
    };
  }

  async unpublishResults(examId: string, classId: string) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const updateResult = await this.resultModel.updateMany(
      {
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
      },
      {
        $set: { isPublished: false },
      },
    );

    return {
      message: 'Results unpublished successfully',
      resultsUnpublished: updateResult.modifiedCount,
    };
  }

  async getStudentReportCard(
    studentId: string,
    academicYearId: string,
    examId?: string,
    context?: TenantContext,
  ) {
    if (
      !Types.ObjectId.isValid(studentId) ||
      !Types.ObjectId.isValid(academicYearId)
    ) {
      throw new BadRequestException('Invalid student or academic year ID');
    }

    // Use tenant-aware model for student lookup
    const studentModel = await this.getStudentModel(context);
    const classModel = await this.getClassModel(context);

    const student = await studentModel.findById(studentId).lean().exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Populate student's currentClass from tenant DB
    if (student.currentClass) {
      const studentClass = await classModel.findById(student.currentClass).select('name grade').lean();
      (student as any).currentClass = studentClass;
    }

    // Build filter for results
    const resultFilter: any = {
      student: new Types.ObjectId(studentId),
      academicYear: new Types.ObjectId(academicYearId),
      isPublished: true,
    };

    // If examId is provided, filter by it
    if (examId && Types.ObjectId.isValid(examId)) {
      resultFilter.exam = new Types.ObjectId(examId);
    }

    const results = await this.resultModel
      .find(resultFilter)
      .populate('exam', 'name examType startDate endDate')
      .populate('subjects.subject', 'name code type')
      .sort({ 'exam.startDate': 1 })
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const overallStats = {
      totalExams: results.length,
      averagePercentage:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
          : 0,
      highestPercentage:
        results.length > 0 ? Math.max(...results.map((r) => r.percentage)) : 0,
      lowestPercentage:
        results.length > 0 ? Math.min(...results.map((r) => r.percentage)) : 0,
    };

    return {
      student,
      results,
      overallStats,
    };
  }

  async getClassResults(examId: string, classId: string) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const results = await this.resultModel
      .find({
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
      })
      .populate('student', 'firstName lastName admissionNumber rollNumber')
      .populate('subjects.subject', 'name code')
      .sort({ rank: 1 })
      .exec();

    if (results.length === 0) {
      return {
        results: [],
        statistics: null,
      };
    }

    const statistics = {
      totalStudents: results.length,
      averagePercentage:
        results.reduce((sum, r) => sum + r.percentage, 0) / results.length,
      highestPercentage: Math.max(...results.map((r) => r.percentage)),
      lowestPercentage: Math.min(...results.map((r) => r.percentage)),
      passCount: results.filter((r) =>
        r.subjects.every((s) => s.isPassed !== false),
      ).length,
    };

    const passPercentage =
      (statistics.passCount / statistics.totalStudents) * 100;

    return {
      results,
      statistics: {
        ...statistics,
        passPercentage,
      },
    };
  }

  async getTopPerformers(examId: string, classId: string, limit: number = 10) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const topPerformers = await this.resultModel
      .find({
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
        isPublished: true,
      })
      .populate(
        'student',
        'firstName lastName admissionNumber rollNumber photo',
      )
      .sort({ percentage: -1 })
      .limit(limit)
      .exec();

    return topPerformers;
  }

  async getSubjectWiseAnalysis(
    examId: string,
    classId: string,
    subjectId: string,
  ) {
    if (
      !Types.ObjectId.isValid(examId) ||
      !Types.ObjectId.isValid(classId) ||
      !Types.ObjectId.isValid(subjectId)
    ) {
      throw new BadRequestException('Invalid exam, class, or subject ID');
    }

    const results = await this.resultModel
      .find({
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
      })
      .populate('student', 'firstName lastName admissionNumber rollNumber')
      .exec();

    const subjectResults = results
      .map((result) => {
        const subjectData = result.subjects.find(
          (s) => s.subject.toString() === subjectId,
        );

        if (!subjectData) return null;

        return {
          student: result.student,
          maxMarks: subjectData.maxMarks,
          obtainedMarks: subjectData.obtainedMarks,
          percentage:
            subjectData.maxMarks > 0
              ? (subjectData.obtainedMarks / subjectData.maxMarks) * 100
              : 0,
          grade: subjectData.grade,
          isPassed: subjectData.isPassed,
        };
      })
      .filter((r) => r !== null);

    if (subjectResults.length === 0) {
      return {
        subjectResults: [],
        analysis: null,
      };
    }

    const analysis = {
      totalStudents: subjectResults.length,
      averageMarks:
        subjectResults.reduce((sum, r) => sum + r.obtainedMarks, 0) /
        subjectResults.length,
      averagePercentage:
        subjectResults.reduce((sum, r) => sum + r.percentage, 0) /
        subjectResults.length,
      highestMarks: Math.max(...subjectResults.map((r) => r.obtainedMarks)),
      lowestMarks: Math.min(...subjectResults.map((r) => r.obtainedMarks)),
      passCount: subjectResults.filter((r) => r.isPassed !== false).length,
    };

    const passPercentage = (analysis.passCount / analysis.totalStudents) * 100;

    return {
      subjectResults,
      analysis: {
        ...analysis,
        passPercentage,
      },
    };
  }

  async getPerformanceTrend(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }

    const results = await this.resultModel
      .find({ student: new Types.ObjectId(studentId), isPublished: true })
      .populate('exam', 'name examType startDate')
      .populate('academicYear', 'name')
      .sort({ 'exam.startDate': 1 })
      .exec();

    const trend = results.map((result) => ({
      exam: result.exam,
      academicYear: result.academicYear,
      percentage: result.percentage,
      grade: result.grade,
      rank: result.rank,
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
    }));

    return {
      studentId,
      totalExams: trend.length,
      trend,
    };
  }

  private calculateGradeFromPercentage(
    percentage: number,
    settings: SettingsDocument | null,
  ): string {
    if (
      !settings ||
      !settings.gradingSystem ||
      settings.gradingSystem.length === 0
    ) {
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B+';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
    }

    const gradeEntry = settings.gradingSystem.find(
      (g) => percentage >= g.minPercentage && percentage <= g.maxPercentage,
    );

    return gradeEntry ? gradeEntry.grade : 'F';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEW: Result Entry & Analytics Methods
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get exams that are ready for result entry (completed or with past schedule dates)
   */
  async getExamsForResultEntry(
    schoolId: string,
    academicYearId?: string,
    context?: TenantContext,
  ) {
    const filter: any = {
      school: new Types.ObjectId(schoolId),
      isActive: true,
    };

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    // Get exams that are completed or have schedules with dates in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exams = await this.examModel
      .find(filter)
      .populate('academicYear', 'name')
      .sort({ startDate: -1 })
      .exec();

    // Filter exams that have at least one schedule item with a past date or status is completed
    const examsForEntry = exams
      .map((exam) => {
        const completedSchedules = exam.schedule?.filter((s) => {
          const scheduleDate = new Date(s.date);
          scheduleDate.setHours(0, 0, 0, 0);
          return scheduleDate < today || s.status === 'completed';
        }) || [];

        // Group schedules by class and section
        const schedulesByClassSection = completedSchedules.reduce((acc, s) => {
          const key = `${s.class?.toString()}_${s.section || 'all'}`;
          if (!acc[key]) {
            acc[key] = {
              classId: s.class?.toString(),
              className: s.className || '',
              section: s.section || 'all',
              subjects: [],
            };
          }
          acc[key].subjects.push({
            subjectId: s.subject?.toString(),
            subjectName: s.subjectName || '',
            date: s.date,
            maxMarks: s.maxMarks,
            passingMarks: s.passingMarks,
            status: s.status,
          });
          return acc;
        }, {} as Record<string, any>);

        return {
          _id: exam._id,
          name: exam.name,
          examType: exam.examType,
          academicYear: exam.academicYear,
          startDate: exam.startDate,
          endDate: exam.endDate,
          status: exam.status,
          resultsPublished: exam.resultsPublished,
          classSchedules: Object.values(schedulesByClassSection),
          totalSubjectsToEnter: completedSchedules.length,
        };
      })
      .filter((e) => e.totalSubjectsToEnter > 0);

    return {
      exams: examsForEntry,
      total: examsForEntry.length,
    };
  }

  /**
   * Get students for a class/section with their existing marks for an exam
   */
  async getStudentsForResultEntry(
    examId: string,
    classId: string,
    section: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const exam = await this.examModel.findById(examId);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Get subjects from exam schedule for this class/section
    const scheduleItems = exam.schedule?.filter(
      (s) =>
        s.class?.toString() === classId &&
        (s.section === section || s.section === null || section === 'all'),
    ) || [];

    const subjects = scheduleItems.map((s) => ({
      subjectId: s.subject?.toString(),
      subjectName: s.subjectName || '',
      maxMarks: s.maxMarks,
      passingMarks: s.passingMarks,
      date: s.date,
    }));

    // Get students by class and section
    const studentModel = await this.getStudentModel(context);
    const studentFilter: any = {
      currentClass: new Types.ObjectId(classId),
      status: { $in: ['active', 'enrolled'] },
    };
    if (section && section !== 'all') {
      studentFilter.currentSection = section;
    }

    const students = await studentModel
      .find(studentFilter)
      .select('firstName lastName admissionNumber rollNumber photo')
      .sort({ rollNumber: 1, firstName: 1 })
      .exec();

    // Get existing results for these students
    const existingResults = await this.resultModel
      .find({
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
        student: { $in: students.map((s) => s._id) },
      })
      .exec();

    const resultMap = new Map(
      existingResults.map((r) => [r.student.toString(), r]),
    );

    // Combine students with their marks
    const studentsWithMarks = students.map((student) => {
      const result = resultMap.get(student._id.toString());
      const subjectsWithMarks = subjects.map((sub) => {
        const subjectResult = result?.subjects?.find(
          (s) => s.subject?.toString() === sub.subjectId,
        );
        return {
          ...sub,
          obtainedMarks: subjectResult?.obtainedMarks ?? null,
          grade: subjectResult?.grade || '',
          isPassed: subjectResult?.isPassed ?? null,
        };
      });

      return {
        studentId: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
        photo: student.photo,
        resultId: result?._id || null,
        subjects: subjectsWithMarks,
        totalMarks: result?.totalMarks ?? null,
        obtainedMarks: result?.obtainedMarks ?? null,
        percentage: result?.percentage ?? null,
        grade: result?.grade || '',
        isPublished: result?.isPublished ?? false,
      };
    });

    return {
      exam: {
        _id: exam._id,
        name: exam.name,
        examType: exam.examType,
      },
      classId,
      section,
      subjects,
      students: studentsWithMarks,
      totalStudents: students.length,
      resultsEntered: existingResults.length,
    };
  }

  /**
   * Bulk enter/update marks for students in an exam
   */
  async bulkEnterMarks(
    examId: string,
    classId: string,
    section: string,
    academicYearId: string,
    marksData: {
      studentId: string;
      subjects: { subjectId: string; obtainedMarks: number }[];
    }[],
    schoolId: string,
    enteredBy: string,
    context?: TenantContext,
  ) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const exam = await this.examModel.findById(examId);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Get schedule items for this class/section to get max marks and passing marks
    const scheduleItems = exam.schedule?.filter(
      (s) =>
        s.class?.toString() === classId &&
        (s.section === section || s.section === null || section === 'all'),
    ) || [];

    const scheduleMap = new Map(
      scheduleItems.map((s) => [
        s.subject?.toString(),
        { maxMarks: s.maxMarks, passingMarks: s.passingMarks },
      ]),
    );

    const settings = await this.settingsModel.findOne({
      school: new Types.ObjectId(schoolId),
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of marksData) {
      try {
        // Find or create result for this student
        let result = await this.resultModel.findOne({
          exam: new Types.ObjectId(examId),
          student: new Types.ObjectId(entry.studentId),
          class: new Types.ObjectId(classId),
        });

        // Build subjects array with grades
        const subjectsData = entry.subjects.map((sub) => {
          const schedule = scheduleMap.get(sub.subjectId);
          const maxMarks = schedule?.maxMarks || 100;
          const passingMarks = schedule?.passingMarks || 40;
          const percentage = maxMarks > 0 ? (sub.obtainedMarks / maxMarks) * 100 : 0;
          const grade = this.calculateGradeFromPercentage(percentage, settings);
          const isPassed = sub.obtainedMarks >= passingMarks;

          return {
            subject: new Types.ObjectId(sub.subjectId),
            maxMarks,
            obtainedMarks: sub.obtainedMarks,
            grade,
            isPassed,
            remarks: '',
          };
        });

        // Calculate totals
        const totalMarks = subjectsData.reduce((sum, s) => sum + s.maxMarks, 0);
        const obtainedMarks = subjectsData.reduce(
          (sum, s) => sum + s.obtainedMarks,
          0,
        );
        const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        const overallGrade = this.calculateGradeFromPercentage(percentage, settings);

        if (result) {
          // Update existing result - merge subjects
          const existingSubjectMap = new Map(
            result.subjects.map((s) => [s.subject.toString(), s]),
          );
          
          // Update or add subjects
          for (const newSub of subjectsData) {
            existingSubjectMap.set(newSub.subject.toString(), newSub);
          }

          const mergedSubjects = Array.from(existingSubjectMap.values());
          const newTotalMarks = mergedSubjects.reduce((sum, s) => sum + s.maxMarks, 0);
          const newObtainedMarks = mergedSubjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
          const newPercentage = newTotalMarks > 0 ? (newObtainedMarks / newTotalMarks) * 100 : 0;
          const newGrade = this.calculateGradeFromPercentage(newPercentage, settings);

          result.subjects = mergedSubjects;
          result.totalMarks = newTotalMarks;
          result.obtainedMarks = newObtainedMarks;
          result.percentage = Math.round(newPercentage * 100) / 100;
          result.grade = newGrade;
          result.enteredBy = new Types.ObjectId(enteredBy);
          await result.save();
        } else {
          // Create new result
          result = new this.resultModel({
            school: new Types.ObjectId(schoolId),
            academicYear: new Types.ObjectId(academicYearId),
            exam: new Types.ObjectId(examId),
            student: new Types.ObjectId(entry.studentId),
            class: new Types.ObjectId(classId),
            subjects: subjectsData,
            totalMarks,
            obtainedMarks,
            percentage: Math.round(percentage * 100) / 100,
            grade: overallGrade,
            enteredBy: new Types.ObjectId(enteredBy),
            isPublished: false,
          });
          await result.save();
        }

        results.push({
          studentId: entry.studentId,
          resultId: result._id,
          percentage: result.percentage,
          grade: result.grade,
        });
      } catch (error) {
        errors.push({
          studentId: entry.studentId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Get comprehensive analytics for a student - trends, comparisons, pass/fail
   */
  async getStudentComprehensiveAnalytics(
    studentId: string,
    academicYearId?: string,
    context?: TenantContext,
  ) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }

    const studentModel = await this.getStudentModel(context);
    const subjectModel = await this.getSubjectModel(context);

    const student = await studentModel
      .findById(studentId)
      .select('firstName lastName admissionNumber rollNumber currentClass currentSection photo')
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const filter: any = {
      student: new Types.ObjectId(studentId),
    };

    if (academicYearId) {
      filter.academicYear = new Types.ObjectId(academicYearId);
    }

    const results = await this.resultModel
      .find(filter)
      .populate('exam', 'name examType startDate endDate')
      .populate('academicYear', 'name')
      .sort({ 'exam.startDate': 1 })
      .exec();

    if (results.length === 0) {
      return {
        student,
        summary: {
          totalExams: 0,
          averagePercentage: 0,
          highestPercentage: 0,
          lowestPercentage: 0,
          passedExams: 0,
          failedExams: 0,
          passRate: 0,
        },
        examResults: [],
        subjectAnalysis: [],
        performanceTrend: [],
        examComparisons: [],
      };
    }

    // Get all unique subject IDs
    const subjectIds = [
      ...new Set(
        results.flatMap((r) =>
          r.subjects.map((s) => s.subject.toString()),
        ),
      ),
    ];

    // Get subject names
    const subjects = await subjectModel
      .find({ _id: { $in: subjectIds.map((id) => new Types.ObjectId(id)) } })
      .select('name code')
      .exec();

    const subjectNameMap = new Map(
      subjects.map((s) => [s._id.toString(), { name: s.name, code: s.code }]),
    );

    // Get settings for pass percentage
    const settings = await this.settingsModel.findOne({
      school: results[0]?.school,
    });
    const passPercentage = settings?.examSettings?.passPercentage || 40;

    // Calculate summary statistics
    const percentages = results.map((r) => r.percentage);
    const passedExams = results.filter((r) =>
      r.subjects.every((s) => s.isPassed !== false),
    ).length;

    const summary = {
      totalExams: results.length,
      averagePercentage: Math.round(
        (percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100,
      ) / 100,
      highestPercentage: Math.max(...percentages),
      lowestPercentage: Math.min(...percentages),
      passedExams,
      failedExams: results.length - passedExams,
      passRate: Math.round((passedExams / results.length) * 10000) / 100,
    };

    // Build exam results with detailed info
    const examResults = results.map((r) => ({
      examId: (r.exam as any)?._id,
      examName: (r.exam as any)?.name,
      examType: (r.exam as any)?.examType,
      examDate: (r.exam as any)?.startDate,
      academicYear: (r.academicYear as any)?.name,
      totalMarks: r.totalMarks,
      obtainedMarks: r.obtainedMarks,
      percentage: r.percentage,
      grade: r.grade,
      rank: r.rank,
      isPublished: r.isPublished,
      subjects: r.subjects.map((s) => {
        const subInfo = subjectNameMap.get(s.subject.toString());
        return {
          subjectId: s.subject.toString(),
          subjectName: subInfo?.name || 'Unknown',
          subjectCode: subInfo?.code || '',
          maxMarks: s.maxMarks,
          obtainedMarks: s.obtainedMarks,
          percentage: s.maxMarks > 0 ? Math.round((s.obtainedMarks / s.maxMarks) * 10000) / 100 : 0,
          grade: s.grade,
          isPassed: s.isPassed,
        };
      }),
    }));

    // Subject-wise analysis across all exams
    const subjectStats: Record<string, any> = {};
    for (const result of results) {
      for (const sub of result.subjects) {
        const subId = sub.subject.toString();
        if (!subjectStats[subId]) {
          const subInfo = subjectNameMap.get(subId);
          subjectStats[subId] = {
            subjectId: subId,
            subjectName: subInfo?.name || 'Unknown',
            subjectCode: subInfo?.code || '',
            examCount: 0,
            totalMaxMarks: 0,
            totalObtainedMarks: 0,
            percentages: [],
            grades: [],
            passCount: 0,
            history: [],
          };
        }
        const percentage = sub.maxMarks > 0
          ? (sub.obtainedMarks / sub.maxMarks) * 100
          : 0;
        subjectStats[subId].examCount++;
        subjectStats[subId].totalMaxMarks += sub.maxMarks;
        subjectStats[subId].totalObtainedMarks += sub.obtainedMarks;
        subjectStats[subId].percentages.push(percentage);
        subjectStats[subId].grades.push(sub.grade);
        if (sub.isPassed !== false) {
          subjectStats[subId].passCount++;
        }
        subjectStats[subId].history.push({
          examId: (result.exam as any)?._id,
          examName: (result.exam as any)?.name,
          examDate: (result.exam as any)?.startDate,
          obtainedMarks: sub.obtainedMarks,
          maxMarks: sub.maxMarks,
          percentage,
          grade: sub.grade,
          isPassed: sub.isPassed,
        });
      }
    }

    const subjectAnalysis = Object.values(subjectStats).map((stat: any) => {
      const avgPercentage =
        stat.percentages.reduce((a: number, b: number) => a + b, 0) /
        stat.percentages.length;
      
      // Calculate trend (improvement or decline)
      let trend = 'stable';
      let trendPercentage = 0;
      if (stat.history.length >= 2) {
        const firstExam = stat.history[0];
        const lastExam = stat.history[stat.history.length - 1];
        trendPercentage = lastExam.percentage - firstExam.percentage;
        if (trendPercentage > 5) {
          trend = 'improving';
        } else if (trendPercentage < -5) {
          trend = 'declining';
        }
      }

      return {
        subjectId: stat.subjectId,
        subjectName: stat.subjectName,
        subjectCode: stat.subjectCode,
        examCount: stat.examCount,
        averagePercentage: Math.round(avgPercentage * 100) / 100,
        highestPercentage: Math.round(Math.max(...stat.percentages) * 100) / 100,
        lowestPercentage: Math.round(Math.min(...stat.percentages) * 100) / 100,
        passCount: stat.passCount,
        passRate: Math.round((stat.passCount / stat.examCount) * 10000) / 100,
        trend,
        trendPercentage: Math.round(trendPercentage * 100) / 100,
        history: stat.history,
      };
    });

    // Performance trend for chart (overall percentage per exam)
    const performanceTrend = examResults.map((r) => ({
      examId: r.examId,
      examName: r.examName,
      examDate: r.examDate,
      percentage: r.percentage,
      grade: r.grade,
    }));

    // Exam comparisons (compare with previous exam)
    const examComparisons: any[] = [];
    for (let i = 1; i < examResults.length; i++) {
      const current = examResults[i];
      const previous = examResults[i - 1];
      
      const subjectComparisons = current.subjects.map((currSub) => {
        const prevSub = previous.subjects.find(
          (s) => s.subjectId === currSub.subjectId,
        );
        const diff = prevSub
          ? currSub.percentage - prevSub.percentage
          : null;
        return {
          subjectId: currSub.subjectId,
          subjectName: currSub.subjectName,
          currentMarks: currSub.obtainedMarks,
          currentPercentage: currSub.percentage,
          previousMarks: prevSub?.obtainedMarks ?? null,
          previousPercentage: prevSub?.percentage ?? null,
          difference: diff !== null ? Math.round(diff * 100) / 100 : null,
          status:
            diff === null
              ? 'new'
              : diff > 0
                ? 'improved'
                : diff < 0
                  ? 'declined'
                  : 'same',
        };
      });

      examComparisons.push({
        currentExam: {
          examId: current.examId,
          examName: current.examName,
          percentage: current.percentage,
        },
        previousExam: {
          examId: previous.examId,
          examName: previous.examName,
          percentage: previous.percentage,
        },
        overallDifference: Math.round(
          (current.percentage - previous.percentage) * 100,
        ) / 100,
        subjectComparisons,
      });
    }

    return {
      student,
      summary,
      examResults,
      subjectAnalysis,
      performanceTrend,
      examComparisons,
      passThreshold: passPercentage,
    };
  }

  /**
   * Get class analytics with ranking and statistics
   */
  async getClassAnalytics(
    examId: string,
    classId: string,
    section?: string,
    context?: TenantContext,
  ) {
    if (!Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid exam or class ID');
    }

    const results = await this.resultModel
      .find({
        exam: new Types.ObjectId(examId),
        class: new Types.ObjectId(classId),
      })
      .populate('subjects.subject', 'name code')
      .sort({ percentage: -1 })
      .lean()
      .exec();

    // Manually populate students from tenant database
    if (context?.isTenantUser && context?.schoolCode && results.length > 0) {
      const studentModel = await this.getStudentModel(context);
      const studentIds = [...new Set(results.map((r: any) => r.student?.toString()).filter(Boolean))];
      const students = await studentModel
        .find({ _id: { $in: studentIds } })
        .select('firstName lastName admissionNumber rollNumber photo currentSection')
        .lean();
      const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));
      for (const result of results as any[]) {
        result.student = result.student ? studentMap.get(result.student.toString()) || null : null;
      }
    }

    // Filter by section if provided
    let filteredResults = results;
    if (section && section !== 'all') {
      filteredResults = results.filter(
        (r: any) => r.student?.currentSection === section,
      );
    }

    if (filteredResults.length === 0) {
      return {
        examId,
        classId,
        section,
        statistics: null,
        topPerformers: [],
        subjectAnalysis: [],
        gradeDistribution: {},
        students: [],
      };
    }

    // Calculate statistics
    const percentages = filteredResults.map((r) => r.percentage);
    const statistics = {
      totalStudents: filteredResults.length,
      averagePercentage: Math.round(
        (percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100,
      ) / 100,
      highestPercentage: Math.max(...percentages),
      lowestPercentage: Math.min(...percentages),
      passCount: filteredResults.filter((r) =>
        r.subjects.every((s) => s.isPassed !== false),
      ).length,
      failCount: 0,
    };
    statistics.failCount = statistics.totalStudents - statistics.passCount;

    // Top performers
    const topPerformers = filteredResults.slice(0, 10).map((r, index) => ({
      rank: index + 1,
      studentId: (r.student as any)?._id,
      studentName: `${(r.student as any)?.firstName} ${(r.student as any)?.lastName}`,
      admissionNumber: (r.student as any)?.admissionNumber,
      rollNumber: (r.student as any)?.rollNumber,
      percentage: r.percentage,
      grade: r.grade,
    }));

    // Subject-wise analysis
    const subjectStats: Record<string, any> = {};
    for (const result of filteredResults) {
      for (const sub of result.subjects) {
        const subId = sub.subject?.toString() || (sub.subject as any)?._id?.toString();
        const subName = (sub.subject as any)?.name || 'Unknown';
        
        if (!subjectStats[subId]) {
          subjectStats[subId] = {
            subjectId: subId,
            subjectName: subName,
            marks: [],
            passCount: 0,
          };
        }
        const percentage = sub.maxMarks > 0
          ? (sub.obtainedMarks / sub.maxMarks) * 100
          : 0;
        subjectStats[subId].marks.push(percentage);
        if (sub.isPassed !== false) {
          subjectStats[subId].passCount++;
        }
      }
    }

    const subjectAnalysis = Object.values(subjectStats).map((stat: any) => ({
      subjectId: stat.subjectId,
      subjectName: stat.subjectName,
      averagePercentage: Math.round(
        (stat.marks.reduce((a: number, b: number) => a + b, 0) / stat.marks.length) * 100,
      ) / 100,
      highestPercentage: Math.round(Math.max(...stat.marks) * 100) / 100,
      lowestPercentage: Math.round(Math.min(...stat.marks) * 100) / 100,
      passRate: Math.round((stat.passCount / filteredResults.length) * 10000) / 100,
    }));

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    for (const result of filteredResults) {
      const grade = result.grade || 'F';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    // All students with ranking
    const students = filteredResults.map((r, index) => ({
      rank: index + 1,
      studentId: (r.student as any)?._id,
      studentName: `${(r.student as any)?.firstName} ${(r.student as any)?.lastName}`,
      admissionNumber: (r.student as any)?.admissionNumber,
      rollNumber: (r.student as any)?.rollNumber,
      section: (r.student as any)?.currentSection,
      totalMarks: r.totalMarks,
      obtainedMarks: r.obtainedMarks,
      percentage: r.percentage,
      grade: r.grade,
      isPassed: r.subjects.every((s) => s.isPassed !== false),
    }));

    return {
      examId,
      classId,
      section,
      statistics,
      topPerformers,
      subjectAnalysis,
      gradeDistribution,
      students,
    };
  }
}
