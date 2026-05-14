import { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../../shared/utils/logger'
import type { AuthService } from './auth.service'
import type { AuthRepository } from './auth.repository'

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido'),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

const googleLoginSchema = z.object({
  credential: z.string().min(1, 'El credential de Google es requerido'),
})

const setupTenantSchema = z.object({
  nombreTienda: z.string().min(1, 'El nombre de la tienda es requerido'),
  ig_page_id: z.string().min(1, 'El ig_page_id es requerido'),
  access_token: z.string().min(1, 'El access_token de Meta es requerido'),
  system_prompt: z.string().min(10, 'El system prompt debe tener al menos 10 caracteres'),
  bot_name: z.string().optional(),
})

const selectTenantSchema = z.object({
  tenantId: z.string().uuid('El tenantId debe ser un UUID válido'),
})

export type AuthController = ReturnType<typeof createAuthController>

export function createAuthController(service: AuthService, repo: AuthRepository) {
  async function register(req: Request, res: Response): Promise<void> {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') })
      return
    }
    try {
      const result = await service.register(parsed.data)
      res.status(201).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar'
      logger.error(`Error en register: ${message}`)
      res.status(400).json({ error: message })
    }
  }

  async function login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') })
      return
    }
    try {
      const result = await service.login(parsed.data)
      res.status(200).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      logger.error(`Error en login: ${message}`)
      res.status(401).json({ error: message })
    }
  }

  async function googleLogin(req: Request, res: Response): Promise<void> {
    const parsed = googleLoginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') })
      return
    }
    try {
      const result = await service.loginWithGoogle(parsed.data.credential)
      res.status(200).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al autenticar con Google'
      logger.error(`Error en googleLogin: ${message}`)
      res.status(401).json({ error: message })
    }
  }

  // Crea una tienda nueva — sirve para el onboarding Y para agregar una segunda tienda.
  async function setupTenant(req: Request, res: Response): Promise<void> {
    const parsed = setupTenantSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') })
      return
    }
    try {
      const result = await service.setupTenant(req.user!.id, parsed.data)
      res.status(201).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al configurar la tienda'
      logger.error(`Error en setupTenant: ${message}`)
      res.status(400).json({ error: message })
    }
  }

  // El usuario elige con qué tienda trabajar. Retorna un nuevo token con ese tenantId.
  async function selectTenant(req: Request, res: Response): Promise<void> {
    const parsed = selectTenantSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') })
      return
    }
    try {
      const result = await service.selectTenant(req.user!.id, parsed.data.tenantId)
      res.status(200).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al seleccionar tienda'
      logger.error(`Error en selectTenant: ${message}`)
      res.status(400).json({ error: message })
    }
  }

  // Lista todas las tiendas del usuario autenticado.
  async function listTenants(req: Request, res: Response): Promise<void> {
    try {
      const tenants = await repo.findTenantsByUserId(req.user!.id)
      res.status(200).json({ tenants })
    } catch (err) {
      logger.error(`Error en listTenants: ${err}`)
      res.status(500).json({ error: 'Error al obtener las tiendas' })
    }
  }

  async function logout(req: Request, res: Response): Promise<void> {
    try {
      await service.logout(req.user!.id)
      res.status(200).json({ message: 'Sesión cerrada correctamente' })
    } catch (err) {
      logger.error(`Error en logout: ${err}`)
      res.status(500).json({ error: 'Error al cerrar sesión' })
    }
  }

  return { register, login, googleLogin, setupTenant, selectTenant, listTenants, logout }
}
