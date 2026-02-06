import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Serviço para validar variáveis de ambiente obrigatórias
 * Garante que todas as variáveis necessárias estão configuradas antes da aplicação iniciar
 */
@Injectable()
export class EnvValidationService {
  private readonly requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRATION',
    'PORT',
  ];

  constructor(private configService: ConfigService) {}

  /**
   * Valida se todas as variáveis de ambiente obrigatórias estão presentes
   * @throws {Error} Se alguma variável obrigatória estiver faltando
   */
  validateEnvVars(): void {
    const missingVars: string[] = [];

    for (const envVar of this.requiredEnvVars) {
      const value = this.configService.get<string>(envVar);
      if (!value || value.trim() === '') {
        missingVars.push(envVar);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `
As seguintes variáveis de ambiente são obrigatórias mas não foram encontradas:

${missingVars.map((v) => `  - Faltante ${v}`).join('\n')}

Por favor, configure estas variáveis no arquivo .env antes de iniciar a aplicação.

Exemplo de configuração (.env):
${this.getExampleConfig()}

Documentação: Consulte o arquivo .env.example para mais detalhes.
      `;

      throw new Error(errorMessage);
    }

    console.log(
      '\nTodas as variáveis de ambiente obrigatórias estão configuradas\n',
    );
  }

  /**
   * Retorna exemplo de configuração para as variáveis faltantes
   */
  private getExampleConfig(): string {
    return `
DATABASE_URL="postgresql://user:password@localhost:5432/database"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="24h"
PORT="3000"
    `.trim();
  }
}
