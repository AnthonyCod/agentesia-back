// Este archivo valida TODAS las variables de entorno al arrancar el servidor.
// Si algo falta o tiene el formato incorrecto, el servidor se detiene con un mensaje claro.
// Es mucho mejor fallar aquí en el arranque que fallar silenciosamente en producción a las 3am.

import { z } from 'zod'
// Zod es una librería de validación y parsing de schemas en TypeScript.
// La diferencia con un if manual: Zod valida tipo, formato, rango y genera el tipo TypeScript
// automáticamente desde el schema — una sola fuente de verdad para validación y tipado.

import dotenv from 'dotenv'

// dotenv lee el archivo .env y carga cada línea como una variable en process.env.
// process.env es el objeto global de Node.js donde viven las variables de entorno del SO.
// En Railway/producción las variables se inyectan directo sin necesitar .env.
dotenv.config()

// z.object() define la forma exacta que esperamos de process.env.
// Cada campo describe su tipo, transformación y valor por defecto.
const envSchema = z.object({
  // Servidor
  PORT: z.string().transform(Number).default(3000),
  // z.enum() restringe los valores posibles — cualquier otro valor falla la validación.
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Prisma — connection string completa de Supabase
  DATABASE_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Meta
  META_APP_SECRET: z.string().default(''),
  META_VERIFY_TOKEN: z.string().min(1),
  META_API_VERSION: z.string().default('v19.0'),

  // Configuración del bot
  MAX_HISTORY_MESSAGES: z.string().transform(Number).default(10),
  ORDER_EXPIRY_HOURS: z.string().transform(Number).default(48),
  COMMISSION_PERCENTAGE: z.string().transform(Number).default(5),

  // Autenticación JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),

  // URLs del frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  PANEL_URL: z.string().url().default('http://localhost:5173'),
})

// safeParse NO lanza excepción si hay errores — devuelve { success: true, data } o { success: false, error }.
// Alternativa: parse() lanza un ZodError directamente. Usamos safeParse para controlar el mensaje.
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Error en variables de entorno:')
  parsed.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  })
  // process.exit(1) termina el proceso de Node.js con código de error (1 = error, 0 = OK).
  // Usamos console.error aquí porque el logger todavía no está inicializado.
  process.exit(1)
}

// El tipo de env es inferido automáticamente por TypeScript desde el schema de Zod.
// Cualquier acceso a env.VARIABLE_INEXISTENTE es un error en tiempo de compilación.
export const env = parsed.data
