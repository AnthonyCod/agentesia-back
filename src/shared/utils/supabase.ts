// Cliente de Supabase: la conexión entre el backend y la base de datos PostgreSQL en la nube.
// Es un singleton porque crear una conexión es costoso — reutilizamos la misma instancia
// en todo el proceso de Node.js en vez de crear una nueva en cada request.

import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

// La service_role key bypasea el Row Level Security (RLS) de Supabase.
// Tiene acceso total a todas las tablas — es equivalente a ser superuser en PostgreSQL.
// NUNCA se expone al frontend ni al cliente: solo vive en el backend y en variables de entorno.
// La anon key (la otra key de Supabase) es para el frontend con RLS activo.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    // En el backend no necesitamos sesiones de usuario — operamos con service_role directamente.
    persistSession: false,
    autoRefreshToken: false,
  },
})
