import { createClient } from '@supabase/supabase-js'

// Lee las credenciales desde las variables de entorno (archivo .env).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si todavía no configuraste Supabase, la app sigue funcionando en modo local
// (localStorage). Al pegar tus credenciales en .env, pasa a usar la nube.
export const supabase = url && key ? createClient(url, key) : null
export const hasCloud = Boolean(supabase)
