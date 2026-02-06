# Article System API

Sistema de gerenciamento de usuários e artigos com autenticação JWT e controle de permissões desenvolvido em NestJS.

> 📚 **[Documentação Completa](./DOCUMENTATION.md)** - Guia detalhado de instalação, API, testes e deploy

## ✨ Destaques

✅ Autenticação JWT completa  
✅ Sistema de permissões granular (8 permissões)  
✅ CRUD de usuários e artigos  
✅ 176 testes automatizados (100% passing)  
✅ Documentação Swagger interativa  
✅ Seed automático com usuário root  
✅ Containerização com Docker  

## 🚀 Quick Start

```bash
# Clone e inicie com Docker
docker compose up --build
```

**Pronto!** Acesse:
- 🌐 API: `http://localhost:3000`
- 📖 Swagger: `http://localhost:3000/api/docs`

**Credenciais iniciais:**
- Email: `root@root.com`
- Senha: `root123`

## 🧪 Testes

```bash
npm test              # 126 testes unitários (~2.9s)
npm run test:e2e      # 78 testes E2E (~26s)
npm run test:cov      # Com relatório de cobertura
```

**Status:** ✅ 204/204 testes passando (100%)  
**Cobertura:** 73% statements, 69% branches, 76% functions

## 📖 Documentação

Toda documentação foi consolidada em um único arquivo:

### [📚 DOCUMENTATION.md](./DOCUMENTATION.md)

**Conteúdo completo:**
- 🔧 Instalação e Configuração
- 🏗️ Arquitetura do Sistema
- 🔐 Autenticação e Autorização
- 📡 API Endpoints (todos os 13 endpoints)
- 🎫 Sistema de Permissões
- 🧪 Guia de Testes (unitários e E2E)
- 📏 Qualidade de Código (Linter/Prettier)
- 📖 Swagger/OpenAPI
- 🌱 Seed Automático
- 🐳 Docker
- ❓ Troubleshooting
- 🚀 Deploy em Produção

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Docker** - Containerização
- **TypeScript** - Linguagem
- **Jest** - Testes
- **Swagger** - Documentação da API

## 🛠️ Comandos Principais

```bash
# Desenvolvimento
npm run start:dev

# Testes
npm test                # Unitários
npm run test:e2e        # E2E

# Qualidade
npm run lint:format     # Lint + Format

# Docker
docker compose up --build
docker compose down
```

## 🔐 Sistema de Permissões

**8 permissões granulares:**
- `read:users`, `create:users`, `update:users`, `delete:users`
- `read:articles`, `create:articles`, `update:articles`, `delete:articles`

**Perfis:**
- **Admin** - Todas as permissões
- **Editor** - Gerencia artigos (apenas próprios)
- **Reader** - Apenas leitura

## 📡 API Endpoints

### Principais rotas:

```
GET  /health                 # Health check
POST /users/register         # Registro
POST /users/login            # Login → JWT token

GET    /users                # Listar usuários
GET    /users/:id            # Buscar usuário
PUT    /users/:id            # Atualizar
DELETE /users/:id            # Deletar

GET    /articles             # Listar artigos
POST   /articles             # Criar artigo
GET    /articles/:id         # Buscar artigo
PUT    /articles/:id         # Atualizar (owner/admin)
DELETE /articles/:id         # Deletar (owner/admin)
```

**Swagger:** `http://localhost:3000/api/docs`

## 📊 Cobertura de Testes

| Componente | Cobertura |
|-----------|-----------|
| Services | ✅ 100% |
| Controllers | ✅ 100% |
| Endpoints | ✅ 100% |
| Auth/Permissions | ✅ 100% |

## 🗄️ Banco de Dados

**PostgreSQL** com Prisma ORM

### Modelos principais:
- **User** - id, name, email, password (hash bcrypt)
- **Permission** - id, name, description
- **Article** - id, title, content, authorId
- **UserPermission** - userId, permissionId (N:N)

## 🐳 Docker

```bash
# Subir ambiente completo
docker compose up --build

# Ver logs
docker compose logs -f app

# Resetar banco
docker compose down -v
```

## ⚙️ Variáveis de Ambiente

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="change-me-in-production"
PORT=3000
```

## 📞 Suporte

Para informações detalhadas, consulte [DOCUMENTATION.md](./DOCUMENTATION.md)

---

**Status:** ✅ Projeto completo e pronto para produção  
**Testes:** 176/176 passando (100%)  
**Documentação:** Completa no DOCUMENTATION.md