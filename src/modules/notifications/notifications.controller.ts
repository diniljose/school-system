import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions('notification:create')
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sender or target not found' })
  async create(
    @Body() createDto: CreateNotificationDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('id') senderId: string,
    @Req() req: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };
    return this.notificationsService.create(createDto, schoolId, senderId, tenantContext);
  }

  @Post(':id/send')
  @RequirePermissions('notification:create')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async send(@Param('id') id: string, @Body() sendDto: SendNotificationDto) {
    return this.notificationsService.send(id, sendDto);
  }

  @Put(':id/schedule')
  @RequirePermissions('notification:create')
  @ApiOperation({ summary: 'Schedule a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification scheduled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async schedule(
    @Param('id') id: string,
    @Body('scheduledFor') scheduledFor: string,
  ) {
    return this.notificationsService.schedule(id, scheduledFor);
  }

  @Put(':id/cancel')
  @RequirePermissions('notification:create')
  @ApiOperation({ summary: 'Cancel a scheduled notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async cancel(@Param('id') id: string) {
    return this.notificationsService.cancel(id);
  }

  @Get()
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: 'Get all notifications for school' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() filters: QueryNotificationDto,
    @Req() req: Request,
  ) {
    const tenantContext = {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    };
    const { page, limit, ...queryFilters } = filters;
    return this.notificationsService.findAll(schoolId, queryFilters, {
      page,
      limit,
    }, tenantContext);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({
    status: 200,
    description: 'User notifications retrieved successfully',
  })
  async findByRecipient(
    @CurrentUser('id') userId: string,
    @Query() filters: QueryNotificationDto,
  ) {
    const { page, limit, ...queryFilters } = filters;
    return this.notificationsService.findByRecipient(userId, queryFilters, {
      page,
      limit,
    });
  }

  @Get('my/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get(':id')
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('my/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get(':id/delivery-stats')
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: 'Get delivery statistics for a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getDeliveryStats(@Param('id') id: string) {
    return this.notificationsService.getDeliveryStats(id);
  }

  @Delete(':id')
  @RequirePermissions('notification:delete')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }
}

