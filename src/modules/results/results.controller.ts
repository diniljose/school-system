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
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { BulkResultDto } from './dto/bulk-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create result' })
  async create(
    @Body() createResultDto: CreateResultDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.resultsService.create(createResultDto, schoolId, userId);
  }

  @Post('bulk')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create results in bulk' })
  async bulkCreate(
    @Body() bulkResultDto: BulkResultDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.resultsService.bulkCreate(bulkResultDto, schoolId, userId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get all results' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'examId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'isPublished', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('examId') examId?: string,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('isPublished') isPublished?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resultsService.findAll(schoolId, {
      academicYearId,
      examId,
      classId,
      studentId,
      isPublished,
      page,
      limit,
    });
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get results by student' })
  async findByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('examId') examId?: string,
  ) {
    return this.resultsService.findByStudent(studentId, schoolId, {
      academicYearId,
      examId,
    });
  }

  @Get('report-card/:studentId/:examId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get student report card' })
  async getStudentReportCard(
    @Param('studentId') studentId: string,
    @Param('examId') examId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.getStudentReportCard(
      studentId,
      examId,
      schoolId,
    );
  }

  @Get('class/:examId/:classId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get class results' })
  async getClassResults(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.getClassResults(examId, classId, schoolId);
  }

  @Get('top-performers/:examId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get top performers' })
  @ApiQuery({ name: 'limit', required: false })
  async getTopPerformers(
    @Param('examId') examId: string,
    @CurrentUser('school') schoolId: string,
    @Query('limit') limit?: number,
  ) {
    return this.resultsService.getTopPerformers(examId, schoolId, limit);
  }

  @Get('analysis/:examId/:classId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get subject-wise analysis' })
  async getSubjectWiseAnalysis(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.getSubjectWiseAnalysis(
      examId,
      classId,
      schoolId,
    );
  }

  @Get('trend/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get performance trend' })
  async getPerformanceTrend(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.getPerformanceTrend(studentId, schoolId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get result by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update result' })
  async update(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.update(id, updateResultDto, schoolId);
  }

  @Patch('calculate-ranks/:examId/:classId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Calculate ranks' })
  async calculateRanks(
    @Param('examId') examId: string,
    @Param('classId') classId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.calculateRanks(examId, classId, schoolId);
  }

  @Patch('publish/:examId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Publish results' })
  async publishResults(
    @Param('examId') examId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.publishResults(examId, schoolId);
  }

  @Patch('unpublish/:examId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Unpublish results' })
  async unpublishResults(
    @Param('examId') examId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.unpublishResults(examId, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete result' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.resultsService.delete(id, schoolId);
  }
}
