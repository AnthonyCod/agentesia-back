-- Ejecutar en: Supabase → SQL Editor
-- Esta tabla NO está en Prisma porque necesita pgvector, que Prisma no soporta nativamente.

-- Habilita la extensión pgvector para búsqueda semántica
CREATE EXTENSION IF NOT EXISTS vector;

-- El embedding es un vector de 1536 dimensiones generado por OpenAI text-embedding-3-small
-- tenant_id es TEXT (no UUID) para coincidir con tenants.id que Prisma genera como text
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  precio      FLOAT NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  atributos   JSONB DEFAULT '{}'::jsonb,
  embedding   vector(1536),
  updated_at  TIMESTAMPTZ DEFAULT now()
  -- Nota: Eliminamos el UNIQUE con talla/color. 
  -- Si en el futuro necesitas evitar duplicados exactos, te sugiero agregar un campo 'sku' (Código de producto) y usar UNIQUE(tenant_id, sku)
);

-- Índice estándar para buscar productos por tenant
CREATE INDEX IF NOT EXISTS idx_products_tenant
  ON products(tenant_id);

-- Índice HNSW para búsqueda semántica eficiente con pgvector
-- HNSW es más rápido que ivfflat para búsquedas en tiempo real
CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON products USING hnsw (embedding vector_cosine_ops);

-- Función que busca los N productos más similares a un embedding dado.
-- Se llama desde catalog.repository.ts para la búsqueda semántica.
CREATE OR REPLACE FUNCTION match_products(
  query_embedding   vector(1536),
  filter_tenant_id  TEXT,
  match_count       INT DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  tenant_id   TEXT,
  nombre      TEXT,
  descripcion TEXT,
  precio      FLOAT,
  stock       INTEGER,
  atributos   JSONB,
  similarity  FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    tenant_id,
    nombre,
    descripcion,
    precio,
    stock,
    atributos,
    1 - (embedding <=> query_embedding) AS similarity
  FROM products
  WHERE tenant_id = filter_tenant_id
    AND stock > 0
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
