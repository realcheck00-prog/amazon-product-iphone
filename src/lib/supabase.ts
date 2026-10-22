import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase browser client.
 *
 * Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only the
 * publishable/anon key belongs in the frontend — never a service-role key.
 * Guest checkout does not create an Auth session, so session persistence is
 * disabled and the client is used purely to invoke Edge Functions.
 */

const PLACEHOLDER_RE = /your-project-ref|your-publishable-or-anon-key/i
const HTTPS_URL_RE = /^https:\/\/[^\s]+$/i

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

function isValidUrl(value: string): boolean {
  return HTTPS_URL_RE.test(value) && !PLACEHOLDER_RE.test(value)
}

function isValidKey(value: string): boolean {
  return value.length > 0 && !PLACEHOLDER_RE.test(value)
}

export const supabaseUrl = isValidUrl(rawUrl) ? rawUrl.replace(/\/+$/, '') : ''
export const supabaseAnonKey = isValidKey(rawKey) ? rawKey : ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/** Human-readable reason checkout cannot run; `null` when configured correctly. */
export const supabaseConfigProblem: string | null = isSupabaseConfigured
  ? null
  : !rawUrl
    ? 'VITE_SUPABASE_URL is missing. Create a .env file from .env.example and add your project URL.'
    : !isValidUrl(rawUrl)
      ? `VITE_SUPABASE_URL is not a valid https://…supabase.co URL (currently "${rawUrl}").`
      : !isValidKey(rawKey)
        ? 'VITE_SUPABASE_ANON_KEY is missing or still the .env.example placeholder.'
        : 'Supabase configuration is incomplete.'

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
