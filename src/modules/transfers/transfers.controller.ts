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
import { CompleteTransferInDto } from './dto/complete-transfer-in.dto';
import { UpdateDocumentsDto } from './dto/update-documents.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @RequirePermissions('transfer:create')
  @ApiOperation({ summary: 'Initiate a transfer (auto-detects in/out from fields)' })
  @ApiResponse({ status: 201, description: 'Transfer initiated successfully' })
  async initiateTransfer(
    @Body() transferDto: TransferOutDto,
    @CurrentUser('id') userId: string,
  ) {
    // Default transferDate to today if not provided
    if (!transferDto.transferDate) {
      transferDto.transferDate = new Date().toISOString().split('T')[0];
    }
    if (!transferDto.reason) {
      transferDto.reason = 'Transfer requested';
    }
    // Map toSchool string as externalSchoolName if not a MongoId
    if (transferDto.toSchool && !/^[0-9a-fA-F]{24}$/.test(transferDto.toSchool)) {
      transferDto.externalSchoolName = transferDto.toSchool;
      transferDto.toSchool = undefined;
    }
    return this.transfersService.initiateTransferOut(transferDto, userId);
  }

  @Post('out')
  @RequirePermissions('transfer:create')
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
  @RequirePermissions('transfer:approve')
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
  @RequirePermissions('transfer:create')
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
  @RequirePermissions('transfer:approve')
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
    @Body() studentData: CompleteTransferInDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.completeTransferIn(id, studentData, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('transfer:update')
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

  @Get()
  @RequirePermissions('transfer:view')
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
  @RequirePermissions('transfer:view')
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

  @Get(':id')
  @RequirePermissions('transfer:view')
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

  @Get(':id/certificate')
  @RequirePermissions('transfer:view')
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
  @RequirePermissions('transfer:update')
  @ApiOperation({ summary: 'Update transfer documents' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: 200,
    description: 'Transfer documents updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async updateTransferDocuments(
    @Param('id') id: string,
    @Body() documents: UpdateDocumentsDto,
  ) {
    return this.transfersService.updateTransferDocuments(id, documents);
  }
}

