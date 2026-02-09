# Guards

Esta pasta contém o Guard unificado da aplicação, responsável por proteger rotas e validar permissões.

## Arquivos

- **jwt.guard.ts** - Guard unificado que substitui todos os guards anteriores

## UnifiedAuthGuard

Guard único que detecta automaticamente o comportamento baseado nos decorators aplicados na rota:

### Comportamentos

1. **Autenticação obrigatória (padrão)**
   - Valida presença e validade do JWT
   - Extrai payload e adiciona em `req.user`
   - Usado em todas as rotas que requerem autenticação

2. **Autenticação opcional** (com `@OptionalAuth()`)
   - JWT é opcional: se houver token válido, popula `req.user`
   - Se não houver ou for inválido, continua sem erro
   - Usado em rotas híbridas (público + autenticado)

3. **Verificação de permissões** (com `@RequirePermissions()`)
   - Valida se usuário tem permissões necessárias após autenticação
   - Usuário precisa ter pelo menos uma das permissões listadas

### Exemplos de Uso

#### 1. Autenticação obrigatória
```typescript
@Get('profile')
@UseGuards(UnifiedAuthGuard)
getProfile(@Request() req) {
  // req.user estará sempre disponível
  return req.user;
}
```

#### 2. Autenticação opcional
```typescript
@Post()
@UseGuards(UnifiedAuthGuard)
@OptionalAuth()
create(@Req() req, @Body() dto: CreateUserDto) {
  // req.user pode ou não estar presente
  const isAdmin = req.user?.role === 'admin';
  
  if (isAdmin) {
    // Admin pode criar com role customizada
    return this.service.create(dto);
  } else {
    // Público só pode criar como reader
    return this.service.create({ ...dto, role: 'reader' });
  }
}
```

#### 3. Autenticação + Permissões
```typescript
@Delete(':id')
@UseGuards(UnifiedAuthGuard)
@RequirePermissions('admin')
remove(@Param('id') id: string) {
  // Usuário autenticado E com permissão 'admin'
  return this.service.remove(id);
}
```

#### 4. Múltiplas permissões (OR lógico)
```typescript
@Post()
@UseGuards(UnifiedAuthGuard)
@RequirePermissions('admin', 'create:articles')
createArticle(@Body() dto: CreateArticleDto) {
  // Usuário precisa ser admin OU ter permissão create:articles
  // Editores têm create:articles, então podem acessar
  return this.service.create(dto);
}
```

#### 5. Guard no controller (aplica a todas as rotas)
```typescript
@Controller('articles')
@UseGuards(UnifiedAuthGuard)
export class ArticlesController {
  // Todas as rotas deste controller exigem autenticação
  
  @Get()
  findAll() { ... }
  
  @Post()
  @RequirePermissions('create:articles')
  create() { ... }
}
```

## Compatibilidade

Os guards antigos ainda existem como aliases para compatibilidade:
- `JwtAuthGuard` → `UnifiedAuthGuard`
- `OptionalJwtAuthGuard` → `UnifiedAuthGuard`
- `PermissionsGuard` → `UnifiedAuthGuard`
- `JwtPermissionsGuard` → `UnifiedAuthGuard`

**Recomendação:** Use `UnifiedAuthGuard` em código novo.

## Permissões Disponíveis

O guard mapeia as seguintes permissões para roles:

| Permissão | Roles Permitidas |
|-----------|------------------|
| `admin` | admin |
| `create:articles` | admin, editor |
| `update:articles` | admin, editor |
| `delete:articles` | admin, editor |
| `read:articles` | admin, editor, reader |

**Uso:**
```typescript
@Delete(':id')
@UseGuards(JwtPermissionsGuard)
@RequirePermissions('admin')
remove(@Param('id') id: string) {
  // Usuário autenticado E com permissão 'admin'
}
```

## Comparação

### Abordagem 1: Dois guards separados
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('admin')
```

### Abordagem 2: Guard combinado
```typescript
@UseGuards(JwtPermissionsGuard)
@RequirePermissions('admin')
```

Ambas as abordagens são funcionalmente equivalentes. Use a que preferir.

## Exemplo Completo

```typescript
import { JwtAuthGuard, OptionalJwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { RequirePermissions } from '../../auth/decorators';

@Controller('articles')
export class ArticlesController {
  // Rota pública (sem guards)
  @Get()
  findAll() {
    return this.articlesService.findAll();
  }

  // Rota com autenticação opcional
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() dto: CreateArticleDto, @Req() req) {
    // Se req.user existir, é um usuário autenticado
    // Se não, é um acesso público
    return this.articlesService.create(dto, req.user?.id);
  }

  // Rota protegida apenas com JWT
  @Get('my-articles')
  @UseGuards(JwtAuthGuard)
  findMyArticles(@Req() req) {
    return this.articlesService.findByAuthor(req.user.id);
  }

  // Rota protegida com JWT + Permissões
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('admin')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }
}
```

