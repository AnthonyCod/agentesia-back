export interface MetaWebhookPayload {
  object: 'instagram' | 'page'
  entry: WebhookEntry[]
}

export interface WebhookEntry {
  id: string
  messaging: WebhookMessaging[]
}

export interface WebhookMessaging {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: {
    mid: string
    text?: string
    attachments?: WebhookAttachment[]
  }
}

export interface WebhookAttachment {
  type: 'image' | 'video' | 'audio' | 'file'
  payload: { url: string }
}
