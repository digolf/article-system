-- Adicionar coluna role na tabela users
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- Migrar dados existentes: definir role baseado nas permissões
UPDATE "users" u
SET "role" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "user_permissions" up
    JOIN "permissions" p ON up."permissionId" = p.id
    WHERE up."userId" = u.id AND p.name = 'admin'
  ) THEN 'admin'
  WHEN EXISTS (
    SELECT 1 FROM "user_permissions" up
    JOIN "permissions" p ON up."permissionId" = p.id
    WHERE up."userId" = u.id AND p.name = 'create:articles'
  ) THEN 'editor'
  ELSE 'user'
END;

-- Remover tabelas de permissões
DROP TABLE IF EXISTS "user_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
