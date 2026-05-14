import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { logger } from '../../shared/utils/logger'
import type { AuthRepository } from './auth.repository'
import type { RegisterDto, LoginDto, SetupTenantDto, AuthResult, JwtPayload, TenantInfo } from './auth.types'

type AuthConfig = {
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  GOOGLE_CLIENT_ID: string
}

export type AuthService = ReturnType<typeof createAuthService>

export function createAuthService(repo: AuthRepository, config: AuthConfig) {
  const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID)

  function signToken(payload: Omit<JwtPayload, 'iat'>): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })
  }

  // Decide qué tenantId va en el token según cuántas tiendas tiene el usuario:
  // 0 tiendas → null (onboarding)
  // 1 tienda  → auto-selecciona esa tienda
  // >1 tiendas → null (el front muestra el selector)
  function buildResult(
    user: { id: string; email: string; nombre: string },
    tenants: TenantInfo[],
    selectedTenant?: TenantInfo
  ): AuthResult {
    const activeTenant = selectedTenant ?? (tenants.length === 1 ? tenants[0] : null)
    const token = signToken({ sub: user.id, email: user.email, tenantId: activeTenant?.id ?? null })

    return {
      token,
      user,
      tenant: activeTenant ?? null,
      tenants,
      needsOnboarding: tenants.length === 0,
      needsTenantSelection: tenants.length > 1 && activeTenant === null,
    }
  }

  async function register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await repo.findByEmail(dto.email)
    if (existing) throw new Error('Ya existe una cuenta con ese correo')

    const password_hash = await bcrypt.hash(dto.password, 10)
    const user = await repo.createUser({ email: dto.email, password_hash, nombre: dto.nombre })

    logger.info(`Nuevo usuario registrado: ${user.email}`)
    return buildResult(user, [])
  }

  async function login(dto: LoginDto): Promise<AuthResult> {
    const user = await repo.findByEmailWithTenants(dto.email)

    if (!user || !user.password_hash) throw new Error('Credenciales inválidas')
    if (!(await bcrypt.compare(dto.password, user.password_hash))) throw new Error('Credenciales inválidas')
    if (!user.activo) throw new Error('Cuenta desactivada')

    logger.info(`Login exitoso: ${user.email} | tiendas: ${user.tenants.length}`)
    return buildResult({ id: user.id, email: user.email, nombre: user.nombre }, user.tenants)
  }

  async function loginWithGoogle(credential: string): Promise<AuthResult> {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload.sub) throw new Error('Token de Google inválido')

    const { sub: googleId, email, name } = payload
    const nombre = name ?? email.split('@')[0]

    let user = await repo.findByGoogleIdWithTenants(googleId)
    if (!user) {
      const byEmail = await repo.findByEmailWithTenants(email)
      if (byEmail) {
        await repo.linkGoogleId(byEmail.id, googleId)
        user = { ...byEmail, google_id: googleId }
      }
    }

    if (!user) {
      const newUser = await repo.createUser({ email, google_id: googleId, nombre })
      logger.info(`Nuevo usuario vía Google: ${email}`)
      return buildResult(newUser, [])
    }

    if (!user.activo) throw new Error('Cuenta desactivada')

    logger.info(`Google login exitoso: ${user.email} | tiendas: ${user.tenants.length}`)
    return buildResult({ id: user.id, email: user.email, nombre: user.nombre }, user.tenants)
  }

  // El usuario elige con qué tienda trabajar en esta sesión.
  // Verifica que el tenant realmente pertenezca al usuario antes de emitir el token.
  async function selectTenant(userId: string, tenantId: string): Promise<AuthResult> {
    const [user, tenant] = await Promise.all([
      repo.findById(userId),
      repo.findTenantOfUser(userId, tenantId),
    ])

    if (!user) throw new Error('Usuario no encontrado')
    if (!tenant) throw new Error('Tienda no encontrada o no pertenece a tu cuenta')

    const tenants = await repo.findTenantsByUserId(userId)
    logger.info(`Tenant seleccionado: ${tenant.nombre} por user ${userId}`)
    return buildResult(user, tenants, tenant)
  }

  // Crea una nueva tienda — funciona tanto en el onboarding como para agregar una segunda tienda.
  async function setupTenant(userId: string, dto: SetupTenantDto): Promise<AuthResult> {
    const [user, tenant] = await Promise.all([
      repo.findById(userId),
      repo.createTenantForUser(userId, {
        nombre: dto.nombreTienda,
        ig_page_id: dto.ig_page_id,
        access_token: dto.access_token,
        system_prompt: dto.system_prompt,
        bot_name: dto.bot_name ?? 'Asistente',
        owner_ig_id: dto.ig_page_id,
      }),
    ])

    if (!user) throw new Error('Usuario no encontrado')

    const tenants = await repo.findTenantsByUserId(userId)
    logger.info(`Nueva tienda creada: ${tenant.nombre} para user ${userId}`)
    // Auto-selecciona la tienda recién creada en el token
    return buildResult(user, tenants, tenant)
  }

  async function logout(userId: string): Promise<void> {
    await repo.updateLastLogout(userId)
    logger.info(`Logout: user ${userId}`)
  }

  return { register, login, loginWithGoogle, selectTenant, setupTenant, logout }
}
