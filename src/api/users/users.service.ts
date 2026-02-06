import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          password: hashedPassword,
        },
      });

      if (
        createUserDto.permissionIds &&
        createUserDto.permissionIds.length > 0
      ) {
        for (const permissionId of createUserDto.permissionIds) {
          await this.prisma.userPermission.create({
            data: { userId: user.id, permissionId },
          });
        }
      }

      const createdUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { permissions: { include: { permission: true } } },
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = createdUser;
      return userWithoutPassword;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email já está em uso');
      }
      throw error;
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Remove password from all users
    return users.map(({ password: _, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const dataToUpdate: any = {};

      if (updateUserDto.name) dataToUpdate.name = updateUserDto.name;
      if (updateUserDto.email) dataToUpdate.email = updateUserDto.email;
      if (updateUserDto.password) {
        dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      await this.prisma.user.update({ where: { id }, data: dataToUpdate });

      if (
        updateUserDto.permissionIds &&
        Array.isArray(updateUserDto.permissionIds)
      ) {
        await this.prisma.userPermission.deleteMany({ where: { userId: id } });
        for (const permissionId of updateUserDto.permissionIds) {
          await this.prisma.userPermission.create({
            data: { userId: id, permissionId },
          });
        }
      }

      const updatedUser = await this.prisma.user.findUnique({
        where: { id },
        include: { permissions: { include: { permission: true } } },
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email já está em uso');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuário não encontrado');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return { message: 'Usuário deletado com sucesso' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuário não encontrado');
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { permissions: { include: { permission: true } } },
    });
  }
}
