import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AccountStatus, User } from '../users/entities/user.entity';
import { ActiveAccountGuard } from './active-account.guard';

describe('ActiveAccountGuard', () => {
  const guard = new ActiveAccountGuard();

  const baseUser: User = {
    id: 1,
    email: 'jane@example.com',
    passwordHash: 'hashed',
    isAdmin: false,
    accountStatus: AccountStatus.ACTIVE,
    selfDeletedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  function contextWithUser(user: User): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows an active account', () => {
    expect(guard.canActivate(contextWithUser(baseUser))).toBe(true);
  });

  it('rejects a suspended account', () => {
    const user = { ...baseUser, accountStatus: AccountStatus.SUSPENDED };

    expect(() => guard.canActivate(contextWithUser(user))).toThrow(ForbiddenException);
  });

  it('rejects a self-deleted account', () => {
    const user = { ...baseUser, accountStatus: AccountStatus.SELF_DELETED };

    expect(() => guard.canActivate(contextWithUser(user))).toThrow(ForbiddenException);
  });
});
