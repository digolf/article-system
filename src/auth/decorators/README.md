# Decorators

Esta pasta contém os decoradores personalizados para controle de permissões.

## Arquivos

- **roles.decorator.ts** - Decorator para definir quais permissões são necessárias para acessar uma rota

## Como usar

```typescript
import { Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';

@Controller('articles')
export class ArticlesController {
  // Apenas usuários com permissão 'create:articles' podem acessar
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('create:articles')
  create(@Body() createDto: CreateArticleDto) {
    // ...
  }

  // Usuários com 'update:articles' OU 'delete:articles' podem acessar
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('update:articles', 'delete:articles')
  update(@Param('id') id: string, @Body() updateDto: UpdateArticleDto) {
    // ...
  }
}
```

## Lógica de permissões

O decorator `@Roles()` usa lógica **OR**:
- Se você passar múltiplas permissões, o usuário precisa ter **pelo menos uma** delas
- Exemplo: `@Roles('admin', 'editor')` → usuário com 'admin' OU 'editor' pode acessar
