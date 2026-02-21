import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for an endpoint.
 * Permissions are strings like 'enrollment:create', 'enrollment:bulk', etc.
 * User must have at least one of the specified permissions to access the endpoint.
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Alias for Permissions decorator for better readability
 */
export const RequirePermissions = Permissions;
