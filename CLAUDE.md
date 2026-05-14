# Agentesia — Guía para Claude Code

## 1. Descripción del proyecto

**Agentesia** es un SaaS de chatbot con IA diseñado para tiendas de ropa que venden por Instagram y Facebook sin tener una web propia.

**Problema que resuelve:** los dueños de estas tiendas pierden ventas porque no pueden responder mensajes 24/7. El bot responde automáticamente, encuentra productos, genera órdenes y valida comprobantes de pago con IA.

**Modelo de negocio:**
- Suscripción mensual por tenant (tienda)
- Comisión del 5% sobre cada venta verificada

**Flujo de valor:** cliente escribe en Instagram → bot responde con productos → cliente paga → bot valida comprobante → dueño verifica con un click → comisión registrada.

---

## 2. Stack tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Node.js / Bun | latest | Runtime. Bun para velocidad en dev y test |
| TypeScript | ^6.0 | Tipado estático estricto (`strict: true`) |
| Express | ^5.2 | Framework HTTP para rutas y middlewares |
| Prisma | ^7.8 | ORM para tablas relacionales (tenants, conversations, messages, orders, commissions) |
| @prisma/adapter-pg + pg | ^7.8 / ^8.20 | Driver TCP para conectar Prisma a Supabase PostgreSQL |
| Supabase | ^2.105 | PostgreSQL + pgvector — cliente directo solo para la tabla `products` |
| @anthropic-ai/sdk | ^0.94 | LLM para respuestas del bot y Vision para comprobantes |
| openai | ^6.36 | Embeddings con `text-embedding-3-small` (1536 dimensiones) |
| axios | ^1.16 | HTTP client para Meta Graph API |
| winston | ^3.19 | Logger estructurado en JSON para producción |
| zod | ^4.4 | Validación de variables de entorno y schemas |
| uuid | ^14 | Generación de IDs únicos |
| dotenv | ^17 | Carga de `.env` en desarrollo |
| nodemon | ^3.1 | Hot reload en desarrollo |
| Railway | — | Deploy del backend en producción |

---

## 3. Arquitectura

### Monolito modular

El proyecto es un **monolito modular**: un solo proceso de Node.js con carpetas organizadas por dominio de negocio. No es microservicios, pero cada módulo es suficientemente autónomo para extraerse si fuera necesario.

### Enfoque híbrido de base de datos

El proyecto usa **dos formas de acceder a la base de datos**, cada una donde tiene ventaja:

| Qué | Cómo | Por qué |
|---|---|---|
| tenants, conversations, messages, orders, commissions | **Prisma** | Tablas relacionales normales — Prisma da tipado automático y migraciones |
| products | **Cliente Supabase directo** | Necesita el tipo `vector(1536)` de pgvector, que Prisma no soporta |

Prisma genera su cliente en `src/generated/prisma/` a partir de `prisma/schema.prisma`.
La conexión TCP usa `@prisma/adapter-pg` configurado en `src/shared/utils/prisma.ts`.
La URL de conexión va en `prisma.config.ts` (Prisma 7 no la lee desde `schema.prisma`).

### Capas por módulo

Los módulos con solo lógica de negocio tienen tres capas:
```
módulo/
├── *.repository.ts   → acceso a datos (queries SQL)
├── *.service.ts      → lógica de negocio (orquestación, reglas)
└── *.types.ts        → interfaces y tipos del dominio
```

El módulo `catalog` tiene una capa adicional porque recibe requests HTTP del panel web:
```
catalog/
├── catalog.controller.ts  → endpoints REST para el panel web del dueño
├── catalog.repository.ts  → queries a Supabase con pgvector
├── catalog.service.ts     → lógica de negocio (CRUD + embeddings)
└── catalog.types.ts       → interfaces del dominio
```

### Principios SOLID aplicados

- **S (Single Responsibility):** cada archivo tiene una sola razón para cambiar. El repositorio solo hace queries; el service solo aplica reglas de negocio.
- **O (Open/Closed):** agregar soporte para WhatsApp = crear un nuevo cliente en `shared/clients/` sin modificar nada existente.
- **D (Dependency Inversion):** los services reciben sus dependencias como parámetros (repositorios, clientes), no las instancian internamente. Esto facilita el testing.

### Regla fundamental de módulos

> **Un módulo solo puede importar de otro módulo a través de su `index.ts`.**

Nunca: `import { algo } from '../tenants/tenant.service'`
Siempre: `import { algo } from '../tenants'`

Esta regla crea contratos explícitos entre módulos y evita el acoplamiento interno.

---

## 4. Estructura de carpetas

```
agentesia-back/
├── src/
│   ├── main.ts                          # Entry point: arranca Express y registra rutas
│   ├── modules/                         # Dominio de negocio dividido por contexto
│   │   ├── bot/
│   │   │   ├── bot.service.ts           # Orquestador principal: historial → búsqueda → LLM → respuesta
│   │   │   ├── bot.types.ts             # Tipos del dominio bot (BotRequest, BotResponse, etc.)
│   │   │   └── index.ts                 # Contrato público del módulo bot
│   │   ├── catalog/
│   │   │   ├── catalog.controller.ts    # Endpoints REST para el panel web del dueño
│   │   │   │                            # GET/POST/PUT/DELETE /catalog
│   │   │   ├── catalog.repository.ts    # Queries a Supabase: CRUD de productos + findSimilar (pgvector)
│   │   │   ├── catalog.service.ts       # Lógica: CRUD + generación automática de embeddings
│   │   │   ├── catalog.types.ts         # Tipos: Product, CreateProductDTO, UpdateProductDTO, ProductSearchResult
│   │   │   └── index.ts                 # Contrato público del módulo catalog
│   │   ├── conversations/
│   │   │   ├── conversation.repository.ts  # findOrCreate conversación, guardar mensajes
│   │   │   ├── conversation.service.ts     # Recuperar historial para el contexto del LLM
│   │   │   ├── conversation.types.ts       # Tipos: Conversation, Message, MessageRole
│   │   │   └── index.ts                    # Contrato público del módulo conversations
│   │   ├── orders/
│   │   │   ├── order.repository.ts      # Queries: crear orden, guardar comprobante, calcular comisión
│   │   │   ├── order.service.ts         # Lógica: código ORD-XX-XXXX, validar con Vision, comisión 5%
│   │   │   ├── order.types.ts           # Tipos: Order, OrderStatus, Voucher, Commission
│   │   │   └── index.ts                 # Contrato público del módulo orders
│   │   ├── tenants/
│   │   │   ├── tenant.repository.ts     # Query: buscar tenant por ig_page_id de Meta
│   │   │   ├── tenant.service.ts        # Resolver tenant desde un mensaje entrante de webhook
│   │   │   ├── tenant.types.ts          # Tipos: Tenant (incluye systemPrompt, botName), CreateTenantDto
│   │   │   └── index.ts                 # Contrato público del módulo tenants
│   │   └── webhooks/
│   │       ├── webhook.handler.ts       # Procesa eventos de Meta: valida HMAC, enruta al bot
│   │       ├── webhook.routes.ts        # Define GET /webhook (verificación) y POST /webhook
│   │       ├── webhook.types.ts         # Tipos: MetaWebhookPayload, WebhookEntry, etc.
│   │       └── index.ts                 # Contrato público del módulo webhooks
│   ├── shared/                          # Código transversal sin lógica de negocio
│   │   ├── clients/
│   │   │   ├── claude.client.ts         # Wrapper del SDK de Anthropic (chat + vision)
│   │   │   ├── meta.client.ts           # HTTP client para Meta Graph API (enviar mensajes)
│   │   │   └── openai.client.ts         # Wrapper del SDK de OpenAI (solo embeddings)
│   │   ├── config/
│   │   │   └── env.ts                   # Validación con Zod de todas las variables de entorno
│   │   ├── types/
│   │   │   └── index.ts                 # Tipos globales compartidos entre múltiples módulos
│   │   └── utils/
│   │       ├── logger.ts                # Instancia de Winston configurada para JSON en prod
│   │       ├── prisma.ts                # Cliente singleton de Prisma con adapter TCP para Supabase
│   │       └── supabase.ts              # Cliente singleton de Supabase (solo para tabla products)
│   └── generated/
│       └── prisma/                      # Cliente Prisma auto-generado — NO editar a mano
├── prisma/
│   └── schema.prisma                    # Schema de Prisma: tenants, conversations, messages, orders, commissions
├── prisma.config.ts                     # Configuración de Prisma 7: DATABASE_URL y ruta del schema
├── index.ts                             # Re-export requerido por Bun como module entry
├── package.json
├── tsconfig.json
├── nodemon.json
└── railway.toml                         # Configuración de deploy en Railway
```

---

## 5. Flujo principal de una venta

```
1. Cliente escribe en Instagram DM
   └─ Meta envía un POST al endpoint /webhook de Agentesia

2. webhook.handler recibe el request
   ├─ Valida la firma HMAC-SHA256 (META_APP_SECRET)
   └─ Responde 200 OK inmediatamente (Meta requiere respuesta < 5 seg)

3. Procesamiento asíncrono comienza
   └─ Se extrae el sender_id y el ig_page_id del payload

4. tenant.service.resolveFromPageId(ig_page_id)
   └─ Busca en la tabla tenants qué tienda corresponde a ese ig_page_id

5. bot.service.handleMessage(tenant, sender_id, text)
   ├─ conversation.service recupera el historial de los últimos N mensajes
   ├─ catalog.service.findSimilarProducts(text) busca productos por similitud semántica
   └─ claude.client genera respuesta con system_prompt del tenant + historial + productos

6. Si Claude detecta intención de compra en su respuesta
   └─ order.service.create() genera código único ORD-IG-XXXX

7. meta.client.sendMessage() envía la respuesta al cliente

8. Cliente envía imagen del comprobante de pago
   └─ webhook.handler recibe el attachment

9. order.service.processVoucher(imageUrl)
   ├─ claude.client.validateVoucher() analiza la imagen con Vision
   └─ Si es válido: guarda el comprobante y cambia el estado a comprobante_recibido

10. meta.client.sendMessage() notifica al dueño con link de verificación

11. Dueño hace click en la URL de verificación
    ├─ order.service.verify() cambia estado a verificado
    └─ commission.service.calculate() registra el 5% como comisión

12. meta.client.sendMessage() notifica al cliente que su pedido fue confirmado
```

---

## 6. Módulos y sus responsabilidades

### `modules/tenants`
Gestiona las tiendas que usan Agentesia. Cada tienda es un **tenant** con su propio `ig_page_id` de Meta, su token de acceso (`accessToken`), su `systemPrompt` personalizado y su `botName`. Este módulo **solo** hace el lookup inicial: dado un `ig_page_id`, retorna el tenant completo. No procesa mensajes ni hace lógica de negocio. Depende de: `shared/utils/supabase`.

### `modules/conversations`
Mantiene el **historial de mensajes** por cliente y por tenant. El bot necesita contexto de los últimos N mensajes para responder coherentemente. Este módulo provee `findOrCreate` (crea una conversación si no existe) y `getHistory`. No interpreta el contenido de los mensajes. Depende de: `shared/utils/supabase`.

### `modules/catalog`
Gestiona el catálogo de productos de cada tienda. El dueño administra sus productos desde el **panel web** — no hay Google Sheets ni cron jobs. Cuando el dueño crea o edita un producto, el service genera automáticamente su embedding con OpenAI y lo guarda en Supabase. Provee búsqueda semántica (`findSimilarProducts`) que el bot usa al responder. Tiene controller HTTP porque recibe requests del panel web. Depende de: `shared/clients/openai`, `shared/utils/supabase`.

### `modules/orders`
Gestiona el ciclo de vida de las órdenes: creación con código único, recepción de comprobantes, validación con Claude Vision y cálculo de comisiones. Es el módulo más crítico para el modelo de negocio. No envía mensajes directamente. Depende de: `shared/clients/claude`, `shared/utils/supabase`.

### `modules/bot`
Es el **orquestador central**. Recibe el mensaje del cliente, llama a `conversations` para historial, a `catalog` para productos, usa el `system_prompt` del tenant como personalidad del bot, y llama a `orders` si detecta intención de compra. Es el único módulo que coordina múltiples módulos. Depende de todos los demás módulos y de `shared/clients/claude`.

### `modules/webhooks`
Es la **puerta de entrada** del sistema. Recibe los eventos de Meta (Instagram y Facebook), valida la autenticidad con HMAC-SHA256, responde 200 OK inmediatamente y delega el procesamiento al `bot.service`. También maneja el flujo de verificación inicial de Meta (GET /webhook con challenge). Depende de: `modules/tenants`, `modules/bot`.

---

## 7. System prompt personalizado por tenant

Cada tenant tiene un campo `system_prompt` en la tabla `tenants`. El dueño lo configura desde el panel web escribiendo la personalidad de su bot, por ejemplo:

> "Eres Luna, la asistente de Boutique Lima. Habla de forma amigable, usa emojis con moderación y siempre pregunta la talla antes de recomendar."

El `bot.service` lee ese campo cada vez que genera una respuesta para esa tienda y lo inyecta como system message en Claude. Así cada tienda tiene su propio bot sin cambiar código.

---

## 8. Convenciones de código

### Reglas que siempre aplicamos

```typescript
// PROHIBIDO — TypeScript pierde su utilidad
const data: any = response.data
// @ts-ignore

// CORRECTO — tipos explícitos siempre
const data: ProductRow = response.data
```

- **Sin `any` ni `@ts-ignore`** — si TypeScript se queja, arregla el tipo, no lo silencies
- **Tipos de retorno explícitos** en todas las funciones exportadas: `function foo(): Promise<Product>`
- **Named exports siempre**, excepto `main.ts`: `export function foo()`, nunca `export default`
- **Cada módulo exporta solo desde su `index.ts`** — los archivos internos son privados
- **Máximo 200 líneas por archivo** — si crece más, dividir en funciones o archivos
- **Comentarios en español** — el equipo es hispanohablante
- **Try/catch en toda llamada a API externa** — Claude, OpenAI, Meta, Supabase, Prisma
- **Logs con Winston** en puntos críticos: inicio de request, errores, decisiones importantes

### Estructura de un service típico

```typescript
// Recibe dependencias como parámetros — no las instancia aquí
export function createOrderService(
  orderRepo: OrderRepository,
  claudeClient: ClaudeClient
) {
  async function create(tenantId: string, data: CreateOrderDto): Promise<Order> {
    // lógica aquí
  }

  return { create }
}
```

---

## 9. Variables de entorno

Crea un archivo `.env` en la raíz con estas variables:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Prisma — Project Settings → Database → Connection string → URI
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Supabase — dashboard.supabase.com → proyecto → Settings → API
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role key (NO la anon key)

# Anthropic — console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI — platform.openai.com → API Keys
OPENAI_API_KEY=sk-...

# Meta — developers.facebook.com → tu app → Webhooks
META_APP_SECRET=                    # App Secret de la app de Meta
META_VERIFY_TOKEN=mi-token-secreto  # Lo defines tú, debe coincidir con Meta
META_API_VERSION=v19.0

# Configuración del bot
MAX_HISTORY_MESSAGES=10   # Cuántos mensajes pasados ve el bot
ORDER_EXPIRY_HOURS=48     # Órdenes sin pago expiran en 48 horas
COMMISSION_PERCENTAGE=5   # 5% de comisión por venta verificada
```

---

## 10. Comandos útiles

```bash
# Desarrollo con hot reload
bun dev

# Verificar tipos sin compilar
bun lint

# Compilar a JavaScript
bun build

# Correr el servidor compilado (producción)
bun start

# Correr un archivo directamente con Bun
bun run src/main.ts

# Instalar dependencias
bun install

# Regenerar el cliente Prisma después de cambiar schema.prisma
bunx prisma generate

# Aplicar cambios del schema a la base de datos (dev)
bunx prisma db push

# Ver el estado del schema vs la base de datos
bunx prisma migrate status
```

---

## 11. Orden de desarrollo recomendado

Construir en este orden garantiza que cada módulo tenga sus dependencias listas.

### Fase 1 — Infraestructura base (sin esto nada funciona)
1. **`shared/config/env.ts`** — primero lo primero: validar variables de entorno. Si falla, el servidor no arranca y el error es claro.
2. **`shared/utils/logger.ts`** — necesario antes de escribir cualquier lógica; usaremos logs desde el inicio.
3. **`shared/utils/prisma.ts`** — cliente singleton de Prisma con adapter TCP para Supabase.
4. **`shared/utils/supabase.ts`** — cliente Supabase solo para la tabla `products` (pgvector).
5. **`shared/types/index.ts`** — interfaces globales que necesitan todos los módulos.

### Fase 2 — Clientes externos
6. **`shared/clients/openai.client.ts`** — embeddings para el catálogo.
7. **`shared/clients/claude.client.ts`** — respuestas del bot y validación de comprobantes.
8. **`shared/clients/meta.client.ts`** — enviar mensajes a Instagram/Facebook.

### Fase 3 — Módulo tenants (resuelve qué tienda es)
9. **`modules/tenants/tenant.types.ts`** — define la forma del tenant (incluye systemPrompt, botName).
10. **`modules/tenants/tenant.repository.ts`** — query a Supabase por ig_page_id.
11. **`modules/tenants/tenant.service.ts`** — lógica de resolución.
12. **`modules/tenants/index.ts`** — exportar el contrato público.

### Fase 4 — Módulo conversations (contexto del bot)
13. **`modules/conversations/conversation.types.ts`**
14. **`modules/conversations/conversation.repository.ts`** — findOrCreate, getHistory.
15. **`modules/conversations/conversation.service.ts`**
16. **`modules/conversations/index.ts`**

### Fase 5 — Módulo catalog (panel web + búsqueda semántica)
17. **`modules/catalog/catalog.types.ts`** — Product, CreateProductDTO, UpdateProductDTO, ProductSearchResult.
18. **`modules/catalog/catalog.repository.ts`** — CRUD en Supabase + findSimilar con pgvector.
19. **`modules/catalog/catalog.service.ts`** — CRUD + generación de embeddings al guardar.
20. **`modules/catalog/catalog.controller.ts`** — endpoints REST para el panel web del dueño.
21. **`modules/catalog/index.ts`**

### Fase 6 — Módulo orders (el corazón del negocio)
22. **`modules/orders/order.types.ts`**
23. **`modules/orders/order.repository.ts`**
24. **`modules/orders/order.service.ts`** — crear orden, validar comprobante, calcular comisión.
25. **`modules/orders/index.ts`**

### Fase 7 — Bot y webhooks (la cara visible)
26. **`modules/bot/bot.types.ts`**
27. **`modules/bot/bot.service.ts`** — orquestador que une todos los módulos anteriores.
28. **`modules/bot/index.ts`**
29. **`modules/webhooks/webhook.types.ts`**
30. **`modules/webhooks/webhook.handler.ts`** — valida firma, llama al bot.
31. **`modules/webhooks/webhook.routes.ts`** — registra las rutas en Express.
32. **`modules/webhooks/index.ts`**

### Fase 8 — Entry point
33. **`main.ts`** — conecta todo: env, middlewares, rutas, listen.

> **Por qué este orden:** cada fase depende de la anterior. No puedes construir el bot sin el catálogo, no puedes tener catálogo sin el cliente de Supabase, no puedes tener nada sin las variables de entorno. Seguir el orden evita romper imports.
