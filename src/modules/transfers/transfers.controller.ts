import {
  Controller,
  Get,
  Post,
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
import { TransfersService } from './transfers.service';
import { TransferOutDto } from './dto/transfer-out.dto';
import { TransferInDto } from './dto/transfer-in.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
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

  @Post('initiate-out')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Initiate transfer out' })
  async initiateTransferOut(
    @Body() transferOutDto: TransferOutDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.transfersService.initiateTransferOut(
      transferOutDto,
      schoolId,
      userId,
    );
  }

  @Patch('complete-out/:transferId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Complete transfer out' })
  async completeTransferOut(
    @Param('transferId') transferId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.completeTransferOut(transferId, schoolId);
  }

  @Post('initiate-in')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Initiate transfer in' })
  async initiateTransferIn(
    @Body() transferInDto: TransferInDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.transfersService.initiateTransferIn(
      transferInDto,
      schoolId,
      userId,
    );
  }

  @Patch('complete-in/:transferId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Complete transfer in' })
  async completeTransferIn(
    @Param('transferId') transferId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.completeTransferIn(transferId, schoolId);
  }

  @Patch('cancel/:transferId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Cancel transfer' })
  async cancelTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.cancelTransfer(transferId, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Get transfers by school' })
  @ApiQuery({ name: 'transferType', required: false, enum: ['in', 'out'] })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransfersBySchool(
    @CurrentUser('school') schoolId: string,
    @Query('transferType') transferType?: 'in' | 'out',
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.transfersService.getTransfersBySchool(schoolId, {
      transferType,
      status,
      page,
      limit,
    });
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get student transfer history' })
  async getStudentTransferHistory(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.getStudentTransferHistory(studentId, schoolId);
  }

  @Get('certificate/:transferId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Generate transfer certificate' })
  async generateTransferCertificate(
    @Param('transferId') transferId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.generateTransferCertificate(
      transferId,
      schoolId,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Get transfer by ID' })
  async getTransferById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.getTransferById(id, schoolId);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update transfer documents' })
  async updateTransferDocuments(
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.transfersService.updateTransferDocuments(
      id,
      updateTransferDto,
      schoolId,
    );
  }
}
