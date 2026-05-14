import { PrismaClient } from '../../generated/prisma/client'
import type { TenantInfo } from './auth.types'

type UserWithTenants = {
  id: string
  email: string
  password_hash: string | null
  google_id: string | null
  nombre: string
  activo: boolean
  last_logout_at: Date | null
  tenants: TenantInfo[]
}

type CreateUserData = {
  email: string
  password_hash?: string
  google_id?: string
  nombre: string
}

type CreateTenantData = {
  nombre: string
  ig_page_id: string
  access_token: string
  system_prompt: string
  bot_name: string
  owner_ig_id: string
}

const tenantSelect = { id: true, nombre: true, ig_page_id: true, bot_name: true } as const

const userWithTenantsSelect = {
  id: true,
  email: true,
  password_hash: true,
  google_id: true,
  nombre: true,
  activo: true,
  last_logout_at: true,
  tenants: { select: tenantSelect },
} as const

export type AuthRepository = ReturnType<typeof createAuthRepository>

export function createAuthRepository(prisma: PrismaClient) {
  async function findByEmail(email: string): Promise<{ id: string } | null> {
    return prisma.user.findUnique({ where: { email }, select: { id: true } })
  }

  async function findById(id: string): Promise<{ id: string; email: string; nombre: string } | null> {
    return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, nombre: true } })
  }

  async function findByEmailWithTenants(email: string): Promise<UserWithTenants | null> {
    return prisma.user.findUnique({ where: { email }, select: userWithTenantsSelect })
  }

  async function findByGoogleIdWithTenants(googleId: string): Promise<UserWithTenants | null> {
    return prisma.user.findUnique({ where: { google_id: googleId }, select: userWithTenantsSelect })
  }

  async function findTenantsByUserId(userId: string): Promise<TenantInfo[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenants: { select: tenantSelect } },
    })
    return user?.tenants ?? []
  }

  // Verifica que el tenant pertenezca al usuario antes de emitir un token con ese tenantId.
  async function findTenantOfUser(userId: string, tenantId: string): Promise<TenantInfo | null> {
    return prisma.tenant.findFirst({
      where: { id: tenantId, user_id: userId },
      select: tenantSelect,
    })
  }

  async function createUser(data: CreateUserData): Promise<{ id: string; email: string; nombre: string }> {
    return prisma.user.create({ data, select: { id: true, email: true, nombre: true } })
  }

  // Con la relación 1:N ya no hay restricción — un usuario puede tener N tiendas.
  async function createTenantForUser(userId: string, tenantData: CreateTenantData): Promise<TenantInfo> {
    return prisma.tenant.create({
      data: { ...tenantData, user_id: userId },
      select: tenantSelect,
    })
  }

  async function linkGoogleId(userId: string, googleId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { google_id: googleId } })
  }

  async function updateLastLogout(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { last_logout_at: new Date() } })
  }

  return {
    findByEmail,
    findById,
    findByEmailWithTenants,
    findByGoogleIdWithTenants,
    findTenantsByUserId,
    findTenantOfUser,
    createUser,
    createTenantForUser,
    linkGoogleId,
    updateLastLogout,
  }
}
