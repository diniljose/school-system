/**
 * Class Teacher Assignments Controller
 * API endpoints for managing teacher-class assignments
 * Updated to support multi-tenant database architecture
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { ClassTeacherAssignmentsService, TenantContext } from './class-teacher-assignments.service';
import { CreateClassTeacherAssignmentDto } from './dto/create-class-teacher-assignment.dto';
import { UpdateClassTeacherAssignmentDto } from './dto/update-class-teacher-assignment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Class Teacher Assignments')
@ApiBearerAuth('JWT-auth')
@Controller('class-teacher-assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClassTeacherAssignmentsController {
  constructor(
    private readonly assignmentsService: ClassTeacherAssignmentsService,
  ) {}

  /**
   * Helper to extract tenant context from request
   */
  private getTenantContext(req: any): TenantContext {
    return {
      schoolCode: req.user?.schoolCode,
      isTenantUser: req.user?.isTenantUser,
      schoolId: req.user?.school,
    };
  }

  @Get()
  @RequirePermissions('class-assignment:view')
  @ApiOperation({ summary: 'Get all class teacher assignments' })
  @ApiQuery({ name: 'teacher', required: false })
  @ApiQuery({ name: 'class', required: false })
  @ApiQuery({ name: 'section', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'isClassTeacher', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async findAll(
    @Query('teacher') teacher?: string,
    @Query('class') classId?: string,
    @Query('section') section?: string,
    @Query('academicYear') academicYear?: string,
    @Query('isClassTeacher') isClassTeacher?: boolean,
    @Query('isActive') isActive?: boolean,
    @Req() req?: ExpressRequest,
  ) {
    return this.assignmentsService.findAll({
      teacher,
      class: classId,
      section,
      academicYear,
      isClassTeacher,
      isActive,
    }, this.getTenantContext(req));
  }

  @Get('my-classes')
  @RequirePermissions('class-assignment:view')
  @ApiOperation({ summary: 'Get classes assigned to the current teacher' })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'classTeacherOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of assigned classes' })
  async getMyClasses(
    @Request() req,
    @Query('academicYear') academicYear?: string,
    @Query('classTeacherOnly') classTeacherOnly?: boolean,
  ) {
    // Get teacher ID from user
    const teacherId = req.user.teacherId || req.user.id;
    return this.assignmentsService.getTeacherClasses(
      teacherId,
      academicYear,
      classTeacherOnly === true,
      this.getTenantContext(req),
    );
  }

  @Get(':id')
  @RequirePermissions('class-assignment:view')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment details' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findById(@Param('id') id: string, @Req() req: ExpressRequest) {
    return this.assignmentsService.findById(id, this.getTenantContext(req));
  }

  @Post()
  @RequirePermissions('class-assignment:create')
  @ApiOperation({ summary: 'Create a new class teacher assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 400, description: 'Invalid data or duplicate' })
  async create(
    @Body() createDto: CreateClassTeacherAssignmentDto,
    @Request() req,
  ) {
    return this.assignmentsService.create(createDto, req.user.id, this.getTenantContext(req));
  }

  @Patch(':id')
  @RequirePermissions('class-assignment:update')
  @ApiOperation({ summary: 'Update an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateClassTeacherAssignmentDto,
    @Req() req: ExpressRequest,
  ) {
    return this.assignmentsService.update(id, updateDto, this.getTenantContext(req));
  }

  @Delete(':id')
  @RequirePermissions('class-assignment:delete')
  @ApiOperation({ summary: 'Remove an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment removed' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async remove(@Param('id') id: string, @Req() req: ExpressRequest) {
    await this.assignmentsService.remove(id, this.getTenantContext(req));
    return { message: 'Assignment removed successfully' };
  }

  @Get('class/:classId/teacher')
  @RequirePermissions('class-assignment:view')
  @ApiOperation({ summary: 'Get the class teacher for a specific class' })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiQuery({ name: 'section', required: false })
  @ApiResponse({ status: 200, description: 'Class teacher details' })
  async getClassTeacher(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @Query('section') section?: string,
    @Req() req?: ExpressRequest,
  ) {
    return this.assignmentsService.getClassTeacher(classId, academicYear, section, this.getTenantContext(req));
  }

  @Get('check-access/:teacherId/:classId')
  @RequirePermissions('class-assignment:view')
  @ApiOperation({ summary: 'Check if a teacher has access to a class' })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(
    @Param('teacherId') teacherId: string,
    @Param('classId') classId: string,
    @Query('academicYear') academicYear?: string,
    @Req() req?: ExpressRequest,
  ) {
    const context = this.getTenantContext(req);
    const hasAccess = await this.assignmentsService.hasClassAccess(
      teacherId,
      classId,
      academicYear,
      context,
    );
    const isClassTeacher = await this.assignmentsService.isClassTeacher(
      teacherId,
      classId,
      academicYear,
      context,
    );
    return { hasAccess, isClassTeacher };
  }
}

