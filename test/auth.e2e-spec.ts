import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.userPermission.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /users/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body.permissions).toEqual([]);
    });

    it('should register user with permissions', async () => {
      const permissions = await prisma.permission.findMany({
        where: { name: { in: ['read:articles'] } },
      });

      const newUser = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'password123',
        permissionIds: [permissions[0].id],
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.permissions).toHaveLength(1);
      expect(response.body.permissions[0].permission.name).toBe(
        'read:articles',
      );
    });

    it('should fail with invalid email', async () => {
      const invalidUser = {
        name: 'Invalid User',
        email: 'not-an-email',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should fail with short password', async () => {
      const invalidUser = {
        name: 'Short Pass User',
        email: 'short@example.com',
        password: '12345',
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain(
        'Senha deve ter no mínimo 6 caracteres',
      );
    });

    it('should fail with missing required fields', async () => {
      const incompleteUser = {
        email: 'incomplete@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(incompleteUser)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail when email already exists', async () => {
      const user = {
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password123',
      };

      // Create first user
      await request(app.getHttpServer())
        .post('/users/register')
        .send(user)
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(user)
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('Email já está em uso');
    });
  });

  describe('POST /users/login', () => {
    const testUser = {
      name: 'Login Test User',
      email: 'login@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      // Register user before login tests
      await request(app.getHttpServer())
        .post('/users/register')
        .send(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.access_token.length).toBeGreaterThan(0);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).toHaveProperty('permissions');
      expect(Array.isArray(response.body.user.permissions)).toBe(true);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: 'wrong@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail with missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/users/login')
        .send({})
        .expect(400);
    });

    it('should return user permissions in login response', async () => {
      // Create user with specific permissions
      const permissions = await prisma.permission.findMany({
        where: { name: { in: ['read:articles', 'create:articles'] } },
      });

      const userWithPerms = {
        name: 'User With Perms',
        email: 'withperms@example.com',
        password: 'password123',
        permissionIds: permissions.map((p) => p.id),
      };

      await request(app.getHttpServer())
        .post('/users/register')
        .send(userWithPerms);

      const response = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: userWithPerms.email,
          password: userWithPerms.password,
        })
        .expect(200);

      expect(response.body.user.permissions).toHaveLength(2);
      const permissionNames = response.body.user.permissions.map(
        (p: { name: string }) => p.name,
      );
      expect(permissionNames).toContain('read:articles');
      expect(permissionNames).toContain('create:articles');
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full register and login flow', async () => {
      const newUser = {
        name: 'Flow Test User',
        email: 'flow@example.com',
        password: 'password123',
      };

      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/users/register')
        .send(newUser)
        .expect(201);

      const userId = registerResponse.body.id;
      expect(userId).toBeDefined();

      // Step 2: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(200);

      const token = loginResponse.body.access_token;
      expect(token).toBeDefined();

      // Step 3: Use token to access protected route
      const protectedResponse = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body.id).toBe(userId);
      expect(protectedResponse.body.email).toBe(newUser.email);
    });

    it('should fail to access protected routes without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should fail to access protected routes with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
