# Strategies

Esta pasta contém as estratégias de autenticação usando Passport.js.

## Arquivos

- **jwt.strategy.ts** - Estratégia JWT para validação de tokens e extração de informações do usuário

## Como funciona

A JwtStrategy é automaticamente usada pelo Passport quando o `JwtAuthGuard` é aplicado em uma rota.

### Fluxo de autenticação:

1. Cliente envia requisição com header `Authorization: Bearer <token>`
2. JwtAuthGuard intercepta a requisição
3. JwtStrategy valida o token JWT
4. Se válido, extrai o payload e busca o usuário no banco
5. Adiciona o usuário ao objeto `request.user`
6. Controller tem acesso aos dados do usuário via `@Request() req`

### Payload do JWT:

```typescript
{
  sub: string;        // ID do usuário
  email: string;      // Email do usuário
  permissions: [];    // Array de permissões
  iat: number;        // Timestamp de criação
  exp: number;        // Timestamp de expiração
}
```
