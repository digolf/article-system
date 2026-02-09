import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed iniciado...\n');

  // 1. Criar Roles
  console.log('- Criando roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Acesso total ao sistema',
    },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      description: 'Criar e gerenciar próprios artigos',
    },
  });

  const readerRole = await prisma.role.upsert({
    where: { name: 'reader' },
    update: {},
    create: {
      name: 'reader',
      description: 'Apenas leitura de artigos',
    },
  });

  console.log('- 3 roles criadas\n');

  // 2. Criar Permissões
  console.log('- Criando permissões...');
  const permissions = await Promise.all([
    // Permissões de artigos
    prisma.permission.upsert({
      where: { name: 'read:articles' },
      update: {},
      create: { name: 'read:articles', description: 'Ler artigos', resource: 'article', action: 'read' },
    }),
    prisma.permission.upsert({
      where: { name: 'create:articles' },
      update: {},
      create: { name: 'create:articles', description: 'Criar artigos', resource: 'article', action: 'create' },
    }),
    prisma.permission.upsert({
      where: { name: 'update:articles' },
      update: {},
      create: { name: 'update:articles', description: 'Atualizar artigos', resource: 'article', action: 'update' },
    }),
    prisma.permission.upsert({
      where: { name: 'delete:articles' },
      update: {},
      create: { name: 'delete:articles', description: 'Deletar artigos', resource: 'article', action: 'delete' },
    }),
    // Permissão admin (acesso total)
    prisma.permission.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Acesso total ao sistema', resource: 'system', action: 'all' },
    }),
  ]);

  console.log('- 5 permissões criadas\n');

  // 3. Associar Permissões às Roles
  console.log('- Associando permissões às roles...');

  // Admin: todas as permissões
  await prisma.rolePermission.createMany({
    data: permissions.map(p => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Editor: permissões de artigos
  const articlePermissions = permissions.filter(p => p.resource === 'article');
  await prisma.rolePermission.createMany({
    data: articlePermissions.map(p => ({ roleId: editorRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Reader: apenas leitura de artigos
  const readPermission = permissions.find(p => p.name === 'read:articles');
  if (readPermission) {
    await prisma.rolePermission.create({
      data: { roleId: readerRole.id, permissionId: readPermission.id },
    }).catch(() => {});
  }

  console.log('- Permissões associadas às roles\n');

  // 4. Criar Usuário Root (Admin)
  console.log('- Criando usuário root...');
  const rootPassword = await bcrypt.hash('root123', 10);
  const root = await prisma.user.upsert({
    where: { email: 'root@root.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'root@root.com',
      name: 'Root User',
      password: rootPassword,
      roleId: adminRole.id,
    },
  });

  console.log(`- Usuário root criado: ${root.id}\n`);

  // 5. Criar Usuário Editor (Exemplo)
  console.log('- Criando usuário editor...');
  const editorPassword = await bcrypt.hash('editor123', 10);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@editor.com' },
    update: { roleId: editorRole.id },
    create: {
      email: 'editor@editor.com',
      name: 'Editor User',
      password: editorPassword,
      roleId: editorRole.id,
    },
  });

  console.log(`- Usuário editor criado: ${editor.id}\n`);

  // 6. Criar Usuário Reader (Exemplo)
  console.log('- Criando usuário reader...');
  const readerPassword = await bcrypt.hash('reader123', 10);
  const reader = await prisma.user.upsert({
    where: { email: 'reader@reader.com' },
    update: { roleId: readerRole.id },
    create: {
      email: 'reader@reader.com',
      name: 'Reader User',
      password: readerPassword,
      roleId: readerRole.id,
    },
  });

  console.log(`- Usuário reader criado: ${reader.id}\n`);

  console.log('Seed concluído com sucesso!\n');
  console.log('Credenciais dos usuários:');
  console.log('  Root:   root@root.com     / root123   (admin - acesso total)');
  console.log('  Editor: editor@editor.com / editor123 (editor - criar/editar artigos)');
  console.log('  Reader: reader@reader.com / reader123 (reader - apenas leitura)');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
