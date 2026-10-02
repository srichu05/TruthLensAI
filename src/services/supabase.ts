import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Safe runtime diagnostics — logs only hostname and presence flags, never actual keys/secrets
try {
  const hostname = supabaseUrl ? new URL(supabaseUrl).hostname : 'NOT_CONFIGURED'
  console.info('[TruthLens Supabase] Initializing client:', {
    hostname,
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
  })
} catch {
  console.warn('[TruthLens Supabase] Malformed VITE_SUPABASE_URL')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[TruthLens Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment configuration.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'truthlens_supabase_session'
  }
})
