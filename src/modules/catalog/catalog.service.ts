import { CatalogRepository } from './catalog.repository'
import { Product, CreateProductDto, UpdateProductDto, ProductSearchResult } from './catalog.types'
import { generateEmbedding } from '../../shared/clients/openai.client'
import { logger } from '../../shared/utils/logger'

export function createCatalogService(catalogRepo: CatalogRepository) {

  // Genera texto combinado para el embedding — cuanto más contexto, mejor la búsqueda semántica
  function buildEmbeddingText(nombre: string, descripcion?: string): string {
    return descripcion ? `${nombre}. ${descripcion}` : nombre
  }

  async function getProduct(id: string): Promise<Product> {
    const product = await catalogRepo.findById(id)
    if (!product) throw new Error(`Producto no encontrado: ${id}`)
    return product
  }

  async function listProducts(tenant_id: string): Promise<Product[]> {
    return catalogRepo.findByTenant(tenant_id)
  }

  async function createProduct(data: CreateProductDto): Promise<Product> {
    const embeddingText = buildEmbeddingText(data.nombre, data.descripcion)
    const embedding = await generateEmbedding(embeddingText)

    const product = await catalogRepo.create({ ...data, embedding })
    logger.info(`Producto creado: ${product.nombre} (tenant: ${data.tenant_id})`)
    return product
  }

  async function updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    const existing = await catalogRepo.findById(id)
    if (!existing) throw new Error(`Producto no encontrado: ${id}`)

    // Solo regenera el embedding si cambia el nombre o la descripción
    let embedding: number[] | undefined
    if (data.nombre || data.descripcion) {
      const nombre = data.nombre ?? existing.nombre
      const descripcion = data.descripcion ?? existing.descripcion ?? undefined
      const embeddingText = buildEmbeddingText(nombre, descripcion)
      embedding = await generateEmbedding(embeddingText)
    }

    const product = await catalogRepo.update(id, { ...data, embedding })
    logger.info(`Producto actualizado: ${product.nombre} (id: ${id})`)
    return product
  }

  async function deleteProduct(id: string): Promise<void> {
    const existing = await catalogRepo.findById(id)
    if (!existing) throw new Error(`Producto no encontrado: ${id}`)

    await catalogRepo.remove(id)
    logger.info(`Producto eliminado: ${existing.nombre} (id: ${id})`)
  }

  async function findSimilarProducts(
    tenant_id: string,
    query: string,
    limit: number = 5
  ): Promise<ProductSearchResult[]> {
    const embedding = await generateEmbedding(query)
    const results = await catalogRepo.findSimilar(tenant_id, embedding, limit)
    logger.info(`Búsqueda semántica: "${query}" → ${results.length} productos encontrados`)
    return results
  }

  return { getProduct, listProducts, createProduct, updateProduct, deleteProduct, findSimilarProducts }
}

export type CatalogService = ReturnType<typeof createCatalogService>
