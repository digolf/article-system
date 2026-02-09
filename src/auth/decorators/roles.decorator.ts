import { SetMetadata } from '@nestjs/common';

/**
 * Chave para metadados de permissões
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Chave para metadados de autenticação opcional
 */
export const OPTIONAL_AUTH_KEY = 'optional_auth';

/**
 * Decorator para definir permissões necessárias em uma rota
 *
 * @param {...string[]} permissions - Permissões necessárias
 * @returns {CustomDecorator} Decorator customizado
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator para marcar uma rota como autenticação opcional
 * Se houver token válido, popula req.user
 * Se não houver ou for inválido, continua sem erro
 *
 * @returns {CustomDecorator} Decorator customizado
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
