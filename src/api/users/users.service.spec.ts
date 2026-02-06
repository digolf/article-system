import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userPermission: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-id-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    permissions: [],
  };

  const mockUserWithPermissions = {
    ...mockUser,
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

  // Mock do usuário sem senha (como retornado pelo service)
  const mockUserWithoutPassword = {
    id: 'user-id-123',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    permissions: [],
  };

  const mockUserWithPermissionsNoPassword = {
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
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
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
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should create a user without permissions', async () => {
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
        },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        include: { permissions: { include: { permission: true } } },
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should create a user with permissions', async () => {
      const createUserDtoWithPerms = {
        ...createUserDto,
        permissionIds: ['perm-1', 'perm-2'],
      };
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userPermission.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUserWithPermissions,
      );

      const result = await service.create(createUserDtoWithPerms);

      expect(mockPrismaService.userPermission.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.userPermission.create).toHaveBeenCalledWith({
        data: { userId: mockUser.id, permissionId: 'perm-1' },
      });
      expect(mockPrismaService.userPermission.create).toHaveBeenCalledWith({
        data: { userId: mockUser.id, permissionId: 'perm-2' },
      });
      expect(result).toEqual(mockUserWithPermissionsNoPassword);
    });

    it('should handle empty permission array', async () => {
      const createUserDtoWithEmptyPerms = {
        ...createUserDto,
        permissionIds: [],
      };
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.create(createUserDtoWithEmptyPerms);

      expect(mockPrismaService.userPermission.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserWithoutPassword);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-id-456' }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        include: { permissions: { include: { permission: true } } },
        orderBy: { createdAt: 'desc' },
      });
      // O serviço remove as senhas, então esperamos users sem password
      const expectedResult = mockUsers.map(({ password: _, ...user }) => user);
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-id-123');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        include: { permissions: { include: { permission: true } } },
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'John Updated',
    };

    it('should update user name', async () => {
      const updatedUser = { ...mockUser, name: 'John Updated' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockPrismaService.user.findUnique.mockResolvedValue(updatedUser);

      const result = await service.update('user-id-123', updateUserDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { name: 'John Updated' },
      });
      const { password: _, ...expectedResult } = updatedUser;
      expect(result).toEqual(expectedResult);
    });

    it('should update user email', async () => {
      const updateDto = { email: 'newemail@example.com' };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockPrismaService.user.findUnique.mockResolvedValue(updatedUser);

      const result = await service.update('user-id-123', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { email: 'newemail@example.com' },
      });
      const { password: _, ...expectedResult } = updatedUser;
      expect(result).toEqual(expectedResult);
    });

    it('should update user password with hashing', async () => {
      const updateDto = { password: 'newPassword123' };
      const hashedPassword = 'newHashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.update('user-id-123', updateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { password: hashedPassword },
      });
    });

    it('should update user permissions', async () => {
      const updateDto = {
        name: 'John Updated',
        permissionIds: ['perm-3', 'perm-4'],
      };
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.userPermission.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.userPermission.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUserWithPermissions,
      );

      const result = await service.update('user-id-123', updateDto);

      expect(mockPrismaService.userPermission.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123' },
      });
      expect(mockPrismaService.userPermission.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUserWithPermissionsNoPassword);
    });

    it('should update multiple fields at once', async () => {
      const updateDto = {
        name: 'John Updated',
        email: 'updated@example.com',
        password: 'newPassword',
      };
      const hashedPassword = 'newHashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.update('user-id-123', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: {
          name: 'John Updated',
          email: 'updated@example.com',
          password: hashedPassword,
        },
      });
    });

    it('should not update permissions if permissionIds is not an array', async () => {
      const updateDto = { name: 'John Updated', permissionIds: undefined };
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.update('user-id-123', updateDto);

      expect(mockPrismaService.userPermission.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaService.userPermission.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('user-id-123');

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
      });
      expect(result).toEqual({ message: 'Usuário deletado com sucesso' });
    });

    it('should handle deletion errors', async () => {
      mockPrismaService.user.delete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.remove('user-id-123')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        include: { permissions: { include: { permission: true } } },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('error handling edge cases', () => {
    it('should rethrow generic errors in create', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      const genericError = new Error('Unexpected database error');
      mockPrismaService.user.create.mockRejectedValue(genericError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Unexpected database error',
      );
    });

    it('should rethrow generic errors in update', async () => {
      const updateDto = { name: 'Updated Name' };
      const genericError = new Error('Unexpected update error');
      
      mockPrismaService.user.update.mockRejectedValue(genericError);

      await expect(service.update('user-id-123', updateDto)).rejects.toThrow(
        'Unexpected update error',
      );
    });

    it('should rethrow generic errors in remove', async () => {
      const genericError = new Error('Unexpected delete error');
      
      mockPrismaService.user.delete.mockRejectedValue(genericError);

      await expect(service.remove('user-id-123')).rejects.toThrow(
        'Unexpected delete error',
      );
    });
  });
});
