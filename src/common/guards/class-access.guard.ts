/**
 * Class Access Guard
 * Restricts class teachers to only access their assigned classes
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, ClassAccessGuard)
 * @ClassContext('classId') // param name containing the class ID
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/roles.enum';
import { ClassTeacherAssignmentsService } from '../../modules/class-teacher-assignments/class-teacher-assignments.service';

export const CLASS_CONTEXT_KEY = 'classContext';

/**
 * Decorator to specify which param contains the class ID
 */
export function ClassContext(paramName: string) {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CLASS_CONTEXT_KEY, paramName, descriptor.value);
    } else {
      Reflect.defineMetadata(CLASS_CONTEXT_KEY, paramName, target);
    }
  };
}

@Injectable()
export class ClassAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => ClassTeacherAssignmentsService))
    private classTeacherAssignmentsService: ClassTeacherAssignmentsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin and school admin bypass class restrictions
    if ([UserRole.PLATFORM_ADMIN, UserRole.PRINCIPAL, UserRole.PRINCIPAL].includes(user.role)) {
      return true;
    }

    // Only apply to teachers
    if (![UserRole.TEACHER, UserRole.CLASS_TEACHER].includes(user.role)) {
      return true;
    }

    // Get the param name containing the class ID
    const classParamName = this.reflector.get<string>(
      CLASS_CONTEXT_KEY,
      context.getHandler(),
    ) || 'classId';

    // Try to get class ID from params, query, or body
    const classId =
      request.params[classParamName] ||
      request.query[classParamName] ||
      request.body?.class ||
      request.body?.classId;

    if (!classId) {
      // If no class ID is specified, we can't check access
      // This might be a list request - let it through and filter in service
      return true;
    }

    // Get teacher ID (from user or linked teacher profile)
    const teacherId = user.teacherId || user.id;

    // Check if teacher has access to this class
    const hasAccess = await this.classTeacherAssignmentsService.hasClassAccess(
      teacherId,
      classId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this class. Contact your administrator.',
      );
    }

    // Inject accessible class IDs into request for service filtering
    request.accessibleClassIds = await this.classTeacherAssignmentsService.getAccessibleClassIds(teacherId);

    return true;
  }
}

