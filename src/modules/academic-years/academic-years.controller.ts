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
  Request,
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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SchoolAccessGuard } from '../../common/guards/school-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('academic-years')
@ApiBearerAuth()
@Controller('academic-years')
@UseGuards(JwtAuthGuard, PermissionsGuard, SchoolAccessGuard)
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Post()
  @RequirePermissions('academic-year:create')
  @ApiOperation({ summary: 'Create a new academic year' })
  @ApiResponse({
    status: 201,
    description: 'Academic year created successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'Academic year already exists' })
  create(@Body() createAcademicYearDto: CreateAcademicYearDto, @Request() req) {
    // Pass user context for tenant-aware operations
    return this.academicYearsService.create(createAcademicYearDto, {
      schoolId: req.user.school,
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all academic years with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic years retrieved successfully',
  })
  findAll(@Query() query: any, @Request() req) {
    // Pass user context for tenant-aware operations
    return this.academicYearsService.findAll(query, {
      schoolId: req.user.school,
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current academic year for a school' })
  @ApiResponse({
    status: 200,
    description: 'Current academic year retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'No current academic year found' })
  getCurrentYear(@Query('schoolId') schoolId: string, @Request() req) {
    const effectiveSchoolId = schoolId || req.user.school;
    return this.academicYearsService.getCurrentYear(effectiveSchoolId, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get academic year by ID' })
  @ApiResponse({
    status: 200,
    description: 'Academic year retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.academicYearsService.findById(id, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Patch(':id')
  @RequirePermissions('academic-year:update')
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
    @Request() req,
  ) {
    return this.academicYearsService.update(id, updateAcademicYearDto, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Delete(':id')
  @RequirePermissions('academic-year:delete')
  @ApiOperation({ summary: 'Delete academic year' })
  @ApiResponse({
    status: 200,
    description: 'Academic year deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.academicYearsService.remove(id, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Post(':id/set-current')
  @RequirePermissions('academic-year:update')
  @ApiOperation({ summary: 'Set academic year as current' })
  @ApiResponse({
    status: 200,
    description: 'Academic year set as current successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  setCurrentYear(@Param('id') id: string, @Request() req) {
    return this.academicYearsService.setCurrentYear(req.user.school, id, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Post(':id/terms')
  @RequirePermissions('academic-year:update')
  @ApiOperation({ summary: 'Add a term to academic year' })
  @ApiResponse({ status: 201, description: 'Term added successfully' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  @ApiResponse({ status: 409, description: 'Term already exists' })
  addTerm(@Param('id') id: string, @Body() addTermDto: AddTermDto, @Request() req) {
    return this.academicYearsService.addTerm(id, addTermDto, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Patch(':id/terms/:termId')
  @RequirePermissions('academic-year:update')
  @ApiOperation({ summary: 'Update a term' })
  @ApiResponse({ status: 200, description: 'Term updated successfully' })
  @ApiResponse({ status: 404, description: 'Academic year or term not found' })
  updateTerm(
    @Param('id') id: string,
    @Param('termId') termId: string,
    @Body() updateTermDto: AddTermDto,
    @Request() req,
  ) {
    return this.academicYearsService.updateTerm(id, termId, updateTermDto, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Delete(':id/terms/:termId')
  @RequirePermissions('academic-year:update')
  @ApiOperation({ summary: 'Remove a term' })
  @ApiResponse({ status: 200, description: 'Term removed successfully' })
  @ApiResponse({ status: 404, description: 'Academic year or term not found' })
  removeTerm(@Param('id') id: string, @Param('termId') termId: string, @Request() req) {
    return this.academicYearsService.removeTerm(id, termId, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Post(':id/holidays')
  @RequirePermissions('academic-year:update')
  @ApiOperation({ summary: 'Add a holiday to academic year' })
  @ApiResponse({ status: 201, description: 'Holiday added successfully' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  addHoliday(@Param('id') id: string, @Body() addHolidayDto: AddHolidayDto, @Request() req) {
    return this.academicYearsService.addHoliday(id, addHolidayDto, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Patch(':id/holidays/:holidayId')
  @RequirePermissions('academic-year:update')
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
    @Request() req,
  ) {
    return this.academicYearsService.updateHoliday(id, holidayId, updateHolidayDto, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }

  @Delete(':id/holidays/:holidayId')
  @RequirePermissions('academic-year:update')
  @ApiOperation({ summary: 'Remove a holiday' })
  @ApiResponse({ status: 200, description: 'Holiday removed successfully' })
  @ApiResponse({
    status: 404,
    description: 'Academic year or holiday not found',
  })
  removeHoliday(
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
    @Request() req,
  ) {
    return this.academicYearsService.removeHoliday(id, holidayId, {
      schoolCode: req.user.schoolCode,
      isTenantUser: req.user.isTenantUser,
    });
  }
}

