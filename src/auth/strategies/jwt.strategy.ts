import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Estratégia JWT para autenticação com Passport
 *
 * @class JwtStrategy
 * @extends {PassportStrategy(Strategy)}
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está configurado no arquivo .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Valida o payload do token JWT
   * Payload simplificado contém apenas: sub (userId) e role
   *
   * @param {any} payload - Payload decodificado do JWT
   * @returns {Promise<any>} Dados do usuário autenticado com role
   * @throws {UnauthorizedException} Se token inválido
   */
  async validate(payload: any): Promise<any> {
    if (!payload || !payload.sub || !payload.role) {
      throw new UnauthorizedException('Token inválido');
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
