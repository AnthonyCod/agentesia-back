import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '../../generated/prisma/client'
import { logger } from '../../shared/utils/logger'
import type { JwtPayload } from './auth.types'

type MiddlewareConfig = {
  JWT_SECRET: string
}

// requireAuth verifica el token JWT y además comprueba que el usuario no haya
// hecho logout después de que el token fue emitido (campo last_logout_at).
// Así, un logout desde el front invalida el token aunque el servidor lo firmó.
export function createRequireAuth(config: MiddlewareConfig, prisma: PrismaClient) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token requerido' })
      return
    }

    const token = header.slice(7)
    let payload: JwtPayload

    try {
      payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload
    } catch {
      res.status(401).json({ error: 'Token inválido o expirado' })
      return
    }

    try {
      // Verificar que el usuario no haya cerrado sesión después de emitir este token.
      // Si last_logout_at > iat del token, el token fue invalidado.
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { activo: true, last_logout_at: true },
      })

      if (!user || !user.activo) {
        res.status(401).json({ error: 'Cuenta no encontrada o desactivada' })
        return
      }

      if (user.last_logout_at && user.last_logout_at.getTime() / 1000 > payload.iat) {
        res.status(401).json({ error: 'Sesión cerrada. Inicia sesión nuevamente' })
        return
      }
    } catch (err) {
      logger.error(`Error verificando sesión: ${err}`)
      res.status(500).json({ error: 'Error interno al verificar sesión' })
      return
    }

    req.user = { id: payload.sub, email: payload.email, tenantId: payload.tenantId ?? null, iat: payload.iat }
    next()
  }
}
