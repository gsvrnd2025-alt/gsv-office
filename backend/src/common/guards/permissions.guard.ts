import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[][]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Super Admin bypasses all permission checks
    if (user.role?.name === 'Super Admin') {
      return true;
    }

    // Build effective permissions from role + user overrides
    const effectivePermissions = new Map<string, boolean>();

    // Add role permissions
    if (user.role?.permissions) {
      for (const rp of user.role.permissions) {
        if (rp.granted) {
          effectivePermissions.set(`${rp.permission.module}:${rp.permission.action}`, true);
        }
      }
    }

    // Apply user-level permission overrides
    if (user.userPermissions) {
      for (const up of user.userPermissions) {
        effectivePermissions.set(
          `${up.permission.module}:${up.permission.action}`,
          up.granted,
        );
      }
    }

    // Check if user has any of the required permissions
    for (const [module, action] of requiredPermissions) {
      const key = `${module}:${action}`;
      if (effectivePermissions.get(key) === true) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have permission to perform this action');
  }
}
