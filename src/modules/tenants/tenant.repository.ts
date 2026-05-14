import { PrismaClient } from '../../generated/prisma/client'
import { Tenant, CreateTenantDto, UpdateTenantDto } from './tenant.types'

export function createTenantRepository(prisma: PrismaClient) {

  async function findByPageId(ig_page_id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { ig_page_id }
    }) as Promise<Tenant | null>
  }

  async function findById(id: string): Promise<(Tenant & { user_id: string }) | null> {
    return prisma.tenant.findUnique({
      where: { id }
    }) as Promise<(Tenant & { user_id: string }) | null>
  }

  async function create(data: CreateTenantDto): Promise<Tenant> {
    return prisma.tenant.create({
      data
    }) as Promise<Tenant>
  }

  async function update(id: string, data: UpdateTenantDto): Promise<Tenant> {
    return prisma.tenant.update({
      where: { id },
      data,
    }) as Promise<Tenant>
  }

  return { findByPageId, findById, create, update }
}

export type TenantRepository = ReturnType<typeof createTenantRepository>
