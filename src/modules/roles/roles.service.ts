/**
 * Roles Service
 * Manages dynamic role definitions per school (tenant-based)
 * All roles are stored in the school's tenant database
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Types, Model } from 'mongoose';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import {
  Role,
  RoleDocument,
  DEFAULT_SCHOOL_ROLES,
  ALL_PERMISSIONS,
} from '../../database/schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

export interface TenantContext {
  schoolCode?: string;
  isTenantUser?: boolean;
  userId?: string;
}

/**
 * Permission modules for organized display
 */
export const PERMISSION_MODULES = [
  {
    code: 'user',
    name: 'User Management',
    description: 'Manage system users',
    permissions: ['user:create', 'user:view', 'user:update', 'user:delete'],
  },
  {
    code: 'role',
    name: 'Role Management',
    description: 'Manage roles and permissions',
    permissions: ['role:create', 'role:view', 'role:update', 'role:delete'],
  },
  {
    code: 'student',
    name: 'Students',
    description: 'Student records and profiles',
    permissions: ['student:create', 'student:view', 'student:update', 'student:delete', 'student:approve'],
  },
  {
    code: 'teacher',
    name: 'Teachers',
    description: 'Teacher profiles and assignments',
    permissions: ['teacher:create', 'teacher:view', 'teacher:update', 'teacher:delete', 'teacher:approve'],
  },
  {
    code: 'parent',
    name: 'Parents',
    description: 'Parent profiles and student linkage',
    permissions: ['parent:create', 'parent:view', 'parent:update', 'parent:delete'],
  },
  {
    code: 'class',
    name: 'Classes',
    description: 'Class and section management',
    permissions: ['class:create', 'class:view', 'class:update', 'class:delete'],
  },
  {
    code: 'subject',
    name: 'Subjects',
    description: 'Subject curriculum and assignments',
    permissions: ['subject:create', 'subject:view', 'subject:update', 'subject:delete'],
  },
  {
    code: 'exam',
    name: 'Examinations',
    description: 'Exam schedules and management',
    permissions: ['exam:create', 'exam:view', 'exam:update', 'exam:delete'],
  },
  {
    code: 'result',
    name: 'Results',
    description: 'Student results and grades',
    permissions: ['result:create', 'result:view', 'result:update', 'result:delete'],
  },
  {
    code: 'attendance',
    name: 'Attendance',
    description: 'Daily attendance tracking',
    permissions: ['attendance:create', 'attendance:view', 'attendance:update', 'attendance:delete'],
  },
  {
    code: 'fee',
    name: 'Fees',
    description: 'Fee collection and management',
    permissions: ['fee:create', 'fee:view', 'fee:update', 'fee:delete'],
  },
  {
    code: 'timetable',
    name: 'Timetable',
    description: 'Class schedules and periods',
    permissions: ['timetable:create', 'timetable:view', 'timetable:update', 'timetable:delete'],
  },
  {
    code: 'transport',
    name: 'Transport',
    description: 'Bus routes and tracking',
    permissions: ['transport:create', 'transport:view', 'transport:update', 'transport:delete'],
  },
  {
    code: 'academic-year',
    name: 'Academic Year',
    description: 'Academic year and terms',
    permissions: ['academic-year:create', 'academic-year:view', 'academic-year:update', 'academic-year:delete'],
  },
  {
    code: 'notification',
    name: 'Notifications',
    description: 'Announcements and alerts',
    permissions: ['notification:create', 'notification:view', 'notification:delete'],
  },
  {
    code: 'report',
    name: 'Reports',
    description: 'Analytics and exports',
    permissions: ['report:view', 'report:export'],
  },
  {
    code: 'settings',
    name: 'Settings',
    description: 'School configuration',
    permissions: ['settings:view', 'settings:update'],
  },
  {
    code: 'transfer',
    name: 'Transfers',
    description: 'Student transfers',
    permissions: ['transfer:create', 'transfer:view', 'transfer:update', 'transfer:approve'],
  },
  {
    code: 'promotion',
    name: 'Promotions',
    description: 'Class promotions',
    permissions: ['promotion:create', 'promotion:view', 'promotion:update', 'promotion:execute'],
  },
  {
    code: 'enrollment',
    name: 'Enrollments',
    description: 'Student enrollment to classes and sections',
    permissions: ['enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:delete', 'enrollment:bulk'],
  },
  {
    code: 'event',
    name: 'Events',
    description: 'School events and calendar management',
    permissions: ['event:create', 'event:view', 'event:update', 'event:delete'],
  },
];

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  /**
   * Get the Role model for a specific tenant
   */
  private async getRoleModel(context: TenantContext): Promise<Model<RoleDocument>> {
    if (!context?.schoolCode) {
      throw new BadRequestException('School context is required');
    }
    return this.tenantDatabaseService.getTenantModel<RoleDocument>(
      context.schoolCode,
      'Role',
    );
  }

  /**
   * Initialize default roles for a new school
   */
  async initializeDefaultRoles(context: TenantContext, createdById?: string): Promise<Role[]> {
    const RoleModel = await this.getRoleModel(context);
    const existingRoles = await RoleModel.find().exec();
    
    if (existingRoles.length > 0) {
      this.logger.warn(`Default roles already exist for ${context.schoolCode}`);
      return existingRoles;
    }

    const roles = DEFAULT_SCHOOL_ROLES.map((role) => ({
      ...role,
      isActive: true,
      createdBy: createdById ? new Types.ObjectId(createdById) : undefined,
    }));

    const createdRoles = await RoleModel.insertMany(roles);
    this.logger.log(`Initialized ${createdRoles.length} default roles for ${context.schoolCode}`);
    
    return createdRoles;
  }

  /**
   * Create a custom role for the school
   */
  async create(createRoleDto: CreateRoleDto, context: TenantContext): Promise<Role> {
    const RoleModel = await this.getRoleModel(context);

    const invalidPermissions = createRoleDto.permissions?.filter(
      (p) => !ALL_PERMISSIONS.includes(p),
    );
    
    if (invalidPermissions && invalidPermissions.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }

    const existing = await RoleModel.findOne({ code: createRoleDto.code }).exec();
    if (existing) {
      throw new ConflictException(`Role with code '${createRoleDto.code}' already exists`);
    }

    const role = new RoleModel({
      ...createRoleDto,
      isSystemRole: false,
      createdBy: context.userId ? new Types.ObjectId(context.userId) : undefined,
    });

    return role.save();
  }

  /**
   * Get all roles for a school
   */
  async findAll(context: TenantContext, includeInactive = false): Promise<Role[]> {
    const RoleModel = await this.getRoleModel(context);
    const filter: any = {};
    if (!includeInactive) {
      filter.isActive = true;
    }
    return RoleModel.find(filter).sort({ isSystemRole: -1, name: 1 }).exec();
  }

  /**
   * Get role by ID
   */
  async findById(id: string, context: TenantContext): Promise<RoleDocument> {
    const RoleModel = await this.getRoleModel(context);
    const role = await RoleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  /**
   * Get role by code
   */
  async findByCode(code: string, context: TenantContext): Promise<RoleDocument | null> {
    const RoleModel = await this.getRoleModel(context);
    return RoleModel.findOne({ code }).exec();
  }

  /**
   * Update a role
   */
  async update(id: string, updateRoleDto: UpdateRoleDto, context: TenantContext): Promise<Role> {
    const role = await this.findById(id, context);

    if (role.isSystemRole && updateRoleDto.code && updateRoleDto.code !== role.code) {
      throw new BadRequestException('Cannot change the code of a system role');
    }

    if (updateRoleDto.permissions) {
      const invalidPermissions = updateRoleDto.permissions.filter(
        (p) => !ALL_PERMISSIONS.includes(p),
      );
      if (invalidPermissions.length > 0) {
        throw new BadRequestException(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }
    }

    Object.assign(role, updateRoleDto);
    return role.save();
  }

  /**
   * Delete a role
   */
  async delete(id: string, context: TenantContext): Promise<void> {
    const RoleModel = await this.getRoleModel(context);
    const role = await this.findById(id, context);

    if (role.isSystemRole) {
      throw new BadRequestException('Cannot delete a system role');
    }

    await RoleModel.findByIdAndDelete(id).exec();
  }

  /**
   * Get permissions for a role
   */
  async getPermissions(roleCode: string, context: TenantContext): Promise<string[]> {
    const role = await this.findByCode(roleCode, context);
    return role?.permissions || [];
  }

  /**
   * Get all available permissions organized by module
   */
  getAvailablePermissions(): { modules: typeof PERMISSION_MODULES; allPermissions: string[] } {
    return {
      modules: PERMISSION_MODULES,
      allPermissions: ALL_PERMISSIONS,
    };
  }
}
