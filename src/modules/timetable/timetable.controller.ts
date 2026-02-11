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
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { AddPeriodDto } from './dto/add-period.dto';
import { QueryTimetableDto } from './dto/query-timetable.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';
import { DayOfWeek } from '../../database/schemas/timetable.schema';

@ApiTags('Timetable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new timetable' })
  @ApiResponse({ status: 201, description: 'Timetable created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'Active timetable already exists for this class',
  })
  async create(
    @Body() createTimetableDto: CreateTimetableDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.timetableService.create(createTimetableDto, schoolId, userId);
  }

  @Get()
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all timetables with filters and pagination' })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'section', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Timetables retrieved successfully',
  })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryTimetableDto,
  ) {
    return this.timetableService.findAll(schoolId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get timetable by ID' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiResponse({ status: 200, description: 'Timetable retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Timetable not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.timetableService.findById(id, schoolId);
  }

  @Get('class/:classId/:section')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get timetable by class and section' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'section', description: 'Section name' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Timetable retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Timetable not found' })
  async findByClass(
    @Param('classId') classId: string,
    @Param('section') section: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.findByClass(classId, section, academicYearId);
  }

  @Patch(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update timetable' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiResponse({ status: 200, description: 'Timetable updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Timetable not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTimetableDto: UpdateTimetableDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.timetableService.update(
      id,
      updateTimetableDto,
      schoolId,
      userId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete timetable' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiResponse({ status: 200, description: 'Timetable deleted successfully' })
  @ApiResponse({ status: 404, description: 'Timetable not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.timetableService.delete(id, schoolId);
  }

  @Post(':id/period')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add a period to timetable' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiQuery({ name: 'day', required: true, enum: DayOfWeek })
  @ApiResponse({ status: 201, description: 'Period added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Timetable not found' })
  async addPeriod(
    @Param('id') id: string,
    @Query('day') day: DayOfWeek,
    @Body() addPeriodDto: AddPeriodDto,
  ) {
    return this.timetableService.addPeriod(id, day, addPeriodDto);
  }

  @Patch(':id/period/:day/:periodIndex')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a specific period in timetable' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiParam({ name: 'day', enum: DayOfWeek, description: 'Day of week' })
  @ApiParam({
    name: 'periodIndex',
    description: 'Period index in schedule array',
  })
  @ApiResponse({ status: 200, description: 'Period updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Timetable or period not found' })
  async updatePeriod(
    @Param('id') id: string,
    @Param('day') day: DayOfWeek,
    @Param('periodIndex') periodIndex: number,
    @Body() addPeriodDto: AddPeriodDto,
  ) {
    return this.timetableService.updatePeriod(
      id,
      day,
      Number(periodIndex),
      addPeriodDto,
    );
  }

  @Delete(':id/period/:day/:periodIndex')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove a period from timetable' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiParam({ name: 'day', enum: DayOfWeek, description: 'Day of week' })
  @ApiParam({
    name: 'periodIndex',
    description: 'Period index in schedule array',
  })
  @ApiResponse({ status: 200, description: 'Period removed successfully' })
  @ApiResponse({ status: 404, description: 'Timetable or period not found' })
  async removePeriod(
    @Param('id') id: string,
    @Param('day') day: DayOfWeek,
    @Param('periodIndex') periodIndex: number,
  ) {
    return this.timetableService.removePeriod(id, day, Number(periodIndex));
  }

  @Get('teacher/:teacherId')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher timetable' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Teacher timetable retrieved successfully',
  })
  async getTeacherTimetable(
    @Param('teacherId') teacherId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.getTeacherTimetable(teacherId, academicYearId);
  }

  @Get(':id/conflicts')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Check for conflicts in timetable' })
  @ApiParam({ name: 'id', description: 'Timetable ID' })
  @ApiResponse({
    status: 200,
    description: 'Conflicts checked successfully',
  })
  @ApiResponse({ status: 404, description: 'Timetable not found' })
  async checkConflicts(@Param('id') id: string) {
    return this.timetableService.checkConflicts(id);
  }

  @Get('available-teachers')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get available teachers for a specific period' })
  @ApiQuery({ name: 'day', required: true, enum: DayOfWeek })
  @ApiQuery({
    name: 'periodTime',
    required: true,
    type: String,
    description: 'Time range in format "HH:MM-HH:MM" (e.g., "09:00-09:45")',
  })
  @ApiResponse({
    status: 200,
    description: 'Available teachers retrieved successfully',
  })
  async getAvailableTeachers(
    @Query('day') day: DayOfWeek,
    @Query('periodTime') periodTime: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.timetableService.getAvailableTeachers(
      day,
      periodTime,
      schoolId,
    );
  }

  @Get('available-rooms')
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get available rooms for a specific period' })
  @ApiQuery({ name: 'day', required: true, enum: DayOfWeek })
  @ApiQuery({
    name: 'periodTime',
    required: true,
    type: String,
    description: 'Time range in format "HH:MM-HH:MM" (e.g., "09:00-09:45")',
  })
  @ApiResponse({
    status: 200,
    description: 'Available rooms retrieved successfully',
  })
  async getAvailableRooms(
    @Query('day') day: DayOfWeek,
    @Query('periodTime') periodTime: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.timetableService.getAvailableRooms(day, periodTime, schoolId);
  }
}

