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
  Settings,
  SettingsDocument,
} from '../../database/schemas/settings.schema';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
    @InjectModel(Exam.name) private examModel: Model<ExamDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  async create(
    createResultDto: CreateResultDto,
    schoolId: string,
    enteredBy: string,
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

      const [exam, student] = await Promise.all([
        this.examModel.findById(createResultDto.exam),
        this.studentModel.findById(createResultDto.student),
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
    pagination?: { page: number; limit: number },
  ) {
    const { page = 1, limit = 20 } = pagination || {};
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

    const [results, total] = await Promise.all([
      this.resultModel
        .find(filter)
        .populate('student', 'firstName lastName admissionNumber rollNumber')
        .populate('exam', 'name examType')
        .populate('class', 'name grade')
        .populate('subjects.subject', 'name code')
        .sort({ percentage: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.resultModel.countDocuments(filter),
    ]);

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

  async getStudentReportCard(studentId: string, academicYearId: string) {
    if (
      !Types.ObjectId.isValid(studentId) ||
      !Types.ObjectId.isValid(academicYearId)
    ) {
      throw new BadRequestException('Invalid student or academic year ID');
    }

    const [student, results] = await Promise.all([
      this.studentModel
        .findById(studentId)
        .populate('currentClass', 'name grade')
        .exec(),
      this.resultModel
        .find({
          student: new Types.ObjectId(studentId),
          academicYear: new Types.ObjectId(academicYearId),
          isPublished: true,
        })
        .populate('exam', 'name examType startDate endDate')
        .populate('subjects.subject', 'name code type')
        .sort({ 'exam.startDate': 1 })
        .exec(),
    ]);

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
}
