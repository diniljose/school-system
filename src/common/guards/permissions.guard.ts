import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../enums/roles.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Access denied - no user context');
    }

    // Platform admin has all permissions
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        `User ${user.email} denied access. Required: [${requiredPermissions.join(', ')}], Has: [${userPermissions.join(', ')}]`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
