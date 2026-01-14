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
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AddQualificationDto } from './dto/add-qualification.dto';
import { AddExperienceDto } from './dto/add-experience.dto';
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
  @ApiOperation({ summary: 'Create a new teacher' })
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
  @ApiOperation({ summary: 'Get all teachers with filters' })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'designation', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('department') department?: string,
    @Query('designation') designation?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.teachersService.findAll(
      schoolId,
      { department, designation, isActive, search },
      { page, limit },
    );
  }

  @Get('statistics')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get teacher statistics' })
  async getStatistics(@CurrentUser('school') schoolId: string) {
    return this.teachersService.getTeacherStatistics(schoolId);
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
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.update(id, updateTeacherDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.delete(id, schoolId);
  }

  @Post(':id/qualifications')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add qualification to teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async addQualification(
    @Param('id') id: string,
    @Body() qualificationDto: AddQualificationDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.addQualification(
      id,
      qualificationDto,
      schoolId,
    );
  }

  @Delete(':id/qualifications/:index')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove qualification from teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiParam({ name: 'index', description: 'Qualification index' })
  async removeQualification(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.removeQualification(
      id,
      parseInt(index, 10),
      schoolId,
    );
  }

  @Post(':id/experience')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add experience to teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async addExperience(
    @Param('id') id: string,
    @Body() experienceDto: AddExperienceDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.addExperience(id, experienceDto, schoolId);
  }

  @Delete(':id/experience/:index')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove experience from teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  @ApiParam({ name: 'index', description: 'Experience index' })
  async removeExperience(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.removeExperience(
      id,
      parseInt(index, 10),
      schoolId,
    );
  }

  @Post(':id/subjects')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign subjects to teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async assignSubjects(
    @Param('id') id: string,
    @Body() assignDto: { subjectIds: string[] },
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.assignSubjects(
      id,
      assignDto.subjectIds,
      schoolId,
    );
  }

  @Post(':id/classes')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign classes to teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async assignClasses(
    @Param('id') id: string,
    @Body() assignClassDto: AssignClassDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.assignClasses(
      id,
      assignClassDto.classIds,
      schoolId,
    );
  }

  @Post(':id/set-class-teacher')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Set teacher as class teacher' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async setAsClassTeacher(
    @Param('id') id: string,
    @Body() body: { classId: string; sectionName: string },
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.setAsClassTeacher(
      id,
      body.classId,
      body.sectionName,
      schoolId,
    );
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
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async getTeacherSchedule(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.getTeacherSchedule(id, schoolId);
  }

  @Get(':id/classes')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher classes' })
  @ApiParam({ name: 'id', description: 'Teacher ID' })
  async getTeacherClasses(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.teachersService.getTeacherClasses(id, schoolId);
  }
}
