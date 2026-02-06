import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Serviço Prisma para gerenciar a conexão com o banco de dados
 *
 * @class PrismaService
 * @extends {PrismaClient}
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Conecta ao banco de dados quando o módulo é inicializado
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Desconecta do banco de dados quando o módulo é destruído
   *
   * @returns {Promise<void>}
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
