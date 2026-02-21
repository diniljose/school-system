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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequirePermissions('event:create')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.create(createEventDto, schoolId, userId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get()
  @RequirePermissions('event:view')
  @ApiOperation({ summary: 'Get all events with filters and pagination' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Events retrieved' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryEventDto,
    @Req() req: Request,
  ) {
    return this.eventsService.findAll(schoolId, query, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get('upcoming')
  @RequirePermissions('event:view')
  @ApiOperation({ summary: 'Get upcoming events (for all users)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Upcoming events retrieved' })
  async getUpcoming(
    @CurrentUser('school') schoolId: string,
    @Query('limit') limit: number,
    @Req() req: Request,
  ) {
    return this.eventsService.getUpcomingEvents(
      schoolId,
      limit || 10,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get('today')
  @RequirePermissions('event:view')
  @ApiOperation({ summary: "Get today's events" })
  @ApiResponse({ status: 200, description: "Today's events retrieved" })
  async getToday(
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.getTodayEvents(schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get('calendar')
  @RequirePermissions('event:view')
  @ApiOperation({ summary: 'Get events for calendar view (month-wise)' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved' })
  async getCalendar(
    @CurrentUser('school') schoolId: string,
    @Query('year') year: number,
    @Query('month') month: number,
    @Req() req: Request,
  ) {
    return this.eventsService.getCalendarEvents(
      schoolId,
      Number(year),
      Number(month),
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get('stats')
  @RequirePermissions('event:view')
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiResponse({ status: 200, description: 'Event statistics retrieved' })
  async getStats(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.getEventStats(
      schoolId,
      academicYearId,
      {
        schoolCode: (req as any).user?.schoolCode,
        isTenantUser: (req as any).user?.isTenantUser,
      },
    );
  }

  @Get(':id')
  @RequirePermissions('event:view')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.findById(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id')
  @RequirePermissions('event:update')
  @ApiOperation({ summary: 'Update an event' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.update(id, updateEventDto, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id')
  @RequirePermissions('event:delete')
  @ApiOperation({ summary: 'Delete an event (soft delete)' })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.remove(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id/cancel')
  @RequirePermissions('event:update')
  @ApiOperation({ summary: 'Cancel an event' })
  @ApiResponse({ status: 200, description: 'Event cancelled' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
    @Req() req: Request,
  ) {
    return this.eventsService.cancelEvent(id, schoolId, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }
}
