import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  Teacher,
  TeacherDocument,
} from '../../database/schemas/teacher.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
  ) {}

  async create(
    createSubjectDto: CreateSubjectDto,
    schoolId: string,
  ): Promise<Subject> {
    try {
      const existingSubject = await this.subjectModel.findOne({
        school: new Types.ObjectId(schoolId),
        code: createSubjectDto.code,
      });

      if (existingSubject) {
        throw new ConflictException('Subject with this code already exists');
      }

      const subjectData = {
        ...createSubjectDto,
        school: new Types.ObjectId(schoolId),
        classes: createSubjectDto.classes?.map((id) => new Types.ObjectId(id)),
        teachers: createSubjectDto.teachers?.map(
          (id) => new Types.ObjectId(id),
        ),
      };

      const newSubject = new this.subjectModel(subjectData);
      await newSubject.save();

      return newSubject;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create subject: ' + error.message,
      );
    }
  }

  async findAll(
    schoolId: string,
    query: QuerySubjectDto,
  ): Promise<{
    data: Subject[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const {
      type,
      isActive,
      classId,
      teacherId,
      search,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { school: new Types.ObjectId(schoolId) };

    if (type) {
      filter.type = type;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (classId) {
      filter.classes = new Types.ObjectId(classId);
    }

    if (teacherId) {
      filter.teachers = new Types.ObjectId(teacherId);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [subjects, total] = await Promise.all([
      this.subjectModel
        .find(filter)
        .populate('classes', 'name grade')
        .populate('teachers', 'firstName lastName employeeId')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.subjectModel.countDocuments(filter),
    ]);

    return {
      data: subjects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Subject> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subject ID');
    }

    const subject = await this.subjectModel
      .findById(id)
      .populate('classes', 'name grade description')
      .populate('teachers', 'firstName lastName employeeId email phone')
      .exec();

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
  ): Promise<Subject> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subject ID');
    }

    const subject = await this.subjectModel.findById(id);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (updateSubjectDto.code && updateSubjectDto.code !== subject.code) {
      const existingSubject = await this.subjectModel.findOne({
        school: subject.school,
        code: updateSubjectDto.code,
        _id: { $ne: id },
      });

      if (existingSubject) {
        throw new ConflictException('Subject with this code already exists');
      }
    }

    const updateData: any = { ...updateSubjectDto };

    if (updateSubjectDto.classes) {
      updateData.classes = updateSubjectDto.classes.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (updateSubjectDto.teachers) {
      updateData.teachers = updateSubjectDto.teachers.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const updatedSubject = await this.subjectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('classes', 'name grade')
      .populate('teachers', 'firstName lastName employeeId')
      .exec();

    return updatedSubject;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subject ID');
    }

    const subject = await this.subjectModel.findById(id);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    await this.subjectModel.findByIdAndDelete(id);

    await this.classModel.updateMany(
      { subjects: new Types.ObjectId(id) },
      { $pull: { subjects: new Types.ObjectId(id) } },
    );

    await this.teacherModel.updateMany(
      { subjects: new Types.ObjectId(id) },
      { $pull: { subjects: new Types.ObjectId(id) } },
    );

    return { message: 'Subject deleted successfully' };
  }

  async assignToClass(
    subjectId: string,
    classId: string,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class ID');
    }

    const subject = await this.subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const classEntity = await this.classModel.findById(classId);
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    if (subject.school.toString() !== classEntity.school.toString()) {
      throw new BadRequestException('Subject and class must be in same school');
    }

    const classObjectId = new Types.ObjectId(classId);

    if (subject.classes.some((c) => c.toString() === classId)) {
      throw new ConflictException('Subject already assigned to this class');
    }

    await this.subjectModel.findByIdAndUpdate(subjectId, {
      $addToSet: { classes: classObjectId },
    });

    await this.classModel.findByIdAndUpdate(classId, {
      $addToSet: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Subject assigned to class successfully' };
  }

  async removeFromClass(
    subjectId: string,
    classId: string,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class ID');
    }

    const subject = await this.subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const classObjectId = new Types.ObjectId(classId);

    await this.subjectModel.findByIdAndUpdate(subjectId, {
      $pull: { classes: classObjectId },
    });

    await this.classModel.findByIdAndUpdate(classId, {
      $pull: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Subject removed from class successfully' };
  }

  async assignTeacher(
    subjectId: string,
    teacherId: string,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher ID');
    }

    const subject = await this.subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const teacher = await this.teacherModel.findById(teacherId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (subject.school.toString() !== teacher.school.toString()) {
      throw new BadRequestException(
        'Subject and teacher must be in same school',
      );
    }

    const teacherObjectId = new Types.ObjectId(teacherId);

    if (subject.teachers.some((t) => t.toString() === teacherId)) {
      throw new ConflictException('Teacher already assigned to this subject');
    }

    await this.subjectModel.findByIdAndUpdate(subjectId, {
      $addToSet: { teachers: teacherObjectId },
    });

    await this.teacherModel.findByIdAndUpdate(teacherId, {
      $addToSet: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Teacher assigned to subject successfully' };
  }

  async removeTeacher(
    subjectId: string,
    teacherId: string,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher ID');
    }

    const subject = await this.subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const teacherObjectId = new Types.ObjectId(teacherId);

    await this.subjectModel.findByIdAndUpdate(subjectId, {
      $pull: { teachers: teacherObjectId },
    });

    await this.teacherModel.findByIdAndUpdate(teacherId, {
      $pull: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Teacher removed from subject successfully' };
  }

  async getSubjectsByClass(classId: string): Promise<Subject[]> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class ID');
    }

    const subjects = await this.subjectModel
      .find({ classes: new Types.ObjectId(classId) })
      .populate('teachers', 'firstName lastName employeeId')
      .sort({ name: 1 })
      .exec();

    return subjects;
  }

  async getSubjectsByTeacher(teacherId: string): Promise<Subject[]> {
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher ID');
    }

    const subjects = await this.subjectModel
      .find({ teachers: new Types.ObjectId(teacherId) })
      .populate('classes', 'name grade')
      .sort({ name: 1 })
      .exec();

    return subjects;
  }
}
