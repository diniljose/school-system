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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SchoolAccessGuard } from '../../common/guards/school-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard, SchoolAccessGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @RequirePermissions('subscription:create')
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  @RequirePermissions('subscription:view')
  @ApiOperation({
    summary: 'Get all subscriptions with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
  })
  findAll(@Query() query: any) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('subscription:view')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('subscription:update')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Delete(':id')
  @RequirePermissions('subscription:delete')
  @ApiOperation({ summary: 'Delete subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }

  @Post(':schoolId/change-plan')
  @RequirePermissions('subscription:update')
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan changed successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  changePlan(
    @Param('schoolId') schoolId: string,
    @Body() changePlanDto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(schoolId, changePlanDto);
  }

  @Post(':id/payment')
  @RequirePermissions('subscription:update')
  @ApiOperation({ summary: 'Record a payment' })
  @ApiResponse({ status: 200, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  recordPayment(
    @Param('id') id: string,
    @Body() recordPaymentDto: RecordPaymentDto,
  ) {
    return this.subscriptionsService.recordPayment(id, recordPaymentDto);
  }

  @Get(':id/usage')
  @RequirePermissions('subscription:view')
  @ApiOperation({ summary: 'Get subscription usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  getUsageStats(@Param('id') id: string) {
    return this.subscriptionsService.getUsageStats(id);
  }
}

