#!/usr/bin/env node
/**
 * Read-only verification of the onboarding backend.
 *
 * It checks the four things that actually break onboarding:
 *
 *   1. `public.customer_onboarding` exists;
 *   2. it has every column the application writes to;
 *   3. the browser's publishable key cannot read the personal data;
 *   4. the browser can insert a complete row, and invalid values are rejected
 *      by the database;
 *   5. the old team-only assignment function is gone.
 *
 * Every probe is designed NOT to create a row: the "can we insert" probes send
 * values a CHECK constraint rejects. If one unexpectedly succeeds, the script
 * says so and prints the one row it created.
 *
 * Dependency-free (Node 18+ has a global `fetch`), reads `.env` from the repo
 * root. It only ever uses the **publishable** key, exactly like the browser.
 *
 *   node scripts/verify-onboarding.mjs
 *
 * Exit code is 0 when every check passes, 1 otherwise.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// --------------------------------------------------------------------- config
function loadEnv() {
  const values = {}
  let text = ''
  try {
    text = readFileSync(join(ROOT, '.env'), 'utf8')
  } catch {
    console.error('Could not read .env in the repo root. Copy .env.example to .env and fill it in.')
    process.exit(1)
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return values
}

const env = loadEnv()
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const PUBLIC_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  ''

if (!SUPABASE_URL || !PUBLIC_KEY) {
  console.error(
    'Missing VITE_SUPABASE_URL and a browser-safe key (VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY) in .env or the environment.',
  )
  process.exit(1)
}

const REST = `${SUPABASE_URL}/rest/v1`
const TABLE = 'customer_onboarding'

/**
 * Every column the application uses, including the account identifiers the
 * customer submits. All of them must exist, whichever role may touch them.
 */
const REQUIRED_COLUMNS = [
  'id',
  'full_name',
  'email',
  'phone',
  'address_line_1',
  'address_line_2',
  'city',
  'state_region',
  'postal_code',
  'country',
  'username',
  'external_user_id',
  'confirmation_code',
  'connection_valid_until',
  'created_at',
  'updated_at',
]

/** A fixed, obviously-fake reference so a probe can be found and deleted. */
const PROBE_ID = '00000000-0000-4000-8000-00000000dead'

const PROBE_ROW = {
  id: PROBE_ID,
  full_name: 'Verification Probe (safe to delete)',
  email: 'verification-probe@example.invalid',
  phone: '+15550100000',
  address_line_1: '1 Probe Street',
  city: 'Probe City',
  state_region: 'Probe',
  postal_code: '00000',
  country: 'United States',
  username: 'verification-probe',
  external_user_id: 'PROBE000000000000000',
  confirmation_code: '007',
  connection_valid_until: '11/2030',
}

// ------------------------------------------------------------------- output
let failed = 0
let passed = 0

function ok(label, detail = '') {
  passed++
  console.log(`  PASS  ${label}${detail ? `  \u2014 ${detail}` : ''}`)
}

function bad(label, detail = '') {
  failed++
  console.log(`  FAIL  ${label}${detail ? `  \u2014 ${detail}` : ''}`)
}

function note(label, detail = '') {
  console.log(`  ....  ${label}${detail ? `  \u2014 ${detail}` : ''}`)
}

function section(title) {
  console.log(`\n${title}`)
}

// ---------------------------------------------------------------------- fetch
function anonHeaders(extra = {}) {
  return { apikey: PUBLIC_KEY, Authorization: `Bearer ${PUBLIC_KEY}`, ...extra }
}

async function request(path, init = {}) {
  const res = await fetch(`${REST}/${path}`, {
    ...init,
    headers: anonHeaders(init.headers),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  const code = json && typeof json === 'object' ? (json.code ?? '') : ''
  return { status: res.status, text, json, code, ok: res.ok }
}

function isPermissionDenied(res) {
  return (
    res.status === 401 ||
    res.status === 403 ||
    res.code === '42501' ||
    /permission denied/i.test(res.text)
  )
}

function isMissingColumn(res) {
  return res.code === '42703' || /column .* does not exist/i.test(res.text)
}

// --------------------------------------------------------------- 1. the table
section(`1. public.${TABLE} exists`)
let tableExists = false
{
  const res = await request(`${TABLE}?select=id&limit=1`)

  if (res.status === 404 && res.text.includes('PGRST205')) {
    bad('the table does not exist', 'run db/customer_onboarding.sql in the SQL Editor')
  } else if (isPermissionDenied(res)) {
    tableExists = true
    ok('the table exists and anon reads are denied', `HTTP ${res.status}`)
  } else if (res.ok) {
    tableExists = true
    bad(
      'the table exists but anon can read it',
      'revoke all on public.customer_onboarding from anon',
    )
  } else {
    bad('the table could not be reached', `HTTP ${res.status} ${res.text.slice(0, 160)}`)
  }
}

// -------------------------------------------------------------- 2. the columns
section(`2. the columns of public.${TABLE}`)
const missingColumns = []
if (tableExists) {
  for (const column of REQUIRED_COLUMNS) {
    const res = await request(`${TABLE}?select=${column}&limit=1`)

    if (isMissingColumn(res)) {
      missingColumns.push(column)
      bad(`the column "${column}" is missing`)
    } else if (isPermissionDenied(res) || res.ok) {
      // Resolved by Postgres, so it exists. A readable answer was already
      // reported as a failure in section 1.
    } else {
      note(`the column "${column}" could not be probed`, `HTTP ${res.status}`)
    }
  }

  if (missingColumns.length === 0) {
    ok(`all ${REQUIRED_COLUMNS.length} columns are present`)
  } else {
    console.log('\n  Run db/customer_onboarding.sql in the Supabase Dashboard → SQL Editor.\n')
  }
}

// -------------------------------------------------------------- 3. the grants
section('3. the publishable key cannot read the personal data')
if (tableExists) {
  const res = await request(`${TABLE}?select=full_name,email,phone&limit=1`)
  if (isPermissionDenied(res)) {
    ok('anon cannot read names, emails or phone numbers', `HTTP ${res.status}`)
  } else if (res.ok && Array.isArray(res.json) && res.json.length === 0) {
    bad(
      'anon can read this table',
      'the table happens to be empty, but the SELECT privilege must still be revoked',
    )
  } else if (res.ok) {
    bad('anon can read the personal data', 'revoke all on this table from anon')
  } else {
    bad('the permission check could not be completed', `HTTP ${res.status}`)
  }
}

// ------------------------------------------------- 4. the insert path is safe
section('4. anon may insert a complete onboarding row — and nothing invalid')
if (!tableExists) {
  note('skipped: the table does not exist yet')
}

// Each probe sends a value a CHECK constraint rejects. The write fails, so no
// row is created; a constraint error (23514) proves the INSERT privilege and
// policy are in place, while a permission error would prove they are not.
const INVALID_PROBES = [
  ['connection_valid_until', '13/2030', 'the expiry must be a real MM/YYYY month'],
  ['confirmation_code', '12', 'the confirmation code must be exactly 3 digits'],
  ['external_user_id', 'abc-123', 'the user ID must be 1–20 alphanumeric characters'],
  ['username', '', 'the username must not be empty'],
]

if (tableExists) {
  for (const [column, value, label] of INVALID_PROBES) {
    const res = await request(`${TABLE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ...PROBE_ROW, [column]: value }),
    })

    if (res.code === '23514' || /check constraint/i.test(res.text)) {
      ok(`anon can insert, and ${label}`)
    } else if (isPermissionDenied(res)) {
      bad(
        'anon cannot insert at all',
        'grant insert (id, full_name, ...) on public.customer_onboarding to anon',
      )
    } else if (res.ok) {
      bad(`the database accepted an invalid "${column}"`, 'the CHECK constraint is missing')
      console.log(`        delete this probe row in the SQL Editor:`)
      console.log(`        delete from public.customer_onboarding where id = '${PROBE_ID}';`)
    } else {
      bad(`the "${column}" probe failed unexpectedly`, `HTTP ${res.status} ${res.text.slice(0, 160)}`)
    }
  }
}

// --------------------------------------------------- 5. the old write path
section('5. the old team-only assignment function is gone')
{
  const res = await request('rpc/assign_customer_onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_id: PROBE_ID,
      p_username: 'probe',
      p_external_user_id: 'A'.repeat(20),
      p_confirmation_code: '007',
    }),
  })

  if (res.status === 404 || res.code === '42883') {
    ok('assign_customer_onboarding does not exist', `HTTP ${res.status}`)
  } else if (isPermissionDenied(res)) {
    ok('anon cannot execute assign_customer_onboarding', `HTTP ${res.status}`)
  } else {
    bad(
      'assign_customer_onboarding is still callable',
      'drop it; the customer now supplies these values',
    )
  }
}

// --------------------------------------------------------------------- result
section('Result')
if (failed === 0) {
  console.log(`\n  ${passed} passed, 0 failed\n`)
  process.exit(0)
}
console.log(`\n  ${passed} passed, ${failed} failed\n`)
process.exit(1)
