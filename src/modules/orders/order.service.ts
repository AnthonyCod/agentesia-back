import { OrderRepository } from './order.repository'
import { Order, Commission, CreateOrderDto } from './order.types'
import { validateVoucher } from '../../shared/clients/claude.client'
import { env } from '../../shared/config/env'
import { logger } from '../../shared/utils/logger'

export function createOrderService(orderRepo: OrderRepository) {

  // Genera código único: ORD-IG-XXXX donde XXXX son 4 caracteres alfanuméricos en mayúsculas
  function generateCodigo(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const random = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `ORD-IG-${random}`
  }

  async function createOrder(data: CreateOrderDto): Promise<Order> {
    const codigo = generateCodigo()
    const order = await orderRepo.create({ ...data, codigo })
    logger.info(`Orden creada: ${codigo} (tenant: ${data.tenant_id}, producto: ${data.product_id})`)
    return order
  }

  async function getOrder(id: string): Promise<Order> {
    const order = await orderRepo.findById(id)
    if (!order) throw new Error(`Orden no encontrada: ${id}`)
    return order
  }

  async function getOrderByCodigo(codigo: string): Promise<Order> {
    const order = await orderRepo.findByCodigo(codigo)
    if (!order) throw new Error(`Orden no encontrada: ${codigo}`)
    return order
  }

  async function listOrders(tenant_id: string): Promise<Order[]> {
    return orderRepo.findByTenant(tenant_id)
  }

  // Procesa el comprobante de pago enviado por el cliente via imagen
  async function processVoucher(orderId: string, imageBase64: string): Promise<Order> {
    const order = await orderRepo.findById(orderId)
    if (!order) throw new Error(`Orden no encontrada: ${orderId}`)

    if (order.estado !== 'pendiente') {
      throw new Error(`La orden ${order.codigo} no está pendiente de pago`)
    }

    const validation = await validateVoucher(imageBase64, order.precio)
    logger.info(`Comprobante validado por IA: ${validation.isValid} (confianza: ${validation.confidence})`)

    const updated = await orderRepo.saveComprobante(orderId, imageBase64, validation.isValid)
    return updated
  }

  // El dueño verifica la orden manualmente y se registra la comisión.
  // tenantId garantiza que solo el dueño de la tienda puede verificar sus órdenes.
  async function verifyOrder(orderId: string, tenantId: string): Promise<{ order: Order; commission: Commission }> {
    const order = await orderRepo.findById(orderId)
    if (!order) throw new Error(`Orden no encontrada: ${orderId}`)
    if (order.tenant_id !== tenantId) throw new Error('No tienes permiso para verificar esta orden')

    if (order.estado !== 'comprobante_recibido') {
      throw new Error(`La orden ${order.codigo} no tiene comprobante recibido`)
    }

    const updatedOrder = await orderRepo.updateEstado(orderId, 'verificado')

    const monto = order.precio * (env.COMMISSION_PERCENTAGE / 100)
    const commission = await orderRepo.createCommission({
      order_id: orderId,
      tenant_id: order.tenant_id,
      monto,
    })

    logger.info(`Orden verificada: ${order.codigo} — comisión: $${monto.toFixed(2)}`)
    return { order: updatedOrder, commission }
  }

  async function rejectOrder(orderId: string, tenantId: string): Promise<Order> {
    const order = await orderRepo.findById(orderId)
    if (!order) throw new Error(`Orden no encontrada: ${orderId}`)
    if (order.tenant_id !== tenantId) throw new Error('No tienes permiso para rechazar esta orden')

    const updated = await orderRepo.updateEstado(orderId, 'rechazado')
    logger.info(`Orden rechazada: ${order.codigo}`)
    return updated
  }

  return { createOrder, getOrder, getOrderByCodigo, listOrders, processVoucher, verifyOrder, rejectOrder }
}

export type OrderService = ReturnType<typeof createOrderService>
