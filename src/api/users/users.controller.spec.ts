import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let authService: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn(),
    validateUser: jest.fn(),
  };

  const mockUser = {
    id: 'user-id-123',
    name: 'John Doe',
    email: 'john@example.com',
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
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const mockRequest = {
      user: null,
    };

    it('should create a new user', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, mockRequest as any);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto, null);
      expect(result).toEqual(mockUser);
    });

    it('should create a user with permissions when admin', async () => {
      const createUserDtoWithPerms = {
        ...createUserDto,
        permissionIds: ['perm-1', 'perm-2'],
      };
      const adminRequest = {
        user: { id: 'admin-id', permissions: [{ permission: { name: 'admin' } }] },
      };
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDtoWithPerms, adminRequest as any);

      expect(usersService.create).toHaveBeenCalledWith(createUserDtoWithPerms, adminRequest.user);
      expect(result).toEqual(mockUser);
    });

    it('should handle validation errors', async () => {
      mockUsersService.create.mockRejectedValue(
        new Error('Validation failed'),
      );

      await expect(controller.create(createUserDto, mockRequest as any)).rejects.toThrow(
        'Validation failed',
      );
    });

    it('should handle duplicate email errors', async () => {
      mockUsersService.create.mockRejectedValue(new Error('Email já em uso'));

      await expect(controller.create(createUserDto, mockRequest as any)).rejects.toThrow(
        'Email já em uso',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should return access token on successful login', async () => {
      const mockLoginResponse = {
        access_token: 'mock.jwt.token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          permissions: ['read:articles'],
        },
      };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toEqual(mockLoginResponse);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });

    it('should handle invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new Error('Credenciais inválidas'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Credenciais inválidas',
      );
    });

    it('should include user permissions in response', async () => {
      const mockLoginResponse = {
        access_token: 'mock.jwt.token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          permissions: ['read:articles', 'create:articles'],
        },
      };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result.user.permissions).toBeDefined();
      expect(Array.isArray(result.user.permissions)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-id-456', email: 'jane@example.com' },
      ];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-id-123');

      expect(usersService.findOne).toHaveBeenCalledWith('user-id-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include user permissions in response', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-id-123');

      expect(result.permissions).toBeDefined();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'John Updated',
    };

    it('should update a user', async () => {
      const updatedUser = { ...mockUser, name: 'John Updated' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user-id-123', updateUserDto);

      expect(usersService.update).toHaveBeenCalledWith(
        'user-id-123',
        updateUserDto,
      );
      expect(result).toEqual(updatedUser);
      expect(result.name).toBe('John Updated');
    });

    it('should update user email', async () => {
      const updateDto = { email: 'newemail@example.com' };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user-id-123', updateDto);

      expect(result.email).toBe('newemail@example.com');
    });

    it('should update user password', async () => {
      const updateDto = { password: 'newPassword123' };
      mockUsersService.update.mockResolvedValue(mockUser);

      await controller.update('user-id-123', updateDto);

      expect(usersService.update).toHaveBeenCalledWith('user-id-123', updateDto);
    });

    it('should update user permissions', async () => {
      const updateDto = {
        name: 'John Updated',
        permissionIds: ['perm-3', 'perm-4'],
      };
      mockUsersService.update.mockResolvedValue(mockUser);

      await controller.update('user-id-123', updateDto);

      expect(usersService.update).toHaveBeenCalledWith('user-id-123', updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      await expect(
        controller.update('non-existent-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle duplicate email errors', async () => {
      const updateDto = { email: 'existing@example.com' };
      mockUsersService.update.mockRejectedValue(new Error('Email já em uso'));

      await expect(
        controller.update('user-id-123', updateDto),
      ).rejects.toThrow('Email já em uso');
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const mockResponse = { message: 'Usuário deletado com sucesso' };
      mockUsersService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove('user-id-123');

      expect(usersService.remove).toHaveBeenCalledWith('user-id-123');
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle deletion errors', async () => {
      mockUsersService.remove.mockRejectedValue(
        new Error('Cannot delete user'),
      );

      await expect(controller.remove('user-id-123')).rejects.toThrow(
        'Cannot delete user',
      );
    });
  });
});
