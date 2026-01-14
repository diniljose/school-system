import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Result, ResultDocument } from '../../database/schemas/result.schema';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { BulkResultDto } from './dto/bulk-result.dto';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
  ) {}

  async create(
    createResultDto: CreateResultDto,
    schoolId: string,
    userId: string,
  ): Promise<Result> {
    const existing = await this.resultModel.findOne({
      school: schoolId,
      exam: createResultDto.exam,
      student: createResultDto.student,
    });

    if (existing) {
      throw new BadRequestException('Result already exists for this exam');
    }

    const { totalMarks, obtainedMarks, percentage, grade } =
      this.calculateGrades(createResultDto.subjects);

    const result = new this.resultModel({
      ...createResultDto,
      school: schoolId,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      enteredBy: userId,
    });

    return result.save();
  }

  async bulkCreate(
    bulkResultDto: BulkResultDto,
    schoolId: string,
    userId: string,
  ): Promise<{ created: number; failed: any[] }> {
    const created = [];
    const failed = [];

    for (const resultDto of bulkResultDto.results) {
      try {
        const result = await this.create(resultDto, schoolId, userId);
        created.push(result);
      } catch (error) {
        failed.push({ data: resultDto, error: error.message });
      }
    }

    return { created: created.length, failed };
  }

  async findAll(
    schoolId: string,
    filters: {
      academicYearId?: string;
      examId?: string;
      classId?: string;
      studentId?: string;
      isPublished?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { school: schoolId };

    if (filters.academicYearId) query.academicYear = filters.academicYearId;
    if (filters.examId) query.exam = filters.examId;
    if (filters.classId) query.class = filters.classId;
    if (filters.studentId) query.student = filters.studentId;
    if (filters.isPublished !== undefined)
      query.isPublished = filters.isPublished;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.resultModel
        .find(query)
        .populate('student', 'firstName lastName admissionNumber')
        .populate('exam', 'name')
        .populate('class', 'name grade')
        .skip(skip)
        .limit(limit)
        .sort({ percentage: -1 }),
      this.resultModel.countDocuments(query),
    ]);

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Result> {
    const result = await this.resultModel
      .findOne({ _id: id, school: schoolId })
      .populate('student')
      .populate('exam')
      .populate('class')
      .populate('academicYear')
      .populate('subjects.subject', 'name code');

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return result;
  }

  async findByStudent(
    studentId: string,
    schoolId: string,
    filters?: { academicYearId?: string; examId?: string },
  ) {
    const query: any = { school: schoolId, student: studentId };
    if (filters?.academicYearId) query.academicYear = filters.academicYearId;
    if (filters?.examId) query.exam = filters.examId;

    return this.resultModel
      .find(query)
      .populate('exam', 'name startDate endDate')
      .populate('academicYear', 'name')
      .sort({ createdAt: -1 });
  }

  async update(
    id: string,
    updateResultDto: UpdateResultDto,
    schoolId: string,
  ): Promise<Result> {
    const updateData: any = { ...updateResultDto };

    if (updateResultDto.subjects) {
      const { totalMarks, obtainedMarks, percentage, grade } =
        this.calculateGrades(updateResultDto.subjects);
      Object.assign(updateData, {
        totalMarks,
        obtainedMarks,
        percentage,
        grade,
      });
    }

    const result = await this.resultModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateData },
      { new: true },
    );

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return result;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    const result = await this.resultModel.findOneAndDelete({
      _id: id,
      school: schoolId,
    });

    if (!result) {
      throw new NotFoundException('Result not found');
    }
  }

  calculateGrades(subjects: any[]): {
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
  } {
    const totalMarks = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
    const obtainedMarks = subjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
    const percentage = (obtainedMarks / totalMarks) * 100;

    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    return { totalMarks, obtainedMarks, percentage, grade };
  }

  async calculateRanks(examId: string, classId: string, schoolId: string) {
    const results = await this.resultModel
      .find({ school: schoolId, exam: examId, class: classId })
      .sort({ percentage: -1 });

    let rank = 1;
    for (const result of results) {
      await this.resultModel.findByIdAndUpdate(result._id, { rank });
      rank++;
    }

    return { updated: results.length };
  }

  async publishResults(examId: string, schoolId: string) {
    await this.resultModel.updateMany(
      { school: schoolId, exam: examId },
      { isPublished: true },
    );
    return { message: 'Results published successfully' };
  }

  async unpublishResults(examId: string, schoolId: string) {
    await this.resultModel.updateMany(
      { school: schoolId, exam: examId },
      { isPublished: false },
    );
    return { message: 'Results unpublished successfully' };
  }

  async getStudentReportCard(
    studentId: string,
    examId: string,
    schoolId: string,
  ) {
    const result = await this.resultModel
      .findOne({ school: schoolId, student: studentId, exam: examId })
      .populate('student')
      .populate('exam')
      .populate('class')
      .populate('subjects.subject');

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return result;
  }

  async getClassResults(examId: string, classId: string, schoolId: string) {
    return this.resultModel
      .find({ school: schoolId, exam: examId, class: classId })
      .populate('student', 'firstName lastName admissionNumber rollNumber')
      .sort({ rank: 1 });
  }

  async getTopPerformers(
    examId: string,
    schoolId: string,
    limit: number = 10,
  ) {
    return this.resultModel
      .find({ school: schoolId, exam: examId, isPublished: true })
      .populate('student', 'firstName lastName admissionNumber')
      .populate('class', 'name')
      .sort({ percentage: -1 })
      .limit(limit);
  }

  async getSubjectWiseAnalysis(
    examId: string,
    classId: string,
    schoolId: string,
  ) {
    const results = await this.resultModel.find({
      school: schoolId,
      exam: examId,
      class: classId,
    });

    const subjectStats: any = {};

    results.forEach((result) => {
      result.subjects.forEach((sub: any) => {
        const subId = sub.subject.toString();
        if (!subjectStats[subId]) {
          subjectStats[subId] = {
            subject: subId,
            totalStudents: 0,
            totalMarks: 0,
            obtainedMarks: 0,
            highest: 0,
            lowest: 999,
            passed: 0,
            failed: 0,
          };
        }

        subjectStats[subId].totalStudents++;
        subjectStats[subId].totalMarks += sub.maxMarks;
        subjectStats[subId].obtainedMarks += sub.obtainedMarks;
        subjectStats[subId].highest = Math.max(
          subjectStats[subId].highest,
          sub.obtainedMarks,
        );
        subjectStats[subId].lowest = Math.min(
          subjectStats[subId].lowest,
          sub.obtainedMarks,
        );

        if (sub.isPassed) subjectStats[subId].passed++;
        else subjectStats[subId].failed++;
      });
    });

    Object.keys(subjectStats).forEach((key) => {
      const stat = subjectStats[key];
      stat.average = stat.obtainedMarks / stat.totalStudents;
      stat.percentage = (stat.obtainedMarks / stat.totalMarks) * 100;
    });

    return Object.values(subjectStats);
  }

  async getPerformanceTrend(studentId: string, schoolId: string) {
    return this.resultModel
      .find({ school: schoolId, student: studentId, isPublished: true })
      .populate('exam', 'name startDate')
      .populate('academicYear', 'name')
      .sort({ 'exam.startDate': 1 })
      .select('exam percentage grade rank');
  }
}
