import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import type { AuthController } from './auth.controller'
import type { RequestHandler } from 'express'

// Máximo 10 intentos por IP cada 15 minutos en endpoints de autenticación.
// Previene ataques de fuerza bruta contra contraseñas.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' },
})

export function createAuthRouter(
  controller: AuthController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  // Rutas públicas con rate limiting
  router.post('/register', authLimiter, controller.register)
  router.post('/login', authLimiter, controller.login)
  router.post('/google', authLimiter, controller.googleLogin)

  // Rutas protegidas
  router.post('/setup', requireAuth, controller.setupTenant)
  router.post('/select-tenant', requireAuth, controller.selectTenant)
  router.get('/tenants', requireAuth, controller.listTenants)
  router.post('/logout', requireAuth, controller.logout)

  return router
}
