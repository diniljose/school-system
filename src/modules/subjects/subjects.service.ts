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
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

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

  private async getTeacherModel(
    context?: TenantContext,
  ): Promise<Model<TeacherDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<TeacherDocument>(
        context.schoolCode,
        'Teacher',
      );
    }
    return this.teacherModel;
  }

  async create(
    createSubjectDto: CreateSubjectDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Subject> {
    try {
      const subjectModel = await this.getSubjectModel(context);
      
      const filter: any = { code: createSubjectDto.code };
      if (!context?.isTenantUser) {
        filter.school = new Types.ObjectId(schoolId);
      }
      
      const existingSubject = await subjectModel.findOne(filter);

      if (existingSubject) {
        throw new ConflictException('Subject with this code already exists');
      }

      const subjectData: any = {
        ...createSubjectDto,
        classes: createSubjectDto.classes?.map((id) => new Types.ObjectId(id)),
        teachers: createSubjectDto.teachers?.map(
          (id) => new Types.ObjectId(id),
        ),
        // Always set school - required by schema
        school: new Types.ObjectId(schoolId),
      };

      const newSubject = new subjectModel(subjectData);
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
    context?: TenantContext,
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

    const subjectModel = await this.getSubjectModel(context);
    const filter: any = {};
    
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

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
      subjectModel
        .find(filter)
        .populate('classes', 'name grade')
        .populate('teachers', 'firstName lastName employeeId')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      subjectModel.countDocuments(filter),
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

  async findOne(id: string, context?: TenantContext): Promise<Subject> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subject ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const subject = await subjectModel
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
    context?: TenantContext,
  ): Promise<Subject> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subject ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const subject = await subjectModel.findById(id);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (updateSubjectDto.code && updateSubjectDto.code !== subject.code) {
      const filter: any = {
        code: updateSubjectDto.code,
        _id: { $ne: id },
      };
      if (!context?.isTenantUser) {
        filter.school = subject.school;
      }
      
      const existingSubject = await subjectModel.findOne(filter);

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

    const updatedSubject = await subjectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('classes', 'name grade')
      .populate('teachers', 'firstName lastName employeeId')
      .exec();

    return updatedSubject;
  }

  async remove(id: string, context?: TenantContext): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid subject ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const classModel = await this.getClassModel(context);
    const teacherModel = await this.getTeacherModel(context);
    
    const subject = await subjectModel.findById(id);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    await subjectModel.findByIdAndDelete(id);

    await classModel.updateMany(
      { subjects: new Types.ObjectId(id) },
      { $pull: { subjects: new Types.ObjectId(id) } },
    );

    await teacherModel.updateMany(
      { subjects: new Types.ObjectId(id) },
      { $pull: { subjects: new Types.ObjectId(id) } },
    );

    return { message: 'Subject deleted successfully' };
  }

  async assignToClass(
    subjectId: string,
    classId: string,
    context?: TenantContext,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const classModel = await this.getClassModel(context);
    
    const subject = await subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const classEntity = await classModel.findById(classId);
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    if (!context?.isTenantUser && subject.school.toString() !== classEntity.school.toString()) {
      throw new BadRequestException('Subject and class must be in same school');
    }

    const classObjectId = new Types.ObjectId(classId);

    if (subject.classes.some((c) => c.toString() === classId)) {
      throw new ConflictException('Subject already assigned to this class');
    }

    await subjectModel.findByIdAndUpdate(subjectId, {
      $addToSet: { classes: classObjectId },
    });

    await classModel.findByIdAndUpdate(classId, {
      $addToSet: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Subject assigned to class successfully' };
  }

  async removeFromClass(
    subjectId: string,
    classId: string,
    context?: TenantContext,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const classModel = await this.getClassModel(context);
    
    const subject = await subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const classObjectId = new Types.ObjectId(classId);

    await subjectModel.findByIdAndUpdate(subjectId, {
      $pull: { classes: classObjectId },
    });

    await classModel.findByIdAndUpdate(classId, {
      $pull: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Subject removed from class successfully' };
  }

  async assignTeacher(
    subjectId: string,
    teacherId: string,
    context?: TenantContext,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const teacherModel = await this.getTeacherModel(context);
    
    const subject = await subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const teacher = await teacherModel.findById(teacherId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!context?.isTenantUser && subject.school.toString() !== teacher.school.toString()) {
      throw new BadRequestException(
        'Subject and teacher must be in same school',
      );
    }

    const teacherObjectId = new Types.ObjectId(teacherId);

    if (subject.teachers.some((t) => t.toString() === teacherId)) {
      throw new ConflictException('Teacher already assigned to this subject');
    }

    await subjectModel.findByIdAndUpdate(subjectId, {
      $addToSet: { teachers: teacherObjectId },
    });

    await teacherModel.findByIdAndUpdate(teacherId, {
      $addToSet: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Teacher assigned to subject successfully' };
  }

  async removeTeacher(
    subjectId: string,
    teacherId: string,
    context?: TenantContext,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid subject ID');
    }
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const teacherModel = await this.getTeacherModel(context);
    
    const subject = await subjectModel.findById(subjectId);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const teacherObjectId = new Types.ObjectId(teacherId);

    await subjectModel.findByIdAndUpdate(subjectId, {
      $pull: { teachers: teacherObjectId },
    });

    await teacherModel.findByIdAndUpdate(teacherId, {
      $pull: { subjects: new Types.ObjectId(subjectId) },
    });

    return { message: 'Teacher removed from subject successfully' };
  }

  async getSubjectsByClass(classId: string, context?: TenantContext): Promise<Subject[]> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const subjects = await subjectModel
      .find({ classes: new Types.ObjectId(classId) })
      .populate('teachers', 'firstName lastName employeeId')
      .sort({ name: 1 })
      .exec();

    return subjects;
  }

  async getSubjectsByTeacher(teacherId: string, context?: TenantContext): Promise<Subject[]> {
    if (!Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid teacher ID');
    }

    const subjectModel = await this.getSubjectModel(context);
    const subjects = await subjectModel
      .find({ teachers: new Types.ObjectId(teacherId) })
      .populate('classes', 'name grade')
      .sort({ name: 1 })
      .exec();

    return subjects;
  }
}
