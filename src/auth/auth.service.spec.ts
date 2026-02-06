import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUser = {
    id: 'user-id-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    permissions: [
      {
        id: 'user-perm-1',
        userId: 'user-id-123',
        permissionId: 'perm-1',
        permission: {
          id: 'perm-1',
          name: 'read:articles',
          description: 'Read articles',
        },
      },
      {
        id: 'user-perm-2',
        userId: 'user-id-123',
        permissionId: 'perm-2',
        permission: {
          id: 'perm-2',
          name: 'create:articles',
          description: 'Create articles',
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'john@example.com',
        'password123',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword123',
      );
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        permissions: mockUser.permissions,
      });
      expect(result.password).toBeUndefined();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('notfound@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('notfound@example.com', 'password123'),
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('john@example.com', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('john@example.com', 'wrongPassword'),
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('should throw UnauthorizedException on database error', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.validateUser('john@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('john@example.com', 'password123'),
      ).rejects.toThrow('Erro ao validar usuário');
    });

    it('should throw UnauthorizedException on bcrypt error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error'),
      );

      await expect(
        service.validateUser('john@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('john@example.com', 'password123'),
      ).rejects.toThrow('Erro ao validar usuário');
    });
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      const mockToken = 'mock.jwt.token';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login('john@example.com', 'password123');

      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          permissions: [
            {
              id: 'perm-1',
              name: 'read:articles',
              description: 'Read articles',
            },
            {
              id: 'perm-2',
              name: 'create:articles',
              description: 'Create articles',
            },
          ],
        },
      });
    });

    it('should sign JWT with correct payload', async () => {
      const mockToken = 'mock.jwt.token';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      await service.login('john@example.com', 'password123');

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        permissions: ['read:articles', 'create:articles'],
      });
    });

    it('should handle user with no permissions', async () => {
      const userWithoutPerms = {
        ...mockUser,
        permissions: [],
      };
      const mockToken = 'mock.jwt.token';
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutPerms);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login('john@example.com', 'password123');

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: userWithoutPerms.id,
        email: userWithoutPerms.email,
        permissions: [],
      });
      expect(result.user.permissions).toEqual([]);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('notfound@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('john@example.com', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on validateUser error', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.login('john@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login('john@example.com', 'password123'),
      ).rejects.toThrow('Erro ao validar usuário');
    });

    it('should throw UnauthorizedException on JWT signing error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });

      await expect(
        service.login('john@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login('john@example.com', 'password123'),
      ).rejects.toThrow('Erro ao realizar login');
    });
  });
});
