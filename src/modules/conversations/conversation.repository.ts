import { PrismaClient, Canal } from '../../generated/prisma/client'
import { Conversation, Message, CreateMessageDto } from './conversation.types'

export function createConversationRepository(prisma: PrismaClient) {

  async function findOrCreate(
    tenant_id: string,
    user_ig_id: string,
    canal: Canal
  ): Promise<Conversation> {
    const existing = await prisma.conversation.findFirst({
      where: { tenant_id, user_ig_id, estado: 'activa' }
    })

    if (existing) return existing

    return prisma.conversation.create({
      data: { tenant_id, user_ig_id, canal }
    })
  }

  async function saveMessage(data: CreateMessageDto): Promise<Message> {
    return prisma.message.create({ data })
  }

  async function getHistory(conversation_id: string, limit: number): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversation_id },
      orderBy: { created_at: 'asc' },
      take: limit
    })
  }

  return { findOrCreate, saveMessage, getHistory }
}

export type ConversationRepository = ReturnType<typeof createConversationRepository>
