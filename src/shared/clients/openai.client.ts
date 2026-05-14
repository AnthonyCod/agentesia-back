import OpenAI from 'openai'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const EMBEDDING_MODEL = 'text-embedding-3-small'
// 512 dimensiones — suficiente para catálogos de ropa, 3x menos storage que 1536.
// text-embedding-3-small fue diseñado para truncarse sin pérdida significativa de calidad.
const EMBEDDING_DIMENSIONS = 512

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    })
    return response.data[0].embedding
  } catch (error) {
    logger.error('Error generando embedding', { error, textPreview: text.slice(0, 50) })
    throw error
  }
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    })
    return response.data.map(item => item.embedding)
  } catch (error) {
    logger.error('Error generando embeddings en batch', { error, count: texts.length })
    throw error
  }
}
