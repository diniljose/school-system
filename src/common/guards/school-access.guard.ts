import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../enums/roles.enum';

@Injectable()
export class SchoolAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Super admin can access all schools
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // For non-super-admin, they must have a school assigned
    if (!user.school) {
      throw new ForbiddenException(
        'No school assigned to this user account',
      );
    }

    // Check if user is accessing resources of their own school
    const schoolId =
      request.params?.schoolId ||
      request.body?.school ||
      request.query?.school;

    // If a specific school is referenced, verify it matches the user's school
    if (schoolId && user.school.toString() !== schoolId.toString()) {
      throw new ForbiddenException('Access denied to this school');
    }

    // Inject schoolId into request for downstream services
    request.schoolId = user.school.toString();

    return true;
  }
}

