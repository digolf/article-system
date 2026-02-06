import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  IsEmail,
  IsArray,
} from 'class-validator';

/**
 * DTO para atualização de usuário
 * Todos os campos são opcionais
 *
 * @class UpdateUserDto
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'Nome completo do usuário',
    example: 'João Silva Santos',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Email único do usuário',
    example: 'joao.santos@email.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nova senha do usuário (mínimo 6 caracteres)',
    example: 'novaSenha123',
    minLength: 6,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'Array de IDs das permissões a serem atribuídas ao usuário',
    example: ['permission-id-1', 'permission-id-2'],
    isArray: true,
    type: [String],
  })
  @IsArray({ message: 'Permissões devem ser um array' })
  @IsOptional()
  permissionIds?: string[];
}
