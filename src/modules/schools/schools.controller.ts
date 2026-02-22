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
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { QuerySchoolDto } from './dto/query-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateFeaturesDto } from './dto/update-features.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SchoolAccessGuard } from '../../common/guards/school-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('schools')
@ApiBearerAuth()
@Controller('schools')
@UseGuards(JwtAuthGuard, PermissionsGuard, SchoolAccessGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @RequirePermissions('school:create')
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponse({ status: 201, description: 'School created successfully' })
  @ApiResponse({
    status: 409,
    description: 'School code or slug already exists',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  @RequirePermissions('school:view')
  @ApiOperation({ summary: 'Get all schools with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Schools retrieved successfully' })
  findAll(@Query() query: QuerySchoolDto) {
    return this.schoolsService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions('school:view')
  @ApiOperation({ summary: 'Get school statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getStatistics() {
    return this.schoolsService.getStatistics();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW ENDPOINTS (Super Admin only)
  // ════════════════════════════════════════════════════════════════════════════

  @Get('pending-approval')
  @RequirePermissions('school:view')
  @ApiOperation({ summary: 'Get schools pending approval' })
  @ApiResponse({
    status: 200,
    description: 'Pending schools retrieved successfully',
  })
  getPendingApproval(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.schoolsService.findPendingApproval(page, limit);
  }

  @Post(':id/approve')
  @RequirePermissions('school:update')
  @ApiOperation({ summary: 'Approve a pending school registration' })
  @ApiResponse({ status: 200, description: 'School approved successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 400, description: 'School cannot be approved' })
  async approveSchool(@Param('id') id: string, @Request() req) {
    return this.schoolsService.approveSchool(id, req.user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('school:update')
  @ApiOperation({ summary: 'Reject a pending school registration' })
  @ApiResponse({ status: 200, description: 'School rejected successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 400, description: 'School cannot be rejected' })
  async rejectSchool(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.schoolsService.rejectSchool(id, req.user.id, reason);
  }

  @Post(':id/suspend')
  @RequirePermissions('school:update')
  @ApiOperation({ summary: 'Suspend an active school' })
  @ApiResponse({ status: 200, description: 'School suspended successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 400, description: 'School cannot be suspended' })
  async suspendSchool(@Param('id') id: string, @Body('reason') reason: string) {
    return this.schoolsService.suspendSchool(id, reason);
  }

  @Post(':id/reactivate')
  @RequirePermissions('school:update')
  @ApiOperation({ summary: 'Reactivate a suspended school' })
  @ApiResponse({ status: 200, description: 'School reactivated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 400, description: 'School cannot be reactivated' })
  async reactivateSchool(@Param('id') id: string) {
    return this.schoolsService.reactivateSchool(id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STANDARD CRUD ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  @Get(':id')
  @RequirePermissions('school:view')
  @ApiOperation({ summary: 'Get school by ID' })
  @ApiResponse({ status: 200, description: 'School retrieved successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  findOne(@Param('id') id: string) {
    return this.schoolsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('school:update')
  @ApiOperation({ summary: 'Update school' })
  @ApiResponse({ status: 200, description: 'School updated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({
    status: 409,
    description: 'School code or slug already exists',
  })
  update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  @RequirePermissions('school:delete')
  @ApiOperation({ summary: 'Delete school' })
  @ApiResponse({ status: 200, description: 'School deleted successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(id);
  }

  @Patch(':id/settings')
  @RequirePermissions('school:update')
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
  @RequirePermissions('school:update')
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
  @RequirePermissions('school:update')
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

