import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para criação de artigo
 *
 * @class CreateArticleDto
 */
export class CreateArticleDto {
  @ApiProperty({
    description: 'Título do artigo',
    example: 'Introdução ao NestJS',
    required: true,
  })
  @IsString({ message: 'Título deve ser uma string' })
  @IsNotEmpty({ message: 'Título é obrigatório' })
  title: string;

  @ApiProperty({
    description: 'Conteúdo completo do artigo',
    example: 'NestJS é um framework progressivo para Node.js...',
    required: true,
  })
  @IsString({ message: 'Conteúdo deve ser uma string' })
  @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
  content: string;
}
