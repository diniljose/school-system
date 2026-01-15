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
} from '@nestjs/common';
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
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({
    summary: 'Create new teacher with auto-generated employee ID',
  })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createTeacherDto: CreateTeacherDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.create(createTeacherDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
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
  ) {
    return this.teachersService.findAll(schoolId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
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
  ) {
    return this.teachersService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update teacher details' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.update(id, updateTeacherDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete teacher (soft delete)' })
  @ApiResponse({ status: 200, description: 'Teacher deleted successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.remove(id, schoolId);
  }

  @Post(':id/assign-subject')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
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
  ) {
    return this.teachersService.assignSubject(id, assignSubjectDto, schoolId);
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
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
  ) {
    return this.teachersService.removeSubject(id, subjectId, schoolId);
  }

  @Post(':id/assign-class')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
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
  ) {
    return this.teachersService.assignClass(id, assignClassDto, schoolId);
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
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
  ) {
    return this.teachersService.removeClass(id, classId, schoolId);
  }

  @Get(':id/schedule')
  @Roles(
    UserRole.SCHOOL_ADMIN,
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
  ) {
    return this.teachersService.getSchedule(id, schoolId);
  }

  @Get(':id/statistics')
  @Roles(
    UserRole.SCHOOL_ADMIN,
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
  ) {
    return this.teachersService.getStatistics(id, schoolId);
  }
}
