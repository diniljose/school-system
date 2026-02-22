import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { MarkIndividualAttendanceDto } from './dto/mark-individual-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions('attendance:view')
  @ApiOperation({ summary: 'Get attendance records with filters' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'section', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Attendance records retrieved' })
  async getAttendance(
    @Query('classId') classId?: string,
    @Query('date') date?: string,
    @Query('section') section?: string,
    @Query('studentId') studentId?: string,
    @Req() req?: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };

    if (studentId) {
      return this.attendanceService.getStudentAttendance(studentId, { startDate: date, endDate: date } as any, tenantContext);
    }
    // For class attendance, at least classId is needed
    if (classId) {
      // If date is not provided, use today's date
      const attendanceDate = date ? date : new Date().toISOString().split('T')[0];
      return this.attendanceService.getClassAttendance(classId, section || null, attendanceDate, tenantContext);
    }
    return { success: true, data: [] };
  }

  @Post()
  @RequirePermissions('attendance:create')
  @ApiOperation({ summary: 'Mark attendance for entire class (alias for mark-class)' })
  @ApiResponse({ status: 201, description: 'Attendance marked successfully' })
  async markAttendanceAlias(
    @Body() markAttendanceDto: MarkAttendanceDto,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };
    return this.attendanceService.markClassAttendance(
      markAttendanceDto,
      schoolId,
      userId,
      tenantContext,
    );
  }

  @Post('mark-class')
  @RequirePermissions('attendance:create')
  @ApiOperation({ summary: 'Mark attendance for entire class' })
  @ApiResponse({
    status: 201,
    description: 'Attendance marked successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Class or section not found' })
  async markClassAttendance(
    @Body() markAttendanceDto: MarkAttendanceDto,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };
    return this.attendanceService.markClassAttendance(
      markAttendanceDto,
      schoolId,
      userId,
      tenantContext,
    );
  }

  @Post('mark-individual')
  @RequirePermissions('attendance:create')
  @ApiOperation({ summary: 'Mark attendance for individual student' })
  @ApiResponse({
    status: 201,
    description: 'Individual attendance marked successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student or class not found' })
  async markIndividualAttendance(
    @Body() markIndividualDto: MarkIndividualAttendanceDto,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };
    return this.attendanceService.markIndividualAttendance(
      markIndividualDto,
      schoolId,
      userId,
      tenantContext,
    );
  }

  @Get('student/:studentId')
  @RequirePermissions('attendance:view')
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
    @Req() req: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };
    return this.attendanceService.getStudentAttendance(studentId, query, tenantContext);
  }

  @Get('class/:classId')
  @RequirePermissions('attendance:view')
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
  @RequirePermissions('attendance:view')
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
    @Req() req?: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any)?.user?.schoolCode,
      isTenantUser: (req as any)?.user?.isTenantUser,
    };
    return this.attendanceService.getAttendanceStatistics(
      studentId,
      startDate,
      endDate,
      tenantContext,
    );
  }

  @Get('class/:classId/absentees')
  @RequirePermissions('attendance:view')
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
    @Req() req?: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any)?.user?.schoolCode,
      isTenantUser: (req as any)?.user?.isTenantUser,
    };
    return this.attendanceService.getAbsentees(classId, section, date, tenantContext);
  }

  @Get('class/:classId/defaulters')
  @RequirePermissions('attendance:view')
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
    @Req() req?: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any)?.user?.schoolCode,
      isTenantUser: (req as any)?.user?.isTenantUser,
    };
    return this.attendanceService.getDefaulters(
      classId,
      section,
      date,
      threshold || 75,
      tenantContext,
    );
  }

  @Get('student/:studentId/monthly-report')
  @RequirePermissions('attendance:view')
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
    @Req() req?: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any)?.user?.schoolCode,
      isTenantUser: (req as any)?.user?.isTenantUser,
    };
    return this.attendanceService.getMonthlyReport(
      studentId,
      Number(month),
      Number(year),
      subjectId,
      tenantContext,
    );
  }

  @Get('student/:studentId/yearly-report')
  @RequirePermissions('attendance:view')
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
    @Req() req?: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any)?.user?.schoolCode,
      isTenantUser: (req as any)?.user?.isTenantUser,
    };
    return this.attendanceService.getYearlyReport(
      studentId,
      Number(year),
      subjectId,
      tenantContext,
    );
  }
}

