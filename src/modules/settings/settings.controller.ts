import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { GradeDto, UpdateGradeDto } from './dto/grading-system.dto';
import {
  CreateFeeTemplateDto,
  UpdateFeeTemplateDto,
} from './dto/fee-template.dto';
import { UpdateWorkingDaysDto, CalendarEventDto } from './dto/working-days.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get all school settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings(@CurrentUser('school') schoolId: string) {
    return this.settingsService.getSettings(schoolId);
  }

  @Patch()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update general settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async updateSettings(
    @CurrentUser('school') schoolId: string,
    @Body() updateDto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(schoolId, updateDto);
  }

  @Get('grading-system')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get grading system configuration' })
  @ApiResponse({
    status: 200,
    description: 'Grading system retrieved successfully',
  })
  async getGradingSystem(@CurrentUser('school') schoolId: string) {
    return this.settingsService.getGradingSystem(schoolId);
  }

  @Patch('grading-system')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update entire grading system' })
  @ApiResponse({
    status: 200,
    description: 'Grading system updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Grade ranges overlap' })
  async updateGradingSystem(
    @CurrentUser('school') schoolId: string,
    @Body() grades: GradeDto[],
  ) {
    return this.settingsService.updateGradingSystem(schoolId, grades);
  }

  @Post('grading-system/grades')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add a new grade to grading system' })
  @ApiResponse({ status: 201, description: 'Grade created successfully' })
  @ApiResponse({ status: 400, description: 'Grade already exists or overlaps' })
  async createGrade(
    @CurrentUser('school') schoolId: string,
    @Body() gradeDto: GradeDto,
  ) {
    return this.settingsService.createGrade(schoolId, gradeDto);
  }

  @Patch('grading-system/grades/:gradeId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a specific grade' })
  @ApiParam({ name: 'gradeId', description: 'Grade index' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  async updateGrade(
    @CurrentUser('school') schoolId: string,
    @Param('gradeId') gradeId: string,
    @Body() updateDto: UpdateGradeDto,
  ) {
    return this.settingsService.updateGrade(schoolId, gradeId, updateDto);
  }

  @Delete('grading-system/grades/:gradeId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete a grade from grading system' })
  @ApiParam({ name: 'gradeId', description: 'Grade index' })
  @ApiResponse({ status: 200, description: 'Grade deleted successfully' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  async deleteGrade(
    @CurrentUser('school') schoolId: string,
    @Param('gradeId') gradeId: string,
  ) {
    return this.settingsService.deleteGrade(schoolId, gradeId);
  }

  @Get('fee-templates')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get all fee templates' })
  @ApiResponse({
    status: 200,
    description: 'Fee templates retrieved successfully',
  })
  async getFeeTemplates(@CurrentUser('school') schoolId: string) {
    return this.settingsService.getFeeTemplates(schoolId);
  }

  @Post('fee-templates')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new fee template' })
  @ApiResponse({
    status: 201,
    description: 'Fee template created successfully',
  })
  async createFeeTemplate(
    @CurrentUser('school') schoolId: string,
    @Body() templateDto: CreateFeeTemplateDto,
  ) {
    return this.settingsService.createFeeTemplate(schoolId, templateDto);
  }

  @Patch('fee-templates/:templateId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update a fee template' })
  @ApiParam({ name: 'templateId', description: 'Fee template index' })
  @ApiResponse({
    status: 200,
    description: 'Fee template updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Fee template not found' })
  async updateFeeTemplate(
    @CurrentUser('school') schoolId: string,
    @Param('templateId') templateId: string,
    @Body() updateDto: UpdateFeeTemplateDto,
  ) {
    return this.settingsService.updateFeeTemplate(
      schoolId,
      templateId,
      updateDto,
    );
  }

  @Delete('fee-templates/:templateId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete a fee template' })
  @ApiParam({ name: 'templateId', description: 'Fee template index' })
  @ApiResponse({
    status: 200,
    description: 'Fee template deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Fee template not found' })
  async deleteFeeTemplate(
    @CurrentUser('school') schoolId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.settingsService.deleteFeeTemplate(schoolId, templateId);
  }

  @Get('working-days')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get working days configuration' })
  @ApiResponse({
    status: 200,
    description: 'Working days retrieved successfully',
  })
  async getWorkingDays(@CurrentUser('school') schoolId: string) {
    return this.settingsService.getWorkingDays(schoolId);
  }

  @Patch('working-days')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update working days configuration' })
  @ApiResponse({
    status: 200,
    description: 'Working days updated successfully',
  })
  async updateWorkingDays(
    @CurrentUser('school') schoolId: string,
    @Body() dto: UpdateWorkingDaysDto,
  ) {
    return this.settingsService.updateWorkingDays(schoolId, dto.workingDays);
  }

  @Get('calendar')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({
    summary: 'Get academic calendar events (placeholder)',
  })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Calendar events retrieved successfully',
  })
  async getAcademicCalendar(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.settingsService.getAcademicCalendar(schoolId, academicYearId);
  }

  @Post('calendar/events')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({
    summary: 'Add a calendar event (placeholder)',
  })
  @ApiResponse({
    status: 201,
    description: 'Calendar event created successfully',
  })
  async addCalendarEvent(
    @CurrentUser('school') schoolId: string,
    @Body() eventDto: CalendarEventDto,
  ) {
    return this.settingsService.addCalendarEvent(schoolId, eventDto);
  }

  @Patch('calendar/events/:eventId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({
    summary: 'Update a calendar event (placeholder)',
  })
  @ApiParam({ name: 'eventId', description: 'Calendar event ID' })
  @ApiResponse({
    status: 200,
    description: 'Calendar event updated successfully',
  })
  async updateCalendarEvent(
    @CurrentUser('school') schoolId: string,
    @Param('eventId') eventId: string,
    @Body() eventDto: Partial<CalendarEventDto>,
  ) {
    return this.settingsService.updateCalendarEvent(
      schoolId,
      eventId,
      eventDto,
    );
  }

  @Delete('calendar/events/:eventId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({
    summary: 'Delete a calendar event (placeholder)',
  })
  @ApiParam({ name: 'eventId', description: 'Calendar event ID' })
  @ApiResponse({
    status: 200,
    description: 'Calendar event deleted successfully',
  })
  async deleteCalendarEvent(
    @CurrentUser('school') schoolId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.settingsService.deleteCalendarEvent(schoolId, eventId);
  }
}
