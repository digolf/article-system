import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './api/users/users.module';
import { ArticlesModule } from './api/articles/articles.module';
import { EnvValidationService } from './config/env-validation.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ArticlesModule,
  ],
  controllers: [AppController],
  providers: [AppService, EnvValidationService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly envValidationService: EnvValidationService) {}

  /**
   * Valida variáveis de ambiente obrigatórias na inicialização do módulo
   */
  onModuleInit() {
    this.envValidationService.validateEnvVars();
  }
}
