import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agentesia API',
      version: '1.0.0',
      description: 'API del chatbot IA para tiendas de ropa en Instagram y Facebook',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desarrollo' },
      { url: 'https://tu-dominio.railway.app', description: 'Producción' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido en /auth/login, /auth/register o /auth/google',
        },
      },
      schemas: {
        // ─── Auth ──────────────────────────────────────────────────────────
        RegisterDto: {
          type: 'object',
          required: ['email', 'password', 'nombre'],
          properties: {
            email: { type: 'string', format: 'email', example: 'maria@boutiquelima.com' },
            password: { type: 'string', minLength: 8, example: 'mipassword123' },
            nombre: { type: 'string', example: 'María García' },
          },
        },
        LoginDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'maria@boutiquelima.com' },
            password: { type: 'string', example: 'mipassword123' },
          },
        },
        SetupTenantDto: {
          type: 'object',
          required: ['nombreTienda', 'ig_page_id', 'access_token', 'system_prompt'],
          properties: {
            nombreTienda: { type: 'string', example: 'Boutique Lima' },
            ig_page_id: { type: 'string', example: '123456789' },
            access_token: { type: 'string', example: 'EAABsbCS...' },
            system_prompt: { type: 'string', example: 'Eres Luna, asistente de Boutique Lima. Habla de forma amigable y usa emojis con moderación.' },
            bot_name: { type: 'string', example: 'Luna' },
          },
        },
        TenantInfo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string', example: 'Boutique Lima' },
            ig_page_id: { type: 'string', example: '123456789' },
            bot_name: { type: 'string', example: 'Luna' },
          },
        },
        AuthResult: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT para usar en el header Authorization: Bearer <token>',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', example: 'maria@boutiquelima.com' },
                nombre: { type: 'string', example: 'María García' },
              },
            },
            tenant: {
              nullable: true,
              description: 'null si todavía no completó el onboarding o tiene múltiples tiendas sin seleccionar',
              allOf: [{ $ref: '#/components/schemas/TenantInfo' }],
            },
            tenants: {
              type: 'array',
              description: 'Todas las tiendas del usuario',
              items: { $ref: '#/components/schemas/TenantInfo' },
            },
            needsOnboarding: {
              type: 'boolean',
              description: 'true → usuario sin tienda, mostrar wizard de creación',
              example: true,
            },
            needsTenantSelection: {
              type: 'boolean',
              description: 'true → usuario con más de una tienda, mostrar selector',
              example: false,
            },
          },
        },
        // ─── Catalog ───────────────────────────────────────────────────────
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string', example: 'Vestido Floral Verano' },
            descripcion: { type: 'string', nullable: true, example: 'Vestido ligero ideal para el calor, talla S-XL' },
            precio: { type: 'number', example: 89.99 },
            stock: { type: 'integer', example: 15 },
            atributos: { type: 'object', nullable: true, example: { tallas: ['S', 'M', 'L'], colores: ['rojo', 'azul'] } },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateProductDto: {
          type: 'object',
          required: ['nombre', 'precio', 'stock'],
          description: 'tenant_id se obtiene automáticamente del JWT — no se envía en el body',
          properties: {
            nombre: { type: 'string', example: 'Vestido Floral Verano' },
            descripcion: { type: 'string', example: 'Vestido ligero ideal para el calor' },
            precio: { type: 'number', example: 89.99 },
            stock: { type: 'integer', example: 15 },
            atributos: { type: 'object', example: { tallas: ['S', 'M', 'L'] } },
          },
        },
        UpdateProductDto: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Vestido Floral Premium' },
            descripcion: { type: 'string', example: 'Nueva descripción del producto' },
            precio: { type: 'number', example: 99.99 },
            stock: { type: 'integer', example: 20 },
            atributos: { type: 'object', example: { tallas: ['S', 'M', 'L', 'XL'] } },
          },
        },
        // ─── Orders ────────────────────────────────────────────────────────
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            conversation_id: { type: 'string', format: 'uuid' },
            product_id: { type: 'string', format: 'uuid' },
            codigo: { type: 'string', example: 'ORD-IG-A1B2' },
            estado: {
              type: 'string',
              enum: ['pendiente', 'comprobante_recibido', 'verificado', 'rechazado', 'archivado'],
              example: 'pendiente',
            },
            precio: { type: 'number', example: 89.99 },
            comprobante_url: { type: 'string', nullable: true },
            comprobante_validado_ia: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Tenants ───────────────────────────────────────────────────────
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string', example: 'Boutique Lima' },
            ig_page_id: { type: 'string', example: '123456789' },
            fb_page_id: { type: 'string', nullable: true, example: '987654321' },
            owner_ig_id: { type: 'string', example: '111222333' },
            system_prompt: { type: 'string', example: 'Eres Luna, asistente de Boutique Lima.' },
            bot_name: { type: 'string', example: 'Luna' },
            commission_pct: { type: 'number', example: 5.0 },
            activo: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        UpdateTenantDto: {
          type: 'object',
          description: 'Todos los campos son opcionales — solo se actualizan los que se envían',
          properties: {
            nombre: { type: 'string', example: 'Boutique Lima Premium' },
            system_prompt: { type: 'string', example: 'Eres Luna, asistente de Boutique Lima. Habla de forma amigable.' },
            bot_name: { type: 'string', example: 'Luna' },
            access_token: { type: 'string', example: 'EAABsbCS...' },
            fb_page_id: { type: 'string', example: '987654321' },
          },
        },
        // ─── Global ────────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje de error descriptivo' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.docs.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
