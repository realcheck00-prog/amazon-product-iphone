/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xxxxxxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable key (safe for the browser). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Legacy anon JWT — accepted as a fallback (also browser-safe). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
