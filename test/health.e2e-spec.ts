import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');
    });

    it('should have valid timestamp format', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toString()).not.toBe(
        'Invalid Date',
      );
    });

    it('should have numeric uptime', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should indicate database connection', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.body.database).toBeDefined();
      expect(['connected', 'disconnected']).toContain(response.body.database);
    });
  });
});
