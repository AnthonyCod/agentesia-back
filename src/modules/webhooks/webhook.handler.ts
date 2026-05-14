import { Request, Response } from 'express'
import crypto from 'crypto'
import axios from 'axios'
import { TenantService } from '../tenants'
import { BotService } from '../bot'
import { OrderService } from '../orders'
import { sendMessage } from '../../shared/clients/meta.client'
import { env } from '../../shared/config/env'
import { logger } from '../../shared/utils/logger'
import { MetaWebhookPayload } from './webhook.types'

export function createWebhookHandler(
  tenantService: TenantService,
  botService: BotService,
  orderService: OrderService
) {

  function verifySignature(payload: string, signature: string): boolean {
    if (!env.META_APP_SECRET) return true
    const expected = `sha256=${crypto.createHmac('sha256', env.META_APP_SECRET).update(payload).digest('hex')}`
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  function verify(req: Request, res: Response): void {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
      logger.info('Webhook verificado por Meta')
      res.status(200).send(challenge)
    } else {
      logger.warn('Verificación de webhook fallida — token incorrecto')
      res.status(403).send('Forbidden')
    }
  }

  async function handle(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string

    if (signature && !verifySignature(JSON.stringify(req.body), signature)) {
      logger.warn('Firma HMAC inválida — request rechazado')
      res.status(401).send('Unauthorized')
      return
    }

    res.status(200).send('OK')
    const payload = req.body as MetaWebhookPayload
    processPayload(payload).catch(err => logger.error('Error procesando webhook', { err }))
  }

  async function processPayload(payload: MetaWebhookPayload): Promise<void> {
    for (const entry of payload.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        const ig_page_id = entry.id
        const sender_id = messaging.sender.id
        const canal = payload.object === 'instagram' ? 'instagram' : 'facebook'

        try {
          const tenant = await tenantService.resolveFromPageId(ig_page_id)

          if (messaging.message?.text) {
            const { reply, order_codigo } = await botService.handleMessage(tenant, {
              tenant_id: tenant.id,
              ig_page_id,
              sender_id,
              message: messaging.message.text,
              canal,
            })

            let fullReply = reply
            if (order_codigo) {
              fullReply += `\n\nTu código de orden es: *${order_codigo}*`
            }

            await sendMessage({ recipientId: sender_id, message: fullReply, accessToken: tenant.access_token })
          }

          if (messaging.message?.attachments) {
            for (const attachment of messaging.message.attachments) {
              if (attachment.type === 'image') {
                await processVoucherImage(tenant, sender_id, attachment.payload.url)
              }
            }
          }
        } catch (error) {
          logger.error(`Error procesando mensaje de ${sender_id}`, { error })
        }
      }
    }
  }

  async function processVoucherImage(
    tenant: { id: string; access_token: string; owner_ig_id: string },
    sender_id: string,
    imageUrl: string
  ): Promise<void> {
    try {
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' })
      const imageBase64 = Buffer.from(imageResponse.data).toString('base64')

      const orders = await orderService.listOrders(tenant.id)
      const pendingOrder = orders.find(o => o.estado === 'pendiente')

      if (!pendingOrder) {
        await sendMessage({
          recipientId: sender_id,
          message: 'No encontré ninguna orden pendiente de pago. ¿Necesitas hacer un pedido?',
          accessToken: tenant.access_token,
        })
        return
      }

      const updatedOrder = await orderService.processVoucher(pendingOrder.id, imageBase64)

      // Notificar al cliente
      const msgCliente = updatedOrder.comprobante_validado_ia
        ? `✅ Recibimos tu comprobante para la orden ${pendingOrder.codigo}. El dueño lo revisará pronto.`
        : `⚠️ Recibimos tu imagen pero no pudimos confirmar que sea un comprobante válido. El dueño lo revisará igual.`

      await sendMessage({ recipientId: sender_id, message: msgCliente, accessToken: tenant.access_token })

      // Notificar al dueño con link directo al panel para verificar con un click
      const verifyUrl = `${env.PANEL_URL}/orders/${pendingOrder.id}`
      const msgDuenio =
        `🔔 Nueva orden lista para verificar\n` +
        `Orden: ${pendingOrder.codigo}\n` +
        `Monto: S/. ${pendingOrder.precio.toFixed(2)}\n` +
        (updatedOrder.comprobante_validado_ia
          ? `✅ La IA validó el comprobante como auténtico.\n`
          : `⚠️ La IA no pudo validar el comprobante — revisa manualmente.\n`) +
        `Verifica aquí: ${verifyUrl}`

      await sendMessage({ recipientId: tenant.owner_ig_id, message: msgDuenio, accessToken: tenant.access_token })

      logger.info(`Comprobante procesado para orden ${pendingOrder.codigo} — dueño notificado`)
    } catch (error) {
      logger.error('Error procesando comprobante', { error, sender_id })
    }
  }

  return { verify, handle }
}

export type WebhookHandler = ReturnType<typeof createWebhookHandler>
