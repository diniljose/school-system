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
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    return this.usersService.create(createUserDto, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Post('bulk')
  @RequirePermissions('user:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk create users' })
  @ApiResponse({ status: 200, description: 'Bulk creation completed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async bulkCreate(@Body() createUsersDto: CreateUserDto[], @Req() req: Request) {
    return this.usersService.bulkCreate(createUsersDto, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get()
  @RequirePermissions('user:view')
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'school', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(@Query() query: QueryUserDto, @Req() req: Request) {
    return this.usersService.findAll(query, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Get(':id')
  @RequirePermissions('user:view')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.findById(id, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
    return this.usersService.update(id, updateUserDto, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id/role')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(@Param('id') id: string, @Body('role') role: UserRole, @Req() req: Request) {
    return this.usersService.updateRole(id, role, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Patch(':id/permissions')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update user permissions' })
  @ApiResponse({
    status: 200,
    description: 'User permissions updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
    @Req() req: Request,
  ) {
    return this.usersService.updatePermissions(id, permissions, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user by ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.remove(id, {
      schoolCode: (req as any).user?.schoolCode,
      isTenantUser: (req as any).user?.isTenantUser,
    });
  }
}

