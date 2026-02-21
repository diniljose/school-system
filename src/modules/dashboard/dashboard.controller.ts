import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('dashboard:view')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({
    name: 'academicYearId',
    required: false,
    type: String,
    description: 'Filter stats by academic year',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getDashboardStats(
    @CurrentUser('school') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
    @Req() req?: any,
  ) {
    return this.dashboardService.getDashboardStats(
      schoolId,
      {
        schoolCode: req.user?.schoolCode,
        isTenantUser: req.user?.isTenantUser,
      },
      academicYearId,
    );
  }
}
