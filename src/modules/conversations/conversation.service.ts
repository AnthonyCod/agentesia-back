import { Canal, MessageRole } from '../../generated/prisma/client'
import { ConversationRepository } from './conversation.repository'
import { Conversation, Message } from './conversation.types'
import { env } from '../../shared/config/env'
import { logger } from '../../shared/utils/logger'

export function createConversationService(conversationRepo: ConversationRepository) {

  async function getOrStartConversation(
    tenant_id: string,
    user_ig_id: string,
    canal: Canal
  ): Promise<Conversation> {
    const conversation = await conversationRepo.findOrCreate(tenant_id, user_ig_id, canal)
    logger.info(`Conversación activa: ${conversation.id} (usuario: ${user_ig_id})`)
    return conversation
  }

  async function addMessage(
    conversation_id: string,
    tenant_id: string,
    role: MessageRole,
    content: string
  ): Promise<Message> {
    return conversationRepo.saveMessage({ conversation_id, tenant_id, role, content })
  }

  async function getHistory(conversation_id: string): Promise<Message[]> {
    const messages = await conversationRepo.getHistory(
      conversation_id,
      env.MAX_HISTORY_MESSAGES
    )
    logger.info(`Historial cargado: ${messages.length} mensajes (conversación: ${conversation_id})`)
    return messages
  }

  return { getOrStartConversation, addMessage, getHistory }
}

export type ConversationService = ReturnType<typeof createConversationService>
