import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import { Result, ResultDocument } from '../../database/schemas/result.schema';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddScheduleDto } from './dto/add-schedule.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(Exam.name) private examModel: Model<ExamDocument>,
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
  ) {}

  async create(
    createExamDto: CreateExamDto,
    schoolId: string,
  ): Promise<Exam> {
    const startDate = new Date(createExamDto.startDate);
    const endDate = new Date(createExamDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const exam = new this.examModel({
      ...createExamDto,
      academicYear: createExamDto.academicYearId,
      school: schoolId,
      classes: createExamDto.classes.map((id) => new Types.ObjectId(id)),
      startDate,
      endDate,
    });

    return exam.save();
  }

  async findAll(
    schoolId: string,
    academicYearId?: string,
    filters?: {
      examType?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { school: schoolId };

    if (academicYearId) {
      query.academicYear = academicYearId;
    }

    if (filters?.examType) {
      query.examType = filters.examType;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
      this.examModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ startDate: -1 })
        .populate('academicYear', 'name year')
        .populate('classes', 'name grade'),
      this.examModel.countDocuments(query),
    ]);

    return {
      data: exams,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, schoolId: string): Promise<Exam> {
    const exam = await this.examModel
      .findOne({
        _id: id,
        school: schoolId,
      })
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      .populate('schedule.class', 'name grade')
      .populate('schedule.subject', 'name code');

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async update(
    id: string,
    updateExamDto: UpdateExamDto,
    schoolId: string,
  ): Promise<Exam> {
    const updateData: any = { ...updateExamDto };

    if (updateExamDto.academicYearId) {
      updateData.academicYear = updateExamDto.academicYearId;
      delete updateData.academicYearId;
    }

    if (updateExamDto.classes) {
      updateData.classes = updateExamDto.classes.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (updateExamDto.startDate && updateExamDto.endDate) {
      const startDate = new Date(updateExamDto.startDate);
      const endDate = new Date(updateExamDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const exam = await this.examModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateData },
      { new: true },
    );

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    const exam = await this.examModel.findOne({ _id: id, school: schoolId });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const hasResults = await this.resultModel.exists({ exam: id });

    if (hasResults) {
      throw new BadRequestException(
        'Cannot delete exam with existing results. Consider deactivating instead.',
      );
    }

    await this.examModel.deleteOne({ _id: id, school: schoolId });
  }

  async addSchedule(
    examId: string,
    scheduleDto: AddScheduleDto,
    schoolId: string,
  ): Promise<Exam> {
    const exam = await this.examModel.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const scheduleDate = new Date(scheduleDto.date);
    if (scheduleDate < exam.startDate || scheduleDate > exam.endDate) {
      throw new BadRequestException(
        'Schedule date must be within exam period',
      );
    }

    const schedule = {
      class: new Types.ObjectId(scheduleDto.class),
      subject: new Types.ObjectId(scheduleDto.subject),
      date: scheduleDate,
      startTime: scheduleDto.startTime,
      endTime: scheduleDto.endTime,
      maxMarks: scheduleDto.maxMarks,
      passingMarks: scheduleDto.passingMarks || scheduleDto.maxMarks * 0.4,
      room: scheduleDto.room || '',
    };

    const updatedExam = await this.examModel.findOneAndUpdate(
      { _id: examId, school: schoolId },
      { $push: { schedule } },
      { new: true },
    );

    return updatedExam!;
  }

  async updateSchedule(
    examId: string,
    scheduleIndex: number,
    scheduleDto: AddScheduleDto,
    schoolId: string,
  ): Promise<Exam> {
    const exam = await this.examModel.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!exam.schedule || scheduleIndex >= exam.schedule.length) {
      throw new NotFoundException('Schedule not found');
    }

    const scheduleDate = new Date(scheduleDto.date);
    if (scheduleDate < exam.startDate || scheduleDate > exam.endDate) {
      throw new BadRequestException(
        'Schedule date must be within exam period',
      );
    }

    const updateKey = `schedule.${scheduleIndex}`;
    const schedule = {
      class: new Types.ObjectId(scheduleDto.class),
      subject: new Types.ObjectId(scheduleDto.subject),
      date: scheduleDate,
      startTime: scheduleDto.startTime,
      endTime: scheduleDto.endTime,
      maxMarks: scheduleDto.maxMarks,
      passingMarks: scheduleDto.passingMarks || scheduleDto.maxMarks * 0.4,
      room: scheduleDto.room || '',
    };

    const updatedExam = await this.examModel.findOneAndUpdate(
      { _id: examId, school: schoolId },
      { $set: { [updateKey]: schedule } },
      { new: true },
    );

    return updatedExam!;
  }

  async removeSchedule(
    examId: string,
    scheduleIndex: number,
    schoolId: string,
  ): Promise<Exam> {
    const exam = await this.examModel.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!exam.schedule || scheduleIndex >= exam.schedule.length) {
      throw new NotFoundException('Schedule not found');
    }

    exam.schedule.splice(scheduleIndex, 1);
    await exam.save();

    return exam;
  }

  async getExamSchedule(examId: string, classId: string, schoolId: string) {
    const exam = await this.examModel
      .findOne({
        _id: examId,
        school: schoolId,
      })
      .populate('schedule.subject', 'name code');

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const classSchedule = exam.schedule.filter(
      (s) => s.class.toString() === classId,
    );

    return {
      examId: exam._id,
      examName: exam.name,
      classId,
      schedule: classSchedule,
    };
  }

  async getUpcomingExams(
    schoolId: string,
    classId?: string,
    academicYearId?: string,
  ) {
    const now = new Date();
    const query: any = {
      school: schoolId,
      startDate: { $gte: now },
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = academicYearId;
    }

    if (classId) {
      query.classes = new Types.ObjectId(classId);
    }

    const exams = await this.examModel
      .find(query)
      .sort({ startDate: 1 })
      .limit(10)
      .populate('academicYear', 'name year')
      .populate('classes', 'name grade')
      .select('name startDate endDate examType');

    return exams;
  }

  async publishResults(examId: string, schoolId: string): Promise<Exam> {
    const exam = await this.examModel.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.resultsPublished) {
      throw new BadRequestException('Results already published');
    }

    const updatedExam = await this.examModel.findOneAndUpdate(
      { _id: examId, school: schoolId },
      {
        $set: {
          resultsPublished: true,
          resultPublishDate: new Date(),
        },
      },
      { new: true },
    );

    return updatedExam!;
  }

  async getExamStatistics(examId: string, schoolId: string) {
    const exam = await this.examModel.findOne({
      _id: examId,
      school: schoolId,
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const results = await this.resultModel.find({
      exam: examId,
      school: schoolId,
    });

    if (results.length === 0) {
      return {
        examId,
        examName: exam.name,
        totalStudents: 0,
        statistics: {
          averagePercentage: 0,
          highestPercentage: 0,
          lowestPercentage: 0,
          passCount: 0,
          failCount: 0,
          passPercentage: 0,
        },
      };
    }

    const percentages = results.map((r) => r.percentage);
    const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
    const passCount = results.filter((r) => r.percentage >= 40).length;

    return {
      examId,
      examName: exam.name,
      totalStudents: results.length,
      statistics: {
        averagePercentage: totalPercentage / results.length,
        highestPercentage: Math.max(...percentages),
        lowestPercentage: Math.min(...percentages),
        passCount,
        failCount: results.length - passCount,
        passPercentage: (passCount / results.length) * 100,
      },
    };
  }
}
