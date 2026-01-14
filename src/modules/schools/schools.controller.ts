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
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { QuerySchoolDto } from './dto/query-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateFeaturesDto } from './dto/update-features.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolAccessGuard } from '../../common/guards/school-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('schools')
@ApiBearerAuth()
@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponse({ status: 201, description: 'School created successfully' })
  @ApiResponse({ status: 409, description: 'School code or slug already exists' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schools with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Schools retrieved successfully' })
  findAll(@Query() query: QuerySchoolDto) {
    return this.schoolsService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get school statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics() {
    return this.schoolsService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get school by ID' })
  @ApiResponse({ status: 200, description: 'School retrieved successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  findOne(@Param('id') id: string) {
    return this.schoolsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update school' })
  @ApiResponse({ status: 200, description: 'School updated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'School code or slug already exists' })
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete school' })
  @ApiResponse({ status: 200, description: 'School deleted successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(id);
  }

  @Patch(':id/settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update school settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  updateSettings(
    @Param('id') id: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.schoolsService.updateSettings(id, updateSettingsDto);
  }

  @Patch(':id/features')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update school features' })
  @ApiResponse({ status: 200, description: 'Features updated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  updateFeatures(
    @Param('id') id: string,
    @Body() updateFeaturesDto: UpdateFeaturesDto,
  ) {
    return this.schoolsService.updateFeatures(id, updateFeaturesDto);
  }

  @Patch(':id/features/:feature')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Toggle a single feature' })
  @ApiResponse({ status: 200, description: 'Feature toggled successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 400, description: 'Invalid feature' })
  toggleFeature(
    @Param('id') id: string,
    @Param('feature') feature: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.schoolsService.toggleFeature(id, feature, enabled);
  }
}
