import { Injectable } from '@nestjs/common';

/**
 * Serviço principal da aplicação
 * Contém métodos gerais da aplicação
 */
@Injectable()
export class AppService {
  /**
   * Verifica o status de saúde da aplicação
   * Usado pelo Docker healthcheck
   *
   * @returns {object} Status da aplicação e informações do sistema
   */
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    };
  }
}
