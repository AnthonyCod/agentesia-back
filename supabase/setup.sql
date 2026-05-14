-- Ejecutar este archivo en Supabase: Dashboard → SQL Editor → New query → pegar y correr

-- Habilitar la extensión pgvector (necesaria para el tipo vector y la búsqueda semántica)
create extension if not exists vector;

-- Tabla de productos con soporte de embeddings
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  nombre      text not null,
  descripcion text,
  precio      numeric(10, 2) not null,
  stock       integer not null default 0,
  atributos   jsonb default '{}',
  embedding   vector(1536),   -- dimensiones de text-embedding-3-small de OpenAI
  updated_at  timestamp with time zone default now()
);

-- Índice para filtrar por tenant rápidamente
create index if not exists products_tenant_id_idx on products(tenant_id);

-- Índice vectorial para acelerar la búsqueda semántica por similitud coseno
create index if not exists products_embedding_idx
  on products using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Función RPC que usa el bot para buscar productos similares al mensaje del cliente.
-- Filtra por tenant_id y ordena por similitud coseno descendente.
create or replace function match_products(
  query_embedding   vector(1536),
  match_count       int,
  filter_tenant_id  uuid
)
returns table (
  id          uuid,
  tenant_id   uuid,
  nombre      text,
  descripcion text,
  precio      numeric,
  stock       integer,
  atributos   jsonb,
  similarity  float
)
language sql stable
as $$
  select
    id,
    tenant_id,
    nombre,
    descripcion,
    precio,
    stock,
    atributos,
    1 - (embedding <=> query_embedding) as similarity
  from products
  where tenant_id = filter_tenant_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
