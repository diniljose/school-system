import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { ApplyFineDto } from './dto/apply-fine.dto';
import { GenerateFeesDto } from './dto/generate-fees.dto';
import { QueryFeeDto } from './dto/query-fee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post()
  @RequirePermissions('fee:create')
  @ApiOperation({ summary: 'Create a new fee' })
  @ApiResponse({ status: 201, description: 'Fee created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'Fee already exists for this month',
  })
  async create(
    @Body() createFeeDto: CreateFeeDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.create(createFeeDto, schoolId);
  }

  @Post('generate')
  @RequirePermissions('fee:create')
  @ApiOperation({ summary: 'Generate monthly fees for a class' })
  @ApiResponse({
    status: 201,
    description: 'Fees generated successfully for all students in the class',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async generateFees(
    @Body() generateFeesDto: GenerateFeesDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.generateMonthlyFees(generateFeesDto, schoolId);
  }

  @Get()
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get all fees with filters and pagination' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'partial', 'paid', 'overdue', 'waived'],
  })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Fees retrieved successfully' })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryFeeDto,
  ) {
    return this.feesService.findAll(schoolId, query);
  }

  @Get('pending')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get all pending fees' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Pending fees retrieved successfully',
  })
  async getPendingFees(
    @CurrentUser('school') schoolId: string,
    @Query() query: QueryFeeDto,
  ) {
    return this.feesService.getPendingFees(schoolId, query);
  }

  @Get('overdue')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get all overdue fees' })
  @ApiResponse({
    status: 200,
    description: 'Overdue fees retrieved successfully',
  })
  async getOverdueFees(@CurrentUser('school') schoolId: string) {
    return this.feesService.getOverdueFees(schoolId);
  }

  @Get('defaulters')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get list of defaulters with pending payments' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Defaulters list retrieved successfully',
  })
  async getDefaulters(
    @CurrentUser('school') schoolId: string,
    @Query('classId') classId?: string,
  ) {
    return this.feesService.getDefaulters(schoolId, classId);
  }

  @Get('statistics')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get fee statistics for school' })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(
    @CurrentUser('school') schoolId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.feesService.getFeeStatistics(schoolId, month, year);
  }

  @Get('collection-report')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get collection report for a date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Collection report retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async getCollectionReport(
    @CurrentUser('school') schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.feesService.getCollectionReport(
      schoolId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('student/:studentId')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get all fees for a student in an academic year' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Student fees retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findByStudent(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.feesService.findByStudent(studentId, academicYearId);
  }

  @Get('student/:studentId/statement')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get complete fee statement for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Fee statement retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentStatement(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.feesService.getStudentFeeStatement(studentId, academicYearId);
  }

  @Get('student/:studentId/payment-history')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get payment history for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(@Param('studentId') studentId: string) {
    return this.feesService.getPaymentHistory(studentId);
  }

  @Get(':id')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Get a fee by ID' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiResponse({ status: 200, description: 'Fee retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.findById(id, schoolId);
  }

  @Get(':id/receipt')
  @RequirePermissions('fee:view')
  @ApiOperation({ summary: 'Generate receipt for a fee payment' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiQuery({ name: 'receiptNumber', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Receipt generated successfully' })
  @ApiResponse({ status: 404, description: 'Fee or payment not found' })
  async generateReceipt(
    @Param('id') id: string,
    @Query('receiptNumber') receiptNumber: string,
    @CurrentUser('school') schoolId: string,
  ) {
    const fee = await this.feesService.findById(id, schoolId);
    const payment = fee.payments.find((p) => p.receiptNumber === receiptNumber);

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      fee,
      payment,
      receiptNumber,
    };
  }

  @Patch(':id')
  @RequirePermissions('fee:update')
  @ApiOperation({ summary: 'Update a fee' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiResponse({ status: 200, description: 'Fee updated successfully' })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot update fee with existing payments',
  })
  async update(
    @Param('id') id: string,
    @Body() updateFeeDto: UpdateFeeDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.update(id, updateFeeDto, schoolId);
  }

  @Post(':id/payment')
  @RequirePermissions('fee:update')
  @ApiOperation({ summary: 'Record a payment for a fee' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment recorded successfully with receipt number',
  })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  @ApiResponse({ status: 400, description: 'Payment amount exceeds balance' })
  async recordPayment(
    @Param('id') id: string,
    @Body() paymentDto: RecordPaymentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feesService.recordPayment(id, paymentDto, userId);
  }

  @Post(':id/discount')
  @RequirePermissions('fee:update')
  @ApiOperation({ summary: 'Apply discount to a fee' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiResponse({ status: 200, description: 'Discount applied successfully' })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot apply discount to fully paid fee',
  })
  async applyDiscount(
    @Param('id') id: string,
    @Body() discountDto: ApplyDiscountDto,
  ) {
    return this.feesService.applyDiscount(id, discountDto);
  }

  @Post(':id/fine')
  @RequirePermissions('fee:update')
  @ApiOperation({ summary: 'Apply fine to a fee' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiResponse({ status: 200, description: 'Fine applied successfully' })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot apply fine to fully paid fee',
  })
  async applyFine(@Param('id') id: string, @Body() fineDto: ApplyFineDto) {
    return this.feesService.applyFine(id, fineDto);
  }

  @Post(':id/waive')
  @RequirePermissions('fee:update')
  @ApiOperation({ summary: 'Waive a fee' })
  @ApiParam({ name: 'id', description: 'Fee ID' })
  @ApiResponse({ status: 200, description: 'Fee waived successfully' })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  @ApiResponse({ status: 400, description: 'Cannot waive fully paid fee' })
  async waiveFee(@Param('id') id: string, @Body('reason') reason: string) {
    return this.feesService.waiveFee(id, reason);
  }
}

