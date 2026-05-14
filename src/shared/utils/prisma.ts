// Cliente único de Prisma para toda la aplicación.
// Prisma 7 requiere un Driver Adapter para conexiones TCP directas (sin Prisma Accelerate).
// Usamos @prisma/adapter-pg con el pool de pg para conectarnos a Supabase PostgreSQL.
// globalThis persiste entre recargas de módulos en desarrollo (hot reload con bun/nodemon).

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'
import { env } from '../config/env'

// Tipado del objeto global para que TypeScript no se queje al leer globalThis.prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Pool de conexiones TCP a Supabase PostgreSQL
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    // En desarrollo mostramos el SQL generado para facilitar el debugging
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Solo en dev reutilizamos la instancia entre hot reloads.
// En producción cada proceso arranca fresco — no hace falta.
if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
