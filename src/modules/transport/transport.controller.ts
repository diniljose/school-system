import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TransportService } from './transport.service';
import {
  CreateTransportDto,
  UpdateTransportDto,
  QueryTransportDto,
  UpdateLocationDto,
  AssignStudentsDto,
} from './dto';
import { VehicleStatus } from '../../database/schemas/transport.schema';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Transport')
@ApiBearerAuth()
@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // ————————————————————————————————————————————————————
  // CRUD
  // ————————————————————————————————————————————————————

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:create')
  @ApiOperation({ summary: 'Create a new transport vehicle/route' })
  @ApiResponse({ status: 201, description: 'Vehicle/route created successfully' })
  async create(@Req() req: any, @Body() dto: CreateTransportDto) {
    return this.transportService.create(req.schoolId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles/routes for the school' })
  async findAll(@Req() req: any, @Query() query: QueryTransportDto) {
    return this.transportService.findAll(req.schoolId, query);
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:view')
  @ApiOperation({ summary: 'Get transport statistics for the school' })
  async getStats(@Req() req: any) {
    return this.transportService.getStats(req.schoolId);
  }

  @Get('locations')
  @ApiOperation({ summary: 'Get all active vehicle locations (fleet overview)' })
  async getAllLocations(@Req() req: any) {
    return this.transportService.getAllLocations(req.schoolId);
  }

  @Get('maintenance/upcoming')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:view')
  @ApiOperation({ summary: 'Get vehicles with upcoming maintenance due (next 30 days)' })
  async getUpcomingMaintenance(@Req() req: any) {
    return this.transportService.getUpcomingMaintenance(req.schoolId);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get transport assignment for a specific student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  async getStudentTransport(
    @Req() req: any,
    @Param('studentId') studentId: string,
  ) {
    return this.transportService.getStudentTransport(req.schoolId, studentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific vehicle/route by ID' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async findById(@Req() req: any, @Param('id') id: string) {
    return this.transportService.findById(req.schoolId, id);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:update')
  @ApiOperation({ summary: 'Update a vehicle/route' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTransportDto,
  ) {
    return this.transportService.update(req.schoolId, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:update')
  @ApiOperation({ summary: 'Update vehicle status' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: VehicleStatus,
  ) {
    return this.transportService.updateStatus(req.schoolId, id, status);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:delete')
  @ApiOperation({ summary: 'Delete a vehicle/route' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.transportService.remove(req.schoolId, id);
    return { message: 'Vehicle/route deleted successfully' };
  }

  // ————————————————————————————————————————————————————
  // GPS Tracking
  // ————————————————————————————————————————————————————

  @Patch(':id/location')
  @ApiOperation({ summary: 'Update vehicle GPS location (called by GPS device/driver app)' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async updateLocation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.transportService.updateLocation(req.schoolId, id, dto);
  }

  @Get(':id/location')
  @ApiOperation({ summary: 'Get current location of a vehicle' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async getLocation(@Req() req: any, @Param('id') id: string) {
    return this.transportService.getLocation(req.schoolId, id);
  }

  @Get(':id/tracking-history')
  @ApiOperation({ summary: 'Get GPS tracking history for route replay' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async getTrackingHistory(@Req() req: any, @Param('id') id: string) {
    return this.transportService.getTrackingHistory(req.schoolId, id);
  }

  // ————————————————————————————————————————————————————
  // Student Assignment
  // ————————————————————————————————————————————————————

  @Post(':id/students')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:update')
  @ApiOperation({ summary: 'Assign students to a vehicle/route' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async assignStudents(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignStudentsDto,
  ) {
    return this.transportService.assignStudents(req.schoolId, id, dto);
  }

  @Delete(':id/students/:studentId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:update')
  @ApiOperation({ summary: 'Remove a student from a vehicle/route' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  async removeStudent(
    @Req() req: any,
    @Param('id') vehicleId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.transportService.removeStudent(req.schoolId, vehicleId, studentId);
  }

  // ————————————————————————————————————————————————————
  // Maintenance
  // ————————————————————————————————————————————————————

  @Post(':id/maintenance')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('transport:update')
  @ApiOperation({ summary: 'Add a maintenance record to a vehicle' })
  @ApiParam({ name: 'id', description: 'Transport ID' })
  async addMaintenance(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      date: Date;
      type: string;
      description: string;
      cost: number;
      vendor: string;
      nextDueDate?: Date;
    },
  ) {
    return this.transportService.addMaintenance(req.schoolId, id, body);
  }
}

