import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeacherDto } from './dto/query-teacher.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { AssignSubjectToClassDto, RemoveSubjectFromClassDto } from './dto/assign-subject-to-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({
    summary: 'Create new teacher with auto-generated employee ID',
  })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createTeacherDto: CreateTeacherDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.create(createTeacherDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get()
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all teachers with filters and pagination' })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'designation', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Teachers retrieved successfully' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryTeacherDto,
    @Req() req: Request,
  ) {
    return this.teachersService.findAll(schoolId, query, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher by ID' })
  @ApiResponse({ status: 200, description: 'Teacher retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.findOne(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update teacher details' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.update(id, updateTeacherDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete teacher (soft delete)' })
  @ApiResponse({ status: 200, description: 'Teacher deleted successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.remove(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post(':id/assign-subject')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Assign subject to teacher' })
  @ApiResponse({
    status: 200,
    description: 'Subject assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 400, description: 'Subject already assigned' })
  async assignSubject(
    @Param('id') id: string,
    @Body() assignSubjectDto: AssignSubjectDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.assignSubject(id, assignSubjectDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Remove subject from teacher' })
  @ApiResponse({
    status: 200,
    description: 'Subject removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async removeSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.removeSubject(id, subjectId, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post(':id/assign-class')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Assign class to teacher' })
  @ApiResponse({
    status: 200,
    description: 'Class assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 400, description: 'Class already assigned' })
  async assignClass(
    @Param('id') id: string,
    @Body() assignClassDto: AssignClassDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.assignClass(id, assignClassDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Remove class from teacher' })
  @ApiResponse({
    status: 200,
    description: 'Class removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async removeClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.removeClass(id, classId, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post(':id/subject-class-assignment')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Assign teacher to teach a subject in specific class and sections' })
  @ApiResponse({
    status: 200,
    description: 'Subject-class assignment created successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async assignSubjectToClass(
    @Param('id') id: string,
    @Body() dto: AssignSubjectToClassDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.assignSubjectToClass(id, dto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post(':id/remove-subject-class-assignment')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Remove subject-class assignment from teacher' })
  @ApiResponse({
    status: 200,
    description: 'Subject-class assignment removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async removeSubjectFromClass(
    @Param('id') id: string,
    @Body() dto: RemoveSubjectFromClassDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.removeSubjectFromClass(id, dto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id/subject-class-assignments')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Get all subject-class assignments for a teacher' })
  @ApiResponse({
    status: 200,
    description: 'Subject-class assignments retrieved successfully',
  })
  async getSubjectClassAssignments(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.getSubjectClassAssignments(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id/schedule')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher schedule' })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getSchedule(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.getSchedule(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id/statistics')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getStatistics(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.teachersService.getStatistics(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }
}

