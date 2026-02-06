# Guards

Esta pasta contém os Guards da aplicação, responsáveis por proteger rotas e validar permissões.

## Arquivos

- **jwt-auth.guard.ts** - Guard para autenticação JWT (valida se o usuário está autenticado)
- **roles.guard.ts** - Guard para validação de permissões específicas (valida se o usuário tem as permissões necessárias)

## Como usar

```typescript
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';

@Controller('users')
export class UsersController {
  // Protege a rota com autenticação JWT
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    // ...
  }

  // Protege a rota com autenticação E permissões específicas
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    // ...
  }
}
```
