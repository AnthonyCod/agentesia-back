import { Router } from 'express'
import { TenantController } from './tenant.controller'

export function createTenantRouter(controller: TenantController): Router {
  const router = Router()

  router.post('/', controller.create)
  router.get('/:ig_page_id', controller.findByPageId)
  router.put('/:id', controller.update)

  return router
}
