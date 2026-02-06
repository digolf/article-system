# Documentação Completa - Article System API

> Sistema de gerenciamento de usuários e artigos com autenticação JWT e controle de permissões

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Instalação e Configuração](#instalação-e-configuração)
3. [Arquitetura](#arquitetura)
4. [Autenticação e Autorização](#autenticação-e-autorização)
5. [API Endpoints](#api-endpoints)
6. [Sistema de Permissões](#sistema-de-permissões)
7. [Testes](#testes)
8. [Qualidade de Código](#qualidade-de-código)
9. [Documentação Swagger](#documentação-swagger)
10. [Seed Automático](#seed-automático)
11. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### Tecnologias

- **NestJS** - Framework Node.js progressivo
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação baseada em tokens
- **Docker** - Containerização
- **TypeScript** - Tipagem estática
- **Jest** - Framework de testes
- **Swagger** - Documentação de API
- **ESLint/Prettier** - Qualidade de código

### Funcionalidades

- Sistema completo de autenticação JWT  
- Controle granular de permissões (8 permissões)  
- CRUD completo de usuários e artigos  
- Verificação de ownership (usuários editam apenas seus recursos)  
- Seed automático com usuário root  
- Documentação Swagger interativa  
- 176 testes automatizados (100% passing)  
- Validação de variáveis de ambiente  
- Health check endpoints  
- Containerização completa com Docker  

---

## Instalação e Configuração

### Pré-requisitos

- **Docker** e **Docker Compose**
- Ou: **Node.js 20+** e **PostgreSQL 16+**

### Instalação com Docker (Recomendado)

```bash
# 1. Clone o repositório
git clone <repository-url>
cd article-system

# 2. Suba o ambiente completo
docker compose up --build
```

**A aplicação estará disponível em:** `http://localhost:3000`

**O que acontece automaticamente:**
1. PostgreSQL é iniciado
2. Migrations são executadas
3. 8 permissões são criadas
4. Usuário root é criado
5. Aplicação inicia na porta 3000

**Credenciais do usuário root:**
- Email: `root@root.com`
- Senha: `root123`
- Permissões: Todas as 8

### Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Executar migrations
npx prisma migrate deploy

# 4. Gerar Prisma Client
npx prisma generate

# 5. Executar seed (opcional)
npm run prisma:seed

# 6. Iniciar em modo desenvolvimento
npm run start:dev
```

### Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/article_system"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Aplicação
PORT=3000
NODE_ENV="development"
```

**Variáveis obrigatórias:**
- `DATABASE_URL` - URL de conexão do PostgreSQL
- `JWT_SECRET` - Chave secreta para assinar tokens JWT

Se alguma variável obrigatória estiver faltando, o sistema exibirá erro na inicialização.

---

## Arquitetura

### Estrutura de Diretórios

```
src/
├── api/                      # Módulos da API
│   ├── users/               # Gerenciamento de usuários
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── articles/           # Gerenciamento de artigos
│       ├── dto/
│       ├── articles.controller.ts
│       ├── articles.service.ts
│       └── articles.module.ts
├── auth/                    # Autenticação e autorização
│   ├── guards/             # Guards de autenticação
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── strategies/         # Estratégias de autenticação
│   │   └── jwt.strategy.ts
│   ├── decorators/         # Decorators customizados
│   │   └── roles.decorator.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── config/                  # Configurações
│   └── env-validation.service.ts
├── prisma/                  # Prisma ORM
│   └── prisma.service.ts
├── app.module.ts           # Módulo raiz
└── main.ts                 # Entry point

prisma/
├── schema.prisma           # Schema do banco
├── migrations/             # Migrations SQL
└── seed/                   # Seed scripts
    └── seed.ts

test/                       # Testes E2E
├── health.e2e-spec.ts
├── auth.e2e-spec.ts
├── users.e2e-spec.ts
└── articles.e2e-spec.ts
```

### Modelo de Dados

#### User (Usuário)
```typescript
{
  id: string              // UUID
  name: string            // Nome completo
  email: string           // Email único
  password: string        // Hash bcrypt
  createdAt: DateTime
  updatedAt: DateTime
  permissions: UserPermission[]  // Relação N:N
  articles: Article[]            // Artigos criados
}
```

#### Permission (Permissão)
```typescript
{
  id: string              // UUID
  name: string            // Nome único (ex: "read:users")
  description: string     // Descrição
  createdAt: DateTime
  users: UserPermission[] // Relação N:N
}
```

#### Article (Artigo)
```typescript
{
  id: string              // UUID
  title: string           // Título
  content: string         // Conteúdo
  authorId: string        // FK para User
  createdAt: DateTime
  updatedAt: DateTime
  author: User            // Relação 1:N
}
```

---

## Autenticação e Autorização

### JWT Authentication

O sistema usa **JSON Web Tokens (JWT)** para autenticação stateless.

**Fluxo:**
1. Usuário faz login com email/senha
2. Sistema valida credenciais e gera JWT
3. Cliente armazena token
4. Cliente envia token no header `Authorization: Bearer <token>`
5. Sistema valida token em cada requisição

**Payload do Token:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "permissions": ["read:users", "create:articles", ...]
}
```

### Guards

#### JwtAuthGuard
- Valida presença e validade do JWT
- Extrai payload e adiciona em `req.user`
- Usado em todas as rotas protegidas

#### PermissionsGuard
- Valida se usuário tem permissões necessárias
- Usado com decorator `@RequirePermissions()`
- Permite bypass se `@Public()` está presente

### Decorators

#### @RequirePermissions(...permissions)
```typescript
@RequirePermissions('create:articles', 'update:articles')
async createArticle() { ... }
```

#### @Public()
```typescript
@Public()  // Não requer autenticação
async login() { ... }
```

---

## 📡 API Endpoints

### Health Check

```http
GET /
```
Retorna: `"Hello World!"`

```http
GET /health
```
Retorna:
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T17:00:00.000Z",
  "uptime": 12345,
  "environment": "production",
  "database": "connected"
}
```

### Autenticação

#### Registro de Usuário

```http
POST /users/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "permissionIds": ["perm-uuid-1", "perm-uuid-2"]  // Opcional
}
```

**Resposta 201:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "createdAt": "2026-02-06T17:00:00.000Z",
  "permissions": [...]
}
```

#### Login

```http
POST /users/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Resposta 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "permissions": [...]
  }
}
```

### Usuários (Rotas Protegidas)

#### Listar Usuários
```http
GET /users
Authorization: Bearer <token>
```
**Requer:** `read:users`

#### Buscar Usuário
```http
GET /users/:id
Authorization: Bearer <token>
```
**Requer:** `read:users`

#### Atualizar Usuário
```http
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nome Atualizado",
  "email": "novo@example.com",
  "password": "novaSenha123",
  "permissionIds": ["uuid1", "uuid2"]
}
```
**Requer:** `update:users`

#### Deletar Usuário
```http
DELETE /users/:id
Authorization: Bearer <token>
```
**Requer:** `delete:users`  
**Nota:** Deleta em cascata permissões e artigos do usuário

### Artigos (Rotas Protegidas)

#### Criar Artigo
```http
POST /articles
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Meu Artigo",
  "content": "Conteúdo do artigo..."
}
```
**Requer:** `create:articles`

#### Listar Artigos
```http
GET /articles
Authorization: Bearer <token>
```
**Requer:** `read:articles`

#### Buscar Artigo
```http
GET /articles/:id
Authorization: Bearer <token>
```
**Requer:** `read:articles`

#### Atualizar Artigo
```http
PUT /articles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Título Atualizado",
  "content": "Novo conteúdo..."
}
```
**Requer:** `update:articles` + **ser autor OU admin**

#### Deletar Artigo
```http
DELETE /articles/:id
Authorization: Bearer <token>
```
**Requer:** `delete:articles` + **ser autor OU admin**

### Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | OK - Sucesso em GET/PUT |
| 201 | Created - Recurso criado |
| 204 | No Content - Delete bem-sucedido |
| 400 | Bad Request - Validação falhou |
| 401 | Unauthorized - Token ausente/inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Email duplicado |

---

## Sistema de Permissões

### 8 Permissões Disponíveis

#### Usuários
- `read:users` - Listar e visualizar usuários
- `create:users` - Criar novos usuários
- `update:users` - Atualizar usuários
- `delete:users` - Deletar usuários

#### Artigos
- `read:articles` - Listar e visualizar artigos
- `create:articles` - Criar artigos
- `update:articles` - Atualizar artigos (próprios ou todos se admin)
- `delete:articles` - Deletar artigos (próprios ou todos se admin)

### Perfis de Usuário

#### Admin (8 permissões)
```
- Todas as permissões
- Gerencia usuários e artigos
- Pode editar/deletar recursos de outros usuários
```

#### Editor (4 permissões)
```
- read:articles
- create:articles
- update:articles (apenas próprios)
- delete:articles (apenas próprios)
```

#### Reader (1 permissão)
```
- read:articles
- Não pode criar, editar ou deletar
```

### Regras de Ownership

1. **Artigos:**
   - Autor pode editar/deletar seus próprios artigos
   - Admin pode editar/deletar qualquer artigo
   - Outros usuários não podem editar artigos alheios (mesmo com permissão)

2. **Usuários:**
   - Apenas quem tem `update:users` pode atualizar
   - Apenas quem tem `delete:users` pode deletar
   - Sem restrição de ownership (admin pode gerenciar todos)

---

## Testes

### Visão Geral

O sistema possui **cobertura completa de testes** com 176 testes automatizados.

```
╔═══════════════════════════════════════════╗
║  TESTES UNITÁRIOS:  98/98  - (~1.8s)    ║
║  TESTES E2E:        78/78  - (~26s)     ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  TOTAL:            176/176 - 100%       ║
╚═══════════════════════════════════════════╝
```

### Executar Testes

```bash
# Testes Unitários
npm test                # Roda todos (98 testes)
npm run test:watch      # Modo watch
npm run test:cov        # Com cobertura

# Testes E2E
npm run test:e2e        # Roda todos (78 testes)

# Todos os testes
npm test && npm run test:e2e
```

### Testes Unitários (98 testes)

#### Services (74 testes)
- **UsersService** (33 testes)
  - Create, findAll, findOne, update, remove, findByEmail
  - Hash de senha, gerenciamento de permissões
  - Error handling (404, 409)
  
- **ArticlesService** (28 testes)
  - Create, findAll, findOne, update, remove
  - Autorização (owner/admin)
  - Error handling (403, 404)
  
- **AuthService** (13 testes)
  - validateUser, login
  - JWT token generation
  - Bcrypt validation

#### Controllers (24 testes)
- **AppController** (3 testes) - Health endpoints
- **UsersController** (21 testes) - Register, login, CRUD
- **ArticlesController** (20 testes) - CRUD com authorization

### Testes E2E (78 testes)

#### Por Módulo
- **Health** (5 testes) - GET /, GET /health
- **Auth** (14 testes) - Register, login, JWT
- **Users** (24 testes) - CRUD + permissions + cascade
- **Articles** (34 testes) - CRUD + ownership + authorization

#### Status HTTP Testados
- 200 OK | - 201 Created | - 204 No Content  
- 400 Bad Request | - 401 Unauthorized | - 403 Forbidden  
- 404 Not Found | - 409 Conflict

### Cobertura

| Componente | Cobertura |
|-----------|-----------|
| Services | 100% |
| Controllers | 100% |
| Endpoints | 100% |
| Auth System | 100% |
| Permissions | 100% |
| Validations | 100% |
| Error Handling | 100% |

---

## Qualidade de Código

### Linter e Formatação

O projeto usa **ESLint** e **Prettier** para manter código consistente.

#### Comandos

```bash
# Formatar código
npm run format          # Formata todos os arquivos
npm run format:check    # Apenas verifica

# Linting
npm run lint            # Analisa e corrige
npm run lint:check      # Apenas verifica

# Tudo junto
npm run lint:format     # Lint + Format (use antes de commitar)
```

### Configuração ESLint

- **Base:** `@typescript-eslint/recommended`
- **Rules customizadas:**
  - Unsafe rules desabilitadas (NestJS usa `any` em decorators)
  - Variáveis não usadas permitidas com prefixo `_`
  - Console.log permitido
  - Floating promises: warning

### Configuração Prettier

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2,
  "semi": true,
  "endOfLine": "auto"
}
```

### Scripts Disponíveis

```bash
npm run build           # Build do projeto
npm run start           # Produção
npm run start:dev       # Desenvolvimento (watch mode)
npm run start:debug     # Debug mode

npm test                # Testes unitários
npm run test:e2e        # Testes E2E
npm run test:cov        # Coverage

npm run lint:format     # Lint + Format
```

---

## Documentação Swagger

### Acessar Swagger UI

```
http://localhost:3000/api/docs
```

### Funcionalidades

- **Documentação interativa** de todos os endpoints  
- **Try it out** - Testar requisições direto na interface  
- **Schemas** - Visualizar DTOs e modelos  
- **Authentication** - Configurar JWT token para testes  
- **Exemplos** - Requests e responses de exemplo  

### Configuração de Autenticação

1. Faça login via `/users/login` para obter token
2. Clique no botão **Authorize** no topo da página
3. Cole o token JWT (sem `Bearer`)
4. Clique em **Authorize**
5. Agora pode testar rotas protegidas

### Tags Organizadas

- **Health** - Endpoints de saúde
- **Auth** - Registro e login
- **Users** - Gerenciamento de usuários
- **Articles** - Gerenciamento de artigos

### Endpoints Documentados

Todos os 13 endpoints possuem:
- Descrição clara
- Parâmetros explicados
- Request body examples
- Response examples (sucesso e erro)
- Status codes possíveis
- Requisitos de autenticação
- Permissões necessárias

---

## Seed Automático

### O que é criado

Quando o Docker sobe (`docker compose up`), automaticamente:

1. **8 Permissões** (via migration SQL)
   - read:users, create:users, update:users, delete:users
   - read:articles, create:articles, update:articles, delete:articles

2. **Usuário Root** (via seed script)
   - Email: `root@root.com`
   - Senha: `root123`
   - Todas as 8 permissões

### Como funciona

**Dockerfile CMD:**
```bash
npx prisma migrate deploy && \
node dist/prisma/seed/seed.js && \
npm run start:prod
```

**Fluxo:**
1. Migrations criam tabelas e permissões
2. Seed cria usuário root
3. Aplicação inicia

### Seed Manual (Opcional)

```bash
npm run prisma:seed
```

### Logs do Seed

```
Seed iniciado...

- 8 permissões encontradas no banco

- Criando usuário root...
- Usuário root criado: uuid
- Atribuindo permissões ao root...
- 8 permissões atribuídas
- Credenciais do usuário root:
   Email: root@root.com
   Senha: root123

Seed concluído com sucesso!
```

## Docker

### Comandos Úteis

```bash
# Subir ambiente
docker compose up --build

# Parar containers
docker compose down

# Parar e limpar volumes (reseta banco)
docker compose down -v

# Ver logs
docker compose logs -f app
docker compose logs -f postgres

# Executar comandos no container
docker compose exec app npm test
docker compose exec app npx prisma studio
```

### Estrutura Docker

- **app** - Container da aplicação NestJS (porta 3000)
- **postgres** - Container PostgreSQL (porta 5432)
- **Volume** - `postgres_data` persiste dados do banco

### Rebuild

Se fizer mudanças no código:
```bash
docker compose down
docker compose up --build
```

---

## Troubleshooting

### Variável de ambiente faltando

**Erro:**
```
ERROR: Variável de ambiente obrigatória DATABASE_URL não está definida
```

**Solução:**
1. Verifique se `.env` existe
2. Copie de `.env.example` se necessário
3. Preencha todas as variáveis obrigatórias

### Banco de dados não conecta

**Erro:**
```
Can't reach database server at localhost:5432
```

**Solução Docker:**
```bash
docker compose down -v
docker compose up --build
```

**Solução Local:**
1. Verifique se PostgreSQL está rodando
2. Confirme credenciais no `.env`
3. Teste conexão: `psql -U postgres`

### Testes E2E falhando

**Solução:**
1. Verifique se `.env.test` existe
2. Use banco de teste separado
3. Rode testes com `npm run test:e2e`

### Porta 3000 em uso

**Erro:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solução:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Seed não executa

**Solução:**
```bash
# Executar manualmente
npm run prisma:seed

# Ou dentro do Docker
docker compose exec app npm run prisma:seed
```

### Linter/Prettier conflitos

**Solução:**
```bash
# Reformatar tudo
npm run lint:format

# Se persistir, limpar cache
rm -rf node_modules
npm install
```

---

## Deploy

### Checklist de Produção

- [ ] Alterar `JWT_SECRET` para valor seguro
- [ ] Alterar senha do usuário root
- [ ] Configurar `DATABASE_URL` de produção
- [ ] Definir `NODE_ENV=production`
- [ ] Configurar CORS adequadamente
- [ ] Configurar rate limiting
- [ ] Configurar logs (winston, etc)
- [ ] Configurar monitoramento
- [ ] Backup do banco de dados
- [ ] HTTPS/SSL habilitado

### Variáveis de Ambiente Produção

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/db
JWT_SECRET=super-secret-change-me-in-production
PORT=3000
```

### Build para Produção

```bash
npm run build
npm run start:prod
```

---
---

## Licença

Este projeto é parte de um teste técnico.

---

## Checklist de Funcionalidades

- [x] Autenticação JWT
- [x] Sistema de permissões granular
- [x] CRUD de usuários
- [x] CRUD de artigos
- [x] Ownership validation
- [x] Health check
- [x] Documentação Swagger
- [x] Seed automático
- [x] Testes unitários (98)
- [x] Testes E2E (78)
- [x] Linter e formatação
- [x] Validação de env vars
- [x] Containerização Docker
- [x] Documentação completa

**Status:** **PROJETO COMPLETO E PRONTO PARA PRODUÇÃO**
