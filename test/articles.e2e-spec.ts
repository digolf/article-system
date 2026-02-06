import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Articles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // User tokens and IDs
  let adminToken: string;
  let adminId: string;
  let editorToken: string;
  let editorId: string;
  let readerToken: string;
  let readerId: string;
  let noPermToken: string;
  let noPermId: string;

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

    // Get permissions
    const allPermissions = await prisma.permission.findMany();
    const readArticles = allPermissions.find((p) => p.name === 'read:articles');
    const createArticles = allPermissions.find(
      (p) => p.name === 'create:articles',
    );
    const updateArticles = allPermissions.find(
      (p) => p.name === 'update:articles',
    );
    const deleteArticles = allPermissions.find(
      (p) => p.name === 'delete:articles',
    );

    // Create admin user (all permissions)
    const adminUser = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      permissionIds: allPermissions.map((p) => p.id),
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/users/register')
      .send(adminUser);
    adminId = adminResponse.body.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.access_token;

    // Create editor user (can manage articles)
    const editorUser = {
      name: 'Editor User',
      email: 'editor@example.com',
      password: 'password123',
      permissionIds: [
        readArticles?.id,
        createArticles?.id,
        updateArticles?.id,
        deleteArticles?.id,
      ].filter(Boolean),
    };

    const editorResponse = await request(app.getHttpServer())
      .post('/users/register')
      .send(editorUser);
    editorId = editorResponse.body.id;

    const editorLogin = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: editorUser.email, password: editorUser.password });
    editorToken = editorLogin.body.access_token;

    // Create reader user (can only read)
    const readerUser = {
      name: 'Reader User',
      email: 'reader@example.com',
      password: 'password123',
      permissionIds: [readArticles?.id].filter(Boolean),
    };

    const readerResponse = await request(app.getHttpServer())
      .post('/users/register')
      .send(readerUser);
    readerId = readerResponse.body.id;

    const readerLogin = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: readerUser.email, password: readerUser.password });
    readerToken = readerLogin.body.access_token;

    // Create user with no permissions
    const noPermUser = {
      name: 'No Permission User',
      email: 'noperm@example.com',
      password: 'password123',
    };

    const noPermResponse = await request(app.getHttpServer())
      .post('/users/register')
      .send(noPermUser);
    noPermId = noPermResponse.body.id;

    const noPermLogin = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: noPermUser.email, password: noPermUser.password });
    noPermToken = noPermLogin.body.access_token;
  });

  describe('POST /articles', () => {
    const newArticle = {
      title: 'Test Article',
      content: 'This is a test article content',
    };

    it('should create article when user has create permission', async () => {
      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(newArticle)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newArticle.title);
      expect(response.body.content).toBe(newArticle.content);
      expect(response.body.authorId).toBe(editorId);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('author');
      expect(response.body.author.id).toBe(editorId);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/articles')
        .send(newArticle)
        .expect(401);
    });

    it('should fail when user has no create permission', async () => {
      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${readerToken}`)
        .send(newArticle)
        .expect(403);
    });

    it('should fail with missing title', async () => {
      const invalidArticle = {
        content: 'Content without title',
      };

      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(invalidArticle)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Título é obrigatório');
    });

    it('should fail with missing content', async () => {
      const invalidArticle = {
        title: 'Title without content',
      };

      const response = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(invalidArticle)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Conteúdo é obrigatório');
    });
  });

  describe('GET /articles', () => {
    beforeEach(async () => {
      // Create some test articles
      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Article 1', content: 'Content 1' });

      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Article 2', content: 'Content 2' });
    });

    it('should return list of articles when user has read permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles')
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('authorId');
      expect(response.body[0]).toHaveProperty('author');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/articles').expect(401);
    });

    it('should fail when user has no read permission', async () => {
      await request(app.getHttpServer())
        .get('/articles')
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('should return articles ordered by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get('/articles')
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(200);

      // Verify descending order (newest first)
      for (let i = 0; i < response.body.length - 1; i++) {
        const current = new Date(response.body[i].createdAt);
        const next = new Date(response.body[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe('GET /articles/:id', () => {
    let articleId: string;

    beforeEach(async () => {
      const article = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Test Article', content: 'Test Content' });

      articleId = article.body.id;
    });

    it('should return article by id when user has read permission', async () => {
      const response = await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', articleId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('author');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .expect(401);
    });

    it('should fail when user has no read permission', async () => {
      await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent article', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/articles/${fakeId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body.message).toContain('Artigo não encontrado');
    });
  });

  describe('PUT /articles/:id', () => {
    let editorArticleId: string;
    let adminArticleId: string;

    beforeEach(async () => {
      // Create article by editor
      const editorArticle = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Editor Article', content: 'Editor Content' });
      editorArticleId = editorArticle.body.id;

      // Create article by admin
      const adminArticle = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Article', content: 'Admin Content' });
      adminArticleId = adminArticle.body.id;
    });

    it('should update own article when user has update permission', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated Content',
      };

      const response = await request(app.getHttpServer())
        .put(`/articles/${editorArticleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.content).toBe(updateData.content);
      expect(response.body.id).toBe(editorArticleId);
    });

    it('should fail to update article owned by another user', async () => {
      const updateData = {
        title: 'Trying to Update',
      };

      const response = await request(app.getHttpServer())
        .put(`/articles/${adminArticleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body.message).toContain(
        'Você não tem permissão para editar este artigo',
      );
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/articles/${editorArticleId}`)
        .send({ title: 'New Title' })
        .expect(401);
    });

    it('should fail when user has no update permission', async () => {
      await request(app.getHttpServer())
        .put(`/articles/${editorArticleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .send({ title: 'New Title' })
        .expect(403);
    });

    it('should return 404 for non-existent article', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .put(`/articles/${fakeId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'New Title' })
        .expect(404);
    });

    it('should update only provided fields', async () => {
      const updateData = {
        title: 'Only Title Updated',
      };

      const response = await request(app.getHttpServer())
        .put(`/articles/${editorArticleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.content).toBe('Editor Content'); // Original content
    });
  });

  describe('DELETE /articles/:id', () => {
    let editorArticleId: string;
    let adminArticleId: string;

    beforeEach(async () => {
      // Create article by editor
      const editorArticle = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Editor Article', content: 'Editor Content' });
      editorArticleId = editorArticle.body.id;

      // Create article by admin
      const adminArticle = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Article', content: 'Admin Content' });
      adminArticleId = adminArticle.body.id;
    });

    it('should delete own article when user has delete permission', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${editorArticleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(204);

      // Verify article is deleted
      await request(app.getHttpServer())
        .get(`/articles/${editorArticleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(404);
    });

    it('should fail to delete article owned by another user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/articles/${adminArticleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body.message).toContain(
        'Você não tem permissão para deletar este artigo',
      );

      // Verify article still exists
      await request(app.getHttpServer())
        .get(`/articles/${adminArticleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(200);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${editorArticleId}`)
        .expect(401);
    });

    it('should fail when user has no delete permission', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${editorArticleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent article', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/articles/${fakeId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(404);
    });
  });

  describe('Article Authorization and Ownership', () => {
    let userAToken: string;
    let userAId: string;
    let userBToken: string;
    let userBId: string;
    let userAArticleId: string;

    beforeEach(async () => {
      const permissions = await prisma.permission.findMany({
        where: {
          name: {
            in: [
              'read:articles',
              'create:articles',
              'update:articles',
              'delete:articles',
            ],
          },
        },
      });

      // Create User A
      const userA = {
        name: 'User A',
        email: 'usera@example.com',
        password: 'password123',
        permissionIds: permissions.map((p) => p.id),
      };

      const userAResponse = await request(app.getHttpServer())
        .post('/users/register')
        .send(userA);
      userAId = userAResponse.body.id;

      const userALogin = await request(app.getHttpServer())
        .post('/users/login')
        .send({ email: userA.email, password: userA.password });
      userAToken = userALogin.body.access_token;

      // Create User B
      const userB = {
        name: 'User B',
        email: 'userb@example.com',
        password: 'password123',
        permissionIds: permissions.map((p) => p.id),
      };

      const userBResponse = await request(app.getHttpServer())
        .post('/users/register')
        .send(userB);
      userBId = userBResponse.body.id;

      const userBLogin = await request(app.getHttpServer())
        .post('/users/login')
        .send({ email: userB.email, password: userB.password });
      userBToken = userBLogin.body.access_token;

      // Create article by User A
      const article = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'User A Article', content: 'Content by User A' });
      userAArticleId = article.body.id;
    });

    it('should allow user to update their own article', async () => {
      await request(app.getHttpServer())
        .put(`/articles/${userAArticleId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'Updated by User A' })
        .expect(200);
    });

    it('should prevent user from updating another users article', async () => {
      const response = await request(app.getHttpServer())
        .put(`/articles/${userAArticleId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ title: 'Trying to update' })
        .expect(403);

      expect(response.body.message).toContain(
        'Você não tem permissão para editar este artigo',
      );
    });

    it('should allow user to delete their own article', async () => {
      await request(app.getHttpServer())
        .delete(`/articles/${userAArticleId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);
    });

    it('should prevent user from deleting another users article', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/articles/${userAArticleId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);

      expect(response.body.message).toContain(
        'Você não tem permissão para deletar este artigo',
      );
    });

    it('should allow both users to read any article', async () => {
      // User A can read their own article
      await request(app.getHttpServer())
        .get(`/articles/${userAArticleId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      // User B can read User A's article
      await request(app.getHttpServer())
        .get(`/articles/${userAArticleId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);
    });
  });

  describe('Complete Article Workflow', () => {
    it('should complete full CRUD workflow for articles', async () => {
      // 1. Create article
      const createResponse = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Workflow Article',
          content: 'Initial content',
        })
        .expect(201);

      const articleId = createResponse.body.id;
      expect(createResponse.body.title).toBe('Workflow Article');

      // 2. Read article
      const readResponse = await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(readResponse.body.id).toBe(articleId);
      expect(readResponse.body.title).toBe('Workflow Article');

      // 3. Update article
      const updateResponse = await request(app.getHttpServer())
        .put(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Updated Workflow Article',
          content: 'Updated content',
        })
        .expect(200);

      expect(updateResponse.body.title).toBe('Updated Workflow Article');

      // 4. Verify update
      const verifyResponse = await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(verifyResponse.body.title).toBe('Updated Workflow Article');

      // 5. Delete article
      await request(app.getHttpServer())
        .delete(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(204);

      // 6. Verify deletion
      await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(404);
    });
  });

  describe('Permission-based Access Control', () => {
    it('should respect create permission', async () => {
      const article = { title: 'Test', content: 'Test' };

      // Reader cannot create
      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${readerToken}`)
        .send(article)
        .expect(403);

      // Editor can create
      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(article)
        .expect(201);

      // Admin can create
      await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(article)
        .expect(201);
    });

    it('should respect read permission', async () => {
      // Create article
      const article = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Test', content: 'Test' });

      const articleId = article.body.id;

      // User with no permissions cannot read
      await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);

      // Reader can read
      await request(app.getHttpServer())
        .get(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(200);
    });

    it('should respect update permission with ownership', async () => {
      // Create article as editor
      const article = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Test', content: 'Test' });

      const articleId = article.body.id;
      const updateData = { title: 'Updated' };

      // Reader cannot update (no permission)
      await request(app.getHttpServer())
        .put(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .send(updateData)
        .expect(403);

      // Editor can update own article
      await request(app.getHttpServer())
        .put(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData)
        .expect(200);

      // Admin cannot update editor's article (ownership check)
      await request(app.getHttpServer())
        .put(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should respect delete permission with ownership', async () => {
      // Create article as editor
      const article = await request(app.getHttpServer())
        .post('/articles')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Test', content: 'Test' });

      const articleId = article.body.id;

      // Reader cannot delete (no permission)
      await request(app.getHttpServer())
        .delete(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${readerToken}`)
        .expect(403);

      // Admin cannot delete editor's article (ownership check)
      await request(app.getHttpServer())
        .delete(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      // Editor can delete own article
      await request(app.getHttpServer())
        .delete(`/articles/${articleId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(204);
    });
  });
});
