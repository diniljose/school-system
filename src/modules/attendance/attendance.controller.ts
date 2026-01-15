import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { MarkIndividualAttendanceDto } from './dto/mark-individual-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark-class')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Mark attendance for entire class' })
  @ApiResponse({
    status: 201,
    description: 'Attendance marked successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Class or section not found' })
  async markClassAttendance(
    @Body() markAttendanceDto: MarkAttendanceDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.markClassAttendance(
      markAttendanceDto,
      schoolId,
      userId,
    );
  }

  @Post('mark-individual')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Mark attendance for individual student' })
  @ApiResponse({
    status: 201,
    description: 'Individual attendance marked successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student or class not found' })
  async markIndividualAttendance(
    @Body() markIndividualDto: MarkIndividualAttendanceDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.markIndividualAttendance(
      markIndividualDto,
      schoolId,
      userId,
    );
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get student attendance with filters' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    description: 'Subject ID for filtering',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: Number,
    description: 'Period number for filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Student attendance retrieved successfully',
  })
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.getStudentAttendance(studentId, query);
  }

  @Get('class/:classId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get class attendance for a specific date' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'section', required: true, description: 'Section name' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Class attendance retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No attendance records found',
  })
  async getClassAttendance(
    @Param('classId') classId: string,
    @Query('section') section: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getClassAttendance(classId, section, date);
  }

  @Get('student/:studentId/statistics')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({
    summary: 'Get attendance statistics for a student with percentage',
  })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance statistics retrieved successfully',
  })
  async getAttendanceStatistics(
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getAttendanceStatistics(
      studentId,
      startDate,
      endDate,
    );
  }

  @Get('class/:classId/absentees')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get list of absentees for a class on a date' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'section', required: true, description: 'Section name' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Absentees list retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No attendance record found',
  })
  async getAbsentees(
    @Param('classId') classId: string,
    @Query('section') section: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getAbsentees(classId, section, date);
  }

  @Get('class/:classId/defaulters')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({
    summary: 'Get list of students below attendance threshold (defaulters)',
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'section', required: true, description: 'Section name' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date up to which to calculate (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    description: 'Minimum attendance percentage (default: 75)',
  })
  @ApiResponse({
    status: 200,
    description: 'Defaulters list retrieved successfully',
  })
  async getDefaulters(
    @Param('classId') classId: string,
    @Query('section') section: string,
    @Query('date') date: string,
    @Query('threshold') threshold?: number,
  ) {
    return this.attendanceService.getDefaulters(
      classId,
      section,
      date,
      threshold || 75,
    );
  }

  @Get('student/:studentId/monthly-report')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get monthly attendance report for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({
    name: 'month',
    required: true,
    type: Number,
    description: 'Month (1-12)',
  })
  @ApiQuery({
    name: 'year',
    required: true,
    type: Number,
    description: 'Year (e.g., 2024)',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    description: 'Subject ID for subject-wise report',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly report retrieved successfully',
  })
  async getMonthlyReport(
    @Param('studentId') studentId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.attendanceService.getMonthlyReport(
      studentId,
      Number(month),
      Number(year),
      subjectId,
    );
  }

  @Get('student/:studentId/yearly-report')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get yearly attendance report for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({
    name: 'year',
    required: true,
    type: Number,
    description: 'Year (e.g., 2024)',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    description: 'Subject ID for subject-wise report',
  })
  @ApiResponse({
    status: 200,
    description: 'Yearly report retrieved successfully',
  })
  async getYearlyReport(
    @Param('studentId') studentId: string,
    @Query('year') year: number,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.attendanceService.getYearlyReport(
      studentId,
      Number(year),
      subjectId,
    );
  }
}
