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
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';
import { ReportQueryDto } from './dto/report-query.dto';
import { ExportReportDto } from './dto/export-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Generate comprehensive student report' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Student report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async generateStudentReport(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.reportsService.generateStudentReport(
      studentId,
      academicYearId,
      schoolId,
    );
  }

  @Get('class/:classId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Generate class performance report' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'section', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Class report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async generateClassReport(
    @Param('classId') classId: string,
    @Query('section') section: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.reportsService.generateClassReport(
      classId,
      section,
      academicYearId,
      schoolId,
    );
  }

  @Get('attendance')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Generate attendance report' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'section', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Attendance report generated successfully',
  })
  async generateAttendanceReport(
    @CurrentUser('school') schoolId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.generateAttendanceReport(
      schoolId,
      query.classId,
      query.section,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get('fee-collection')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Generate fee collection report' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Fee collection report generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async generateFeeCollectionReport(
    @CurrentUser('school') schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.generateFeeCollectionReport(
      schoolId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('exam-analysis/:examId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Generate exam analysis report' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({
    status: 200,
    description: 'Exam analysis report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async generateExamAnalysisReport(
    @Param('examId') examId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.reportsService.generateExamAnalysisReport(examId, schoolId);
  }

  @Get('teacher/:teacherId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Generate teacher performance report' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Teacher performance report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async generateTeacherPerformanceReport(
    @Param('teacherId') teacherId: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.reportsService.generateTeacherPerformanceReport(
      teacherId,
      academicYearId,
      schoolId,
    );
  }

  @Get('school-overview')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Generate school overview dashboard report' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'School overview report generated successfully',
  })
  async generateSchoolOverviewReport(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.reportsService.generateSchoolOverviewReport(
      schoolId,
      academicYearId,
    );
  }

  @Get('defaulters')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Generate fee defaulters report' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Defaulters report generated successfully',
  })
  async generateDefaultersReport(
    @CurrentUser('school') schoolId: string,
    @Query('classId') classId?: string,
  ) {
    return this.reportsService.generateDefaultersReport(schoolId, classId);
  }

  @Get('promotions')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Generate promotion statistics report' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Promotion report generated successfully',
  })
  async generatePromotionReport(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.reportsService.generatePromotionReport(
      schoolId,
      academicYearId,
    );
  }

  @Post('export/pdf')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Export report to PDF (placeholder)' })
  @ApiResponse({
    status: 200,
    description: 'PDF export initiated (placeholder)',
  })
  async exportToPdf(@Body() exportDto: ExportReportDto) {
    return this.reportsService.exportToPdf(
      exportDto.reportType,
      exportDto.reportData,
    );
  }

  @Post('export/excel')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Export report to Excel (placeholder)' })
  @ApiResponse({
    status: 200,
    description: 'Excel export initiated (placeholder)',
  })
  async exportToExcel(@Body() exportDto: ExportReportDto) {
    return this.reportsService.exportToExcel(
      exportDto.reportType,
      exportDto.reportData,
    );
  }
}
