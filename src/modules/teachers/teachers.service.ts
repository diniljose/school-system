import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Teacher,
  TeacherDocument,
} from '../../database/schemas/teacher.schema';
import {
  Subject,
  SubjectDocument,
} from '../../database/schemas/subject.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

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

  /**
   * Enrich subject assignments with populated data
   */
  private async enrichSubjectAssignments(
    assignments: any[],
    subjectModel: Model<SubjectDocument>,
    classModel: Model<ClassDocument>,
    context?: TenantContext,
  ): Promise<any[]> {
    if (!assignments || !Array.isArray(assignments)) return [];

    let subjectCache = new Map();
    let classCache = new Map();

    for (const assignment of assignments) {
      // Get subject if not cached
      let subjectId = (assignment.subject as any)?._id || assignment.subject;
      if (subjectId && !subjectCache.has(subjectId.toString())) {
        try {
          const subj = await subjectModel.findById(subjectId).select('name code');
          subjectCache.set(subjectId.toString(), subj);
        } catch (e) {
          subjectCache.set(subjectId.toString(), null);
        }
      }

      // Get class if not cached
      let classId = (assignment.class as any)?._id || assignment.class;
      if (classId && !classCache.has(classId.toString())) {
        try {
          const cls = await classModel.findById(classId).select('name grade');
          classCache.set(classId.toString(), cls);
        } catch (e) {
          classCache.set(classId.toString(), null);
        }
      }

      // Enrich the assignment
      if (subjectCache.has(subjectId.toString())) {
        assignment.subject = subjectCache.get(subjectId.toString());
      }
      if (classCache.has(classId.toString())) {
        assignment.class = classCache.get(classId.toString());
      }
    }

    return assignments;
  }

  async create(
    createTeacherDto: CreateTeacherDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);

    if (!createTeacherDto.employeeId) {
      createTeacherDto.employeeId = await this.generateEmployeeId(
        schoolId,
        context,
      );
    }

    const existingQuery: any = {
      employeeId: createTeacherDto.employeeId,
      isActive: { $ne: false },
    };
    if (!context?.isTenantUser) {
      existingQuery.school = schoolId;
    }

    const existing = await teacherModel.findOne(existingQuery);

    if (existing) {
      throw new BadRequestException('Employee ID already exists');
    }

    const emailQuery: any = {
      email: createTeacherDto.email,
      isActive: { $ne: false },
    };
    if (!context?.isTenantUser) {
      emailQuery.school = schoolId;
    }

    const emailExists = await teacherModel.findOne(emailQuery);

    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    // Handle flat 'qualification' field → convert to qualifications array
    const teacherData: any = { ...createTeacherDto };
    if (teacherData.qualification && !teacherData.qualifications?.length) {
      teacherData.qualifications = [
        {
          degree: teacherData.qualification,
          institution: 'N/A',
          year: new Date().getFullYear(),
        },
      ];
    }
    delete teacherData.qualification;

    const createData: any = {
      ...teacherData,
      subjects: [],
      assignedClasses: [],
      school: schoolId, // Always set school - required by schema
    };

    const teacher = new teacherModel(createData);

    return teacher.save();
  }

  async findAll(
    schoolId: string,
    filters: QueryTeacherDto,
    context?: TenantContext,
  ) {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = {};

    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    if (filters.department) {
      query.department = filters.department;
    }

    if (filters.designation) {
      query.designation = filters.designation;
    }

    if (filters.subjectId) {
      query.subjects = filters.subjectId;
    }

    if (filters.classId) {
      query.assignedClasses = filters.classId;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    } else {
      // Default to only active teachers unless explicitly requested all
      query.isActive = { $ne: false };
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { employeeId: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      teacherModel
        .find(query)
        .populate('subjects', 'name code')
        .populate('assignedClasses', 'name grade')
        .populate('classTeacherOf', 'name grade')
        .populate({
          path: 'subjectAssignments.subject',
          select: 'name code'
        })
        .populate({
          path: 'subjectAssignments.class',
          select: 'name grade'
        })
        .populate({
          path: 'subjectAssignments.academicYear',
          select: 'name year start end isCurrent'
        })
        .skip(skip)
        .limit(limit)
        .sort({ firstName: 1 }),
      teacherModel.countDocuments(query),
    ]);

    return {
      data: teachers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: id };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    let teacher = await teacherModel
      .findOne(query)
      .populate('subjects', 'name code')
      .populate('assignedClasses', 'name grade')
      .populate('classTeacherOf', 'name grade')
      .populate('user', '-password')
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code'
      })
      .populate({
        path: 'subjectAssignments.class',
        select: 'name grade'
      })
      .populate({
        path: 'subjectAssignments.academicYear',
        select: 'name year start end isCurrent'
      });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Fallback enrichment if populate didn't work for existing data
    if (teacher.subjectAssignments && teacher.subjectAssignments.length > 0) {
      const hasUnpopulated = teacher.subjectAssignments.some(
        (a: any) => typeof a.subject === 'string' || typeof a.subject === 'object' && !a.subject.name
      );
      
      if (hasUnpopulated) {
        const subjectModel = await this.getSubjectModel(context);
        const classModel = await this.getClassModel(context);
        teacher.subjectAssignments = await this.enrichSubjectAssignments(
          teacher.subjectAssignments,
          subjectModel,
          classModel,
          context
        );
      }
    }

    return teacher;
  }

  async findByEmployeeId(
    employeeId: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { employeeId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOne(query);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async update(
    id: string,
    updateTeacherDto: UpdateTeacherDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);

    if (updateTeacherDto.email) {
      const emailQuery: any = {
        email: updateTeacherDto.email,
        _id: { $ne: id },
      };
      if (!context?.isTenantUser) {
        emailQuery.school = schoolId;
      }

      const emailExists = await teacherModel.findOne(emailQuery);

      if (emailExists) {
        throw new BadRequestException('Email already exists');
      }
    }

    const updateQuery: any = { _id: id };
    if (!context?.isTenantUser) {
      updateQuery.school = schoolId;
    }

    const teacher = await teacherModel.findOneAndUpdate(
      updateQuery,
      { $set: updateTeacherDto },
      { new: true },
    );

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async remove(
    id: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: id };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOneAndUpdate(
      query,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async assignSubject(
    teacherId: string,
    assignSubjectDto: AssignSubjectDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const subjectModel = await this.getSubjectModel(context);

    const teacherQuery: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      teacherQuery.school = schoolId;
    }

    const teacher = await teacherModel.findOne(teacherQuery);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const subjectId = new Types.ObjectId(assignSubjectDto.subjectId);

    const subjectQuery: any = { _id: subjectId };
    if (!context?.isTenantUser) {
      subjectQuery.school = schoolId;
    }

    const subject = await subjectModel.findOne(subjectQuery);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (teacher.subjects.some((s) => s.equals(subjectId))) {
      throw new BadRequestException('Subject already assigned to teacher');
    }

    teacher.subjects.push(subjectId);
    return teacher.save();
  }

  async removeSubject(
    teacherId: string,
    subjectId: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOneAndUpdate(
      query,
      { $pull: { subjects: new Types.ObjectId(subjectId) } },
      { new: true },
    );

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async assignClass(
    teacherId: string,
    assignClassDto: AssignClassDto,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const classModel = await this.getClassModel(context);

    const teacherQuery: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      teacherQuery.school = schoolId;
    }

    const teacher = await teacherModel.findOne(teacherQuery);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const classId = new Types.ObjectId(assignClassDto.classId);

    const classQuery: any = { _id: classId };
    if (!context?.isTenantUser) {
      classQuery.school = schoolId;
    }

    const classExists = await classModel.findOne(classQuery);

    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    if (teacher.assignedClasses.some((c) => c.equals(classId))) {
      throw new BadRequestException('Class already assigned to teacher');
    }

    const updateData: {
      $push: { assignedClasses: Types.ObjectId };
      $set?: { classTeacherOf: Types.ObjectId };
    } = {
      $push: { assignedClasses: classId },
    };

    if (assignClassDto.setAsClassTeacher) {
      if (teacher.classTeacherOf) {
        throw new BadRequestException(
          'Teacher is already a class teacher of another class',
        );
      }
      updateData.$set = { classTeacherOf: classId };
    }

    return teacherModel.findOneAndUpdate(teacherQuery, updateData, {
      new: true,
    });
  }

  async removeClass(
    teacherId: string,
    classId: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOne(query);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const classObjectId = new Types.ObjectId(classId);
    const updateData: {
      $pull: { assignedClasses: Types.ObjectId };
      $unset?: { classTeacherOf: number };
    } = {
      $pull: { assignedClasses: classObjectId },
    };

    if (teacher.classTeacherOf?.equals(classObjectId)) {
      updateData.$unset = { classTeacherOf: 1 };
    }

    return teacherModel.findOneAndUpdate(query, updateData, { new: true });
  }

  async setAsClassTeacher(
    teacherId: string,
    classId: string,
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOne(query);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.classTeacherOf) {
      throw new BadRequestException(
        'Teacher is already a class teacher of another class',
      );
    }

    const classObjectId = new Types.ObjectId(classId);

    if (!teacher.assignedClasses.some((c) => c.equals(classObjectId))) {
      throw new BadRequestException(
        'Teacher must be assigned to the class first',
      );
    }

    teacher.classTeacherOf = classObjectId;
    return teacher.save();
  }

  async getSchedule(
    teacherId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel
      .findOne(query)
      .populate('subjects', 'name code')
      .populate('assignedClasses', 'name grade')
      .populate('classTeacherOf', 'name grade')
      .lean();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        employeeId: teacher.employeeId,
      },
      subjects: teacher.subjects || [],
      assignedClasses: teacher.assignedClasses || [],
      classTeacherOf: teacher.classTeacherOf || null,
    };
  }

  async getStatistics(
    teacherId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const teacherModel = await this.getTeacherModel(context);
    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOne(query).lean();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const totalSubjects = teacher.subjects?.length || 0;
    const totalClasses = teacher.assignedClasses?.length || 0;
    const isClassTeacher = !!teacher.classTeacherOf;
    const totalQualifications = teacher.qualifications?.length || 0;
    const totalExperience = teacher.experience?.length || 0;

    let yearsOfExperience = 0;
    if (teacher.joiningDate) {
      const today = new Date();
      const joiningDate = new Date(teacher.joiningDate);
      // Calculate years more accurately by comparing year/month/day differences
      let years = today.getFullYear() - joiningDate.getFullYear();
      const monthDiff = today.getMonth() - joiningDate.getMonth();
      const dayDiff = today.getDate() - joiningDate.getDate();

      // Adjust if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        years--;
      }

      // Add fractional year based on months
      const additionalMonths = monthDiff >= 0 ? monthDiff : 12 + monthDiff;
      yearsOfExperience = years + additionalMonths / 12;
      yearsOfExperience = Math.floor(yearsOfExperience * 10) / 10;
    }

    return {
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        employeeId: teacher.employeeId,
        designation: teacher.designation,
        department: teacher.department,
      },
      statistics: {
        totalSubjects,
        totalClasses,
        isClassTeacher,
        totalQualifications,
        totalExperience,
        yearsOfExperience,
      },
    };
  }

  /**
   * Assign a teacher to teach a specific subject in a specific class and sections
   */
  async assignSubjectToClass(
    teacherId: string,
    dto: { subjectId: string; classId: string; sections: string[]; academicYearId?: string; startDate?: string },
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);
    const subjectModel = await this.getSubjectModel(context);
    const classModel = await this.getClassModel(context);

    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOne(query);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Verify subject exists
    const subjectQuery: any = { _id: dto.subjectId };
    if (!context?.isTenantUser) {
      subjectQuery.school = schoolId;
    }
    const subject = await subjectModel.findOne(subjectQuery);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Verify class exists
    const classQuery: any = { _id: dto.classId };
    if (!context?.isTenantUser) {
      classQuery.school = schoolId;
    }
    const classEntity = await classModel.findOne(classQuery);
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Initialize subjectAssignments if not exists
    if (!teacher.subjectAssignments) {
      teacher.subjectAssignments = [];
    }

    // Check if assignment already exists
    const existingIndex = teacher.subjectAssignments.findIndex(
      (a: any) => a.subject?.toString() === dto.subjectId && a.class?.toString() === dto.classId
    );

    if (existingIndex >= 0) {
      // Update existing assignment with new sections (merge)
      const existing = teacher.subjectAssignments[existingIndex] as any;
      const allSections = [...new Set([...existing.sections, ...dto.sections])];
      teacher.subjectAssignments[existingIndex] = {
        subject: new Types.ObjectId(dto.subjectId),
        class: new Types.ObjectId(dto.classId),
        sections: allSections,
        academicYear: dto.academicYearId ? new Types.ObjectId(dto.academicYearId) : existing.academicYear,
        assignedDate: existing.assignedDate || new Date(),
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      };
    } else {
      // Add new assignment
      teacher.subjectAssignments.push({
        subject: new Types.ObjectId(dto.subjectId),
        class: new Types.ObjectId(dto.classId),
        sections: dto.sections,
        academicYear: dto.academicYearId ? new Types.ObjectId(dto.academicYearId) : undefined,
        assignedDate: new Date(),
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      });
    }

    // Also add to subjects array if not already present
    const subjectObjectId = new Types.ObjectId(dto.subjectId);
    if (!teacher.subjects.some((s) => s.equals(subjectObjectId))) {
      teacher.subjects.push(subjectObjectId);
    }

    // Also add to assignedClasses if not already present
    const classObjectId = new Types.ObjectId(dto.classId);
    if (!teacher.assignedClasses.some((c) => c.equals(classObjectId))) {
      teacher.assignedClasses.push(classObjectId);
    }

    return teacher.save();
  }

  /**
   * Remove a subject-class assignment from teacher
   */
  async removeSubjectFromClass(
    teacherId: string,
    dto: { subjectId: string; classId: string },
    schoolId: string,
    context?: TenantContext,
  ): Promise<Teacher> {
    const teacherModel = await this.getTeacherModel(context);

    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel.findOne(query);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!teacher.subjectAssignments) {
      throw new BadRequestException('No subject assignments found');
    }

    const initialLength = teacher.subjectAssignments.length;
    teacher.subjectAssignments = teacher.subjectAssignments.filter(
      (a: any) => !(a.subject?.toString() === dto.subjectId && a.class?.toString() === dto.classId)
    );

    if (teacher.subjectAssignments.length === initialLength) {
      throw new NotFoundException('Subject-class assignment not found');
    }

    return teacher.save();
  }

  /**
   * Get all subject-class assignments for a teacher with populated data
   */
  async getSubjectClassAssignments(
    teacherId: string,
    schoolId: string,
    context?: TenantContext,
  ) {
    const teacherModel = await this.getTeacherModel(context);

    const query: any = { _id: teacherId };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const teacher = await teacherModel
      .findOne(query)
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code',
      })
      .populate({
        path: 'subjectAssignments.class',
        select: 'name grade sections',
      })
      .populate({
        path: 'subjectAssignments.academicYear',
        select: 'name start end isCurrent',
      });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Enrich assignments with populated data
    const enrichedAssignments = (teacher.subjectAssignments || []).map((assignment: any) => ({
      _id: assignment._id,
      subject: assignment.subject,
      class: assignment.class,
      sections: assignment.sections,
      academicYear: assignment.academicYear,
      assignedDate: assignment.assignedDate,
      startDate: assignment.startDate,
    }));

    return {
      teacherId: teacher._id,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      assignments: enrichedAssignments,
    };
  }

  private async generateEmployeeId(
    schoolId: string,
    context?: TenantContext,
  ): Promise<string> {
    const teacherModel = await this.getTeacherModel(context);
    const currentYear = new Date().getFullYear();
    const prefix = `EMP${currentYear}`;

    // Find the last teacher with an employeeId starting with this year's prefix
    // Note: This query uses the compound index (school, employeeId) efficiently
    // The sort works correctly because we use zero-padded numbers (00001, 00002, etc.)
    // which sort lexicographically in the same order as numerically
    const query: any = { employeeId: { $regex: `^${prefix}` } };
    if (!context?.isTenantUser) {
      query.school = schoolId;
    }

    const lastTeacher = await teacherModel
      .findOne(query)
      .sort({ employeeId: -1 })
      .select('employeeId')
      .lean();

    let nextNumber = 1;
    if (lastTeacher && lastTeacher.employeeId) {
      const lastNumber = parseInt(
        lastTeacher.employeeId.replace(prefix, ''),
        10,
      );
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }
}
