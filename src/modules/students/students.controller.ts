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
import { StudentActionDto, BulkStudentActionDto } from './dto/student-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StudentStatus } from '../../common/enums/student-status.enum';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Permissions('student:create')
  @ApiOperation({
    summary: 'Create new student with auto-generated admission number',
  })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async create(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    return this.studentsService.create(createStudentDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    }, userId);
  }

  @Get()
  @Permissions('student:view')
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
  @Permissions('student:view')
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
  @Permissions('student:view')
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
  @Permissions('student:update')
  @ApiOperation({ summary: 'Update student details' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    return this.studentsService.update(id, updateStudentDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    }, userId);
  }

  @Delete(':id')
  @Permissions('student:delete')
  @ApiOperation({ summary: 'Delete student (soft delete)' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub || (req as any).user?.userId;
    return this.studentsService.remove(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    }, userId);
  }

  @Post('bulk')
  @Permissions('student:create')
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
  @Permissions('student:update')
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
  @Permissions('student:view')
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
  @Permissions('student:view')
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
  @Permissions('student:update')
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

  @Get('options/actions')
  @Permissions('student:view')
  @ApiOperation({ summary: 'Get available student action options' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter actions by student status' })
  @ApiResponse({ status: 200, description: 'Action options retrieved' })
  getActionOptions(@Query('status') status?: string) {
    return this.studentsService.getActionOptions(status);
  }

  @Post(':id/action')
  @Permissions('student:update')
  @ApiOperation({ summary: 'Perform action on student (promote, fail, transfer, etc.)' })
  @ApiResponse({ status: 200, description: 'Action performed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action or parameters' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async performAction(
    @Param('id') id: string,
    @Body() actionDto: StudentActionDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.performAction(id, actionDto, schoolId, userId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post('bulk/action')
  @Permissions('student:update')
  @ApiOperation({ summary: 'Perform bulk action on multiple students' })
  @ApiResponse({ status: 200, description: 'Bulk action completed' })
  async performBulkAction(
    @Body() bulkActionDto: BulkStudentActionDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    return this.studentsService.performBulkAction(bulkActionDto, schoolId, userId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }
}

