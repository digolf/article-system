import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/decorators/roles.decorator';

@ApiTags('Articles')
@Controller('articles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create:articles')
  @ApiOperation({
    summary: 'Criar novo artigo',
    description:
      'Cria um novo artigo vinculado ao usuário autenticado (requer permissão create:articles)',
  })
  @ApiBody({ type: CreateArticleDto })
  @ApiResponse({
    status: 201,
    description: 'Artigo criado com sucesso',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Introdução ao NestJS',
        content: 'NestJS é um framework progressivo para Node.js...',
        published: false,
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2026-02-06T14:23:38.000Z',
        updatedAt: '2026-02-06T14:23:38.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['Título é obrigatório', 'Conteúdo é obrigatório'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para criar artigos',
  })
  async create(@Body() createArticleDto: CreateArticleDto, @Request() req) {
    return this.articlesService.create(createArticleDto, req.user.userId);
  }

  @Get()
  @RequirePermissions('read:articles')
  @ApiOperation({
    summary: 'Listar todos os artigos',
    description:
      'Retorna lista de todos os artigos (requer permissão read:articles)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de artigos retornada com sucesso',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Introdução ao NestJS',
          content: 'NestJS é um framework progressivo...',
          published: true,
          authorId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: '2026-02-06T14:23:38.000Z',
          updatedAt: '2026-02-06T14:23:38.000Z',
          author: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'João Silva',
            email: 'joao.silva@email.com',
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para ler artigos',
  })
  async findAll() {
    return this.articlesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read:articles')
  @ApiOperation({
    summary: 'Buscar artigo por ID',
    description:
      'Retorna dados de um artigo específico (requer permissão read:articles)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do artigo (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Artigo encontrado',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Introdução ao NestJS',
        content: 'NestJS é um framework progressivo para Node.js...',
        published: true,
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2026-02-06T14:23:38.000Z',
        updatedAt: '2026-02-06T14:23:38.000Z',
        author: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'João Silva',
          email: 'joao.silva@email.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para ler artigos',
  })
  @ApiResponse({
    status: 404,
    description: 'Artigo não encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Artigo não encontrado',
        error: 'Not Found',
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('update:articles')
  @ApiOperation({
    summary: 'Atualizar artigo',
    description:
      'Atualiza um artigo específico. Usuários com permissão update:articles podem atualizar apenas seus próprios artigos. Admins podem atualizar qualquer artigo.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do artigo (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiBody({ type: UpdateArticleDto })
  @ApiResponse({
    status: 200,
    description: 'Artigo atualizado com sucesso',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Título Atualizado',
        content: 'Conteúdo atualizado...',
        published: true,
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2026-02-06T14:23:38.000Z',
        updatedAt: '2026-02-06T14:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para atualizar este artigo',
    schema: {
      example: {
        statusCode: 403,
        message: 'Você não tem permissão para atualizar este artigo',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Artigo não encontrado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @Request() req,
  ) {
    return this.articlesService.update(id, updateArticleDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete:articles')
  @ApiOperation({
    summary: 'Deletar artigo',
    description:
      'Remove um artigo do sistema. Usuários com permissão delete:articles podem deletar apenas seus próprios artigos. Admins podem deletar qualquer artigo.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do artigo (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 204,
    description: 'Artigo deletado com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para deletar este artigo',
    schema: {
      example: {
        statusCode: 403,
        message: 'Você não tem permissão para deletar este artigo',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Artigo não encontrado',
  })
  async remove(@Param('id') id: string, @Request() req) {
    return this.articlesService.remove(id, req.user.userId);
  }
}
