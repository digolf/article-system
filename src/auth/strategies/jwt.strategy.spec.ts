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

  const mockPrismaService = {};

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
      role: 'editor',
    };

    it('should validate payload and return user with role', async () => {
      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 'user-id-123',
        role: 'editor',
      });
    });

    it('should validate admin role', async () => {
      const adminPayload = {
        sub: 'admin-id-123',
        role: 'admin',
      };

      const result = await strategy.validate(adminPayload);

      expect(result).toEqual({
        userId: 'admin-id-123',
        role: 'admin',
      });
    });

    it('should throw UnauthorizedException if payload is null', async () => {
      await expect(strategy.validate(null)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(null)).rejects.toThrow('Token inválido');
    });

    it('should throw UnauthorizedException if payload.sub is missing', async () => {
      const invalidPayload = { role: 'editor' };

      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        'Token inválido',
      );
    });

    it('should throw UnauthorizedException if payload.role is missing', async () => {
      const invalidPayload = { sub: 'user-id-123' };

      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        'Token inválido',
      );
    });

    it('should validate reader role', async () => {
      const readerPayload = {
        sub: 'reader-id-123',
        role: 'reader',
      };

      const result = await strategy.validate(readerPayload);

      expect(result).toEqual({
        userId: 'reader-id-123',
        role: 'reader',
      });
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
