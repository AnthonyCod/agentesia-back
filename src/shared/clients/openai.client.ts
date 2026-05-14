// Cliente de OpenAI: usado exclusivamente para generar embeddings de texto.
// Un embedding es una representación numérica de texto como un vector de 1536 números.
// Textos con significado similar producen vectores similares — eso permite búsqueda semántica.

// ¿Por qué OpenAI para embeddings y Claude para respuestas?
// text-embedding-3-small de OpenAI es el estándar de la industria para embeddings:
// alta calidad, bajo costo ($0.02/millón de tokens) y compatible con pgvector en Supabase.

import OpenAI from 'openai'
import { env } from '../config/env'
import { logger } from '../utils/logger'

// El modelo text-embedding-3-small genera vectores de 1536 dimensiones.
// Esa cifra debe coincidir con la columna vector(1536) en la tabla products de Supabase.
const EMBEDDING_MODEL = 'text-embedding-3-small'

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

/**
 * Convierte un texto en un vector de 1536 números flotantes.
 * Úsalo para: indexar productos al sincronizar, y para el query del cliente al buscar.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      // encoding_format float es el formato nativo — evita conversiones innecesarias.
      encoding_format: 'float',
    })

    return response.data[0].embedding
  } catch (error) {
    logger.error('Error generando embedding', { error, textPreview: text.slice(0, 50) })
    throw error
  }
}

/**
 * Genera embeddings para múltiples textos en una sola llamada a la API.
 * Más eficiente que llamar generateEmbedding N veces — la API los procesa en batch.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: 'float',
    })

    // La API devuelve los embeddings en el mismo orden que el input — podemos mapear directo.
    return response.data.map(item => item.embedding)
  } catch (error) {
    logger.error('Error generando embeddings en batch', { error, count: texts.length })
    throw error
  }
}
