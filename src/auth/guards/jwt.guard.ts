import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PERMISSIONS_KEY, OPTIONAL_AUTH_KEY } from '../decorators';

/**
 * Guard unificado que substitui todos os guards anteriores:
 * - JwtAuthGuard (autenticação obrigatória)
 * - OptionalJwtAuthGuard (autenticação opcional)
 * - PermissionsGuard (verificação de permissões)
 * - JwtPermissionsGuard (JWT + permissões)
 * 
 * Detecta automaticamente o comportamento baseado nos decorators:
 * - @OptionalAuth() -> Autenticação opcional
 * - @RequirePermissions() -> Valida permissões após autenticação
 * - Sem decorators -> Autenticação obrigatória padrão
 */
@Injectable()
export class UnifiedAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Mapeia "permissões" (nomes lógicos) para roles que podem acessar
   */
  private getRolesForPermission(permission: string): string[] {
    switch (permission) {
      case 'admin':
        return ['admin'];
      case 'create:articles':
      case 'update:articles':
      case 'delete:articles':
        return ['admin', 'editor'];
      case 'read:articles':
        return ['admin', 'editor', 'reader'];
      default:
        return [];
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verifica se a autenticação é opcional
    const isOptional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Tenta autenticar via JWT
    let isAuthenticated = false;
    try {
      isAuthenticated = (await super.canActivate(context)) as boolean;
    } catch (error) {
      // Se a autenticação é opcional e falhou, permite acesso sem usuário
      if (isOptional) {
        return true;
      }
      // Se a autenticação é obrigatória e falhou, propaga o erro
      throw error;
    }

    // Se não conseguiu autenticar e é opcional, permite acesso
    if (!isAuthenticated && isOptional) {
      return true;
    }

    // Se não conseguiu autenticar e é obrigatório, nega acesso
    if (!isAuthenticated) {
      return false;
    }

    // Verifica permissões (se houver)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há permissões requeridas, permite acesso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Valida permissões do usuário autenticado
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userRole = user.role;

    // Verificar se o usuário tem alguma das permissões requeridas
    const hasPermission = requiredPermissions.some((permission) => {
      const allowedRoles = this.getRolesForPermission(permission);
      return allowedRoles.includes(userRole);
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso',
      );
    }

    return true;
  }

  /**
   * Override do handleRequest para suportar autenticação opcional
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isOptional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se é opcional e não há usuário, retorna undefined sem erro
    if (isOptional && !user) {
      return undefined;
    }

    // Se não é opcional e há erro ou não há usuário, lança erro
    if (err || !user) {
      throw err || new ForbiddenException('Usuário não autenticado');
    }

    return user;
  }
}

// Mantém exports dos guards antigos para compatibilidade
// mas todos agora apontam para o UnifiedAuthGuard
export const JwtAuthGuard = UnifiedAuthGuard;
export const OptionalJwtAuthGuard = UnifiedAuthGuard;
export const PermissionsGuard = UnifiedAuthGuard;
export const JwtPermissionsGuard = UnifiedAuthGuard;
