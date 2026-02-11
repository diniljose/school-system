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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
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
  ) {
    return this.notificationsService.create(createDto, schoolId, senderId);
  }

  @Post(':id/send')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
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
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
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
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
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
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get all notifications for school' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() filters: QueryNotificationDto,
  ) {
    const { page, limit, ...queryFilters } = filters;
    return this.notificationsService.findAll(schoolId, queryFilters, {
      page,
      limit,
    });
  }

  @Get('my')
  @Roles(...Object.values(UserRole))
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
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get(':id')
  @Roles(...Object.values(UserRole))
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
  @Roles(...Object.values(UserRole))
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
  @Roles(...Object.values(UserRole))
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get(':id/delivery-stats')
  @Roles(
    UserRole.PRINCIPAL,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
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
  @Roles(UserRole.PRINCIPAL, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
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

