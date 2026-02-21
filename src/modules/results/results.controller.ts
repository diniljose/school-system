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
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { BulkResultDto } from './dto/bulk-result.dto';
import { QueryResultDto } from './dto/query-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  @RequirePermissions('result:create')
  @ApiOperation({ summary: 'Create a new result' })
  @ApiResponse({ status: 201, description: 'Result created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'Result for this student and exam already exists',
  })
  async create(
    @Body() createResultDto: CreateResultDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resultsService.create(createResultDto, schoolId, userId);
  }

  @Post('bulk')
  @RequirePermissions('result:create')
  @ApiOperation({ summary: 'Create multiple results at once' })
  @ApiResponse({ status: 201, description: 'Results created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async bulkCreate(
    @Body() bulkResultDto: BulkResultDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resultsService.bulkCreate(
      bulkResultDto.results,
      schoolId,
      userId,
    );
  }

  @Get()
  @RequirePermissions('result:view')
  @ApiOperation({ summary: 'Get all results with filters and pagination' })
  @ApiQuery({ name: 'examId', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Results retrieved successfully' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryResultDto,
  ) {
    return this.resultsService.findAll(query.examId, query.classId, schoolId, {
      page: query.page || 1,
      limit: query.limit || 20,
    });
  }

  // ————————————————————————————————————————————————————
  // Specific GET routes MUST come before @Get(':id')
  // ————————————————————————————————————————————————————

  @Get('student/:studentId')
  @RequirePermissions('result:view')
  @ApiOperation({ summary: 'Get all results for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Results retrieved successfully' })
  async findByStudent(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.resultsService.findByStudent(studentId, academicYearId);
  }

  @Get('report-card/:studentId')
  @RequirePermissions('result:view')
  @ApiOperation({ summary: 'Get student report card for an academic year' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Report card retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentReportCard(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.resultsService.getStudentReportCard(studentId, academicYearId);
  }

  @Get('trend/:studentId')
  @RequirePermissions('result:view')
  @ApiOperation({
    summary: 'Get performance trend for a student across all exams',
  })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Performance trend retrieved successfully',
  })
  async getPerformanceTrend(@Param('studentId') studentId: string) {
    return this.resultsService.getPerformanceTrend(studentId);
  }

  @Get('class/:examId/:classId')
  @RequirePermissions('result:view')
  @ApiOperation({
    summary: 'Get all results for a class in an exam with statistics',
  })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Class results retrieved successfully',
  })
  async getClassResults(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
  ) {
    return this.resultsService.getClassResults(examId, classId);
  }

  @Get('top-performers/:examId/:classId')
  @RequirePermissions('result:view')
  @ApiOperation({ summary: 'Get top performers in an exam for a class' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top performers (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top performers retrieved successfully',
  })
  async getTopPerformers(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
    @Query('limit') limit?: number,
  ) {
    return this.resultsService.getTopPerformers(examId, classId, limit || 10);
  }

  @Get('analysis/:examId/:classId/:subjectId')
  @RequirePermissions('result:view')
  @ApiOperation({ summary: 'Get subject-wise analysis for an exam and class' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({
    status: 200,
    description: 'Subject analysis retrieved successfully',
  })
  async getSubjectWiseAnalysis(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.resultsService.getSubjectWiseAnalysis(
      examId,
      classId,
      subjectId,
    );
  }

  // ————————————————————————————————————————————————————
  // Generic :id route MUST come AFTER all specific routes
  // ————————————————————————————————————————————————————

  @Get(':id')
  @RequirePermissions('result:view')
  @ApiOperation({ summary: 'Get a result by ID' })
  @ApiParam({ name: 'id', description: 'Result ID' })
  @ApiResponse({ status: 200, description: 'Result retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.findById(id, schoolId);
  }

  @Patch(':id')
  @RequirePermissions('result:update')
  @ApiOperation({ summary: 'Update a result' })
  @ApiParam({ name: 'id', description: 'Result ID' })
  @ApiResponse({ status: 200, description: 'Result updated successfully' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  async update(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.update(id, updateResultDto, schoolId);
  }

  @Delete(':id')
  @RequirePermissions('result:delete')
  @ApiOperation({ summary: 'Delete a result' })
  @ApiParam({ name: 'id', description: 'Result ID' })
  @ApiResponse({ status: 200, description: 'Result deleted successfully' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.delete(id, schoolId);
  }

  @Post('calculate-grades/:id')
  @RequirePermissions('result:update')
  @ApiOperation({ summary: 'Calculate grades for a result' })
  @ApiParam({ name: 'id', description: 'Result ID' })
  @ApiResponse({ status: 200, description: 'Grades calculated successfully' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  async calculateGrades(@Param('id') id: string) {
    return this.resultsService.calculateGrades(id);
  }

  @Post('calculate-ranks/:examId/:classId')
  @RequirePermissions('result:update')
  @ApiOperation({ summary: 'Calculate ranks for an exam and class' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Ranks calculated successfully' })
  async calculateRanks(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
  ) {
    return this.resultsService.calculateRanks(examId, classId);
  }

  @Post('publish/:examId/:classId')
  @RequirePermissions('result:publish')
  @ApiOperation({ summary: 'Publish results for an exam and class' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Results published successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async publishResults(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
  ) {
    return this.resultsService.publishResults(examId, classId);
  }

  @Post('unpublish/:examId/:classId')
  @RequirePermissions('result:publish')
  @ApiOperation({ summary: 'Unpublish results for an exam and class' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, description: 'Results unpublished successfully' })
  async unpublishResults(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
  ) {
    return this.resultsService.unpublishResults(examId, classId);
  }
}

