import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { TransferOutDto } from './dto/transfer-out.dto';
import { TransferInDto } from './dto/transfer-in.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post('out')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Initiate transfer out for a student' })
  @ApiResponse({
    status: 201,
    description: 'Transfer out initiated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student or school not found' })
  @ApiResponse({
    status: 409,
    description: 'Student already has a pending transfer',
  })
  async initiateTransferOut(
    @Body() transferOutDto: TransferOutDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.initiateTransferOut(transferOutDto, userId);
  }

  @Post(':id/complete-out')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Complete transfer out and generate TC' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer out completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  @ApiResponse({ status: 409, description: 'Transfer already completed' })
  async completeTransferOut(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.completeTransferOut(id, userId);
  }

  @Post('in')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Initiate transfer in for a student' })
  @ApiResponse({
    status: 201,
    description: 'Transfer in initiated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student or school not found' })
  @ApiResponse({
    status: 409,
    description: 'Student already has a pending transfer',
  })
  async initiateTransferIn(
    @Body() transferInDto: TransferInDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.initiateTransferIn(transferInDto, userId);
  }

  @Post(':id/complete-in')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Complete transfer in for a student' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer in completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  @ApiResponse({ status: 409, description: 'Transfer already completed' })
  async completeTransferIn(
    @Param('id') id: string,
    @Body() studentData: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.completeTransferIn(id, studentData, userId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Cancel a transfer request' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed transfer' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  @ApiResponse({ status: 409, description: 'Transfer already cancelled' })
  async cancelTransfer(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.transfersService.cancelTransfer(id, reason);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get transfer details by ID' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async getTransferById(@Param('id') id: string) {
    return this.transfersService.getTransferById(id);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get transfers with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Transfers retrieved successfully' })
  async getTransfers(@Query() query: QueryTransferDto) {
    return this.transfersService.getTransfersBySchool(
      query.schoolId,
      query.type,
      query.status,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('student/:studentId/history')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get transfer history for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentTransferHistory(@Param('studentId') studentId: string) {
    return this.transfersService.getStudentTransferHistory(studentId);
  }

  @Get(':id/certificate')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Generate transfer certificate details' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer certificate generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Certificate only available for completed transfer out',
  })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async generateTransferCertificate(@Param('id') id: string) {
    return this.transfersService.generateTransferCertificate(id);
  }

  @Patch(':id/documents')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Update transfer documents' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer documents updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async updateTransferDocuments(
    @Param('id') id: string,
    @Body() documents: any,
  ) {
    return this.transfersService.updateTransferDocuments(id, documents);
  }
}
