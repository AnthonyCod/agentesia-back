import { OrderEstado, CommissionEstado } from '../../generated/prisma/client'

export interface Order {
  id: string
  tenant_id: string
  conversation_id: string
  product_id: string
  codigo: string
  estado: OrderEstado
  precio: number
  comprobante_url: string | null
  comprobante_validado_ia: boolean
  created_at: Date
  updated_at: Date
}

export interface Commission {
  id: string
  order_id: string
  tenant_id: string
  monto: number
  estado: CommissionEstado
  created_at: Date
}

export interface CreateOrderDto {
  tenant_id: string
  conversation_id: string
  product_id: string
  precio: number
}
