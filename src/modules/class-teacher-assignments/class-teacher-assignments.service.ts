/**
 * Class Teacher Assignments Service
 * Manages teacher-class assignments for scoped access control
 * Updated to support multi-tenant database architecture
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
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class ClassTeacherAssignmentsService {
  private readonly logger = new Logger(ClassTeacherAssignmentsService.name);

  constructor(
    @InjectModel(ClassTeacherAssignment.name)
    private assignmentModel: Model<ClassTeacherAssignmentDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  /**
   * Get the appropriate model based on tenant context
   */
  private async getAssignmentModel(context?: TenantContext): Promise<Model<ClassTeacherAssignmentDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassTeacherAssignmentDocument>(
        context.schoolCode,
        'ClassTeacherAssignment',
      );
    }
    return this.assignmentModel;
  }

  /**
   * Create a new class teacher assignment
   */
  async create(
    createDto: CreateClassTeacherAssignmentDto,
    assignedById: string,
    context?: TenantContext,
  ): Promise<ClassTeacherAssignment> {
    const model = await this.getAssignmentModel(context);

    // Check for existing assignment (teacher + class + section + academic year)
    const existingQuery: any = {
      teacher: new Types.ObjectId(createDto.teacher),
      class: new Types.ObjectId(createDto.class),
      academicYear: new Types.ObjectId(createDto.academicYear),
    };
    if (createDto.section) {
      existingQuery.section = createDto.section;
    }

    const existing = await model.findOne(existingQuery).exec();

    if (existing) {
      throw new ConflictException(
        'This teacher is already assigned to this class/section for the academic year',
      );
    }

    // If isClassTeacher is true, check if there's already a class teacher for this section
    if (createDto.isClassTeacher) {
      const classTeacherQuery: any = {
        class: new Types.ObjectId(createDto.class),
        academicYear: new Types.ObjectId(createDto.academicYear),
        isClassTeacher: true,
        isActive: true,
      };
      if (createDto.section) {
        classTeacherQuery.section = createDto.section;
      }

      const existingClassTeacher = await model.findOne(classTeacherQuery).exec();

      if (existingClassTeacher) {
        throw new BadRequestException(
          'This class/section already has a class teacher assigned. Remove the existing class teacher first.',
        );
      }
    }

    const assignment = new model({
      teacher: new Types.ObjectId(createDto.teacher),
      class: new Types.ObjectId(createDto.class),
      academicYear: new Types.ObjectId(createDto.academicYear),
      section: createDto.section || null,
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
    section?: string;
    academicYear?: string;
    isClassTeacher?: boolean;
    isActive?: boolean;
  }, context?: TenantContext): Promise<ClassTeacherAssignment[]> {
    const model = await this.getAssignmentModel(context);
    const query: any = {};

    if (filters?.teacher) query.teacher = new Types.ObjectId(filters.teacher);
    if (filters?.class) query.class = new Types.ObjectId(filters.class);
    if (filters?.section) query.section = filters.section;
    if (filters?.academicYear) query.academicYear = new Types.ObjectId(filters.academicYear);
    if (filters?.isClassTeacher !== undefined) query.isClassTeacher = filters.isClassTeacher;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    return model
      .find(query)
      .populate('teacher', 'firstName lastName email designation')
      .populate('class', 'name section grade')
      .populate('academicYear', 'name startDate endDate isCurrent')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get assignment by ID
   */
  async findById(id: string, context?: TenantContext): Promise<ClassTeacherAssignmentDocument> {
    const model = await this.getAssignmentModel(context);
    const assignment = await model
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
    context?: TenantContext,
  ): Promise<ClassTeacherAssignment[]> {
    const model = await this.getAssignmentModel(context);
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

    return model
      .find(query)
      .populate('class', 'name section grade')
      .populate('academicYear', 'name startDate endDate')
      .exec();
  }

  /**
   * Get the class teacher for a specific class/section
   */
  async getClassTeacher(
    classId: string,
    academicYearId: string,
    section?: string,
    context?: TenantContext,
  ): Promise<ClassTeacherAssignment | null> {
    const model = await this.getAssignmentModel(context);
    const query: any = {
      class: new Types.ObjectId(classId),
      academicYear: new Types.ObjectId(academicYearId),
      isClassTeacher: true,
      isActive: true,
    };
    if (section) {
      query.section = section;
    }
    return model
      .findOne(query)
      .populate('teacher', 'firstName lastName email designation')
      .populate('assignedBy', 'firstName lastName')
      .exec();
  }

  /**
   * Check if a teacher has access to a specific class
   */
  async hasClassAccess(
    teacherId: string,
    classId: string,
    academicYearId?: string,
    context?: TenantContext,
  ): Promise<boolean> {
    const model = await this.getAssignmentModel(context);
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      class: new Types.ObjectId(classId),
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    const assignment = await model.findOne(query).exec();
    return !!assignment;
  }

  /**
   * Check if a teacher is the class teacher for a specific class
   */
  async isClassTeacher(
    teacherId: string,
    classId: string,
    academicYearId?: string,
    context?: TenantContext,
  ): Promise<boolean> {
    const model = await this.getAssignmentModel(context);
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      class: new Types.ObjectId(classId),
      isClassTeacher: true,
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    const assignment = await model.findOne(query).exec();
    return !!assignment;
  }

  /**
   * Get class IDs a teacher has access to
   */
  async getAccessibleClassIds(
    teacherId: string,
    academicYearId?: string,
    context?: TenantContext,
  ): Promise<string[]> {
    const model = await this.getAssignmentModel(context);
    const query: any = {
      teacher: new Types.ObjectId(teacherId),
      isActive: true,
    };

    if (academicYearId) {
      query.academicYear = new Types.ObjectId(academicYearId);
    }

    const assignments = await model.find(query).exec();
    return assignments.map((a) => a.class.toString());
  }

  /**
   * Update an assignment
   */
  async update(
    id: string,
    updateDto: UpdateClassTeacherAssignmentDto,
    context?: TenantContext,
  ): Promise<ClassTeacherAssignment> {
    const model = await this.getAssignmentModel(context);
    const assignment = await this.findById(id, context);

    // If changing to class teacher, check for existing
    if (updateDto.isClassTeacher && !assignment.isClassTeacher) {
      const existingClassTeacher = await model.findOne({
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
  async remove(id: string, context?: TenantContext): Promise<void> {
    const assignment = await this.findById(id, context);
    assignment.isActive = false;
    await assignment.save();
  }

  /**
   * Hard delete an assignment
   */
  async delete(id: string, context?: TenantContext): Promise<void> {
    const model = await this.getAssignmentModel(context);
    await model.findByIdAndDelete(id).exec();
  }
}
