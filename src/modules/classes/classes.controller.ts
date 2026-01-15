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
  ApiParam,
} from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto } from './dto/query-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'Class with this name already exists',
  })
  async create(
    @Body() createClassDto: CreateClassDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.create(createClassDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all classes with filters and pagination' })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryClassDto,
  ) {
    return this.classesService.findAll(schoolId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get a class by ID with students and subjects' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({
    status: 409,
    description: 'Class with this name already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete class with enrolled students',
  })
  async remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Get(':id/students')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all students in a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getStudents(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.classesService.getStudents(id, page, limit);
  }

  @Get(':id/subjects')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all subjects for a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getSubjects(@Param('id') id: string) {
    return this.classesService.getSubjects(id);
  }

  @Post(':id/subjects/:subjectId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add a subject to a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject added successfully' })
  @ApiResponse({ status: 404, description: 'Class or subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Subject already assigned to this class',
  })
  async addSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.classesService.addSubject(id, subjectId);
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove a subject from a class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject removed successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async removeSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.classesService.removeSubject(id, subjectId);
  }

  @Post(':id/sections/:sectionName/teacher/:teacherId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign a class teacher to a section' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({
    name: 'sectionName',
    description: 'Section name (e.g., A, B, C)',
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Class teacher assigned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class, section, or teacher not found',
  })
  async assignClassTeacher(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
    @Param('teacherId') teacherId: string,
  ) {
    return this.classesService.assignClassTeacher(id, sectionName, teacherId);
  }

  @Delete(':id/sections/:sectionName/teacher')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove a class teacher from a section' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({
    name: 'sectionName',
    description: 'Section name (e.g., A, B, C)',
  })
  @ApiResponse({
    status: 200,
    description: 'Class teacher removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Class or section not found' })
  async removeClassTeacher(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
  ) {
    return this.classesService.removeClassTeacher(id, sectionName);
  }

  @Get(':id/statistics')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({
    summary:
      'Get class statistics including student count and capacity utilization',
  })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getStatistics(@Param('id') id: string) {
    return this.classesService.getStatistics(id);
  }
}
