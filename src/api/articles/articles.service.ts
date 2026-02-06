import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createArticleDto: CreateArticleDto, authorId: string) {
    return this.prisma.article.create({
      data: {
        ...createArticleDto,
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.article.findMany({
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este artigo',
      );
    }

    return this.prisma.article.update({
      where: { id },
      data: updateArticleDto,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este artigo',
      );
    }

    await this.prisma.article.delete({ where: { id } });
    return { message: 'Artigo deletado com sucesso' };
  }
}
