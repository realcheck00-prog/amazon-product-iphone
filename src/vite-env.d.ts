/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xxxxxxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable / anon key (safe for the browser). */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Payment mode advertised to the UI. Defaults to `demo`. */
  readonly VITE_PAYMENT_MODE?: 'demo' | 'live'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
