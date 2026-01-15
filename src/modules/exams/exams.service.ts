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
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { ExamScheduleDto } from './dto/exam-schedule.dto';

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(Exam.name)
    private examModel: Model<ExamDocument>,
    @InjectModel(Class.name)
    private classModel: Model<ClassDocument>,
    @InjectModel(Subject.name)
    private subjectModel: Model<SubjectDocument>,
  ) {}

  async create(createExamDto: CreateExamDto, schoolId: string) {
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
      resultsPublished: createExamDto.resultsPublished || false,
      isActive:
        createExamDto.isActive !== undefined ? createExamDto.isActive : true,
    };

    if (createExamDto.classes && createExamDto.classes.length > 0) {
      examData.classes = createExamDto.classes.map(
        (classId) => new Types.ObjectId(classId),
      );
    }

    if (createExamDto.schedule && createExamDto.schedule.length > 0) {
      examData.schedule = createExamDto.schedule.map((item) => ({
        class: new Types.ObjectId(item.class),
        subject: new Types.ObjectId(item.subject),
        date: new Date(item.date),
        startTime: item.startTime,
        endTime: item.endTime,
        maxMarks: item.maxMarks,
        passingMarks: item.passingMarks,
        room: item.room || '',
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
        .populate('classes', 'name grade')
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
      .populate('classes', 'name grade')
      .populate('schedule.class', 'name grade')
      .populate('schedule.subject', 'name code')
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto, schoolId: string) {
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

    if (updateExamDto.classes) {
      updateData.classes = updateExamDto.classes.map(
        (classId) => new Types.ObjectId(classId),
      );
    }

    if (updateExamDto.schedule) {
      updateData.schedule = updateExamDto.schedule.map((item) => ({
        class: new Types.ObjectId(item.class),
        subject: new Types.ObjectId(item.subject),
        date: new Date(item.date),
        startTime: item.startTime,
        endTime: item.endTime,
        maxMarks: item.maxMarks,
        passingMarks: item.passingMarks,
        room: item.room || '',
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
  ) {
    const exam = await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      school: new Types.ObjectId(schoolId),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const classDoc = await this.classModel.findOne({
      _id: new Types.ObjectId(scheduleDto.class),
      school: new Types.ObjectId(schoolId),
    });

    if (!classDoc) {
      throw new NotFoundException('Class not found');
    }

    const subject = await this.subjectModel.findOne({
      _id: new Types.ObjectId(scheduleDto.subject),
      school: new Types.ObjectId(schoolId),
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const scheduleItem: any = {
      class: new Types.ObjectId(scheduleDto.class),
      subject: new Types.ObjectId(scheduleDto.subject),
      date: new Date(scheduleDto.date),
      startTime: scheduleDto.startTime,
      endTime: scheduleDto.endTime,
      maxMarks: scheduleDto.maxMarks,
      passingMarks: scheduleDto.passingMarks,
      room: scheduleDto.room || '',
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
      .populate('schedule.class', 'name grade')
      .populate('schedule.subject', 'name code')
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
      .populate('schedule.class', 'name grade')
      .populate('schedule.subject', 'name code')
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
}
