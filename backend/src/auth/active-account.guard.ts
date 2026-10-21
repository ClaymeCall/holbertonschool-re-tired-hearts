import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AccountStatus, User } from '../users/entities/user.entity';

// Rejects a valid session whose account isn't `active` (suspended or self-deleted) on
// every route that uses it. Two routes deliberately never use this guard, per
// docs/design-decisions.md §4 ("what each state allows"): GET /v1/auth/me (so a
// suspended/self-deleted caller can still read their own restriction) and
// POST /v1/auth/logout (sign-out is allowed in every state). Must run after
// JwtAuthGuard, which attaches `request.user`.
@Injectable()
export class ActiveAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<Request & { user: User }>();

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Your account is suspended.');
    }
    if (user.accountStatus === AccountStatus.SELF_DELETED) {
      throw new ForbiddenException('This account has been deleted.');
    }
    return true;
  }
}
