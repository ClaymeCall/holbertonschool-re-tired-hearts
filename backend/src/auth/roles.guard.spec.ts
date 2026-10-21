import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountStatus, User } from '../users/entities/user.entity';
import { Role } from './roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const admin: User = {
    id: 1,
    email: 'mod@example.com',
    passwordHash: 'hashed',
    isAdmin: true,
    accountStatus: AccountStatus.ACTIVE,
    selfDeletedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
  const member: User = { ...admin, id: 2, isAdmin: false };

  function contextWithUser(user: User): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows any authenticated user when the route has no @Roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextWithUser(member))).toBe(true);
  });

  it('allows an admin on a route requiring the admin role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
  });

  it('rejects a plain member on a route requiring the admin role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(contextWithUser(member))).toThrow(ForbiddenException);
  });
});
