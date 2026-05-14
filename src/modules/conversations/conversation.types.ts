import { Canal, ConversationEstado, MessageRole } from '../../generated/prisma/client'

export interface Conversation {
  id: string
  tenant_id: string
  user_ig_id: string
  canal: Canal
  estado: ConversationEstado
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: string
  conversation_id: string
  tenant_id: string
  role: MessageRole
  content: string
  created_at: Date
}

export interface CreateMessageDto {
  conversation_id: string
  tenant_id: string
  role: MessageRole
  content: string
}
