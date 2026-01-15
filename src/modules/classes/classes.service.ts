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

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) {}

  async create(createClassDto: CreateClassDto, schoolId: string) {
    try {
      const existingClass = await this.classModel.findOne({
        school: new Types.ObjectId(schoolId),
        name: createClassDto.name,
      });

      if (existingClass) {
        throw new ConflictException('Class with this name already exists');
      }

      const classData = {
        ...createClassDto,
        school: new Types.ObjectId(schoolId),
        subjects: createClassDto.subjects?.map((id) => new Types.ObjectId(id)),
        nextClass: createClassDto.nextClass
          ? new Types.ObjectId(createClassDto.nextClass)
          : undefined,
      };

      const newClass = new this.classModel(classData);
      await newClass.save();

      return newClass;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create class: ' + error.message);
    }
  }

  async findAll(schoolId: string, query: QueryClassDto) {
    const { grade, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { school: new Types.ObjectId(schoolId) };

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
      this.classModel
        .find(filter)
        .populate('subjects', 'name code type')
        .sort({ grade: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.classModel.countDocuments(filter),
    ]);

    return {
      data: classes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classData = await this.classModel
      .findById(id)
      .populate('subjects', 'name code type')
      .populate('nextClass', 'name grade')
      .exec();

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return classData;
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const existingClass = await this.classModel.findById(id);
    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    if (updateClassDto.name && updateClassDto.name !== existingClass.name) {
      const duplicateClass = await this.classModel.findOne({
        school: existingClass.school,
        name: updateClassDto.name,
        _id: { $ne: id },
      });

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

    const updatedClass = await this.classModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('subjects', 'name code type')
      .populate('nextClass', 'name grade')
      .exec();

    return updatedClass;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classData = await this.classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const studentCount = await this.studentModel.countDocuments({
      currentClass: new Types.ObjectId(id),
    });

    if (studentCount > 0) {
      throw new BadRequestException(
        `Cannot delete class with ${studentCount} enrolled students`,
      );
    }

    await this.classModel.findByIdAndDelete(id);

    return { message: 'Class deleted successfully' };
  }

  async getStudents(id: string, page: number = 1, limit: number = 20) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classData = await this.classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      this.studentModel
        .find({ currentClass: new Types.ObjectId(id) })
        .select(
          'firstName lastName admissionNumber rollNumber status photo contact',
        )
        .sort({ rollNumber: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.studentModel.countDocuments({
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

  async getSubjects(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classData = await this.classModel
      .findById(id)
      .populate('subjects')
      .exec();

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return classData.subjects;
  }

  async addSubject(id: string, subjectId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid class or subject ID');
    }

    const [classData, subject] = await Promise.all([
      this.classModel.findById(id),
      this.subjectModel.findById(subjectId),
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

    return this.classModel
      .findById(id)
      .populate('subjects', 'name code type')
      .exec();
  }

  async removeSubject(id: string, subjectId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Invalid class or subject ID');
    }

    const classData = await this.classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    classData.subjects =
      classData.subjects?.filter((s) => s.toString() !== subjectId) || [];
    await classData.save();

    const subject = await this.subjectModel.findById(subjectId);
    if (subject) {
      subject.classes =
        subject.classes?.filter((c) => c.toString() !== id) || [];
      await subject.save();
    }

    return this.classModel
      .findById(id)
      .populate('subjects', 'name code type')
      .exec();
  }

  async assignClassTeacher(id: string, sectionName: string, teacherId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(teacherId)) {
      throw new BadRequestException('Invalid class or teacher ID');
    }

    const [classData, teacher] = await Promise.all([
      this.classModel.findById(id),
      this.teacherModel.findById(teacherId),
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

    return this.classModel.findById(id).exec();
  }

  async removeClassTeacher(id: string, sectionName: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classData = await this.classModel.findById(id);
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
      const teacher = await this.teacherModel.findById(teacherId);
      if (teacher && teacher.classTeacherOf?.toString() === id) {
        teacher.classTeacherOf = undefined;
        await teacher.save();
      }
    }

    return this.classModel.findById(id).exec();
  }

  async getStatistics(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class ID');
    }

    const classData = await this.classModel.findById(id);
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const studentCount = await this.studentModel.countDocuments({
      currentClass: new Types.ObjectId(id),
    });

    const totalCapacity =
      classData.sections?.reduce((sum, section) => sum + section.capacity, 0) ||
      0;

    const capacityUtilization =
      totalCapacity > 0 ? (studentCount / totalCapacity) * 100 : 0;

    const sectionStats = await Promise.all(
      (classData.sections || []).map(async (section) => {
        const sectionStudents = await this.studentModel.countDocuments({
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
