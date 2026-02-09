# Article System API - Documentação

> Sistema de gerenciamento de artigos com autenticação JWT e controle de permissões RBAC

## Visão Geral

**Stack:** NestJS, Prisma, PostgreSQL, JWT, Docker, TypeScript, Jest, Swagger

**Funcionalidades:**
- Autenticação JWT
- RBAC (Role-Based Access Control)
- CRUD de usuários e artigos
- Ownership validation (editores só editam seus artigos)
- Swagger UI
- Testes automatizados (176 testes)
- Docker completo

---

## Instalação

### Com Docker (Recomendado)

```bash
docker compose up --build
```

**Acesse:** `http://localhost:3000`  
**Swagger:** `http://localhost:3000/api/docs`

**Usuário padrão:**
- Email: `root@root.com`
- Senha: `root123`
- Role: `admin`

### Variáveis de Ambiente

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/article_system"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
NODE_ENV="development"
```

---

## Modelo de Dados

### User
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String   // bcrypt hash
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id])
  articles  Article[]
}
```

### Article
```prisma
model Article {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(onDelete: Cascade)
}
```

### Role
```prisma
model Role {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  permissions RolePermission[]
}
```

### Permission
```prisma
model Permission {
  id          String           @id @default(uuid())
  name        String           @unique
  resource    String           // article, user
  action      String           // create, read, update, delete
  roles       RolePermission[]
}
```

---

## Sistema de Permissões (RBAC)

### Roles e Permissões

| Role | Permissões | Capacidades |
|------|------------|-------------|
| **admin** | Todas | Gerenciar usuários, editar/deletar qualquer artigo |
| **editor** | read/create/update/delete:articles | Criar e gerenciar próprios artigos |
| **reader** | read:articles | Apenas visualizar artigos |

### Regras de Negócio

**Usuários:**
- Apenas `admin` pode: criar, listar, editar, deletar usuários
- Auto-cadastro (sem token): cria usuário `reader`
- Cadastro com token `admin`: pode definir qualquer role

**Artigos:**
- `admin`: CRUD completo em qualquer artigo
- `editor`: CRUD apenas nos próprios artigos
- `reader`: Apenas leitura

---

## API Endpoints

### Health
```http
GET /health
```

### Autenticação (Público)

**Registro:**
```http
POST /users
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Login:**
```http
POST /users/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "reader"
  }
}
```

### Usuários (Admin apenas)

```http
GET    /users           # Listar todos
GET    /users/:id       # Buscar por ID
POST   /users           # Criar (pode definir role)
PUT    /users/:id       # Atualizar
DELETE /users/:id       # Deletar (cascade: artigos)
```

**Header obrigatório:** `Authorization: Bearer <token>`

**Body criar/atualizar:**
```json
{
  "name": "Nome",
  "email": "email@example.com",
  "password": "senha123",
  "role": "admin|editor|reader"
}
```

### Artigos (Autenticados)

```http
GET    /articles        # Listar todos (todos os roles)
GET    /articles/:id    # Buscar por ID (todos os roles)
POST   /articles        # Criar (admin/editor)
PUT    /articles/:id    # Atualizar (admin ou autor)
DELETE /articles/:id    # Deletar (admin ou autor)
```

**Header obrigatório:** `Authorization: Bearer <token>`

**Body (POST/PUT):**
```json
{
  "title": "Título do Artigo",
  "content": "Conteúdo do artigo..."
}
```

### Status Codes

| Code | Descrição |
|------|-----------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |

---

## Testes

```bash
npm test              # Unitários (98 testes)
npm run test:e2e      # E2E (78 testes)
npm run test:cov      # Com cobertura
```

**Cobertura:** 100% em services, controllers, guards, validações

---

## Desenvolvimento

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Lint e Format
npm run lint
npm run format

# Docker
docker compose up --build    # Iniciar
docker compose down          # Parar
docker compose down -v       # Parar e limpar volumes
docker compose logs -f app   # Logs
```

---

## Swagger UI

**Acesse:** `http://localhost:3000/api/docs`

**Para testar rotas protegidas:**
1. Faça login via `/users/login`
2. Copie o `access_token`
3. Clique em **Authorize** (canto superior direito)
4. Cole o token (sem "Bearer")
5. Clique em **Authorize**

---

## Troubleshooting

**Porta 3000 em uso:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Banco não conecta:**
```bash
docker compose down -v
docker compose up --build
```

**Seed não executa:**
```bash
docker compose exec app npm run prisma:seed
```

## Licença

Este projeto é parte de um teste técnico.
