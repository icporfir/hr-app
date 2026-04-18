// =====================================================
// Singleton Prisma Client — reutilizăm aceeași instanță
// pentru a evita deschiderea de conexiuni multiple
// =====================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // Logging pentru dezvoltare — vedem query-urile în consolă
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;