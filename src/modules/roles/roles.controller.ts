/**
 * Roles Controller
 * API endpoints for role management (Principal only)
 * All operations are tenant-scoped
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesService, TenantContext } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private getContext(req: any): TenantContext {
    return {
      schoolCode: req.user?.schoolCode,
      isTenantUser: req.user?.isTenantUser,
      userId: req.user?.sub || req.user?.id,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles for the school' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async findAll(@Request() req, @Query('includeInactive') includeInactive?: boolean) {
    const roles = await this.rolesService.findAll(this.getContext(req), includeInactive === true);
    return { success: true, data: roles };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions organized by module' })
  @ApiResponse({ status: 200, description: 'Permission modules and all permissions' })
  getAvailablePermissions() {
    return { success: true, data: this.rolesService.getAvailablePermissions() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findById(@Param('id') id: string, @Request() req) {
    const role = await this.rolesService.findById(id, this.getContext(req));
    return { success: true, data: role };
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 400, description: 'Invalid permissions or duplicate code' })
  async create(@Body() createRoleDto: CreateRoleDto, @Request() req) {
    const role = await this.rolesService.create(createRoleDto, this.getContext(req));
    return { success: true, data: role };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 400, description: 'Cannot modify system role code' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Request() req) {
    const role = await this.rolesService.update(id, updateRoleDto, this.getContext(req));
    return { success: true, data: role };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete system role' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async delete(@Param('id') id: string, @Request() req) {
    await this.rolesService.delete(id, this.getContext(req));
    return { success: true, message: 'Role deleted successfully' };
  }

  @Post('initialize')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Initialize default roles for the school' })
  @ApiResponse({ status: 201, description: 'Default roles created' })
  async initializeDefaults(@Request() req) {
    const roles = await this.rolesService.initializeDefaultRoles(this.getContext(req), req.user?.sub);
    return { success: true, data: roles };
  }
}

