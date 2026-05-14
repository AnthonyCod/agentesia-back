import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env'
import { logger } from '../utils/logger'

// Haiku 4.5 — el más rápido y económico de Claude 4. Ideal para respuestas de chatbot.
// $0.80/MTok input · $4/MTok output · $0.08/MTok cached input
const MODEL_CHAT = 'claude-haiku-4-5-20251001'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  systemPrompt: string      // personalidad del bot — viene del tenant, se cachea
  history: ChatMessage[]
  userMessage: string
  productsContext?: string  // productos relevantes — dinámico, NO va en el system (rompe caché)
}

/**
 * Genera una respuesta del bot.
 *
 * Estrategia de caching:
 * - system prompt (personalidad del tenant) → cacheado con ephemeral cache
 * - productos encontrados → van en el mensaje del usuario, fuera del caché
 *
 * Así el caché del system prompt sobrevive entre mensajes del mismo tenant
 * aunque los productos cambien. Ahorro: ~90% del costo en conversaciones largas.
 */
export async function generateChatResponse(options: ChatOptions): Promise<string> {
  const { systemPrompt, history, userMessage, productsContext } = options

  // El contexto de productos va en el mensaje del usuario, no en el system prompt.
  // Si lo pusieramos en el system, el caché se invalida en cada mensaje (los productos cambian).
  const messageContent = productsContext
    ? `[Productos disponibles relevantes]\n${productsContext}\n\n[Mensaje del cliente]\n${userMessage}`
    : userMessage

  try {
    const response = await client.messages.create({
      model: MODEL_CHAT,
      max_tokens: 500,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        ...history,
        { role: 'user', content: messageContent },
      ],
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Respuesta inesperada de Claude')

    logger.info(`Claude tokens — input: ${response.usage.input_tokens} | output: ${response.usage.output_tokens} | cache_read: ${response.usage.cache_read_input_tokens ?? 0}`)
    return block.text
  } catch (error) {
    logger.error('Error en Claude chat', { error })
    throw error
  }
}

export interface VoucherValidationResult {
  isValid: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
  amount?: number
}

/**
 * Valida si una imagen es un comprobante de pago usando Claude Vision.
 * Pide JSON explícito y limpia posible markdown antes de parsear.
 */
export async function validateVoucher(imageBase64: string, expectedAmount?: number): Promise<VoucherValidationResult> {
  const amountHint = expectedAmount ? ` por aproximadamente S/. ${expectedAmount}` : ''
  const prompt = `Analiza esta imagen y determina si es un comprobante de transferencia o pago válido${amountHint}.
Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones:
{"isValid": boolean, "confidence": "high"|"medium"|"low", "reason": string, "amount": number|null}`

  try {
    const response = await client.messages.create({
      model: MODEL_CHAT,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Respuesta inesperada de Vision')

    // Limpiar posible markdown ```json ... ``` que Claude a veces agrega
    const cleaned = block.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    try {
      return JSON.parse(cleaned) as VoucherValidationResult
    } catch {
      logger.warn('Claude Vision no retornó JSON válido — asumiendo inválido', { raw: block.text })
      return { isValid: false, confidence: 'low', reason: 'No se pudo analizar la respuesta de IA' }
    }
  } catch (error) {
    logger.error('Error en Claude Vision', { error })
    throw error
  }
}
