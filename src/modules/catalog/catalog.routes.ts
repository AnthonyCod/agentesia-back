import { Router } from 'express'
import { CatalogController } from './catalog.controller'

export function createCatalogRouter(controller: CatalogController): Router {
  const router = Router()

  router.get('/', controller.listProducts)
  router.get('/:id', controller.getProduct)
  router.post('/', controller.createProduct)
  router.put('/:id', controller.updateProduct)
  router.delete('/:id', controller.deleteProduct)

  return router
}
