export interface Tenant {
  id: string
  nombre: string
  ig_page_id: string
  fb_page_id: string | null
  owner_ig_id: string
  system_prompt: string
  bot_name: string
  commission_pct: number
  access_token: string
  crm_token: string
  activo: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateTenantDto {
  user_id: string
  nombre: string
  ig_page_id: string
  fb_page_id?: string
  owner_ig_id: string
  system_prompt: string
  bot_name?: string
  commission_pct?: number
  access_token: string
}

// Solo estos campos puede editar el dueño desde el panel
export interface UpdateTenantDto {
  nombre?: string
  system_prompt?: string
  bot_name?: string
  access_token?: string
  fb_page_id?: string
}