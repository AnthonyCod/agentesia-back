import { Request, Response } from 'express'
import { CatalogService } from './catalog.service'
import { logger } from '../../shared/utils/logger'

export function createCatalogController(catalogService: CatalogService) {

  async function getProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await catalogService.getProduct(req.params.id as string)
      res.status(200).json(product)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al obtener producto: ${error.message}`)
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function listProducts(req: Request, res: Response): Promise<void> {
    const tenant_id = req.user!.tenantId
    if (!tenant_id) {
      res.status(400).json({ error: 'No tienes una tienda seleccionada. Usa POST /auth/select-tenant primero.' })
      return
    }
    try {
      const products = await catalogService.listProducts(tenant_id)
      res.status(200).json(products)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al listar productos: ${error.message}`)
        res.status(500).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function createProduct(req: Request, res: Response): Promise<void> {
    const tenant_id = req.user!.tenantId
    if (!tenant_id) {
      res.status(400).json({ error: 'No tienes una tienda seleccionada. Usa POST /auth/select-tenant primero.' })
      return
    }
    try {
      const product = await catalogService.createProduct({ ...req.body, tenant_id })
      res.status(201).json(product)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al crear producto: ${error.message}`)
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await catalogService.updateProduct(req.params.id as string, req.body)
      res.status(200).json(product)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al actualizar producto: ${error.message}`)
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  async function deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      await catalogService.deleteProduct(req.params.id as string)
      res.status(204).send()
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error al eliminar producto: ${error.message}`)
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Error interno del servidor' })
      }
    }
  }

  return { getProduct, listProducts, createProduct, updateProduct, deleteProduct }
}

export type CatalogController = ReturnType<typeof createCatalogController>
