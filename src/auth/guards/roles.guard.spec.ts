import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './roles.guard';
import { PERMISSIONS_KEY } from '../decorators';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if no permissions are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );
    });

    it('should return true if required permissions array is empty', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has required permission', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['read:users']);
      const user = {
        userId: 'user-123',
        permissions: ['read:users', 'create:users'],
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has at least one of multiple required permissions', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'read:users',
        'create:users',
      ]);
      const user = {
        userId: 'user-123',
        permissions: ['read:users'],
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required permission', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['delete:users']);
      const user = {
        userId: 'user-123',
        permissions: ['read:users'],
      };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Você não tem permissão para acessar este recurso',
      );
    });

    it('should throw ForbiddenException if user is not authenticated', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['read:users']);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Usuário não autenticado',
      );
    });

    it('should throw ForbiddenException if user has no permissions property', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['read:users']);
      const user = { userId: 'user-123' };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Usuário não autenticado',
      );
    });

    it('should throw ForbiddenException if user permissions is empty array', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['read:users']);
      const user = {
        userId: 'user-123',
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Você não tem permissão para acessar este recurso',
      );
    });

    it('should handle multiple permissions correctly', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'read:articles',
        'create:articles',
      ]);
      const user = {
        userId: 'user-123',
        permissions: ['create:articles', 'update:articles'],
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException for unexpected errors', () => {
      mockReflector.getAllAndOverride.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Erro ao verificar permissões',
      );
    });

    it('should return true when user has all required permissions', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'read:users',
        'create:users',
      ]);
      const user = {
        userId: 'user-123',
        permissions: ['read:users', 'create:users', 'update:users'],
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user object exists but is undefined', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['read:users']);
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle case-sensitive permission names', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['Read:Users']);
      const user = {
        userId: 'user-123',
        permissions: ['read:users'],
      };
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
