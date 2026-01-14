import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/roles.enum';

@Injectable()
export class SchoolAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const schoolId = request.params.schoolId || request.body.school || request.query.school;

    // Super admin can access all schools
    if (user.role === UserRole. SUPER_ADMIN) {
      return true;
    }

    // Check if user belongs to the requested school
    if (schoolId && user.school?. toString() !== schoolId) {
      throw new ForbiddenException('Access denied to this school');
    }

    return true;
  }
}