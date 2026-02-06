import { Injectable } from '@nestjs/common';

/**
 * Serviço principal da aplicação
 * Contém métodos gerais da aplicação
 */
@Injectable()
export class AppService {
  /**
   * Retorna mensagem de boas-vindas
   * @returns {string} Mensagem de boas-vindas
   */
  getHello(): string {
    return 'Hello World!';
  }

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
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected', // Pode ser expandido para verificar conexão real
    };
  }
}
