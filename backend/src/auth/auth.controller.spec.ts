import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AccountStatus, User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS,
} from './cookie';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'register' | 'validateCredentials' | 'signToken'>>;
  let res: jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>>;

  const user: User = {
    id: 1,
    email: 'jane@example.com',
    passwordHash: 'hashed',
    isAdmin: false,
    accountStatus: AccountStatus.ACTIVE,
    selfDeletedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(user),
      validateCredentials: jest.fn().mockResolvedValue(user),
      signToken: jest.fn().mockReturnValue('signed.jwt.token'),
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('register sets the session cookie and returns the user without the password hash', async () => {
    const body = await controller.register(
      { email: 'jane@example.com', password: 'a-long-password' },
      res as unknown as Response,
    );

    expect(authService.register).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'a-long-password',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'signed.jwt.token',
      ACCESS_TOKEN_COOKIE_OPTIONS,
    );
    expect(body).toEqual({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
    });
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('login sets the session cookie', async () => {
    await controller.login(
      { email: 'jane@example.com', password: 'a-long-password' },
      res as unknown as Response,
    );

    expect(authService.validateCredentials).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'signed.jwt.token',
      ACCESS_TOKEN_COOKIE_OPTIONS,
    );
  });

  it('logout clears the session cookie without a maxAge (so it expires immediately)', () => {
    controller.logout(res as unknown as Response);

    expect(res.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS,
    );
    expect(CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS).not.toHaveProperty('maxAge');
  });

  it('me returns the current user without the password hash', () => {
    const body = controller.me(user);

    expect(body).toEqual({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
    });
  });
});
