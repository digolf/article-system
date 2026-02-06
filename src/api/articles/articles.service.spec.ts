import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    article: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuthor = {
    id: 'author-id-123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockArticle = {
    id: 'article-id-123',
    title: 'Test Article',
    content: 'This is test content',
    published: false,
    authorId: 'author-id-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    author: mockAuthor,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createArticleDto: CreateArticleDto = {
      title: 'Test Article',
      content: 'This is test content',
      published: false,
    };

    it('should create an article successfully', async () => {
      mockPrismaService.article.create.mockResolvedValue(mockArticle);

      const result = await service.create(createArticleDto, 'author-id-123');

      expect(mockPrismaService.article.create).toHaveBeenCalledWith({
        data: {
          ...createArticleDto,
          authorId: 'author-id-123',
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      expect(result).toEqual(mockArticle);
    });

    it('should create a published article', async () => {
      const publishedArticleDto = { ...createArticleDto, published: true };
      const publishedArticle = { ...mockArticle, published: true };
      mockPrismaService.article.create.mockResolvedValue(publishedArticle);

      const result = await service.create(publishedArticleDto, 'author-id-123');

      expect(mockPrismaService.article.create).toHaveBeenCalledWith({
        data: {
          ...publishedArticleDto,
          authorId: 'author-id-123',
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      expect(result.published).toBe(true);
    });

    it('should handle creation errors', async () => {
      mockPrismaService.article.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.create(createArticleDto, 'author-id-123'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all articles', async () => {
      const mockArticles = [
        mockArticle,
        { ...mockArticle, id: 'article-id-456', title: 'Second Article' },
      ];
      mockPrismaService.article.findMany.mockResolvedValue(mockArticles);

      const result = await service.findAll();

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockArticles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no articles exist', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should return articles ordered by createdAt desc', async () => {
      const article1 = {
        ...mockArticle,
        id: 'article-1',
        createdAt: new Date('2024-01-01'),
      };
      const article2 = {
        ...mockArticle,
        id: 'article-2',
        createdAt: new Date('2024-01-02'),
      };
      mockPrismaService.article.findMany.mockResolvedValue([
        article2,
        article1,
      ]);

      const result = await service.findAll();

      expect(result[0].createdAt > result[1].createdAt).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return an article by id', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      const result = await service.findOne('article-id-123');

      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-id-123' },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Artigo não encontrado',
      );
    });
  });

  describe('update', () => {
    const updateArticleDto: UpdateArticleDto = {
      title: 'Updated Title',
    };

    it('should update an article when user is the author', async () => {
      const updatedArticle = { ...mockArticle, title: 'Updated Title' };
      mockPrismaService.article.findUnique
        .mockResolvedValueOnce(mockArticle)
        .mockResolvedValueOnce(updatedArticle);
      mockPrismaService.article.update.mockResolvedValue(updatedArticle);

      const result = await service.update(
        'article-id-123',
        updateArticleDto,
        'author-id-123',
      );

      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-id-123' },
      });
      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article-id-123' },
        data: updateArticleDto,
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      expect(result).toEqual(updatedArticle);
    });

    it('should update article content', async () => {
      const updateDto = { content: 'Updated content' };
      const updatedArticle = { ...mockArticle, content: 'Updated content' };
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue(updatedArticle);

      const result = await service.update(
        'article-id-123',
        updateDto,
        'author-id-123',
      );

      expect(result.content).toBe('Updated content');
    });

    it('should update article published status', async () => {
      const updateDto = { published: true };
      const updatedArticle = { ...mockArticle, published: true };
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue(updatedArticle);

      const result = await service.update(
        'article-id-123',
        updateDto,
        'author-id-123',
      );

      expect(result.published).toBe(true);
    });

    it('should throw NotFoundException when article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateArticleDto, 'author-id-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent-id', updateArticleDto, 'author-id-123'),
      ).rejects.toThrow('Artigo não encontrado');
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      await expect(
        service.update('article-id-123', updateArticleDto, 'different-user-id'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('article-id-123', updateArticleDto, 'different-user-id'),
      ).rejects.toThrow('Você não tem permissão para editar este artigo');
    });

    it('should update multiple fields at once', async () => {
      const updateDto = {
        title: 'New Title',
        content: 'New Content',
        published: true,
      };
      const updatedArticle = { ...mockArticle, ...updateDto };
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue(updatedArticle);

      const result = await service.update(
        'article-id-123',
        updateDto,
        'author-id-123',
      );

      expect(result.title).toBe('New Title');
      expect(result.content).toBe('New Content');
      expect(result.published).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete an article when user is the author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.delete.mockResolvedValue(mockArticle);

      const result = await service.remove('article-id-123', 'author-id-123');

      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-id-123' },
      });
      expect(mockPrismaService.article.delete).toHaveBeenCalledWith({
        where: { id: 'article-id-123' },
      });
      expect(result).toEqual({ message: 'Artigo deletado com sucesso' });
    });

    it('should throw NotFoundException when article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-id', 'author-id-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.remove('non-existent-id', 'author-id-123'),
      ).rejects.toThrow('Artigo não encontrado');
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      await expect(
        service.remove('article-id-123', 'different-user-id'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove('article-id-123', 'different-user-id'),
      ).rejects.toThrow('Você não tem permissão para deletar este artigo');
    });

    it('should handle deletion errors', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.delete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.remove('article-id-123', 'author-id-123'),
      ).rejects.toThrow('Database error');
    });
  });
});
