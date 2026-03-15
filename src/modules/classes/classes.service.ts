import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import {
  Teacher,
  TeacherDocument,
} from '../../database/schemas/teacher.schema';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto } from './dto/query-class.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  private async getClassModel(context?: TenantContext): Promise<Model<ClassDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassDocument>(
        context.schoolCode,
        'Class',
      );
    }
    return this.classModel;
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

  private async getTeacherModel(context?: TenantContext): Promise<Model<TeacherDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<TeacherDocument>(
        context.schoolCode,
        'Teacher',
      );
    }
    return this.teacherModel;
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

  /**
   * Auto-derive numeric grade from class name.
   * e.g. "Grade 5" → 5, "Class 10" → 10, "10th Standard" → 10, "KG" → 0
   */
  private deriveGrade(name: string): number {
    const match = name.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    const lower = name.toLowerCase();
    if (lower.includes('kg') || lower.includes('kindergarten') || lower.includes('nursery') || lower.includes('pre')) {
      return 0;
    }
    return 1;
  }

  async create(createClassDto: CreateClassDto, schoolId: string, context?: TenantContext) {
    try {
      const classModel = await this.getClassModel(context);
      const teacherModel = await this.getTeacherModel(context);

      const filter: any = { name: createClassDto.name };
      if (!context?.isTenantUser) {
        filter.school = new Types.ObjectId(schoolId);
      }

      const existingClass = await classModel.findOne(filter);

      // Build the new section from flat fields
      let newSection: any = null;
      if (createClassDto.section) {
        newSection = {
          name: createClassDto.section,
          capacity: createClassDto.capacity || 30,
        };
        if (createClassDto.classTeacher) {
          newSection.classTeacher = new Types.ObjectId(createClassDto.classTeacher);
        }
      }

      // If class exists with the same name, add the new section to it
      if (existingClass) {
        // If no section specified, throw error (duplicate class without section)
        if (!newSection) {
          throw new ConflictException('Class with this name already exists');
        }

        // Check if section already exists in the class
        const sectionExists = existingClass.sections?.some(
          (s: any) => s.name?.toLowerCase() === newSection.name.toLowerCase(),
        );

        if (sectionExists) {
          throw new ConflictException(
            `Section "${newSection.name}" already exists in class "${existingClass.name}"`,
          );
        }

        // Add the new section to existing class
        existingClass.sections = existingClass.sections || [];
        existingClass.sections.push(newSection);
        await existingClass.save();

        // If classTeacher was set, also update the teacher record
        if (createClassDto.classTeacher) {
          try {
            await teacherModel.findByIdAndUpdate(
              createClassDto.classTeacher,
              { 
                classTeacherOf: existingClass._id,
                classTeacherSection: newSection.name,
              },
            );
          } catch (err) {
            // Non-critical: teacher update failed but section was added
          }
        }

        return existingClass;
      }

      // Auto-derive grade if not provided
      const grade = createClassDto.grade !== undefined && createClassDto.grade !== null
        ? Number(createClassDto.grade)
        : this.deriveGrade(createClassDto.name);

      // Build sections array from flat fields if sections array not provided
      let sections: any[] = createClassDto.sections ? [...createClassDto.sections] : [];
      if (sections.length === 0 && newSection) {
        sections = [newSection];
      } else if (sections.length > 0) {
        // Convert classTeacher strings to ObjectIds in sections
        sections = sections.map((s: any) => ({
          ...s,
          classTeacher: s.classTeacher ? new Types.ObjectId(s.classTeacher) : undefined,
        }));
      }

      // Remove flat convenience fields before saving
      const { section, classTeacher, capacity, roomNumber, ...rest } = createClassDto;

      const classData: any = {
        ...rest,
        grade,
        sections,
        subjects: createClassDto.subjects?.map((id) => new Types.ObjectId(id)),
        nextClass: createClassDto.nextClass
          ? new Types.ObjectId(createClassDto.nextClass)
          : undefined,
        // Always set school - required by schema
        school: new Types.ObjectId(schoolId),
      };

      const newClass = new classModel(classData);
      await newClass.save();

      // If classTeacher was set, also update the teacher record
      if (createClassDto.classTeacher && sections.length > 0) {
        try {
          await teacherModel.findByIdAndUpdate(
            createClassDto.classTeacher,
            { 
              classTeacherOf: newClass._id,
              classTeacherSection: sections[0].name,
            },
          );
        } catch (err) {
          // Non-critical: teacher update failed but class was created
        }
      }

      return newClass;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create class: ' + error.message);
    }
  }

  async findAll(schoolId: string, query: QueryClassDto, context?: TenantContext) {
    const { grade, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const classModel = await this.getClassModel(context);

    const filter: any = {};
    if (!context?.isTenantUser) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (grade !== undefined) {
      filter.grade = grade;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [classes, total] = await Promise.all([
      classModel
        .find(filter)
        .populate('subjects', 'name code type')
        .sort({ grade: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      classModel.countDocuments(filter),
    ]);

    return {
      data: classes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);

    const classData = await classModel
      .findById(id)
      .populate('subjects', 'name code type')
      .populate('nextClass', 'name grade')
      .exec();

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return classData;
  }

  async update(id: string, updateClassDto: UpdateClassDto, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);

    const existingClass = await classModel.findById(id);
    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    if (updateClassDto.name && updateClassDto.name !== existingClass.name) {
      const duplicateFilter: any = {
        name: updateClassDto.name,
        _id: { $ne: id },
      };
      if (!context?.isTenantUser) {
        duplicateFilter.school = existingClass.school;
      }

      const duplicateClass = await classModel.findOne(duplicateFilter);

      if (duplicateClass) {
        throw new ConflictException('Class with this name already exists');
      }
    }

    const updateData: any = { ...updateClassDto };

    if (updateClassDto.subjects) {
      updateData.subjects = updateClassDto.subjects.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (updateClassDto.nextClass) {
      updateData.nextClass = new Types.ObjectId(updateClassDto.nextClass);
    }

    const updatedClass = await classModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('subjects', 'name code type')
      .populate('nextClass', 'name grade')
      .exec();

    return updatedClass;
  }

  async remove(id: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);
    const studentModel = await this.getStudentModel(context);

    const classData = await classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const studentCount = await studentModel.countDocuments({
      currentClass: new Types.ObjectId(id),
    });

    if (studentCount > 0) {
      throw new BadRequestException(
        `Cannot delete class with ${studentCount} enrolled students`,
      );
    }

    await classModel.findByIdAndDelete(id);

    return { message: 'Class deleted successfully' };
  }

  async getStudents(id: string, page: number = 1, limit: number = 20, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);
    const studentModel = await this.getStudentModel(context);

    const classData = await classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      studentModel
        .find({ currentClass: new Types.ObjectId(id) })
        .select(
          'firstName lastName admissionNumber rollNumber status photo contact',
        )
        .sort({ rollNumber: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      studentModel.countDocuments({
        currentClass: new Types.ObjectId(id),
      }),
    ]);

    return {
      data: students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubjects(id: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);

    const classData = await classModel
      .findById(id)
      .populate('subjects')
      .exec();

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return classData.subjects;
  }

  async addSubject(id: string, subjectId: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid class or subject ID');
    }

    const classModel = await this.getClassModel(context);
    const subjectModel = await this.getSubjectModel(context);

    const [classData, subject] = await Promise.all([
      classModel.findById(id),
      subjectModel.findById(subjectId),
    ]);

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const subjectObjectId = new Types.ObjectId(subjectId);

    if (classData.subjects?.some((s) => s.toString() === subjectId)) {
      throw new ConflictException('Subject already assigned to this class');
    }

    classData.subjects = classData.subjects || [];
    classData.subjects.push(subjectObjectId);
    await classData.save();

    if (!subject.classes) {
      subject.classes = [];
    }
    if (!subject.classes.some((c) => c.toString() === id)) {
      subject.classes.push(new Types.ObjectId(id));
      await subject.save();
    }

    return classModel
      .findById(id)
      .populate('subjects', 'name code type')
      .exec();
  }

  async removeSubject(id: string, subjectId: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid class or subject ID');
    }

    const classModel = await this.getClassModel(context);
    const subjectModel = await this.getSubjectModel(context);

    const classData = await classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    classData.subjects =
      classData.subjects?.filter((s) => s.toString() !== subjectId) || [];
    await classData.save();

    const subject = await subjectModel.findById(subjectId);
    if (subject) {
      subject.classes =
        subject.classes?.filter((c) => c.toString() !== id) || [];
      await subject.save();
    }

    return classModel
      .findById(id)
      .populate('subjects', 'name code type')
      .exec();
  }

  async assignClassTeacher(id: string, sectionName: string, teacherId: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid class or teacher ID');
    }

    const classModel = await this.getClassModel(context);
    const teacherModel = await this.getTeacherModel(context);

    const [classData, teacher] = await Promise.all([
      classModel.findById(id),
      teacherModel.findById(teacherId),
    ]);

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const section = classData.sections?.find((s) => s.name === sectionName);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    section.classTeacher = new Types.ObjectId(teacherId);
    await classData.save();

    teacher.classTeacherOf = new Types.ObjectId(id);
    await teacher.save();

    return classModel.findById(id).exec();
  }

  async removeClassTeacher(id: string, sectionName: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);
    const teacherModel = await this.getTeacherModel(context);

    const classData = await classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const section = classData.sections?.find((s) => s.name === sectionName);
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const teacherId = section.classTeacher;
    section.classTeacher = undefined;
    await classData.save();

    if (teacherId) {
      const teacher = await teacherModel.findById(teacherId);
      if (teacher && teacher.classTeacherOf?.toString() === id) {
        teacher.classTeacherOf = undefined;
        await teacher.save();
      }
    }

    return classModel.findById(id).exec();
  }

  async getStatistics(id: string, context?: TenantContext) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classModel = await this.getClassModel(context);
    const studentModel = await this.getStudentModel(context);

    const classData = await classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const studentCount = await studentModel.countDocuments({
      currentClass: new Types.ObjectId(id),
    });

    const totalCapacity =
      classData.sections?.reduce((sum, section) => sum + section.capacity, 0) ||
      0;

    const capacityUtilization =
      totalCapacity > 0 ? (studentCount / totalCapacity) * 100 : 0;

    const sectionStats = await Promise.all(
      (classData.sections || []).map(async (section) => {
        const sectionStudents = await studentModel.countDocuments({
          currentClass: new Types.ObjectId(id),
          currentSection: section.name,
        });

        return {
          name: section.name,
          capacity: section.capacity,
          enrolled: sectionStudents,
          utilization:
            section.capacity > 0
              ? (sectionStudents / section.capacity) * 100
              : 0,
          hasClassTeacher: !!section.classTeacher,
        };
      }),
    );

    return {
      classId: id,
      className: classData.name,
      grade: classData.grade,
      totalStudents: studentCount,
      totalCapacity,
      capacityUtilization: Math.round(capacityUtilization * 100) / 100,
      subjectCount: classData.subjects?.length || 0,
      sectionCount: classData.sections?.length || 0,
      sections: sectionStats,
      isActive: classData.isActive,
    };
  }
}
