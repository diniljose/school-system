import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { ApplyFineDto } from './dto/apply-fine.dto';
import { GenerateFeesDto } from './dto/generate-fees.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';
import { FeeStatus } from '../../common/enums/student-status.enum';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create fee' })
  async create(
    @Body() createFeeDto: CreateFeeDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.create(createFeeDto, schoolId);
  }

  @Post('generate')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate monthly fees for multiple students' })
  async generateMonthlyFees(
    @Body() generateFeesDto: GenerateFeesDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.generateMonthlyFees(generateFeesDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Get all fees' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: FeeStatus })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: FeeStatus,
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.feesService.findAll(schoolId, {
      academicYearId,
      studentId,
      status,
      month,
      year,
      page,
      limit,
    });
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get fees by student' })
  async findByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('status') status?: FeeStatus,
  ) {
    return this.feesService.findByStudent(studentId, schoolId, {
      academicYearId,
      status,
    });
  }

  @Get('payment-history/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get payment history' })
  async getPaymentHistory(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.getPaymentHistory(studentId, schoolId);
  }

  @Get('pending')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get pending fees' })
  async getPendingFees(@CurrentUser('school') schoolId: string) {
    return this.feesService.getPendingFees(schoolId);
  }

  @Get('overdue')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get overdue fees' })
  async getOverdueFees(@CurrentUser('school') schoolId: string) {
    return this.feesService.getOverdueFees(schoolId);
  }

  @Get('defaulters')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fee defaulters' })
  @ApiQuery({ name: 'daysOverdue', required: false })
  async getDefaulters(
    @CurrentUser('school') schoolId: string,
    @Query('daysOverdue') daysOverdue?: number,
  ) {
    return this.feesService.getDefaulters(schoolId, daysOverdue);
  }

  @Get('statistics')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fee statistics' })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  async getFeeStatistics(
    @CurrentUser('school') schoolId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.feesService.getFeeStatistics(schoolId, { month, year });
  }

  @Get('collection-report')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get collection report' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
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

  @Get('statement/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get student fee statement' })
  async getStudentFeeStatement(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.getStudentFeeStatement(studentId, schoolId);
  }

  @Get('receipt/:feeId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Generate receipt' })
  async generateReceipt(
    @Param('feeId') feeId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.generateReceipt(feeId, schoolId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get fee by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update fee' })
  async update(
    @Param('id') id: string,
    @Body() updateFeeDto: UpdateFeeDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.update(id, updateFeeDto, schoolId);
  }

  @Patch(':id/payment')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.ACCOUNTANT,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Record payment' })
  async recordPayment(
    @Param('id') id: string,
    @Body() recordPaymentDto: RecordPaymentDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.feesService.recordPayment(
      id,
      recordPaymentDto,
      schoolId,
      userId,
    );
  }

  @Patch(':id/discount')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Apply discount' })
  async applyDiscount(
    @Param('id') id: string,
    @Body() applyDiscountDto: ApplyDiscountDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.applyDiscount(id, applyDiscountDto, schoolId);
  }

  @Patch(':id/fine')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Apply fine' })
  async applyFine(
    @Param('id') id: string,
    @Body() applyFineDto: ApplyFineDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.applyFine(id, applyFineDto, schoolId);
  }

  @Patch(':id/waive')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Waive fee' })
  async waiveFee(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.feesService.waiveFee(id, schoolId);
  }
}
