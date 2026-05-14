export interface Product {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  atributos: Record<string, unknown> | null
  embedding: number[] | null
  updated_at: Date
}

export interface CreateProductDto {
  tenant_id: string
  nombre: string
  descripcion?: string
  precio: number
  stock: number
  atributos?: Record<string, unknown>
}

export interface UpdateProductDto {
  nombre?: string
  descripcion?: string
  precio?: number
  stock?: number
  atributos?: Record<string, unknown>
}

// Lo que devuelve la búsqueda semántica — incluye similarity (qué tan parecido es al query)
export interface ProductSearchResult {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  atributos: Record<string, unknown> | null
  similarity: number
}
