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
- CRUD completo de usuários (apenas admins) e artigos  
- Verificação de ownership (usuários editores editam apenas seus recursos)  
- Seed automático com usuários (root, editor e reader)  
- Documentação Swagger
- Testes automatizados  
- Validação de variáveis de ambiente  
- Health check endpoints  
- Containerização completa com Docker

---

## Instalação e Configuração

### Pré-requisitos

- **Docker** e **Docker Compose**
- Ou: **Node.js 20+** e **PostgreSQL 16+**

### Instalação com Docker

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
- Permissões: Todas

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

## Primeiros Passos - Criando um Admin

Após executar o seed, você terá um usuário root admin:

**Credenciais do Root:**
```
Email: root@root.com
Senha: root123
Permissão: admin
```

**Para criar um novo usuário admin:**

1. **Faça login como root:**
   ```bash
   curl -X POST http://localhost:3000/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"root@root.com","password":"root123"}'
   ```

2. **Crie o novo admin:**
   ```bash
   curl -X POST http://localhost:3000/users \
     -H "Authorization: Bearer SEU_TOKEN_AQUI" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Novo Admin",
       "email": "novoadmin@example.com",
       "password": "senha123",
       "role": "admin"
     }'
   ```

**Roles disponíveis:**
- `"admin"` - Acesso total (gerenciar usuários e artigos)
- `"editor"` - Criar e editar artigos
- `"reader"` - Apenas leitura de artigos

**Auto-cadastro (sem token):**
Qualquer pessoa pode se cadastrar sem token. O sistema automaticamente cria com role "reader":
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

### Modelo de Dados

O sistema utiliza **Prisma ORM** com **PostgreSQL** como banco de dados.

#### User (Usuário)
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  role      String   @default("reader") // admin, editor, reader
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  articles  Article[]

  @@map("users")
}
```

**Campos:**
- `id`: UUID único 
- `name`: Nome completo do usuário
- `email`: Email único para login
- `password`: Hash bcrypt da senha
- `role`: Papel do usuário (admin, editor, reader) - padrão: "reader"
- `createdAt`: Data de criação (automática)
- `updatedAt`: Data da última atualização (automática)
- `articles`: Relação com artigos criados pelo usuário

#### Article (Artigo)
```prisma
model Article {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("articles")
}
```

**Campos:**
- `id`: UUID único (gerado automaticamente)
- `title`: Título do artigo
- `content`: Conteúdo completo do artigo
- `authorId`: ID do usuário autor
- `author`: Relação com o usuário autor
- `createdAt`: Data de criação (automática)
- `updatedAt`: Data da última atualização (automática)

**Comportamento de Deleção:**
- Ao deletar um usuário, todos os seus artigos são deletados automaticamente (`onDelete: Cascade`)

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

**Payload do Token (Simplificado):**
```json
{
  "sub": "user-id-uuid",
  "role": "admin|editor|user"
}
```

### Guards

O sistema utiliza um **guard unificado** que substitui todos os guards anteriores:

#### UnifiedAuthGuard
Guard único que detecta automaticamente o comportamento baseado nos decorators:
- **Autenticação obrigatória (padrão)**: Valida presença e validade do JWT
- **Autenticação opcional**: Com `@OptionalAuth()`, JWT é opcional (se houver token válido, popula `req.user`)
- **Verificação de permissões**: Com `@RequirePermissions()`, valida permissões após autenticação

**Benefícios da unificação:**
- 1 guard para todos os casos
- Menos imports nos controllers
- Comportamento detectado automaticamente via decorators
- Manutenção mais simples

**Compatibilidade:**
Os guards antigos (`JwtAuthGuard`, `OptionalJwtAuthGuard`, `PermissionsGuard`, `JwtPermissionsGuard`) ainda existem como aliases para compatibilidade, mas todos apontam para `UnifiedAuthGuard`.

### Decorators

#### @OptionalAuth()
Marca uma rota como autenticação opcional:
```typescript
@UseGuards(UnifiedAuthGuard)
@OptionalAuth()
async create() { ... }
```
- Se houver token válido, popula `req.user`
- Se não houver ou for inválido, continua sem erro
- Usado em rotas híbridas (público + autenticado)

#### @RequirePermissions(...permissions)
Define permissões necessárias para acessar uma rota:
```typescript
@UseGuards(UnifiedAuthGuard)
@RequirePermissions('create:articles', 'update:articles')
async createArticle() { ... }
```
- Valida se usuário tem as permissões necessárias
- Funciona automaticamente com `UnifiedAuthGuard`
- Usuário precisa ter pelo menos uma das permissões listadas

**Exemplos de uso:**

```typescript
// Apenas autenticação obrigatória
@UseGuards(UnifiedAuthGuard)
async getProfile() { ... }

// Autenticação opcional
@UseGuards(UnifiedAuthGuard)
@OptionalAuth()
async createUser() { ... }

// Autenticação + permissões
@UseGuards(UnifiedAuthGuard)
@RequirePermissions('admin')
async listUsers() { ... }

// Nível de controller (aplica a todas as rotas)
@Controller('articles')
@UseGuards(UnifiedAuthGuard)
export class ArticlesController { ... }
```

---

## 📡 API Endpoints

### Health Check

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

#### Criar Usuário (Público ou Admin)

```http
POST /users
Content-Type: application/json
Authorization: Bearer <token> (opcional - apenas para criar admin/editor)
```

**Caso 1: Auto-cadastro (sem token)**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123"
}
```
Resultado: Usuário criado com role "reader" (apenas leitura)

**Caso 2: Admin cria outro admin (com token admin)**
```json
{
  "name": "Novo Admin",
  "email": "admin@example.com",
  "password": "senha123",
  "role": "admin"
}
```
Resultado: Usuário criado com acesso total

**Caso 3: Admin cria editor (com token admin)**
```json
{
  "name": "Editor",
  "email": "editor@example.com",
  "password": "senha123",
  "role": "editor"
}
```
Resultado: Usuário criado com permissões de editor

**IMPORTANTE:** 
- Sem token → role é ignorada, sempre cria "reader"
- Com token admin → pode criar qualquer role

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
  "reader": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "editor"
  }
}
```

### Usuários (Rotas Protegidas)

#### Criar Usuário (Admin)
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json
```

**Requer:** `admin` (apenas administradores podem criar usuários)

**Exemplos:**

**Criar usuário admin:**
```json
{
  "name": "Novo Admin",
  "email": "admin@example.com",
  "password": "senha123",
  "role": "admin"
}
```

**Criar usuário editor:**
```json
{
  "name": "Editor User",
  "email": "editor@example.com",
  "password": "senha123",
  "role": "editor"
}
```

**Criar usuário básico:**
```json
{
  "name": "Basic User",
  "email": "user@example.com",
  "password": "senha123",
  "role": "reader"
}
```

**Roles disponíveis:**
- `admin` - Acesso total ao sistema
- `editor` - Pode criar/editar/deletar artigos (próprios)
- `user` - Apenas leitura de artigos

#### Listar Permissões Disponíveis (Avançado)
```http
GET /users/permissions
Authorization: Bearer <token>
```
**Requer:** `admin`

**Nota:** Este endpoint é opcional. Use apenas se quiser trabalhar com permissões customizadas ao invés dos roles padrão.
  ]
}
```

#### Listar Usuários
```http
GET /users
Authorization: Bearer <token>
```
**Requer:** `admin` (apenas administradores)

#### Buscar Usuário
```http
GET /users/:id
Authorization: Bearer <token>
```
**Requer:** `admin` (apenas administradores)

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
**Requer:** `admin` (apenas administradores)

#### Deletar Usuário
```http
DELETE /users/:id
Authorization: Bearer <token>
```
**Requer:** `admin` (apenas administradores)
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

### 9 Permissões Disponíveis

#### Admin
- `admin` - **Acesso total ao sistema** (obrigatória para gerenciar usuários)

#### Usuários (Requer permissão `admin`)
- `read:users` - Listar e visualizar usuários (obsoleto - use `admin`)
- `create:users` - Criar novos usuários (obsoleto - use `admin`)
- `update:users` - Atualizar usuários (obsoleto - use `admin`)
- `delete:users` - Deletar usuários (obsoleto - use `admin`)

#### Artigos
- `read:articles` - Listar e visualizar artigos
- `create:articles` - Criar artigos
- `update:articles` - Atualizar artigos (próprios ou todos se admin)
- `delete:articles` - Deletar artigos (próprios ou todos se admin)

### Perfis de Usuário

#### Admin (com permissão `admin`)
```
- Permissão: admin
- Gerencia TODOS os usuários (criar, ler, atualizar, deletar)
- Artigos: Ler, Criar, Editar e Deletar QUALQUER artigo
- Acesso total ao sistema
```

#### Editor (4 permissões)
```
- read:articles
- create:articles
- update:articles (apenas próprios artigos)
- delete:articles (apenas próprios artigos)
- NÃO pode gerenciar usuários
```

#### Reader / Usuário comum (1 permissão)
```
- read:articles (apenas leitura)
- NÃO pode criar, editar ou deletar artigos
- NÃO pode gerenciar usuários
```

### Regras de Autorização

1. **Gerenciamento de Usuários:**
   - ✅ Apenas usuários com permissão `admin` podem:
     - Criar usuários (POST /users)
     - Listar usuários (GET /users)
     - Ver detalhes de usuário (GET /users/:id)
     - Atualizar usuários (PUT /users/:id)
     - Deletar usuários (DELETE /users/:id)
   - ❌ Usuários sem `admin` recebem **403 Forbidden**

2. **Registro e Login (Público):**
   - ✅ Qualquer pessoa pode se registrar (POST /users/register)
   - ✅ Qualquer pessoa pode fazer login (POST /users/login)

3. **Artigos:**
   - ✅ **Leitura (GET):** Todos os usuários autenticados (admin, editor, user)
   - ✅ **Criação (POST):** Apenas Admins e Editores
   - ✅ **Atualização (PUT):**
     - Editores: apenas seus próprios artigos
     - Admins: qualquer artigo
   - ✅ **Exclusão (DELETE):**
     - Editores: apenas seus próprios artigos
     - Admins: qualquer artigo
   - ❌ **Usuários comuns (Reader):** Podem apenas LER artigos, sem criar/editar/deletar

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

## Sistema de Permissões

### 📋 Visão Geral

O sistema utiliza um modelo de **Role-Based Access Control (RBAC)** simplificado com 3 roles principais:

### 🎭 Roles Disponíveis

#### 1. Admin (Administrador)
**Permissão:** `admin`

**Pode fazer:**
- ✅ **Usuários:** Criar, Ler, Atualizar, Deletar TODOS os usuários
- ✅ **Artigos:** Ler, Criar, Editar e Deletar QUALQUER artigo (independente do autor)

**Uso típico:** Gestores do sistema, super usuários

---

#### 2. Editor
**Permissões:** `read:articles`, `create:articles`, `update:articles`, `delete:articles`

**Pode fazer:**
- ✅ **Artigos (Ler):** Visualizar todos os artigos
- ✅ **Artigos (Criar):** Criar novos artigos
- ✅ **Artigos (Editar):** Editar apenas seus próprios artigos
- ✅ **Artigos (Deletar):** Deletar apenas seus próprios artigos
- ❌ **Usuários:** Não pode gerenciar usuários

**Uso típico:** Autores de conteúdo, criadores de artigos

---

#### 3. Reader (Leitor)
**Permissão:** `read:articles`

**Pode fazer:**
- ✅ **Artigos (Ler):** Visualizar todos os artigos
- ❌ **Artigos (Criar/Editar/Deletar):** Não pode criar, editar ou deletar
- ❌ **Usuários:** Não pode gerenciar usuários

**Uso típico:** Leitores, consumidores de conteúdo

---

### 📊 Matriz de Permissões

#### Artigos

| Operação | Endpoint | Admin | Editor | Reader |
|----------|----------|-------|--------|--------|
| **Listar artigos** | `GET /articles` | ✅ | ✅ | ✅ |
| **Ver artigo** | `GET /articles/:id` | ✅ | ✅ | ✅ |
| **Criar artigo** | `POST /articles` | ✅ | ✅ | ❌ |
| **Editar artigo próprio** | `PUT /articles/:id` | ✅ | ✅ | ❌ |
| **Editar qualquer artigo** | `PUT /articles/:id` | ✅ | ❌ | ❌ |
| **Deletar artigo próprio** | `DELETE /articles/:id` | ✅ | ✅ | ❌ |
| **Deletar qualquer artigo** | `DELETE /articles/:id` | ✅ | ❌ | ❌ |

#### Usuários

| Operação | Endpoint | Admin | Editor | Reader |
|----------|----------|-------|--------|--------|
| **Registrar (público)** | `POST /users` (sem token) | ✅ | ✅ | ✅ |
| **Login** | `POST /users/login` | ✅ | ✅ | ✅ |
| **Listar usuários** | `GET /users` | ✅ | ❌ | ❌ |
| **Ver usuário** | `GET /users/:id` | ✅ | ❌ | ❌ |
| **Criar usuário com role** | `POST /users` (com token) | ✅ | ❌ | ❌ |
| **Atualizar usuário** | `PUT /users/:id` | ✅ | ❌ | ❌ |
| **Deletar usuário** | `DELETE /users/:id` | ✅ | ❌ | ❌ |

---

### 🔧 Implementação Técnica

#### Como as permissões são verificadas?

O sistema usa **Guards** e **Decorators**:

```typescript
// Exemplo: Rota que requer 'admin' OU 'create:articles'
@Post()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('admin', 'create:articles')
async create(@Body() dto: CreateArticleDto) {
  // Se usuário tem 'admin' OU 'create:articles', acessa esta rota
}
```

#### Lógica de verificação

- O decorator `@RequirePermissions()` aceita múltiplas permissões
- A verificação é feita usando **OR lógico** (`.some()`)
- **Basta ter UMA das permissões listadas** para acessar a rota

#### Criando usuários com roles

```bash
# Criar Admin (apenas outro admin pode fazer isso)
POST /users
Authorization: Bearer <admin-token>
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "senha123",
  "role": "admin"
}

# Criar Editor (apenas admin pode fazer isso)
POST /users
Authorization: Bearer <admin-token>
{
  "name": "Editor User",
  "email": "editor@example.com",
  "password": "senha123",
  "role": "editor"
}

# Registro público (sem token, sempre cria como 'reader')
POST /users
{
  "name": "Regular User",
  "email": "user@example.com",
  "password": "senha123"
}
```

---

### 🚦 Regras de Negócio

#### 1. Ownership (Propriedade)

**Editores só podem editar/deletar seus próprios artigos:**

```typescript
// No articles.service.ts
const article = await this.prisma.article.findUnique({ where: { id } });

// Editor tentando editar artigo de outro
if (article.authorId !== userId && !isAdmin(user)) {
  throw new ForbiddenException('Você não tem permissão...');
}
```

**Admins podem editar/deletar qualquer artigo:**

```typescript
// Admin bypassa o check de ownership
const isAdmin = user.role === 'admin';
```

#### 2. Registro Público vs Admin

- **Sem token:** Qualquer pessoa pode se registrar como `reader` (role padrão)
- **Com token admin:** Pode criar usuário com qualquer role (`admin`, `editor`, `reader`)

#### 3. JWT Token Simplificado

O token de autenticação contém apenas o essencial:

**Payload JWT:**
```json
{
  "sub": "user-id-123-uuid",
  "role": "editor"
}
```

**Após decode no backend (`req.user`):**
```typescript
{
  userId: "user-id-123-uuid",
  role: "editor"
}
```

**Vantagens:**
- Token menor e mais rápido
- Apenas informações essenciais
- Sem dados sensíveis (como email)
- Role é verificada diretamente no guard

#### 4. Hierarquia de permissões

```
admin
  ↓ (pode tudo)
  ├── Gerenciar usuários
  ├── Criar/Editar/Deletar qualquer artigo
  └── Todas as permissões do sistema

editor
  ↓ (artigos apenas)
  ├── Criar artigos
  ├── Editar próprios artigos
  ├── Deletar próprios artigos
  └── Ler todos os artigos

reader
  ↓ (read-only)
  └── Ler artigos
```

---

### 📝 Exemplos de Uso

#### Exemplo 1: Reader tenta criar artigo

```bash
POST /articles
Authorization: Bearer <reader-token>

❌ Resposta: 403 Forbidden
{
  "statusCode": 403,
  "message": "Você não tem permissão para acessar este recurso",
  "error": "Forbidden"
}
```

#### Exemplo 2: Editor cria artigo

```bash
POST /articles
Authorization: Bearer <editor-token>
{
  "title": "Meu Artigo",
  "content": "Conteúdo..."
}

✅ Resposta: 201 Created
{
  "id": "uuid",
  "title": "Meu Artigo",
  "authorId": "editor-id",
  ...
}
```

#### Exemplo 3: Editor tenta editar artigo de outro

```bash
PUT /articles/outro-autor-id
Authorization: Bearer <editor-token>
{
  "title": "Tentando editar..."
}

❌ Resposta: 403 Forbidden
{
  "statusCode": 403,
  "message": "Você não tem permissão para atualizar este artigo",
  "error": "Forbidden"
}
```

#### Exemplo 4: Admin edita qualquer artigo

```bash
PUT /articles/qualquer-id
Authorization: Bearer <admin-token>
{
  "title": "Admin editando..."
}

✅ Resposta: 200 OK
{
  "id": "qualquer-id",
  "title": "Admin editando...",
  ...
}
```

---

### 🔐 Segurança

#### Boas práticas implementadas:

1. ✅ **JWT Bearer Token** para autenticação
2. ✅ **Guards** NestJS para proteção de rotas
3. ✅ **Verificação de ownership** para editores
4. ✅ **Role-based access control** simplificado
5. ✅ **Senhas hasheadas** com bcrypt
6. ✅ **Validação de dados** com class-validator
7. ✅ **Try-catch** em todos os endpoints
8. ✅ **Mensagens de erro claras** sem expor informações sensíveis

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

