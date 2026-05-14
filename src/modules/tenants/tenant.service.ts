import { TenantRepository } from './tenant.repository'
import { Tenant, CreateTenantDto, UpdateTenantDto } from './tenant.types'
import { logger } from '../../shared/utils/logger'

export function createTenantService(tenantRepo: TenantRepository) {

  async function resolveFromPageId(ig_page_id: string): Promise<Tenant> {
    const tenant = await tenantRepo.findByPageId(ig_page_id)

    if (!tenant) {
      logger.warn(`Tenant no encontrado para ig_page_id: ${ig_page_id}`)
      throw new Error(`No se encontró ningún tenant con ig_page_id: ${ig_page_id}`)
    }

    logger.info(`Tenant resuelto: ${tenant.nombre} (${ig_page_id})`)
    return tenant
  }

  async function createTenant(data: CreateTenantDto): Promise<Tenant> {
    const existing = await tenantRepo.findByPageId(data.ig_page_id)

    if (existing) {
      logger.warn(`Intento de crear tenant duplicado: ${data.ig_page_id}`)
      throw new Error(`Ya existe un tenant con ig_page_id: ${data.ig_page_id}`)
    }

    const tenant = await tenantRepo.create(data)
    logger.info(`Tenant creado: ${tenant.nombre} (id: ${tenant.id})`)
    return tenant
  }

  // Verifica que la tienda pertenezca al userId antes de actualizar.
  async function updateTenant(tenantId: string, userId: string, data: UpdateTenantDto): Promise<Tenant> {
    const tenant = await tenantRepo.findById(tenantId)
    if (!tenant) throw new Error('Tienda no encontrada')
    if (tenant.user_id !== userId) throw new Error('No tienes permiso para editar esta tienda')

    const updated = await tenantRepo.update(tenantId, data)
    logger.info(`Tienda actualizada: ${updated.nombre} (id: ${tenantId})`)
    return updated
  }

  return { resolveFromPageId, createTenant, updateTenant }
}

export type TenantService = ReturnType<typeof createTenantService>
