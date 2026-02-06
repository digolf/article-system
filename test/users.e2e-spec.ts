import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  const testUser = {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'password123',
  };

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
    // Clean database
    await prisma.userPermission.deleteMany();
    await prisma.article.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and login
    const registerResponse = await request(app.getHttpServer())
      .post('/users/register')
      .send(testUser);

    userId = registerResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/users/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    authToken = loginResponse.body.access_token;
  });

  describe('GET /users', () => {
    it('should return list of all users when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return users with permissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body[0]).toHaveProperty('permissions');
      expect(Array.isArray(response.body[0].permissions)).toBe(true);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('name', testUser.name);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return user with permissions', async () => {
      const permissions = await prisma.permission.findMany({
        where: { name: 'read:articles' },
      });

      const userWithPerms = {
        name: 'User With Permissions',
        email: 'withperms@example.com',
        password: 'password123',
        permissionIds: [permissions[0].id],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users/register')
        .send(userWithPerms);

      const response = await request(app.getHttpServer())
        .get(`/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.permissions).toHaveLength(1);
      expect(response.body.permissions[0].permission.name).toBe(
        'read:articles',
      );
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user name when authenticated', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('email', testUser.email);
    });

    it('should update user email when authenticated', async () => {
      const updateData = {
        email: 'newemail@example.com',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('email', updateData.email);
    });

    it('should update user password when authenticated', async () => {
      const updateData = {
        password: 'newpassword123',
      };

      await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Try logging in with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/users/login')
        .send({
          email: testUser.email,
          password: updateData.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        name: 'Completely New Name',
        email: 'completelynew@example.com',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('should fail when updating to existing email', async () => {
      // Create another user
      const anotherUser = {
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/users/register')
        .send(anotherUser);

      // Try to update first user to second user's email
      const response = await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: anotherUser.email })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .put(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should fail with short password', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: '12345' })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user when authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify user is deleted
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should cascade delete user permissions', async () => {
      const permissions = await prisma.permission.findMany({
        where: { name: 'read:articles' },
      });

      const userWithPerms = {
        name: 'User To Delete',
        email: 'todelete@example.com',
        password: 'password123',
        permissionIds: [permissions[0].id],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users/register')
        .send(userWithPerms);

      const userToDeleteId = createResponse.body.id;

      // Verify user has permissions
      const userPerms = await prisma.userPermission.findMany({
        where: { userId: userToDeleteId },
      });
      expect(userPerms.length).toBeGreaterThan(0);

      // Delete user
      await request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify permissions are deleted
      const deletedUserPerms = await prisma.userPermission.findMany({
        where: { userId: userToDeleteId },
      });
      expect(deletedUserPerms.length).toBe(0);
    });

    it('should cascade delete user articles', async () => {
      // Create user with article creation permission
      const permissions = await prisma.permission.findMany({
        where: { name: 'create:articles' },
      });

      const author = {
        name: 'Author To Delete',
        email: 'author@example.com',
        password: 'password123',
        permissionIds: [permissions[0].id],
      };

      const authorResponse = await request(app.getHttpServer())
        .post('/users/register')
        .send(author);

      const authorId = authorResponse.body.id;

      // Login as author
      const loginResponse = await request(app.getHttpServer())
        .post('/users/login')
        .send({ email: author.email, password: author.password });

      const authorToken = loginResponse.body.access_token;

      // Create article
      const article = {
        title: 'Article to be deleted',
        content: 'This article will be deleted with user',
      };

      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(article);

      // Verify article exists
      const articlesBefore = await prisma.article.findMany({
        where: { authorId },
      });
      expect(articlesBefore.length).toBeGreaterThan(0);

      // Delete user
      await request(app.getHttpServer())
        .delete(`/users/${authorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify articles are deleted
      const articlesAfter = await prisma.article.findMany({
        where: { authorId },
      });
      expect(articlesAfter.length).toBe(0);
    });
  });

  describe('User Permissions', () => {
    it('should create user with multiple permissions', async () => {
      const permissions = await prisma.permission.findMany({
        where: {
          name: { in: ['read:articles', 'create:articles', 'update:articles'] },
        },
      });

      const userWithMultiplePerms = {
        name: 'Multi Perm User',
        email: 'multiperms@example.com',
        password: 'password123',
        permissionIds: permissions.map((p) => p.id),
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(userWithMultiplePerms)
        .expect(201);

      expect(response.body.permissions).toHaveLength(3);
    });

    it('should handle user with no permissions', async () => {
      const userNoPerms = {
        name: 'No Perms User',
        email: 'noperms@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/users/register')
        .send(userNoPerms)
        .expect(201);

      expect(response.body.permissions).toHaveLength(0);
    });
  });
});
