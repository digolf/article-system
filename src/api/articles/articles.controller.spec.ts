import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let articlesService: ArticlesService;

  const mockArticlesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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

  const mockRequest = {
    user: {
      userId: 'author-id-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: ArticlesService,
          useValue: mockArticlesService,
        },
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    articlesService = module.get<ArticlesService>(ArticlesService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createArticleDto: CreateArticleDto = {
      title: 'Test Article',
      content: 'This is test content',
      published: false,
    };

    it('should create an article', async () => {
      mockArticlesService.create.mockResolvedValue(mockArticle);

      const result = await controller.create(createArticleDto, mockRequest);

      expect(articlesService.create).toHaveBeenCalledWith(
        createArticleDto,
        mockRequest.user.userId,
      );
      expect(result).toEqual(mockArticle);
    });

    it('should create a published article', async () => {
      const publishedDto = { ...createArticleDto, published: true };
      const publishedArticle = { ...mockArticle, published: true };
      mockArticlesService.create.mockResolvedValue(publishedArticle);

      const result = await controller.create(publishedDto, mockRequest);

      expect(articlesService.create).toHaveBeenCalledWith(
        publishedDto,
        mockRequest.user.userId,
      );
      expect(result.published).toBe(true);
    });

    it('should include author information in response', async () => {
      mockArticlesService.create.mockResolvedValue(mockArticle);

      const result = await controller.create(createArticleDto, mockRequest);

      expect(result.author).toBeDefined();
      expect(result.author.id).toBe('author-id-123');
      expect(result.author.name).toBe('John Doe');
    });

    it('should handle validation errors', async () => {
      mockArticlesService.create.mockRejectedValue(
        new Error('Validation failed'),
      );

      await expect(
        controller.create(createArticleDto, mockRequest),
      ).rejects.toThrow('Validation failed');
    });

    it('should use authenticated user as author', async () => {
      const differentUserRequest = { user: { userId: 'different-user-id' } };
      mockArticlesService.create.mockResolvedValue({
        ...mockArticle,
        authorId: 'different-user-id',
      });

      await controller.create(createArticleDto, differentUserRequest);

      expect(articlesService.create).toHaveBeenCalledWith(
        createArticleDto,
        'different-user-id',
      );
    });
  });

  describe('findAll', () => {
    it('should return all articles', async () => {
      const mockArticles = [
        mockArticle,
        {
          ...mockArticle,
          id: 'article-id-456',
          title: 'Second Article',
        },
      ];
      mockArticlesService.findAll.mockResolvedValue(mockArticles);

      const result = await controller.findAll();

      expect(articlesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockArticles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no articles exist', async () => {
      mockArticlesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should include author information for all articles', async () => {
      const mockArticles = [mockArticle];
      mockArticlesService.findAll.mockResolvedValue(mockArticles);

      const result = await controller.findAll();

      expect(result[0].author).toBeDefined();
      expect(result[0].author.id).toBe('author-id-123');
    });
  });

  describe('findOne', () => {
    it('should return an article by id', async () => {
      mockArticlesService.findOne.mockResolvedValue(mockArticle);

      const result = await controller.findOne('article-id-123');

      expect(articlesService.findOne).toHaveBeenCalledWith('article-id-123');
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when article not found', async () => {
      mockArticlesService.findOne.mockRejectedValue(
        new NotFoundException('Artigo não encontrado'),
      );

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include author information', async () => {
      mockArticlesService.findOne.mockResolvedValue(mockArticle);

      const result = await controller.findOne('article-id-123');

      expect(result.author).toBeDefined();
      expect(result.author.name).toBe('John Doe');
    });
  });

  describe('update', () => {
    const updateArticleDto: UpdateArticleDto = {
      title: 'Updated Title',
    };

    it('should update an article when user is the author', async () => {
      const updatedArticle = { ...mockArticle, title: 'Updated Title' };
      mockArticlesService.update.mockResolvedValue(updatedArticle);

      const result = await controller.update(
        'article-id-123',
        updateArticleDto,
        mockRequest,
      );

      expect(articlesService.update).toHaveBeenCalledWith(
        'article-id-123',
        updateArticleDto,
        mockRequest.user.userId,
      );
      expect(result).toEqual(updatedArticle);
      expect(result.title).toBe('Updated Title');
    });

    it('should update article content', async () => {
      const updateDto = { content: 'Updated content' };
      const updatedArticle = { ...mockArticle, content: 'Updated content' };
      mockArticlesService.update.mockResolvedValue(updatedArticle);

      const result = await controller.update(
        'article-id-123',
        updateDto,
        mockRequest,
      );

      expect(result.content).toBe('Updated content');
    });

    it('should update published status', async () => {
      const updateDto = { published: true };
      const updatedArticle = { ...mockArticle, published: true };
      mockArticlesService.update.mockResolvedValue(updatedArticle);

      const result = await controller.update(
        'article-id-123',
        updateDto,
        mockRequest,
      );

      expect(result.published).toBe(true);
    });

    it('should throw NotFoundException when article not found', async () => {
      mockArticlesService.update.mockRejectedValue(
        new NotFoundException('Artigo não encontrado'),
      );

      await expect(
        controller.update('non-existent-id', updateArticleDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockArticlesService.update.mockRejectedValue(
        new ForbiddenException(
          'Você não tem permissão para editar este artigo',
        ),
      );

      const differentUserRequest = { user: 'different-user-id' };

      await expect(
        controller.update('article-id-123', updateArticleDto, differentUserRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update multiple fields at once', async () => {
      const updateDto = {
        title: 'New Title',
        content: 'New Content',
        published: true,
      };
      const updatedArticle = { ...mockArticle, ...updateDto };
      mockArticlesService.update.mockResolvedValue(updatedArticle);

      const result = await controller.update(
        'article-id-123',
        updateDto,
        mockRequest,
      );

      expect(result.title).toBe('New Title');
      expect(result.content).toBe('New Content');
      expect(result.published).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete an article when user is the author', async () => {
      const mockResponse = { message: 'Artigo deletado com sucesso' };
      mockArticlesService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove('article-id-123', mockRequest);

      expect(articlesService.remove).toHaveBeenCalledWith(
        'article-id-123',
        mockRequest.user.userId,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException when article not found', async () => {
      mockArticlesService.remove.mockRejectedValue(
        new NotFoundException('Artigo não encontrado'),
      );

      await expect(
        controller.remove('non-existent-id', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockArticlesService.remove.mockRejectedValue(
        new ForbiddenException(
          'Você não tem permissão para deletar este artigo',
        ),
      );

      const differentUserRequest = { user: 'different-user-id' };

      await expect(
        controller.remove('article-id-123', differentUserRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle deletion errors', async () => {
      mockArticlesService.remove.mockRejectedValue(
        new Error('Cannot delete article'),
      );

      await expect(
        controller.remove('article-id-123', mockRequest),
      ).rejects.toThrow('Cannot delete article');
    });
  });
});
