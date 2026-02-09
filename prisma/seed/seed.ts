import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Criar usuário admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { role: 'admin' },
    create: {
      email: 'admin@admin.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
    },
  });

  console.log('Usuário Admin criado:', {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  // Criar usuário editor
  const editorPassword = await bcrypt.hash('editor123', 10);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@editor.com' },
    update: { role: 'editor' },
    create: {
      email: 'editor@editor.com',
      name: 'Editor User',
      password: editorPassword,
      role: 'editor',
    },
  });

  console.log('Usuário Editor criado:', {
    id: editor.id,
    email: editor.email,
    name: editor.name,
    role: editor.role,
  });

  // Criar usuário reader
  const readerPassword = await bcrypt.hash('reader123', 10);
  const reader = await prisma.user.upsert({
    where: { email: 'reader@reader.com' },
    update: { role: 'reader' },
    create: {
      email: 'reader@reader.com',
      name: 'Reader User',
      password: readerPassword,
      role: 'reader',
    },
  });

  console.log('Usuário Reader criado:', {
    id: reader.id,
    email: reader.email,
    name: reader.name,
    role: reader.role,
  });

  console.log('\nSeed concluído com sucesso!');
  console.log('\nCredenciais de acesso:');
  console.log('Admin:  admin@admin.com   / admin123');
  console.log('Editor: editor@editor.com / editor123');
  console.log('Reader: reader@reader.com / reader123');
  console.log('\nRoles disponíveis:');
  console.log('  - admin:  Acesso total ao sistema');
  console.log('  - editor: Criar e gerenciar próprios artigos');
  console.log('  - reader: Apenas leitura de artigos');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
