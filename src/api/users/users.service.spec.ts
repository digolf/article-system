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
    role: {
      findUnique: jest.fn(),
    },
    userPermission: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
  };

  const mockRole = {
    id: 'role-id-reader',
    name: 'reader',
    description: 'Apenas leitura de artigos',
  };

  const mockUser = {
    id: 'user-id-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    role: {
      name: 'reader',
      description: 'Apenas leitura de artigos',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  // Mock do usuário sem senha (como retornado pelo service)
  const mockUserWithoutPassword = {
    id: 'user-id-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: {
      name: 'reader',
      description: 'Apenas leitura de artigos',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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

    it('should create a user with reader role by default', async () => {
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'reader' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          roleId: mockRole.id,
        },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should create a user with custom role when admin creates', async () => {
      const createUserDtoWithRole = {
        ...createUserDto,
        role: 'editor' as any,
      };
      const hashedPassword = 'hashedPassword123';
      const adminUser = { userId: 'admin-123', role: 'admin' };
      const mockEditorRole = { id: 'role-id-editor', name: 'editor', description: 'Editor' };
      const editorUser = { 
        ...mockUser, 
        role: { name: 'editor', description: 'Editor' },
      };
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.role.findUnique.mockResolvedValue(mockEditorRole);
      mockPrismaService.user.create.mockResolvedValue(editorUser);
      mockPrismaService.user.findUnique.mockResolvedValue(editorUser);

      const result = await service.create(createUserDtoWithRole, adminUser);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'editor' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          roleId: mockEditorRole.id,
        },
      });
      expect(result.role).toEqual({ name: 'editor', description: 'Editor' });
    });

    it('should force reader role when non-admin creates user', async () => {
      const createUserDtoWithRole = {
        ...createUserDto,
        role: 'admin' as any,
      };
      const hashedPassword = 'hashedPassword123';
      const regularUser = { userId: 'user-123', role: 'reader' };
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.create(createUserDtoWithRole, regularUser);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'reader' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          roleId: mockRole.id,
        },
      });
      expect(result.role).toEqual({ name: 'reader', description: 'Apenas leitura de artigos' });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-id-456' }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          role: {
            select: {
              name: true,
              description: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      // O serviço já retorna users sem password
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.findOne('user-id-123');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true, description: true } },
          createdAt: true,
          updatedAt: true,
        },
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
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: { select: { name: true, description: true } },
          createdAt: true,
          updatedAt: true,
        },
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
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: { select: { name: true, description: true } },
          createdAt: true,
          updatedAt: true,
        },
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
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: { select: { name: true, description: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should update user role', async () => {
      const updateDto = {
        name: 'John Updated',
        role: 'editor' as any,
      };
      const mockEditorRole = { id: 'role-id-editor', name: 'editor', description: 'Editor' };
      const updatedUser = { 
        ...mockUser, 
        name: 'John Updated', 
        role: { name: 'editor', description: 'Editor' },
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockEditorRole);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-id-123', updateDto);

      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'editor' },
      });
      expect(result.role).toEqual({ name: 'editor', description: 'Editor' });
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
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: { select: { name: true, description: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should not update role if role is not provided', async () => {
      const updateDto = { name: 'John Updated' };
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.update('user-id-123', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ role: expect.anything() }),
        }),
      );
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
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: { select: { name: true, description: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should handle error in findByEmail', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByEmail('john@example.com')).rejects.toThrow(
        'Database error',
      );
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
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      
      const genericError = new Error('Unexpected database error');
      mockPrismaService.user.create.mockRejectedValue(genericError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Unexpected database error',
      );
    });

    it('should handle ConflictException in update when email already exists', async () => {
      const updateDto = { email: 'existing@example.com' };
      mockPrismaService.user.update.mockRejectedValue(
        Object.assign(new Error('Email already exists'), { code: 'P2002' })
      );

      await expect(service.update('user-id-123', updateDto)).rejects.toThrow();
    });

    it('should handle NotFoundException in update when user not found', async () => {
      const updateDto = { name: 'John Updated' };
      mockPrismaService.user.update.mockRejectedValue(
        Object.assign(new Error('Record not found'), { code: 'P2025' })
      );

      await expect(service.update('user-id-123', updateDto)).rejects.toThrow();
    });

    it('should handle NotFoundException in remove when user not found', async () => {
      mockPrismaService.user.delete.mockRejectedValue(
        Object.assign(new Error('Record not found'), { code: 'P2025' })
      );

      await expect(service.remove('user-id-123')).rejects.toThrow();
    });

    it('should handle error in findAll', async () => {
      mockPrismaService.user.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow('Database error');
    });

    it('should handle error in findOne', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne('user-id-123')).rejects.toThrow(
        'Database error',
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
