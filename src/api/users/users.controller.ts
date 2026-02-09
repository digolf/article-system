import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from '../../auth/auth.service';
import { UnifiedAuthGuard } from '../../auth/guards';
import { RequirePermissions, OptionalAuth } from '../../auth/decorators';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @ApiTags('Users')
  @Post()
  @UseGuards(UnifiedAuthGuard)
  @OptionalAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar novo usuário',
    description:
      '**Rota híbrida que funciona de 2 formas:**\n\n' +
      '1️⃣ **Sem token (Público - Auto-cadastro)**\n' +
      '   - Qualquer pessoa pode criar uma conta\n' +
      '   - Role é IGNORADA por segurança\n' +
      '   - Sempre cria com role "reader" (apenas leitura)\n\n' +
      '2️⃣ **Com token admin (Criar usuário customizado)**\n' +
      '   - Requer autenticação com role "admin"\n' +
      '   - Pode especificar role: "admin", "editor" ou "reader"\n' +
      '   - Admin pode criar outros admins\n\n' +
      '**Roles disponíveis:**\n' +
      '- `admin` - Acesso total (gerenciar usuários + artigos)\n' +
      '- `editor` - Criar e editar artigos (apenas próprios)\n' +
      '- `reader` - Apenas leitura de artigos',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      'public-register': {
        summary: 'Auto-cadastro público (SEM TOKEN)',
        description:
          'Cria usuário com role "reader" automaticamente. Campo "role" é ignorado.',
        value: {
          name: 'João Silva',
          email: 'joao@example.com',
          password: 'senha123',
        },
      },
      'admin-create-admin': {
        summary: 'Admin criar outro admin (COM TOKEN)',
        description: 'Requer token de admin no header Authorization',
        value: {
          name: 'Novo Admin',
          email: 'admin@example.com',
          password: 'senha123',
          role: 'admin',
        },
      },
      'admin-create-editor': {
        summary: 'Admin criar editor (COM TOKEN)',
        description: 'Requer token de admin no header Authorization',
        value: {
          name: 'Editor User',
          email: 'editor@example.com',
          password: 'senha123',
          role: 'editor',
        },
      },
      'admin-create-reader': {
        summary: 'Admin criar usuário reader (COM TOKEN)',
        description: 'Requer token de admin no header Authorization',
        value: {
          name: 'Reader User',
          email: 'reader@example.com',
          password: 'senha123',
          role: 'reader',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'João Silva',
        email: 'joao@example.com',
        createdAt: '2026-02-07T14:30:00.000Z',
        updatedAt: '2026-02-07T14:30:00.000Z',
        permissions: [
          {
            id: 'perm-123',
            permission: {
              id: 'xyz-789',
              name: 'read:articles',
              description: 'Pode ler artigos',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['Email inválido', 'Senha deve ter no mínimo 6 caracteres'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email já cadastrado',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email já está em uso',
        error: 'Conflict',
      },
    },
  })
  @ApiBearerAuth('JWT-auth')
  async create(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    return await this.usersService.create(createUserDto, req.user);
  }

  @ApiTags('Auth')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuário',
    description: 'Realiza login e retorna token JWT para autenticação',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'João Silva',
          email: 'joao.silva@email.com',
          permissions: ['read:articles', 'create:articles'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
    schema: {
      example: {
        statusCode: 401,
        message: 'Email ou senha inválidos',
        error: 'Unauthorized',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto.email, loginDto.password);
  }

  @Get()
  @UseGuards(UnifiedAuthGuard)
  @RequirePermissions('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description:
      'Retorna lista de todos os usuários cadastrados (requer permissão de admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'João Silva',
          email: 'joao.silva@email.com',
          createdAt: '2026-02-06T14:23:38.000Z',
          updatedAt: '2026-02-06T14:23:38.000Z',
          permissions: [
            {
              permission: {
                id: 'perm-id-1',
                name: 'read:articles',
                description: 'Ler artigos',
              },
            },
          ],
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão',
    schema: {
      example: {
        statusCode: 403,
        message: 'Você não tem permissão para acessar este recurso',
        error: 'Forbidden',
      },
    },
  })
  async findAll() {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(UnifiedAuthGuard)
  @RequirePermissions('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description:
      'Retorna dados de um usuário específico (requer permissão de admin)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'João Silva',
        email: 'joao.silva@email.com',
        createdAt: '2026-02-06T14:23:38.000Z',
        updatedAt: '2026-02-06T14:23:38.000Z',
        permissions: [],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão',
    schema: {
      example: {
        statusCode: 403,
        message: 'Você não tem permissão para acessar este recurso',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Usuário não encontrado',
        error: 'Not Found',
      },
    },
  })
  async findOne(@Param('id') id: string) {
    try {
      return await this.usersService.findOne(id);
    } catch (error) {
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(UnifiedAuthGuard)
  @RequirePermissions('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Atualizar usuário',
    description:
      'Atualiza dados de um usuário específico (requer permissão de admin)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'João Silva Santos',
        email: 'joao.silva@email.com',
        createdAt: '2026-02-06T14:23:38.000Z',
        updatedAt: '2026-02-06T14:30:00.000Z',
        permissions: [],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Email já está em uso por outro usuário',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      return await this.usersService.update(id, updateUserDto);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(UnifiedAuthGuard)
  @RequirePermissions('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar usuário',
    description: 'Remove um usuário do sistema (requer permissão de admin)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Usuário deletado com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para deletar usuários',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
  })
  async remove(@Param('id') id: string) {
    try {
      return await this.usersService.remove(id);
    } catch (error) {
      throw error;
    }
  }
}

