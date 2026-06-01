import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require permissions for a route.
 * Each argument is a [module, action] pair.
 * User needs at least ONE of the listed permissions.
 * 
 * @example
 * @RequirePermissions(['users', 'read'], ['users', 'create'])
 */
export const RequirePermissions = (...permissions: [string, string][]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
