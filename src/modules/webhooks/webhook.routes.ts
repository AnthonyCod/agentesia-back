import { Router } from 'express'
import { WebhookHandler } from './webhook.handler'

export function createWebhookRouter(handler: WebhookHandler): Router {
  const router = Router()

  router.get('/', handler.verify)
  router.post('/', handler.handle)

  return router
}
