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
  ApiParam,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'Subject with this code already exists',
  })
  async create(
    @Body() createSubjectDto: CreateSubjectDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.subjectsService.create(createSubjectDto, schoolId, {
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
  @ApiOperation({ summary: 'Get all subjects with filters and pagination' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QuerySubjectDto,
    @Req() req: Request,
  ) {
    return this.subjectsService.findAll(schoolId, query, {
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
  @ApiOperation({ summary: 'Get a subject by ID' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    return this.subjectsService.findOne(id, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Subject with this code already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @Req() req: Request,
  ) {
    return this.subjectsService.update(id, updateSubjectDto, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.subjectsService.remove(id, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post(':id/assign-class/:classId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign subject to a class' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Subject assigned to class successfully',
  })
  @ApiResponse({ status: 404, description: 'Subject or class not found' })
  @ApiResponse({
    status: 409,
    description: 'Subject already assigned to this class',
  })
  async assignToClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @Req() req: Request,
  ) {
    return this.subjectsService.assignToClass(id, classId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove subject from a class' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Subject removed from class successfully',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async removeFromClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @Req() req: Request,
  ) {
    return this.subjectsService.removeFromClass(id, classId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post(':id/assign-teacher/:teacherId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign teacher to a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Teacher assigned to subject successfully',
  })
  @ApiResponse({ status: 404, description: 'Subject or teacher not found' })
  @ApiResponse({
    status: 409,
    description: 'Teacher already assigned to this subject',
  })
  async assignTeacher(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Req() req: Request,
  ) {
    return this.subjectsService.assignTeacher(id, teacherId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id/teachers/:teacherId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove teacher from a subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Teacher removed from subject successfully',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async removeTeacher(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @Req() req: Request,
  ) {
    return this.subjectsService.removeTeacher(id, teacherId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get('by-class/:classId')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all subjects for a specific class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Subjects for class retrieved successfully',
  })
  async getSubjectsByClass(@Param('classId') classId: string) {
    return this.subjectsService.getSubjectsByClass(classId);
  }

  @Get('by-teacher/:teacherId')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all subjects for a specific teacher' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiResponse({
    status: 200,
    description: 'Subjects for teacher retrieved successfully',
  })
  async getSubjectsByTeacher(@Param('teacherId') teacherId: string) {
    return this.subjectsService.getSubjectsByTeacher(teacherId);
  }
}

