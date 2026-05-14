// Un logger es una herramienta para registrar eventos del sistema con metadata estructurada.
// En producción NO usamos console.log porque: no tiene niveles, no tiene timestamp,
// no es JSON (difícil de parsear en Railway/Datadog), y mezcla todo en stdout sin filtros.

// Winston es la librería de logging más usada en Node.js.
// Permite definir niveles (error > warn > info > debug), formatos y destinos (transports).
import winston from 'winston'

import { env } from '../config/env'

// Los niveles de log representan severidad: error es lo más crítico, debug lo más detallado.
// En producción solo queremos ver 'info' hacia arriba para no saturar los logs.
// En desarrollo queremos 'debug' para ver todo lo que pasa internamente.
const LOG_LEVEL = env.NODE_ENV === 'production' ? 'info' : 'debug'

// JSON estructurado en producción: cada log es un objeto parseable por herramientas externas.
// En desarrollo usamos colorize + simple para que sea legible en la terminal.
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.simple()
)

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  // Los transports definen dónde se escriben los logs.
  // Console es suficiente porque Railway captura stdout/stderr automáticamente.
  transports: [new winston.transports.Console()],
})
