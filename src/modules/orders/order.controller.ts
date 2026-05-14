import { Request, Response } from 'express'
import { OrderService } from './order.service'
import { logger } from '../../shared/utils/logger'

export function createOrderController(orderService: OrderService) {

  async function listOrders(req: Request, res: Response): Promise<void> {
    const tenant_id = req.user!.tenantId
    if (!tenant_id) {
      res.status(400).json({ error: 'No tienes una tienda seleccionada. Usa POST /auth/select-tenant primero.' })
      return
    }
    try {
      const orders = await orderService.listOrders(tenant_id)
      res.status(200).json(orders)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al listar órdenes: ${error.message}`)
        res.status(500).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function getOrder(req: Request, res: Response): Promise<void> {
    try {
      const order = await orderService.getOrder(req.params.id as string)
      res.status(200).json(order)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al obtener orden: ${error.message}`)
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function verifyOrder(req: Request, res: Response): Promise<void> {
    const tenant_id = req.user!.tenantId
    if (!tenant_id) {
      res.status(400).json({ error: 'No tienes una tienda seleccionada.' })
      return
    }
    try {
      const result = await orderService.verifyOrder(req.params.id as string, tenant_id)
      res.status(200).json(result)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al verificar orden: ${error.message}`)
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function rejectOrder(req: Request, res: Response): Promise<void> {
    const tenant_id = req.user!.tenantId
    if (!tenant_id) {
      res.status(400).json({ error: 'No tienes una tienda seleccionada.' })
      return
    }
    try {
      const order = await orderService.rejectOrder(req.params.id as string, tenant_id)
      res.status(200).json(order)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al rechazar orden: ${error.message}`)
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  return { listOrders, getOrder, verifyOrder, rejectOrder }
}

export type OrderController = ReturnType<typeof createOrderController>
