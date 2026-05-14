export interface BotRequest {
  tenant_id: string
  ig_page_id: string
  sender_id: string
  message: string
  canal: 'instagram' | 'facebook'
}

export interface BotResponse {
  reply: string
  order_codigo?: string
}
