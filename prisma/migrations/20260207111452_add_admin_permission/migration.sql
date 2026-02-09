-- Add admin permission
INSERT INTO "permissions" ("id", "name", "description", "createdAt") VALUES
    (gen_random_uuid(), 'admin', 'Administrador com acesso total', NOW());
