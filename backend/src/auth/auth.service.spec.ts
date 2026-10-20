import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AccountStatus, User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';

type QueryBuilderMock = { where: jest.Mock; getOne: jest.Mock };
type RepoMock = { create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };

describe('AuthService', () => {
  let service: AuthService;
  let repo: RepoMock;
  let queryBuilder: QueryBuilderMock;
  let jwtService: { sign: jest.Mock };

  const existingUser: User = {
    id: 1,
    email: 'jane@example.com',
    passwordHash: bcrypt.hashSync('correct-password', 4),
    isAdmin: false,
    accountStatus: AccountStatus.ACTIVE,
    selfDeletedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    queryBuilder = { where: jest.fn().mockReturnThis(), getOne: jest.fn() };
    repo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => ({ id: 2, ...input })),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('hashes the password and saves a new user', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      const user = await service.register({ email: 'new@example.com', password: 'a-long-password' });

      expect(repo.save).toHaveBeenCalled();
      expect(user.email).toBe('new@example.com');
      expect(user.passwordHash).not.toBe('a-long-password');
      expect(await bcrypt.compare('a-long-password', user.passwordHash)).toBe(true);
    });

    it('rejects an email already in use, case-insensitively', async () => {
      queryBuilder.getOne.mockResolvedValue(existingUser);

      await expect(
        service.register({ email: 'JANE@example.com', password: 'a-long-password' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('validateCredentials', () => {
    it('returns the user for correct credentials', async () => {
      queryBuilder.getOne.mockResolvedValue(existingUser);

      const user = await service.validateCredentials({
        email: 'jane@example.com',
        password: 'correct-password',
      });

      expect(user).toBe(existingUser);
    });

    it('rejects an unknown email', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.validateCredentials({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      queryBuilder.getOne.mockResolvedValue(existingUser);

      await expect(
        service.validateCredentials({ email: 'jane@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('signToken', () => {
    it('signs the user id as the JWT subject', () => {
      const token = service.signToken(existingUser);

      expect(token).toBe('signed.jwt.token');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: existingUser.id });
    });
  });
});
