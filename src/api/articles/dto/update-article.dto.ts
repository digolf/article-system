import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO para atualização de artigo
 * Todos os campos são opcionais
 *
 * @class UpdateArticleDto
 */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiPropertyOptional({
    description: 'Título do artigo',
    example: 'Título Atualizado do Artigo',
  })
  @IsString({ message: 'Título deve ser uma string' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Conteúdo completo do artigo',
    example: 'Conteúdo atualizado do artigo...',
  })
  @IsString({ message: 'Conteúdo deve ser uma string' })
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Define se o artigo está publicado',
    example: true,
  })
  @IsBoolean({ message: 'Published deve ser um booleano' })
  @IsOptional()
  published?: boolean;
}
