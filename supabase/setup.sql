-- Ejecutar este archivo en Supabase: Dashboard → SQL Editor → New query → pegar y correr

create extension if not exists vector;

-- Limpiar versión anterior si existe
drop index if exists products_embedding_idx;
drop index if exists products_tenant_id_idx;
drop function if exists match_products;
drop table if exists products;

-- Tabla de productos con 512 dimensiones (3x menos storage que 1536, misma calidad para ropa)
create table products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  nombre      text not null,
  descripcion text,
  precio      numeric(10, 2) not null,
  stock       integer not null default 0,
  atributos   jsonb default '{}',
  embedding   vector(512),
  updated_at  timestamp with time zone default now()
);

create index products_tenant_id_idx on products(tenant_id);

create index products_embedding_idx
  on products using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_products(
  query_embedding   vector(512),
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
