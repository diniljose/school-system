/**
 * Class Teacher Assignments Service
 * Manages teacher-class assignments for scoped access control
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClassTeacherAssignment,
  ClassTeacherAssignmentDocument,
} from '../../database/schemas/class-teacher-assignment.schema';
import { CreateClassTeacherAssignmentDto } from './dto/create-class-teacher-assignment.dto';
import { UpdateClassTeacherAssignmentDto } from './dto/update-class-teacher-assignment.dto';

@Injectable()
export class ClassTeacherAssignmentsService {
  private readonly logger = new Logger(ClassTeacherAssignmentsService.name);

  constructor(
    @InjectModel(ClassTeacherAssignment.name)
    private assignmentModel: Model<ClassTeacherAssignmentDocument>,
  ) {}

  /**
   * Create a new class teacher assignment
   */
  async create(
    createDto: CreateClassTeacherAssignmentDto,
    assignedById: string,
  ): Promise<ClassTeacherAssignment> {
    // Check for existing assignment
    const existing = await this.assignmentModel.findOne({
      teacher: new Types.ObjectId(createDto.teacher),
      class: new Types.ObjectId(createDto.class),
      academicYear: new Types.ObjectId(createDto.academicYear),
    }).exec();

    if (existing) {
      throw new ConflictException(
        'This teacher is already assigned to this class for the academic year',
      );
    }

    // If isClassTeacher is true, check if there's already a class teacher
    if (createDto.isClassTeacher) {
      const existingClassTeacher = await this.assignmentModel.findOne({
        class: new Types.ObjectId(createDto.class),
        academicYear: new Types.ObjectId(createDto.academicYear),
        isClassTeacher: true,
        isActive: true,
      }).exec();

      if (existingClassTeacher) {
        throw new BadRequestException(
          'This class already has a class teacher assigned. Remove the existing class teacher first.',
        );
      }
    }

    const assignment = new this.assignmentModel({
      teacher: new Types.ObjectId(createDto.teacher),
      class: new Types.ObjectId(createDto.class),
      academicYear: new Types.ObjectId(createDto.academicYear),
      isClassTeacher: createDto.isClassTeacher ?? false,
      isActive: true,
      assignedBy: new Types.ObjectId(assignedById),
      assignedAt: new Date(),
      notes: createDto.notes,
    });

    return assignment.save();
  }

  /**
   * Get all assignments, optionally filtered
   */
  async findAll(filters?: {
    teacher?: string;
    class?: string;
    academicYear?: string;
    isClassTeacher?: boolean;
    isActive?: boolean;
  }): Promise<ClassTeacherAssignment[]> {
    const query: any = {};

    if (filters?.teacher) query.teacher = new Types.ObjectId(filters.teacher);
    if (filters?.class) query.class = new Types.ObjectId(filters.class);
    if (filters?.academicYear) query.academicYear = new Types.ObjectId(filters.academicYear);
    if (filters?.isClassTeacher !== undefined) query.isClassTeacher = filters.isClassTeacher;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    return this.assignmentModel
      .find(query)
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name section grade')
      .populate('academicYear', 'name startDate endDate')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get assignment by ID
   */
  async findById(id: string): Promise<ClassTeacherAssignmentDocument> {
    const assignment = await this.assignmentModel
      .findById(id)
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name section grade')
      .populate('academicYear', 'name startDate endDate')
      .exec();

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return assignment;
  }

  /**
   * Get all classes a teacher is assigned to
   */
  async getTeacherClasses(
    teacherId: string,
    academicYearId?: string,
    isClassTeacherOnly = false,
  ): Promise<ClassTeacherAssignment[]> {
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    if (isClassTeacherOnly) {
      query.isClassTeacher = true;
    }

    return this.assignmentModel
      .find(query)
      .populate('class', 'name section grade')
      .populate('academicYear', 'name startDate endDate')
      .exec();
  }

  /**
   * Get the class teacher for a specific class
   */
  async getClassTeacher(
    classId: string,
    academicYearId: string,
  ): Promise<ClassTeacherAssignment | null> {
    return this.assignmentModel
      .findOne({
        class: new Types.ObjectId(classId),
        academicYear: new Types.ObjectId(academicYearId),
        isClassTeacher: true,
        isActive: true,
      })
      .populate('teacher', 'firstName lastName email')
      .exec();
  }

  /**
   * Check if a teacher has access to a specific class
   */
  async hasClassAccess(
    teacherId: string,
    classId: string,
    academicYearId?: string,
  ): Promise<boolean> {
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      class: new Types.ObjectId(classId),
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    const assignment = await this.assignmentModel.findOne(query).exec();
    return !!assignment;
  }

  /**
   * Check if a teacher is the class teacher for a specific class
   */
  async isClassTeacher(
    teacherId: string,
    classId: string,
    academicYearId?: string,
  ): Promise<boolean> {
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      class: new Types.ObjectId(classId),
      isClassTeacher: true,
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    const assignment = await this.assignmentModel.findOne(query).exec();
    return !!assignment;
  }

  /**
   * Get class IDs a teacher has access to
   */
  async getAccessibleClassIds(
    teacherId: string,
    academicYearId?: string,
  ): Promise<string[]> {
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    const assignments = await this.assignmentModel.find(query).exec();
    return assignments.map((a) => a.class.toString());
  }

  /**
   * Update an assignment
   */
  async update(
    id: string,
    updateDto: UpdateClassTeacherAssignmentDto,
  ): Promise<ClassTeacherAssignment> {
    const assignment = await this.findById(id);

    // If changing to class teacher, check for existing
    if (updateDto.isClassTeacher && !assignment.isClassTeacher) {
      const existingClassTeacher = await this.assignmentModel.findOne({
        _id: { $ne: assignment._id },
        class: assignment.class,
        academicYear: assignment.academicYear,
        isClassTeacher: true,
        isActive: true,
      }).exec();

      if (existingClassTeacher) {
        throw new BadRequestException(
          'This class already has a class teacher assigned',
        );
      }
    }

    Object.assign(assignment, updateDto);
    return assignment.save();
  }

  /**
   * Remove an assignment (soft delete)
   */
  async remove(id: string): Promise<void> {
    const assignment = await this.findById(id);
    assignment.isActive = false;
    await assignment.save();
  }

  /**
   * Hard delete an assignment
   */
  async delete(id: string): Promise<void> {
    await this.assignmentModel.findByIdAndDelete(id).exec();
  }
}
