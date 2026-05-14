// Cliente de Meta Graph API: permite enviar mensajes a Instagram DM y Facebook Messenger.
// La diferencia entre webhook y API REST:
// - Webhook: Meta LLAMA a nuestro servidor cuando hay un mensaje nuevo (push).
// - API REST: NOSOTROS llamamos a Meta para enviar una respuesta (pull/push manual).
// Este cliente maneja el segundo caso — enviar mensajes de vuelta al cliente.

import axios, { type AxiosError } from 'axios'
import { env } from '../config/env'
import { logger } from '../utils/logger'

// Cada tenant (tienda) tiene su propio access token de Meta.
// El token se obtiene cuando el dueño conecta su cuenta de Facebook/Instagram en el onboarding.
// Sin el token correcto del tenant, no podemos enviar mensajes en su nombre.
const BASE_URL = `https://graph.facebook.com/${env.META_API_VERSION}`

export interface SendMessageParams {
  recipientId: string   // PSID del usuario en Facebook/Instagram
  message: string
  accessToken: string   // Token del tenant — cada tienda tiene el suyo
}

/**
 * Envía un mensaje de texto a un usuario de Instagram DM o Facebook Messenger.
 * Implementa retry exponencial: si Meta devuelve 5xx, reintenta con espera creciente.
 */
export async function sendMessage(params: SendMessageParams): Promise<void> {
  const { recipientId, message, accessToken } = params

  const body = {
    recipient: { id: recipientId },
    message: { text: message },
    messaging_type: 'RESPONSE',
  }

  // El retry exponencial evita saturar a Meta si hay un error temporal.
  // Intento 1 → espera 1s → intento 2 → espera 2s → intento 3.
  const MAX_RETRIES = 3
  let lastError: AxiosError | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.post(`${BASE_URL}/me/messages`, body, {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10_000,
      })
      return
    } catch (error) {
      lastError = error as AxiosError
      const status = lastError.response?.status ?? 0

      // Errores 4xx son del cliente (token inválido, usuario bloqueó el bot) — no reintentamos.
      if (status >= 400 && status < 500) {
        logger.warn('Error 4xx enviando mensaje Meta — no reintentando', { status, recipientId })
        throw error
      }

      if (attempt < MAX_RETRIES) {
        const waitMs = attempt * 1000
        logger.warn(`Error Meta intento ${attempt}/${MAX_RETRIES} — reintentando en ${waitMs}ms`, { status })
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
    }
  }

  logger.error('Error enviando mensaje Meta tras todos los reintentos', { recipientId })
  throw lastError
}

/**
 * Envía un mensaje con botones de respuesta rápida (quick replies).
 * Útil para confirmar órdenes o verificar pagos con opciones predefinidas.
 */
export async function sendQuickReplies(
  params: SendMessageParams & { quickReplies: string[] }
): Promise<void> {
  const { recipientId, message, accessToken, quickReplies } = params

  const body = {
    recipient: { id: recipientId },
    message: {
      text: message,
      quick_replies: quickReplies.map(title => ({
        content_type: 'text',
        title,
        payload: title.toUpperCase().replace(/\s/g, '_'),
      })),
    },
  }

  try {
    await axios.post(`${BASE_URL}/me/messages`, body, {
      params: { access_token: accessToken },
      timeout: 10_000,
    })
  } catch (error) {
    logger.error('Error enviando quick replies Meta', { error, recipientId })
    throw error
  }
}
