import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  MarkAttendanceDto,
  MarkSubjectAttendanceDto,
  MarkPeriodAttendanceDto,
  MarkStudentAttendanceDto,
} from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
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

  @Post()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Mark attendance for entire class' })
  async markAttendance(
    @Body() markAttendanceDto: MarkAttendanceDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.attendanceService.markAttendance(
      markAttendanceDto,
      schoolId,
      userId,
    );
  }

  @Post('student')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Mark attendance for individual student' })
  async markStudentAttendance(@Body() dto: MarkStudentAttendanceDto) {
    return this.attendanceService.markStudentAttendance(
      dto.studentId,
      dto.date,
      dto.status,
      dto.remarks,
    );
  }

  @Post('subject')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Mark subject-wise attendance' })
  async markSubjectAttendance(
    @Body() dto: MarkSubjectAttendanceDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.attendanceService.markSubjectAttendance(dto, schoolId, userId);
  }

  @Post('period')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Mark period-wise attendance' })
  async markPeriodAttendance(
    @Body() dto: MarkPeriodAttendanceDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.attendanceService.markPeriodAttendance(dto, schoolId, userId);
  }

  @Put(':attendanceId/student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Update attendance record for a student' })
  @ApiParam({ name: 'attendanceId', description: 'Attendance record ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  async updateAttendance(
    @Param('attendanceId') attendanceId: string,
    @Param('studentId') studentId: string,
    @Body() updateDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateAttendance(
      attendanceId,
      studentId,
      updateDto,
    );
  }

  @Get('class/:classId/section/:section/date/:date')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get attendance by date for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiParam({ name: 'date', description: 'Date (YYYY-MM-DD)' })
  async getAttendanceByDate(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.getAttendanceByDate(
      classId,
      section,
      new Date(date),
    );
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get student attendance for date range' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getStudentAttendance(
      studentId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('class/:classId/section/:section')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get class attendance for a month' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  async getClassAttendance(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.attendanceService.getClassAttendance(
      classId,
      section,
      +month,
      +year,
    );
  }

  @Get('statistics/class/:classId/section/:section')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get attendance statistics for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiQuery({ name: 'academicYearId', required: true })
  async getAttendanceStatistics(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.attendanceService.getAttendanceStatistics(
      classId,
      section,
      academicYearId,
    );
  }

  @Get('student/:studentId/percentage')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get student attendance percentage' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'academicYearId', required: true })
  async getStudentAttendancePercentage(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.attendanceService.getStudentAttendancePercentage(
      studentId,
      academicYearId,
    );
  }

  @Get('absentees/class/:classId/section/:section/date/:date')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get list of absentees for a date' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiParam({ name: 'date', description: 'Date (YYYY-MM-DD)' })
  async getAbsentees(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.getAbsentees(
      classId,
      section,
      new Date(date),
    );
  }

  @Get('defaulters/class/:classId/section/:section')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get list of attendance defaulters' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiQuery({
    name: 'minimumPercentage',
    required: false,
    description: 'Minimum attendance percentage (default: 75)',
  })
  async getDefaulters(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Query('minimumPercentage') minimumPercentage: number = 75,
  ) {
    return this.attendanceService.getDefaulters(
      classId,
      section,
      +minimumPercentage,
    );
  }

  @Get('report/class/:classId/section/:section')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Generate attendance report for a month' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  async generateAttendanceReport(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.attendanceService.generateAttendanceReport(
      classId,
      section,
      +month,
      +year,
    );
  }
}
