import {
  Controller,
  Get,
  Post,
  Body,
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
import { PromotionsService } from './promotions.service';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { RetainStudentDto } from './dto/retain-student.dto';
import { BulkPromoteDto } from './dto/bulk-promote.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('check-eligibility/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Check promotion eligibility for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'fromAcademicYear', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Eligibility checked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or academic year not found',
  })
  async checkEligibility(
    @Param('studentId') studentId: string,
    @Query('fromAcademicYear') fromAcademicYear: string,
  ) {
    return this.promotionsService.checkEligibility(studentId, fromAcademicYear);
  }

  @Post('promote')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Promote a student to next class' })
  @ApiResponse({ status: 201, description: 'Student promoted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'Student already promoted for this academic year',
  })
  async promoteStudent(
    @Body() promoteStudentDto: PromoteStudentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.promotionsService.promoteStudent(promoteStudentDto, userId);
  }

  @Post('retain')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Retain a student in the same class' })
  @ApiResponse({ status: 201, description: 'Student retained successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async retainStudent(
    @Body() retainStudentDto: RetainStudentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.promotionsService.retainStudent(retainStudentDto, userId);
  }

  @Post('bulk-promote')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Bulk promote students from a class section' })
  @ApiResponse({
    status: 201,
    description: 'Bulk promotion completed with results',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'Class or academic year not found',
  })
  async bulkPromote(
    @Body() bulkPromoteDto: BulkPromoteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.promotionsService.bulkPromote(bulkPromoteDto, userId);
  }

  @Post('bulk-check-eligibility')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'Check promotion eligibility for all students in a class section',
  })
  @ApiQuery({ name: 'classId', required: true, type: String })
  @ApiQuery({ name: 'section', required: true, type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Eligibility checked for all students',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found or no students found',
  })
  async bulkCheckEligibility(
    @Query('classId') classId: string,
    @Query('section') section: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.promotionsService.bulkCheckEligibility(
      classId,
      section,
      academicYearId,
    );
  }

  @Get('history/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get promotion history for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Promotion history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getPromotionHistory(@Param('studentId') studentId: string) {
    return this.promotionsService.getPromotionHistory(studentId);
  }

  @Get('pending')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get all pending promotions for a school' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Pending promotions retrieved successfully',
  })
  async getPendingPromotions(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.promotionsService.getPendingPromotions(
      schoolId,
      academicYearId,
    );
  }

  @Get('statistics')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({
    summary: 'Get promotion statistics for an academic year',
  })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Promotion statistics retrieved successfully',
  })
  async getPromotionStatistics(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.promotionsService.getPromotionStatistics(
      schoolId,
      academicYearId,
    );
  }

  @Delete(':id/undo')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({
    summary: 'Undo a promotion and revert student to previous class',
  })
  @ApiParam({ name: 'id', description: 'Promotion ID' })
  @ApiResponse({ status: 200, description: 'Promotion undone successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({
    status: 400,
    description: 'Can only undo promoted students',
  })
  async undoPromotion(@Param('id') id: string) {
    return this.promotionsService.undoPromotion(id);
  }
}
