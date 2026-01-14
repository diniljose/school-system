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
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddScheduleDto } from './dto/add-schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new exam' })
  async create(
    @Body() createExamDto: CreateExamDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.create(createExamDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all exams with filters' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'examType', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('examType') examType?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.examsService.findAll(
      schoolId,
      academicYearId,
      { examType, isActive, search },
      { page, limit },
    );
  }

  @Get('upcoming')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get upcoming exams' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getUpcomingExams(
    @CurrentUser('school') schoolId: string,
    @Query('classId') classId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.examsService.getUpcomingExams(schoolId, classId, academicYearId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.update(id, updateExamDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.delete(id, schoolId);
  }

  @Post(':id/schedule')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add schedule to exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async addSchedule(
    @Param('id') id: string,
    @Body() scheduleDto: AddScheduleDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.addSchedule(id, scheduleDto, schoolId);
  }

  @Put(':id/schedule/:index')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update exam schedule' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'index', description: 'Schedule index' })
  async updateSchedule(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() scheduleDto: AddScheduleDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.updateSchedule(
      id,
      parseInt(index),
      scheduleDto,
      schoolId,
    );
  }

  @Delete(':id/schedule/:index')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove exam schedule' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'index', description: 'Schedule index' })
  async removeSchedule(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.removeSchedule(id, parseInt(index), schoolId);
  }

  @Get(':id/schedule/:classId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get exam schedule for a class' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  async getExamSchedule(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.getExamSchedule(id, classId, schoolId);
  }

  @Post(':id/publish-results')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Publish exam results' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async publishResults(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.publishResults(id, schoolId);
  }

  @Get(':id/statistics')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get exam statistics' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async getExamStatistics(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.getExamStatistics(id, schoolId);
  }
}
