import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Mensagem de boas-vindas' })
  @ApiResponse({
    status: 200,
    description: 'Retorna mensagem de boas-vindas da API',
    schema: {
      example: {
        message: 'Article System API is running!',
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Verificar saúde da aplicação',
    description:
      'Endpoint público para verificar se a aplicação está funcionando corretamente',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está saudável',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-02-06T14:23:38.000Z',
        uptime: 78.623,
        environment: 'development',
        version: '0.0.1',
        database: 'connected',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
