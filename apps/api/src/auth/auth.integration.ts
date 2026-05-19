/**
 * Integration tests for the JWT guard (ADR-005, ADR-015).
 *
 * No real DB needed — we test at the HTTP layer using NestJS testing utilities
 * to verify that:
 *   - GET /api/v1/me without a token returns 401
 *   - GET /api/v1/me with a valid Auth.js-style JWT returns 200 + userId
 *   - GET /api/v1/me with a tampered token returns 401
 */

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthController } from './auth.controller.js';

const TEST_SECRET = 'integration-test-secret-32-bytes!!';
const TEST_USER_ID = 'cltest000000000000000000000';
const TEST_EMAIL = 'test@example.com';

describe('JWT Guard (integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env['AUTH_SECRET'] = TEST_SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_SECRET, signOptions: { algorithm: 'HS256' } }),
      ],
      controllers: [AuthController],
      providers: [JwtStrategy, JwtAuthGuard],
    }).compile();

    // Express adapter is used in tests (lightweight, works with supertest).
    // Production uses Fastify; the guard logic tested here is adapter-agnostic.
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
    delete process.env['AUTH_SECRET'];
  });

  it('401 — no Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(401);
  });

  it('401 — malformed token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401);
  });

  it('401 — token signed with wrong secret', async () => {
    const wrongToken = jwtService.sign(
      { sub: TEST_USER_ID, email: TEST_EMAIL },
      { secret: 'completely-different-secret-!!!!' },
    );
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${wrongToken}`)
      .expect(401);
  });

  it('200 — valid JWT returns userId and email', async () => {
    const token = jwtService.sign({ sub: TEST_USER_ID, email: TEST_EMAIL });
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body).toEqual({ userId: TEST_USER_ID, email: TEST_EMAIL });
  });

  it('200 — token without email returns only userId', async () => {
    const token = jwtService.sign({ sub: TEST_USER_ID });
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body).toEqual({ userId: TEST_USER_ID });
  });
});
