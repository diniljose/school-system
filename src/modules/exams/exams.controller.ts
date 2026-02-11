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
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { ExamScheduleDto } from './dto/exam-schedule.dto';
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
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createExamDto: CreateExamDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.create(createExamDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get all exams with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Exams retrieved successfully' })
  async findAll(
    @Query() queryDto: QueryExamDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.findAll(queryDto, schoolId);
  }

  @Get('upcoming')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get upcoming exams (next 30 days)' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming exams retrieved successfully',
  })
  async getUpcomingExams(@CurrentUser('school') schoolId: string) {
    return this.examsService.getUpcomingExams(schoolId);
  }

  @Get(':id')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get exam by ID with full schedule' })
  @ApiResponse({ status: 200, description: 'Exam retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update exam' })
  @ApiResponse({ status: 200, description: 'Exam updated successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async update(
    @Param('id') id: string,
    @Body() updateExamDto: UpdateExamDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.update(id, updateExamDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete exam' })
  @ApiResponse({ status: 200, description: 'Exam deleted successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.remove(id, schoolId);
  }

  @Post(':id/assign-class/:classId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Assign exam to a class' })
  @ApiResponse({ status: 200, description: 'Class assigned successfully' })
  @ApiResponse({ status: 404, description: 'Exam or class not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  async assignToClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.assignToClass(id, classId, schoolId);
  }

  @Delete(':id/classes/:classId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove class from exam' })
  @ApiResponse({ status: 200, description: 'Class removed successfully' })
  @ApiResponse({ status: 404, description: 'Exam or class not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  async removeFromClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.removeFromClass(id, classId, schoolId);
  }

  @Post(':id/schedule')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add schedule item to exam' })
  @ApiResponse({ status: 201, description: 'Schedule added successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async addSchedule(
    @Param('id') id: string,
    @Body() scheduleDto: ExamScheduleDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.addSchedule(id, scheduleDto, schoolId);
  }

  @Patch(':id/schedule/:scheduleId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update schedule item' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Exam or schedule item not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'scheduleId', description: 'Schedule Item ID' })
  async updateSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @Body() scheduleDto: ExamScheduleDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.updateSchedule(
      id,
      scheduleId,
      scheduleDto,
      schoolId,
    );
  }

  @Delete(':id/schedule/:scheduleId')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove schedule item from exam' })
  @ApiResponse({ status: 200, description: 'Schedule removed successfully' })
  @ApiResponse({ status: 404, description: 'Exam or schedule item not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'scheduleId', description: 'Schedule Item ID' })
  async removeSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.removeSchedule(id, scheduleId, schoolId);
  }

  @Get(':id/timetable')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get exam timetable' })
  @ApiResponse({ status: 200, description: 'Timetable retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async getExamTimetable(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.examsService.getExamTimetable(id, schoolId);
  }
}

