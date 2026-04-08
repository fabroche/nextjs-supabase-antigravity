// Cliente Supabase con service_role — SOLO usar en API routes (backend)
// Nunca importar desde componentes cliente o hooks
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_ROLE_KEY!
    )
  }
  return _admin
}
