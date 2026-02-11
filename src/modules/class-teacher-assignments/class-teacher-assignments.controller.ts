/**
 * Class Teacher Assignments Controller
 * API endpoints for managing teacher-class assignments
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ClassTeacherAssignmentsService } from './class-teacher-assignments.service';
import { CreateClassTeacherAssignmentDto } from './dto/create-class-teacher-assignment.dto';
import { UpdateClassTeacherAssignmentDto } from './dto/update-class-teacher-assignment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Class Teacher Assignments')
@ApiBearerAuth('JWT-auth')
@Controller('class-teacher-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassTeacherAssignmentsController {
  constructor(
    private readonly assignmentsService: ClassTeacherAssignmentsService,
  ) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Get all class teacher assignments' })
  @ApiQuery({ name: 'teacher', required: false })
  @ApiQuery({ name: 'class', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'isClassTeacher', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async findAll(
    @Query('teacher') teacher?: string,
    @Query('class') classId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('isClassTeacher') isClassTeacher?: boolean,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.assignmentsService.findAll({
      teacher,
      class: classId,
      academicYear,
      isClassTeacher,
      isActive,
    });
  }

  @Get('my-classes')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER)
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
    );
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment details' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findById(@Param('id') id: string) {
    return this.assignmentsService.findById(id);
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new class teacher assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 400, description: 'Invalid data or duplicate' })
  async create(
    @Body() createDto: CreateClassTeacherAssignmentDto,
    @Request() req,
  ) {
    return this.assignmentsService.create(createDto, req.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateClassTeacherAssignmentDto,
  ) {
    return this.assignmentsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment removed' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async remove(@Param('id') id: string) {
    await this.assignmentsService.remove(id);
    return { message: 'Assignment removed successfully' };
  }

  @Get('class/:classId/teacher')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get the class teacher for a specific class' })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiResponse({ status: 200, description: 'Class teacher details' })
  async getClassTeacher(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.assignmentsService.getClassTeacher(classId, academicYear);
  }

  @Get('check-access/:teacherId/:classId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Check if a teacher has access to a class' })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(
    @Param('teacherId') teacherId: string,
    @Param('classId') classId: string,
    @Query('academicYear') academicYear?: string,
  ) {
    const hasAccess = await this.assignmentsService.hasClassAccess(
      teacherId,
      classId,
      academicYear,
    );
    const isClassTeacher = await this.assignmentsService.isClassTeacher(
      teacherId,
      classId,
      academicYear,
    );
    return { hasAccess, isClassTeacher };
  }
}

