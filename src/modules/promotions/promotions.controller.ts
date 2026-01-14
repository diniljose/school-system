import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { BulkPromoteDto } from './dto/bulk-promote.dto';
import { RetainStudentDto } from './dto/retain-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('check-eligibility/:studentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Check promotion eligibility' })
  @ApiQuery({ name: 'academicYearId', required: true })
  async checkEligibility(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.promotionsService.checkEligibility(
      studentId,
      academicYearId,
      schoolId,
    );
  }

  @Post('promote')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Promote student' })
  async promoteStudent(
    @Body() promoteStudentDto: PromoteStudentDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.promotionsService.promoteStudent(
      promoteStudentDto,
      schoolId,
      userId,
    );
  }

  @Post('retain')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Retain student' })
  async retainStudent(
    @Body() retainStudentDto: RetainStudentDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.promotionsService.retainStudent(
      retainStudentDto,
      schoolId,
      userId,
    );
  }

  @Post('bulk-promote')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Bulk promote students' })
  async bulkPromote(
    @Body() bulkPromoteDto: BulkPromoteDto,
    @CurrentUser('school') schoolId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.promotionsService.bulkPromote(
      bulkPromoteDto,
      schoolId,
      userId,
    );
  }

  @Post('bulk-check-eligibility')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Bulk check promotion eligibility' })
  async bulkCheckEligibility(
    @Body() body: { studentIds: string[]; academicYearId: string },
    @CurrentUser('school') schoolId: string,
  ) {
    return this.promotionsService.bulkCheckEligibility(
      body.studentIds,
      body.academicYearId,
      schoolId,
    );
  }

  @Get('history/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get promotion history' })
  async getPromotionHistory(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.promotionsService.getPromotionHistory(studentId, schoolId);
  }

  @Get('pending')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get pending promotions' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getPendingPromotions(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.promotionsService.getPendingPromotions(
      schoolId,
      academicYearId,
    );
  }

  @Get('statistics/:academicYearId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get promotion statistics' })
  async getPromotionStatistics(
    @Param('academicYearId') academicYearId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.promotionsService.getPromotionStatistics(
      schoolId,
      academicYearId,
    );
  }

  @Patch('undo/:promotionId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Undo promotion' })
  async undoPromotion(
    @Param('promotionId') promotionId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.promotionsService.undoPromotion(promotionId, schoolId);
  }
}
