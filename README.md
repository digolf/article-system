# Article System API

Sistema de gerenciamento de artigos com autenticação JWT e RBAC.

## Quick Start

```bash
# Docker (recomendado)
docker compose up --build

# Ou manual
npm install
cp .env.example .env
npm run prisma:migrate
npm run seed
npm run start:dev
```

**Acesse:** http://localhost:3000/api/docs

## Credenciais Padrão

| Email | Senha | Role | Permissões |
|-------|-------|------|------------|
| root@root.com | root123 | admin | Acesso total |
| editor@editor.com | editor123 | editor | Gerenciar próprios artigos |
| reader@reader.com | reader123 | reader | Apenas leitura |

## Criar Novo Admin

1. **Login como root:**
```bash
POST /users/login
{"email": "root@root.com", "password": "root123"}
```

2. **Criar admin:**
```bash
POST /users
Authorization: Bearer <token>
{"name": "Admin", "email": "admin@example.com", "password": "senha123", "role": "admin"}
```

**Roles:** `admin` | `editor` | `reader`

## Auto-Registro vs Admin

**Sem token (público):**
- Qualquer pessoa pode se registrar
- Role sempre será `reader`

**Com token admin:**
- Pode definir qualquer role
- Controle total sobre permissões

## Sistema de Permissões

| Role | Artigos (Ler) | Artigos (Criar) | Artigos (Editar/Deletar) | Gerenciar Usuários |
|------|---------------|-----------------|--------------------------|-------------------|
| **admin** | Todos | Sim | Todos | Sim |
| **editor** | Todos | Sim | Apenas próprios | Não |
| **reader** | Todos | Não | Não | Não |

## Comandos

```bash
# Desenvolvimento
npm run start:dev

# Testes
npm test              # Unitários
npm run test:e2e      # E2E
npm run test:cov      # Com cobertura

# Docker
docker compose up --build
docker compose down
docker compose logs -f app
```

## Stack

NestJS • Prisma • PostgreSQL • JWT • Docker • TypeScript • Swagger

## Documentação Completa

Ver [DOCUMENTATION.md](./DOCUMENTATION.md) para detalhes completos.
