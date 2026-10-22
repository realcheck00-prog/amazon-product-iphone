import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase browser client.
 *
 * Reads `VITE_SUPABASE_URL` and one browser-safe key:
 *
 *   - `VITE_SUPABASE_PUBLISHABLE_KEY` — the modern `sb_publishable_…` key
 *   - `VITE_SUPABASE_ANON_KEY` — the legacy anon JWT, still valid
 *
 * Both are safe to ship in a browser bundle: they carry the `anon` role only.
 * The database password, the service-role key and every other secret stay on
 * the server and must never appear in `VITE_*` variables, in this file or in
 * a log.
 *
 * This onboarding flow creates no Auth session, so session persistence is
 * switched off: the client is used only to insert one onboarding row.
 */

const PLACEHOLDER_RE = /your-project-ref|your-publishable-key|your_publishable_key/i
const HTTPS_URL_RE = /^https:\/\/[^\s]+$/i

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const rawKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ''
).trim()

function isValidUrl(value: string): boolean {
  return HTTPS_URL_RE.test(value) && !PLACEHOLDER_RE.test(value)
}

function isValidKey(value: string): boolean {
  return value.length > 0 && !PLACEHOLDER_RE.test(value)
}

export const supabaseUrl = isValidUrl(rawUrl) ? rawUrl.replace(/\/+$/, '') : ''
export const supabasePublishableKey = isValidKey(rawKey) ? rawKey : ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

/** Human-readable reason onboarding cannot run; `null` when configured correctly. */
export const supabaseConfigProblem: string | null = isSupabaseConfigured
  ? null
  : !rawUrl
    ? 'VITE_SUPABASE_URL is missing. Create a .env file from .env.example and add your project URL.'
    : !isValidUrl(rawUrl)
      ? `VITE_SUPABASE_URL is not a valid https://…supabase.co URL (currently "${rawUrl}").`
      : !isValidKey(rawKey)
        ? 'VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) is missing or still the .env.example placeholder.'
        : 'Supabase configuration is incomplete.'

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null
