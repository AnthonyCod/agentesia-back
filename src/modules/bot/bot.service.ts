import { ConversationService } from '../conversations'
import { CatalogService } from '../catalog'
import { OrderService } from '../orders'
import { Tenant } from '../tenants'
import { generateChatResponse, ChatMessage } from '../../shared/clients/claude.client'
import { env } from '../../shared/config/env'
import { logger } from '../../shared/utils/logger'
import { BotRequest, BotResponse } from './bot.types'

// System prompt base que se antepone al personalizado del tenant.
// Define el comportamiento universal del bot independientemente de la tienda.
const BASE_SYSTEM_PROMPT = `Eres un asistente de ventas para una tienda de ropa.
Responde siempre en el idioma del cliente. Sé breve: máximo 3 oraciones por respuesta.
Si el cliente quiere comprar algo, confirma el producto y menciona que generarás un código de orden.
No inventes productos — usa solo los que se te indiquen como disponibles.`

export function createBotService(
  conversationService: ConversationService,
  catalogService: CatalogService,
  orderService: OrderService
) {

  function detectaPurchaseIntent(reply: string): boolean {
    const keywords = ['código de orden', 'orden generada', 'ORD-IG-', 'procesar tu compra']
    return keywords.some(k => reply.toLowerCase().includes(k.toLowerCase()))
  }

  function formatProductsContext(products: { nombre: string; precio: number; descripcion: string | null; stock: number }[]): string {
    if (products.length === 0) return ''
    return products
      .map(p => `- ${p.nombre}: S/. ${p.precio} | Stock: ${p.stock}${p.descripcion ? ` | ${p.descripcion}` : ''}`)
      .join('\n')
  }

  // Combina el prompt base con la personalidad específica del tenant.
  // El resultado completo se cachea — el tenant configura su bot sin romper el caché base.
  function buildSystemPrompt(tenant: Tenant): string {
    return `${BASE_SYSTEM_PROMPT}\n\n[Personalidad y contexto de esta tienda]\n${tenant.system_prompt}`
  }

  async function handleMessage(tenant: Tenant, request: BotRequest): Promise<BotResponse> {
    logger.info(`Bot procesando mensaje de ${request.sender_id} en tenant ${tenant.nombre}`)

    const conversation = await conversationService.getOrStartConversation(
      tenant.id,
      request.sender_id,
      request.canal
    )

    await conversationService.addMessage(conversation.id, tenant.id, 'user', request.message)

    const history = await conversationService.getHistory(conversation.id)

    // Limitar historial a MAX_HISTORY_MESSAGES para controlar costos.
    // Con 10 mensajes de contexto el bot recuerda suficiente sin desperdiciar tokens.
    const chatHistory: ChatMessage[] = history
      .slice(0, -1)                          // excluye el mensaje actual
      .slice(-env.MAX_HISTORY_MESSAGES)       // aplica límite de contexto
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const similarProducts = await catalogService.findSimilarProducts(tenant.id, request.message, 3)
    const productsContext = formatProductsContext(similarProducts)

    const reply = await generateChatResponse({
      systemPrompt: buildSystemPrompt(tenant),   // personalidad del tenant — se cachea
      history: chatHistory,
      userMessage: request.message,
      productsContext: productsContext || undefined, // dinámico — fuera del caché
    })

    await conversationService.addMessage(conversation.id, tenant.id, 'assistant', reply)

    let order_codigo: string | undefined
    if (detectaPurchaseIntent(reply) && similarProducts.length > 0) {
      const topProduct = similarProducts[0]
      const order = await orderService.createOrder({
        tenant_id: tenant.id,
        conversation_id: conversation.id,
        product_id: topProduct.id,
        precio: topProduct.precio,
      })
      order_codigo = order.codigo
      logger.info(`Orden creada automáticamente: ${order_codigo}`)
    }

    return { reply, order_codigo }
  }

  return { handleMessage }
}

export type BotService = ReturnType<typeof createBotService>
