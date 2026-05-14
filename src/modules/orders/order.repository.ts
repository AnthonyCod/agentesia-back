import { PrismaClient } from '../../generated/prisma/client'
import { Order, Commission, CreateOrderDto } from './order.types'

export function createOrderRepository(prisma: PrismaClient) {

  async function create(data: CreateOrderDto & { codigo: string }): Promise<Order> {
    return prisma.order.create({ data }) as Promise<Order>
  }

  async function findById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({ where: { id } }) as Promise<Order | null>
  }

  async function findByCodigo(codigo: string): Promise<Order | null> {
    return prisma.order.findUnique({ where: { codigo } }) as Promise<Order | null>
  }

  async function findByTenant(tenant_id: string): Promise<Order[]> {
    return prisma.order.findMany({
      where: { tenant_id },
      orderBy: { created_at: 'desc' },
    }) as Promise<Order[]>
  }

  async function updateEstado(id: string, estado: Order['estado']): Promise<Order> {
    return prisma.order.update({ where: { id }, data: { estado } }) as Promise<Order>
  }

  async function saveComprobante(id: string, comprobante_url: string, validado: boolean): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: {
        comprobante_url,
        comprobante_validado_ia: validado,
        estado: 'comprobante_recibido',
      },
    }) as Promise<Order>
  }

  async function createCommission(data: { order_id: string; tenant_id: string; monto: number }): Promise<Commission> {
    return prisma.commission.create({ data }) as Promise<Commission>
  }

  return { create, findById, findByCodigo, findByTenant, updateEstado, saveComprobante, createCommission }
}

export type OrderRepository = ReturnType<typeof createOrderRepository>
