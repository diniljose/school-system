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
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';
import { StudentStatus } from '../../common/enums/student-status.enum';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Create new student with auto-generated admission number',
  })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async create(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.create(createStudentDto, schoolId, {
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
  @ApiOperation({ summary: 'Get all students with filters and pagination' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'section', required: false })
  @ApiQuery({ name: 'status', required: false, enum: StudentStatus })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryStudentDto,
    @Req() req: Request,
  ) {
    return this.studentsService.findAll(schoolId, query, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get('stats')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get student statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.getStatistics(schoolId, {
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
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.findById(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update student details' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.update(id, updateStudentDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete student (soft delete)' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.remove(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post('bulk')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Bulk import students' })
  @ApiResponse({ status: 201, description: 'Students imported successfully' })
  async bulkImport(
    @Body() students: CreateStudentDto[],
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.bulkImport(students, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id/assign-class')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Assign student to class and section' })
  @ApiResponse({ status: 200, description: 'Student assigned successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async assignClass(
    @Param('id') id: string,
    @Body() assignClassDto: AssignClassDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.assignClass(id, assignClassDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id/academic-history')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get student academic history' })
  @ApiResponse({
    status: 200,
    description: 'Academic history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getAcademicHistory(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.getAcademicHistory(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id/transfer-history')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get student transfer history' })
  @ApiResponse({
    status: 200,
    description: 'Transfer history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getTransferHistory(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.getTransferHistory(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id/status')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update student status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: StudentStatus,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.updateStatus(id, status, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }
}

