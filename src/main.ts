import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './shared/config/env'
import { prisma } from './shared/utils/prisma'
import { supabase } from './shared/utils/supabase'
import { logger } from './shared/utils/logger'

import { createAuthRepository, createAuthService, createAuthController, createAuthRouter, createRequireAuth } from './modules/auth'
import { createTenantRepository, createTenantService, createTenantController, createTenantRouter } from './modules/tenants'
import { createConversationRepository, createConversationService } from './modules/conversations'
import { createCatalogRepository, createCatalogService, createCatalogController, createCatalogRouter } from './modules/catalog'
import { createOrderRepository, createOrderService, createOrderController, createOrderRouter } from './modules/orders'
import { createBotService } from './modules/bot'
import { createWebhookHandler, createWebhookRouter } from './modules/webhooks'

import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './shared/config/swagger'

const app = express()
app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Repositories
const authRepo = createAuthRepository(prisma)
const tenantRepo = createTenantRepository(prisma)
const conversationRepo = createConversationRepository(prisma)
const catalogRepo = createCatalogRepository(supabase)
const orderRepo = createOrderRepository(prisma)

// Services
const authService = createAuthService(authRepo, env)
const tenantService = createTenantService(tenantRepo)
const conversationService = createConversationService(conversationRepo)
const catalogService = createCatalogService(catalogRepo)
const orderService = createOrderService(orderRepo)
const botService = createBotService(conversationService, catalogService, orderService)

// Middleware de autenticación — se reutiliza en todas las rutas protegidas
const requireAuth = createRequireAuth(env, prisma)

// Controllers
const authController = createAuthController(authService, authRepo)
const tenantController = createTenantController(tenantService)
const catalogController = createCatalogController(catalogService)
const orderController = createOrderController(orderService)
const webhookHandler = createWebhookHandler(tenantService, botService, orderService)

// Routers
const authRouter = createAuthRouter(authController, requireAuth)
const tenantRouter = createTenantRouter(tenantController)
const catalogRouter = createCatalogRouter(catalogController)
const orderRouter = createOrderRouter(orderController)
const webhookRouter = createWebhookRouter(webhookHandler)

// Rutas — /auth es público, el resto protegido con JWT
app.use('/auth', authRouter)
app.use('/tenants', requireAuth, tenantRouter)
app.use('/catalog', requireAuth, catalogRouter)
app.use('/orders', requireAuth, orderRouter)
app.use('/webhook', webhookRouter) // usa HMAC de Meta, no JWT

// Middleware de errores global
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error en ${req.method} ${req.path}: ${err.message}`)
  res.status(400).json({ error: err.message })
})

app.listen(env.PORT, () => {
  logger.info(`Servidor corriendo en puerto ${env.PORT}`)
})
