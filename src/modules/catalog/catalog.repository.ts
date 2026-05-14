import { SupabaseClient } from '@supabase/supabase-js'
import { Product, CreateProductDto, UpdateProductDto, ProductSearchResult } from './catalog.types'

export function createCatalogRepository(supabase: SupabaseClient) {

  async function findById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as Product
  }

  async function findByTenant(tenant_id: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as Product[]) ?? []
  }

  async function create(data: CreateProductDto & { embedding: number[] }): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return product as Product
  }

  async function update(id: string, data: UpdateProductDto & { embedding?: number[] }): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return product as Product
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  // Busca productos por similitud semántica usando pgvector.
  // Requiere la función match_products creada en Supabase (ver docs del proyecto).
  async function findSimilar(
    tenant_id: string,
    embedding: number[],
    limit: number = 5
  ): Promise<ProductSearchResult[]> {
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: embedding,
      match_count: limit,
      filter_tenant_id: tenant_id,
    })

    if (error) throw new Error(error.message)
    return (data as ProductSearchResult[]) ?? []
  }

  return { findById, findByTenant, create, update, remove, findSimilar }
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>
