import { Router } from 'express'
import { OrderController } from './order.controller'

export function createOrderRouter(controller: OrderController): Router {
  const router = Router()

  router.get('/', controller.listOrders)
  router.get('/:id', controller.getOrder)
  router.post('/:id/verify', controller.verifyOrder)
  router.post('/:id/reject', controller.rejectOrder)

  return router
}
