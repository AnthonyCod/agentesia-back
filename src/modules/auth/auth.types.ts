export interface JwtPayload {
  sub: string
  email: string
  tenantId: string | null  // null cuando el usuario tiene 0 o más de 1 tienda sin seleccionar
  iat: number
}

export interface RegisterDto {
  email: string
  password: string
  nombre: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface GoogleLoginDto {
  credential: string
}

// Datos para crear una nueva tienda (onboarding o tienda adicional)
export interface SetupTenantDto {
  nombreTienda: string
  ig_page_id: string
  access_token: string
  system_prompt: string
  bot_name?: string
}

// El usuario elige con qué tienda quiere trabajar en esta sesión
export interface SelectTenantDto {
  tenantId: string
}

export type TenantInfo = {
  id: string
  nombre: string
  ig_page_id: string
  bot_name: string
}

export interface AuthResult {
  token: string
  user: {
    id: string
    email: string
    nombre: string
  }
  // La tienda activa de esta sesión (null si hay 0 o más de 1 sin seleccionar)
  tenant: TenantInfo | null
  // Todas las tiendas del usuario — el front las muestra para que elija
  tenants: TenantInfo[]
  // Flags para que el front sepa qué pantalla mostrar
  needsOnboarding: boolean        // 0 tiendas → mostrar wizard de creación
  needsTenantSelection: boolean   // >1 tiendas → mostrar selector de tienda
}
