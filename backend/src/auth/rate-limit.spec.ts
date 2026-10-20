import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS } from './rate-limit.constants';

// Exercises the real ThrottlerGuard over HTTP (unlike auth.controller.spec.ts, which calls the
// controller's methods directly and never goes through the guard pipeline at all).
describe('Auth rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const authService: Partial<AuthService> = {
      register: jest.fn().mockResolvedValue({ id: 1 }),
      validateCredentials: jest.fn().mockResolvedValue({ id: 1 }),
      signToken: jest.fn().mockReturnValue('signed.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ limit: AUTH_RATE_LIMIT, ttl: AUTH_RATE_WINDOW_MS }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it(`allows ${AUTH_RATE_LIMIT} login attempts then rejects the next one with 429`, async () => {
    const credentials = { email: 'jane@example.com', password: 'whatever12' };

    for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
      await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(200);
    }

    await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(429);
  });

  it(`allows ${AUTH_RATE_LIMIT} registration attempts then rejects the next one with 429`, async () => {
    const payload = { email: 'new@example.com', password: 'whatever12' };

    for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
      await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);
    }

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(429);
  });

  it('tracks register and login against separate limits', async () => {
    for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'jane@example.com', password: 'whatever12' })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'whatever12' })
      .expect(201);
  });
});
