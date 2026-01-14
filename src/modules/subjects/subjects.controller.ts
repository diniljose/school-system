import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
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
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new subject' })
  async create(
    @Body() createSubjectDto: CreateSubjectDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.create(createSubjectDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all subjects with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('type') type?: string,
    @Query('department') department?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.subjectsService.findAll(
      schoolId,
      { type, department, isActive, search },
      { page, limit },
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get subject by ID' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  async update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.update(id, updateSubjectDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.delete(id, schoolId);
  }

  @Post(':id/classes/:classId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign subject to class' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  async assignToClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.assignToClass(id, classId, schoolId);
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove subject from class' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  async removeFromClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.removeFromClass(id, classId, schoolId);
  }

  @Post(':id/teachers')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign teacher to subject for a class' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  async assignTeacher(
    @Param('id') id: string,
    @Body() assignTeacherDto: AssignTeacherDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.assignTeacher(
      id,
      assignTeacherDto.classId,
      assignTeacherDto.teacherId,
      schoolId,
    );
  }

  @Get(':id/teachers')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all teachers assigned to subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  async getSubjectTeachers(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.getSubjectTeachers(id, schoolId);
  }

  @Get(':id/classes')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all classes for subject' })
  @ApiParam({ name: 'id', description: 'Subject ID' })
  async getSubjectClasses(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.subjectsService.getSubjectClasses(id, schoolId);
  }
}
