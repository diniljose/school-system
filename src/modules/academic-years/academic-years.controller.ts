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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AddTermDto } from './dto/add-term.dto';
import { AddHolidayDto } from './dto/add-holiday.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolAccessGuard } from '../../common/guards/school-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('academic-years')
@ApiBearerAuth()
@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard)
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new academic year' })
  @ApiResponse({
    status: 201,
    description: 'Academic year created successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'Academic year already exists' })
  create(@Body() createAcademicYearDto: CreateAcademicYearDto) {
    return this.academicYearsService.create(createAcademicYearDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all academic years with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic years retrieved successfully',
  })
  findAll(@Query() query: any) {
    return this.academicYearsService.findAll(query);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current academic year for a school' })
  @ApiResponse({
    status: 200,
    description: 'Current academic year retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'No current academic year found' })
  getCurrentYear(@Query('schoolId') schoolId: string) {
    return this.academicYearsService.getCurrentYear(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get academic year by ID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  findOne(@Param('id') id: string) {
    return this.academicYearsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update academic year' })
  @ApiResponse({
    status: 200,
    description: 'Academic year updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  @ApiResponse({
    status: 409,
    description: 'Academic year name already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateAcademicYearDto: UpdateAcademicYearDto,
  ) {
    return this.academicYearsService.update(id, updateAcademicYearDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete academic year' })
  @ApiResponse({
    status: 200,
    description: 'Academic year deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  remove(@Param('id') id: string) {
    return this.academicYearsService.remove(id);
  }

  @Post(':id/set-current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Set academic year as current' })
  @ApiResponse({
    status: 200,
    description: 'Academic year set as current successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  setCurrentYear(@Param('id') id: string, @Body('schoolId') schoolId: string) {
    return this.academicYearsService.setCurrentYear(schoolId, id);
  }

  @Post(':id/terms')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add a term to academic year' })
  @ApiResponse({ status: 201, description: 'Term added successfully' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  @ApiResponse({ status: 409, description: 'Term already exists' })
  addTerm(@Param('id') id: string, @Body() addTermDto: AddTermDto) {
    return this.academicYearsService.addTerm(id, addTermDto);
  }

  @Patch(':id/terms/:termId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a term' })
  @ApiResponse({ status: 200, description: 'Term updated successfully' })
  @ApiResponse({ status: 404, description: 'Academic year or term not found' })
  updateTerm(
    @Param('id') id: string,
    @Param('termId') termId: string,
    @Body() updateTermDto: AddTermDto,
  ) {
    return this.academicYearsService.updateTerm(id, termId, updateTermDto);
  }

  @Delete(':id/terms/:termId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove a term' })
  @ApiResponse({ status: 200, description: 'Term removed successfully' })
  @ApiResponse({ status: 404, description: 'Academic year or term not found' })
  removeTerm(@Param('id') id: string, @Param('termId') termId: string) {
    return this.academicYearsService.removeTerm(id, termId);
  }

  @Post(':id/holidays')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add a holiday to academic year' })
  @ApiResponse({ status: 201, description: 'Holiday added successfully' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  addHoliday(@Param('id') id: string, @Body() addHolidayDto: AddHolidayDto) {
    return this.academicYearsService.addHoliday(id, addHolidayDto);
  }

  @Patch(':id/holidays/:holidayId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a holiday' })
  @ApiResponse({ status: 200, description: 'Holiday updated successfully' })
  @ApiResponse({
    status: 404,
    description: 'Academic year or holiday not found',
  })
  updateHoliday(
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
    @Body() updateHolidayDto: AddHolidayDto,
  ) {
    return this.academicYearsService.updateHoliday(
      id,
      holidayId,
      updateHolidayDto,
    );
  }

  @Delete(':id/holidays/:holidayId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Remove a holiday' })
  @ApiResponse({ status: 200, description: 'Holiday removed successfully' })
  @ApiResponse({
    status: 404,
    description: 'Academic year or holiday not found',
  })
  removeHoliday(
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
  ) {
    return this.academicYearsService.removeHoliday(id, holidayId);
  }
}
