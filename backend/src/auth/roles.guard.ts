import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { Role, ROLES_KEY } from './roles.decorator';

// Gates routes carrying @Roles(...). Must run after JwtAuthGuard (needs `request.user`).
// A route with no @Roles metadata is left alone — this guard only ever narrows access.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request & { user: User }>();
    const granted = required.every((role) => hasRole(user, role));
    if (!granted) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

function hasRole(user: User, role: Role): boolean {
  switch (role) {
    case Role.ADMIN:
      return user.isAdmin;
    default:
      return false;
  }
}
