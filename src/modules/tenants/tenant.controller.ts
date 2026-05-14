import { Request, Response } from 'express'
import { z } from 'zod'
import { TenantService } from './tenant.service'
import { logger } from '../../shared/utils/logger'

const updateTenantSchema = z.object({
  nombre: z.string().min(1).optional(),
  system_prompt: z.string().min(10).optional(),
  bot_name: z.string().min(1).optional(),
  access_token: z.string().min(1).optional(),
  fb_page_id: z.string().optional(),
})

export function createTenantController(tenantService: TenantService) {

  async function create(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.createTenant(req.body)
      res.status(201).json(tenant)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al crear tenant: ${error.message}`)
        res.status(400).json({ error: error.message })
      } else {
        logger.error('Error inesperado al crear tenant', { error })
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function findByPageId(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await tenantService.resolveFromPageId(req.params.ig_page_id as string)
      res.status(200).json(tenant)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al buscar tenant: ${error.message}`)
        res.status(404).json({ error: error.message })
      } else {
        logger.error('Error inesperado al buscar tenant', { error })
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  // El dueño actualiza la configuración de su tienda desde el panel.
  // Valida que la tienda pertenece al usuario autenticado en el service.
  async function update(req: Request, res: Response): Promise<void> {
    const parsed = updateTenantSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') })
      return
    }
    try {
      const tenant = await tenantService.updateTenant(
        req.params.id as string,
        req.user!.id,
        parsed.data
      )
      res.status(200).json(tenant)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al actualizar tenant: ${error.message}`)
        const status = error.message.includes('permiso') ? 403 : 400
        res.status(status).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  return { create, findByPageId, update }
}

export type TenantController = ReturnType<typeof createTenantController>
