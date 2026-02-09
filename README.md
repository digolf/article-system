# Article System API

Sistema de gerenciamento de usuários e artigos com autenticação JWT e controle de permissões.

## Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Iniciar banco de dados (Docker)
docker-compose up -d postgres

# 4. Executar migrations
npm run prisma:migrate

# 5. Executar seed (cria usuário root admin)
npm run seed

# 6. Iniciar aplicação
npm run start:dev
```

**Acesse:** http://localhost:3000/api/docs (Swagger)

## Credenciais Padrão

Após executar o seed:

```
Email: root@root.com
Senha: root123
Permissão: admin (acesso total - artigos e usuários)
```

```
Email: editor@editor.com
Senha: editor123
Permissão: editor (acesso limitado a gerenciamento artigos próprios)
```

```
Email: reader@reader.com
Senha: reader123
Permissão: reader (acesso limitado a leitura artigos)
```

## 📝 Como Criar um Novo Admin

### 1. Faça login como root

```bash
POST /users/login
Content-Type: application/json

{
  "email": "root@root.com",
  "password": "root123"
}
```

### 2. Crie o novo admin

```bash
POST /users
Authorization: Bearer <seu-token>
Content-Type: application/json

{
  "name": "Novo Admin",
  "email": "novoadmin@example.com",
  "password": "senha123",
  "role": "admin" --- PASSE A ROLE DESEJADA
}
```

**Roles disponíveis:**
- `"admin"` - Acesso total ao sistema
- `"editor"` - Criar e editar artigos
- `"user"` - Apenas leitura

## Diferença Entre Uso Público e Admin

### Rota Única: `POST /users`

#### Uso Público (sem token)
- Qualquer pessoa pode criar conta
- Role é **ignorada** e sempre cria como "user"
- Acesso apenas de leitura

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"João","email":"joao@example.com","password":"senha123"}'
```

#### Uso Admin (com token)
- Requer token admin
- Pode criar qualquer role: admin, editor ou user
- Controle total sobre permissões

```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"senha123","role":"admin"}'
```

## Documentação Completa

Veja [DOCUMENTATION.md](./DOCUMENTATION.md) para:
- Arquitetura detalhada
- Todos os endpoints da API
- Sistema de permissões
- Testes e qualidade de código
- Troubleshooting

##  Tecnologias

- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **JWT** - Autenticação
- **Swagger** - Documentação da API
- **Docker** - Containerização
- **TypeScript** - Tipagem estática

## Endpoints Principais
Acessar /api/docs para visualizar a estrutura de endpoints. 

## Sistema de Permissões

### Roles e Permissões

| Role | Artigos (Ler) | Artigos (Criar) | Artigos (Editar) | Artigos (Deletar) | Gerenciar Usuários |
|------|---------------|-----------------|------------------|--------------------|-------------------|
| **Admin** | Todos | Sim | Todos | Todos | Sim |
| **Editor** | Todos | Sim | Apenas próprios | Apenas próprios |  Não |
| **Reader** | Todos |  Não |  Não |  Não |  Não |

**Resumo:**
- **Admin**: Acesso total ao sistema
- **Editor**: Pode criar e gerenciar seus próprios artigos
- **Reader**: Pode apenas ler artigos (read-only)

## Cobertura de Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura
npm run test:cov
```

## Docker

```bash
# Iniciar tudo (app + banco)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```
