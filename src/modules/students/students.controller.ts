import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';
import { StudentStatus } from '../../common/enums/student-status.enum';
import { AssignClassDto } from './dto/assign-class.dto';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create new student' })
  async create(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.studentsService.create(createStudentDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole. PRINCIPAL,
    UserRole. VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all students with filters' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name:  'section', required: false })
  @ApiQuery({ name:  'status', required: false, enum: StudentStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name:  'limit', required: false })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('classId') classId?: string,
    @Query('section') section?: string,
    @Query('status') status?: StudentStatus,
    @Query('academicYearId') academicYearId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.studentsService.findAll(schoolId, {
      classId,
      section,
      status,
      academicYearId,
      search,
      page,
      limit,
    });
  }

  @Get('stats')
  @Roles(UserRole.SCHOOL_ADMIN,