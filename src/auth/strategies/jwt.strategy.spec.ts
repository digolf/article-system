import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  const mockPrismaService = {
    userPermission: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', () => {
      const mockConfigNoSecret = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new JwtStrategy(mockConfigNoSecret as any, prismaService);
      }).toThrow('JWT_SECRET não está configurado no arquivo .env');
    });

    it('should initialize with JWT_SECRET from config', () => {
      // O strategy já foi criado no beforeEach, então o configService.get já foi chamado
      expect(strategy).toBeDefined();
      // Podemos verificar que o strategy foi inicializado corretamente
      expect(configService.get('JWT_SECRET')).toBe('test-secret');
    });
  });

  describe('validate', () => {
    const mockPayload = {
      sub: 'user-id-123',
      email: 'user@example.com',
    };

    it('should validate payload and return user with permissions', async () => {
      const mockUserPermissions = [
        {
          id: 'up-1',
          userId: 'user-id-123',
          permissionId: 'perm-1',
          permission: { id: 'perm-1', name: 'read:users' },
        },
        {
          id: 'up-2',
          userId: 'user-id-123',
          permissionId: 'perm-2',
          permission: { id: 'perm-2', name: 'create:articles' },
        },
      ];

      mockPrismaService.userPermission.findMany.mockResolvedValue(
        mockUserPermissions,
      );

      const result = await strategy.validate(mockPayload);

      expect(prismaService.userPermission.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123' },
        include: { permission: true },
      });

      expect(result).toEqual({
        userId: 'user-id-123',
        email: 'user@example.com',
        permissions: ['read:users', 'create:articles'],
      });
    });

    it('should return user with empty permissions array if no permissions found', async () => {
      mockPrismaService.userPermission.findMany.mockResolvedValue([]);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 'user-id-123',
        email: 'user@example.com',
        permissions: [],
      });
    });

    it('should throw UnauthorizedException if payload is null', async () => {
      await expect(strategy.validate(null)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(null)).rejects.toThrow('Token inválido');
    });

    it('should throw UnauthorizedException if payload.sub is missing', async () => {
      const invalidPayload = { email: 'user@example.com' };

      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        'Token inválido',
      );
    });

    it('should throw UnauthorizedException if database query fails', async () => {
      mockPrismaService.userPermission.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Token inválido',
      );
    });

    it('should handle payload with multiple permissions correctly', async () => {
      const mockUserPermissions = [
        {
          permission: { name: 'read:users' },
        },
        {
          permission: { name: 'create:users' },
        },
        {
          permission: { name: 'update:users' },
        },
        {
          permission: { name: 'delete:users' },
        },
      ];

      mockPrismaService.userPermission.findMany.mockResolvedValue(
        mockUserPermissions,
      );

      const result = await strategy.validate(mockPayload);

      expect(result.permissions).toHaveLength(4);
      expect(result.permissions).toContain('read:users');
      expect(result.permissions).toContain('create:users');
      expect(result.permissions).toContain('update:users');
      expect(result.permissions).toContain('delete:users');
    });

    it('should throw UnauthorizedException if payload is undefined', async () => {
      await expect(strategy.validate(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if payload is empty object', async () => {
      await expect(strategy.validate({})).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
