import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo usuário
   * Se requestingUser for admin, pode definir qualquer role
   * Se não for admin (registro público), cria como 'reader'
   */
  async create(createUserDto: CreateUserDto, requestingUser?: any) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Verificar se o usuário que está criando é admin
    const isAdmin = requestingUser?.role === 'admin';

    // Determinar role: se admin, usar role fornecida; senão, forçar 'reader'
    let role = UserRole.READER;
    if (isAdmin && createUserDto.role) {
      role = createUserDto.role;
    }

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: role,
      },
    });

    // Buscar usuário criado sem a senha
    const createdUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!createdUser) {
      throw new NotFoundException('Usuário não encontrado após criação');
    }

    const { password: _, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const dataToUpdate: any = {};

    if (updateUserDto.name) dataToUpdate.name = updateUserDto.name;
    if (updateUserDto.email) dataToUpdate.email = updateUserDto.email;
    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    if (updateUserDto.role) dataToUpdate.role = updateUserDto.role;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!updatedUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuário deletado com sucesso' };
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
