import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Roles disponíveis no sistema
 */
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  READER = 'reader',
}

/**
 * DTO para criação de usuário
 *
 * @class CreateUserDto
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
    required: true,
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({
    description: 'Email único do usuário',
    example: 'joao.silva@email.com',
    required: true,
    uniqueItems: true,
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 6 caracteres)',
    example: 'senha123',
    required: true,
    minLength: 6,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;

  @ApiProperty({
    description:
      'Role do usuário: admin (acesso total), editor (criar/editar artigos próprios), reader (apenas leitura)',
    example: 'reader',
    required: false,
    enum: UserRole,
    default: 'reader',
  })
  @IsEnum(UserRole, {
    message: 'Role deve ser: admin, editor ou reader',
  })
  @IsOptional()
  role?: UserRole;
}
