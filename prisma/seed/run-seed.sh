#!/bin/sh

# Script para executar seed no ambiente de produção

echo "🌱 Executando seed do banco de dados..."

# Verifica se o arquivo de seed compilado existe
if [ -f "dist/prisma/seed/seed.js" ]; then
  node dist/prisma/seed/seed.js
else
  echo "❌ Arquivo de seed não encontrado em dist/prisma/seed/seed.js"
  echo "⚠️  Pulando seed..."
fi
