import 'express'

// Extiende el tipo Request de Express para agregar el usuario autenticado.
// Los controllers en rutas protegidas pueden usar req.user! con confianza
// porque el middleware requireAuth garantiza que siempre está presente.
declare module 'express' {
  interface Request {
    user?: {
      id: string
      email: string
      tenantId: string | null
      iat: number
    }
  }
}
