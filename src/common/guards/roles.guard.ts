import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

// Mapping of roles to their default permission prefixes
// This allows users with permissions to access role-restricted endpoints
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  [UserRole.PRINCIPAL]: ['class:create', 'class:update', 'class:delete', 'teacher:create', 'student:create', 'settings:update'],
  [UserRole.VICE_PRINCIPAL]: ['class:create', 'class:update', 'student:create', 'teacher:view'],
  [UserRole.TEACHER]: ['attendance:create', 'result:create', 'student:view'],
  [UserRole.CLASS_TEACHER]: ['attendance:create', 'result:create', 'student:create', 'class:view'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Also get required permissions if defined
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Check 1: User has a required role
    if (requiredRoles) {
      const hasRole = requiredRoles.some((role) => user.role === role);
      if (hasRole) {
        return true;
      }

      // Check if user's roleCode matches any required role
      if (user.roleCode && requiredRoles.some((role) => user.roleCode === role)) {
        return true;
      }
    }

    // Check 2: User has required permissions directly
    const userPermissions: string[] = user.permissions || [];
    
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));
      if (hasPermission) {
        return true;
      }
    }

    // Check 3: User has permissions that allow access to role-restricted resources
    if (requiredRoles) {
      // Get all permissions that would grant access for the required roles
      const rolePermissions: string[] = [];
      for (const role of requiredRoles) {
        const perms = ROLE_PERMISSION_MAP[role];
        if (perms) {
          rolePermissions.push(...perms);
        }
      }

      if (rolePermissions.length > 0) {
        const hasEquivalentPermission = rolePermissions.some((perm) => userPermissions.includes(perm));
        if (hasEquivalentPermission) {
          return true;
        }
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
