// Tipos e interfaces globales compartidos entre múltiples módulos.
// Solo viven aquí los tipos que NO pertenecen a un dominio específico.
// Si un tipo solo lo usa el módulo orders, va en order.types.ts, no aquí.

// interface define la forma de un objeto — es extensible con "extends".
// type es más flexible: puede ser unión, intersección, primitivo o alias.
// Regla práctica: usa interface para objetos de dominio, type para uniones y aliases.

// Respuesta estándar de la API — cualquier endpoint devuelve esta forma.
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Paginación genérica para cualquier lista de recursos.
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// Contexto que viaja en cada operación para garantizar el aislamiento multi-tenant.
// Todos los servicios lo reciben como primer parámetro para evitar filtrar datos entre tiendas.
export interface TenantContext {
  tenantId: string
}

// Canal de mensajería — extensible cuando agreguemos WhatsApp.
export type MessageChannel = 'instagram' | 'facebook'

// Estado de una orden a lo largo de su ciclo de vida.
export type OrderStatus =
  | 'pending_payment'     // orden creada, esperando comprobante
  | 'pending_verification' // comprobante recibido, esperando que el dueño verifique
  | 'verified'            // dueño confirmó, comisión calculada
  | 'cancelled'           // orden cancelada o expirada
