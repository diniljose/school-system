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
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolAccessGuard } from '../../common/guards/school-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolAccessGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
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
  @Roles(UserRole.PLATFORM_ADMIN)
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
  @Roles(UserRole.PLATFORM_ADMIN)
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
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL)
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
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
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
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL)
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

