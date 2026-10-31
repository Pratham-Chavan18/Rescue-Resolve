import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload, UserRole } from '@swiggy/types';

// Decorator to mark required roles on route handlers
export const ROLES_KEY = 'roles';
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Combined JWT auth + role guard (CONSTRAINTS §4.15 — server-side role check required)
@Injectable()
export class JwtRoleGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First run JWT authentication
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    // Then check roles
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const { user } = request;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Role '${user.role}' is not authorized for this endpoint`);
    }

    return true;
  }
}

// Convenience guard for any authenticated user (no role restriction)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
