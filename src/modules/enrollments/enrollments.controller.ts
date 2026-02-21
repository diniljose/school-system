import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Permissions('enrollment:create')
  @ApiOperation({ summary: 'Enroll a student to a class/section for an academic year' })
  @ApiResponse({ status: 201, description: 'Student enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data or section full' })
  @ApiResponse({ status: 404, description: 'Student, class, or academic year not found' })
  async enrollStudent(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.enrollStudent(
      createEnrollmentDto,
      schoolId,
      userId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Post('bulk')
  @Permissions('enrollment:bulk')
  @ApiOperation({ summary: 'Bulk enroll multiple students to a class/section' })
  @ApiResponse({ status: 201, description: 'Bulk enrollment completed with results' })
  async bulkEnroll(
    @Body() bulkEnrollmentDto: BulkEnrollmentDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.bulkEnroll(
      bulkEnrollmentDto,
      schoolId,
      userId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get()
  @Permissions('enrollment:view')
  @ApiOperation({ summary: 'Get all enrollments with filters and pagination' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'section', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Enrollments retrieved' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryEnrollmentDto,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.findAll(schoolId, query, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get('stats')
  @Permissions('enrollment:view')
  @ApiOperation({ summary: 'Get enrollment statistics' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.getEnrollmentStats(
      schoolId,
      academicYearId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get('unenrolled')
  @Permissions('enrollment:view', 'enrollment:create')
  @ApiOperation({ summary: 'Get students not enrolled for an academic year' })
  @ApiQuery({ name: 'academicYearId', required: true })
  @ApiResponse({ status: 200, description: 'Unenrolled students retrieved' })
  async getUnenrolled(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.getUnenrolledStudents(
      schoolId,
      academicYearId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get('class/:classId/section/:section')
  @Permissions('enrollment:view')
  @ApiOperation({ summary: 'Get students enrolled in a specific class/section' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiQuery({ name: 'academicYearId', required: true })
  @ApiResponse({ status: 200, description: 'Class enrollments retrieved' })
  async getClassEnrollments(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.getClassEnrollments(
      classId,
      section,
      academicYearId,
      schoolId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get('student/:studentId/history')
  @Permissions('enrollment:view')
  @ApiOperation({ summary: 'Get enrollment history for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Enrollment history retrieved' })
  async getStudentHistory(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.getStudentEnrollmentHistory(
      studentId,
      schoolId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get(':id')
  @Permissions('enrollment:view')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({ status: 200, description: 'Enrollment retrieved' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.findById(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id')
  @Permissions('enrollment:update')
  @ApiOperation({ summary: 'Update enrollment (section, roll number, status)' })
  @ApiResponse({ status: 200, description: 'Enrollment updated' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEnrollmentDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.update(id, updateDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id/withdraw')
  @Permissions('enrollment:delete')
  @ApiOperation({ summary: 'Withdraw a student from enrollment' })
  @ApiResponse({ status: 200, description: 'Student withdrawn' })
  async withdraw(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.withdrawStudent(id, reason, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }
}
