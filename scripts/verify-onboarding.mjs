#!/usr/bin/env node
/**
 * Post-deploy verification for the `complete-onboarding` Edge Function.
 *
 * It checks the two things that actually break onboarding — a missing function
 * and a missing table — and then exercises the endpoint end to end:
 * preflight, happy path, retry idempotency, the sensitive-field guard and the
 * capability token.
 *
 * Dependency-free (Node 18+ has a global `fetch`), reads `.env` from the repo
 * root. It only ever uses the **anon** key, exactly like the browser.
 *
 *   node scripts/verify-onboarding.mjs
 *   node scripts/verify-onboarding.mjs --order SF-20261021-B6564D6C \
 *        --token a1bbc7d5-e379-4052-a74e-4204c4313afd
 *
 * Without `--order`/`--token` the script creates its own throw-away test order
 * (one row in `orders` + one in `order_items`) so it can test the onboarding
 * endpoint. Exit code is 0 when every check passes, 1 otherwise.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

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
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? ''

const args = process.argv.slice(2)
function arg(name) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : ''
}

const GIVEN_ORDER = arg('--order')
const GIVEN_TOKEN = arg('--token')

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (in .env or the environment).')
  process.exit(1)
}

const FUNCTIONS = `${SUPABASE_URL}/functions/v1`
const REST = `${SUPABASE_URL}/rest/v1`

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
function fnHeaders() {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function callFunction(name, body, { method = 'POST', headers = fnHeaders() } = {}) {
  const res = await fetch(`${FUNCTIONS}/${name}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: res.status, headers: res.headers, text, json }
}

// ---------------------------------------------------------------- 1. preflight
section('1. CORS preflight (this is what the browser hits first)')
let functionDeployed = false
{
  const res = await fetch(`${FUNCTIONS}/complete-onboarding`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,apikey,authorization',
    },
  })
  const allowOrigin = res.headers.get('access-control-allow-origin')
  const allowMethods = res.headers.get('access-control-allow-methods')
  const allowHeaders = res.headers.get('access-control-allow-headers') ?? ''

  if (res.status === 404) {
    bad(
      'preflight answered 404',
      'the function is not deployed — deploy it (README §2.3) and turn Verify JWT OFF',
    )
  } else if (res.status === 401) {
    bad(
      'preflight answered 401',
      'Verify JWT is ON — turn it OFF in the function settings',
    )
  } else if (res.status !== 200) {
    bad('preflight answered an unexpected status', `HTTP ${res.status}`)
  } else if (!allowOrigin) {
    bad('preflight has no access-control-allow-origin header')
  } else if (!allowMethods || !allowMethods.includes('POST')) {
    bad('preflight does not allow POST', `allow-methods: ${allowMethods}`)
  } else if (!allowHeaders.includes('content-type')) {
    bad('preflight does not allow content-type', `allow-headers: ${allowHeaders}`)
  } else {
    functionDeployed = true
    ok('preflight answered 200 with CORS headers', `allow-origin: ${allowOrigin}`)
  }
}

// ------------------------------------------------------------------- 2. table
section('2. customer_profiles table exists')
let tableExists = false
{
  const res = await fetch(`${REST}/customer_profiles?select=id&limit=1`, {
    method: 'GET',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  const text = await res.text()

  if (res.status === 404 && text.includes('PGRST205')) {
    bad(
      'the table does not exist',
      'run supabase/migrations/20261022000000_customer_onboarding.sql in the SQL Editor',
    )
  } else if (res.status === 401 || res.status === 403) {
    tableExists = true
    ok('the table exists and anon access is correctly denied', `HTTP ${res.status}`)
  } else if (res.ok) {
    tableExists = true
    ok('the table exists', 'anon read returned an empty result set')
  } else {
    bad('the table could not be reached', `HTTP ${res.status} ${text.slice(0, 160)}`)
  }
}

// ------------------------------------------------- 3. stop before side effects
if (!functionDeployed || !tableExists) {
  section('Result')
  console.log(
    '\n  The onboarding endpoint cannot be tested yet, so no test order was created.\n' +
      '  Fix the failed checks above and run this script again.\n',
  )
  console.log(`  ${passed} passed, ${failed} failed\n`)
  process.exit(1)
}

// ------------------------------------------------------------------- 3. order
section('3. Test order')
let orderNumber = GIVEN_ORDER
let accessToken = GIVEN_TOKEN
const idempotencyKey = randomUUID()
const username = `verifier${randomUUID().slice(0, 8)}`

if (orderNumber && accessToken) {
  note('using the order you supplied', orderNumber)
  const res = await callFunction('get-order', { orderNumber, accessToken })
  if (res.status === 200 && res.json) {
    ok('the supplied order was found', orderNumber)
  } else {
    bad('the supplied order was not found', `HTTP ${res.status} ${res.text.slice(0, 160)}`)
    orderNumber = ''
    accessToken = ''
  }
}

if (!orderNumber || !accessToken) {
  const res = await callFunction('create-order', {
    idempotencyKey,
    customer: {
      fullName: 'Opencode Verifier',
      email: 'verifier@example.com',
      phone: '+1 555 555 0123',
    },
    shipping: {
      line1: '1 Market Street',
      line2: '',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94105',
      country: 'US',
    },
    items: [{ productId: 'B0FQFNQ5LX', variant: '256 GB', quantity: 1 }],
  })

  if (res.status === 201 && res.json?.orderNumber && res.json?.accessToken) {
    orderNumber = res.json.orderNumber
    accessToken = res.json.accessToken
    ok('created a test order', `${orderNumber} (this row stays in your database)`)
  } else {
    bad('could not create a test order', `HTTP ${res.status} ${res.text.slice(0, 200)}`)
    section('Result')
    console.log(`\n  ${passed} passed, ${failed} failed\n`)
    process.exit(1)
  }
}

// ------------------------------------------------------------- 4. onboarding
section('4. complete-onboarding')
const onboardingPayload = {
  orderNumber,
  accessToken,
  username,
  fullName: 'Opencode Verifier',
  email: 'verifier@example.com',
  phone: '+1 555 555 0123',
  birthMonth: null,
  birthYear: null,
  addressLine1: '1 Market Street',
  addressLine2: '',
  city: 'San Francisco',
  region: 'CA',
  postalCode: '94105',
  country: 'US',
}

let customerReference = ''
{
  const res = await callFunction('complete-onboarding', onboardingPayload)
  if (res.status !== 200 && res.status !== 201) {
    bad('the onboarding call failed', `HTTP ${res.status} ${res.text.slice(0, 200)}`)
  } else if (res.json?.ok !== true) {
    bad('the onboarding call did not return ok:true', res.text.slice(0, 200))
  } else if (typeof res.json.customerReference !== 'string' || !res.json.customerReference) {
    bad('no customer reference was issued', res.text.slice(0, 200))
  } else if (!/^CUST-[0-9A-F]{10}$/.test(res.json.customerReference)) {
    bad('the customer reference has an unexpected shape', res.json.customerReference)
  } else {
    customerReference = res.json.customerReference
    ok('the customer account was created', `reference ${customerReference}`)
  }
}

verificationStatus: {
  const res = await callFunction('complete-onboarding', onboardingPayload)
  if (res.json?.verificationStatus === 'pending_review') {
    ok('the record starts as pending_review (manual confirmation)', 'no automated verification')
  } else {
    bad(
      'the record does not start as pending_review',
      `verificationStatus ${res.json?.verificationStatus}`,
    )
  }
}

// ------------------------------------------------------------- 5. retry safety
{
  const res = await callFunction('complete-onboarding', onboardingPayload)
  if (res.status !== 200) {
    bad('the retry failed', `HTTP ${res.status} ${res.text.slice(0, 200)}`)
  } else if (res.json?.customerReference !== customerReference) {
    bad(
      'the retry issued a different customer reference',
      `first ${customerReference} vs retry ${res.json?.customerReference}`,
    )
  } else if (res.json?.duplicate !== true) {
    bad('the retry was not reported as a duplicate', res.text.slice(0, 200))
  } else {
    ok('the retry reused the same record and reference', customerReference)
  }
}

// ------------------------------------------------------- 6. sensitive fields
{
  const res = await callFunction('complete-onboarding', {
    ...onboardingPayload,
    cardNumber: '4242424242424242',
    cvv: '123',
    otp: '654321',
  })
  if (res.status === 400) {
    ok('card data and one-time codes in the body were rejected', 'HTTP 400, nothing was written')
  } else {
    bad('card data in the body was NOT rejected', `HTTP ${res.status} ${res.text.slice(0, 200)}`)
  }
}

// ------------------------------------------------------ 7. capability token
{
  const res = await callFunction('complete-onboarding', {
    ...onboardingPayload,
    accessToken: randomUUID(),
  })
  if (res.status === 404 && res.json?.error === 'Order not found.') {
    ok('a wrong access token was rejected', 'HTTP 404 "Order not found."')
  } else {
    bad('a wrong access token was NOT rejected', `HTTP ${res.status} ${res.text.slice(0, 200)}`)
  }
}

// ------------------------------------------------- 8. no second order created
{
  const res = await callFunction('create-order', {
    idempotencyKey,
    customer: {
      fullName: 'Opencode Verifier',
      email: 'verifier@example.com',
      phone: '+1 555 555 0123',
    },
    shipping: {
      line1: '1 Market Street',
      line2: '',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94105',
      country: 'US',
    },
    items: [{ productId: 'B0FQFNQ5LX', variant: '256 GB', quantity: 1 }],
  })
  if (res.status === 201 && res.json?.orderNumber === orderNumber) {
    ok('replaying the order with the same idempotency key returned the same order', orderNumber)
  } else {
    bad(
      'replaying the order created a second order',
      `HTTP ${res.status} orderNumber ${res.json?.orderNumber} (expected ${orderNumber})`,
    )
  }
}

{
  const res = await callFunction('get-order', { orderNumber, accessToken })
  if (res.status === 200 && res.json?.orderNumber === orderNumber) {
    ok('the order still resolves to exactly one order', orderNumber)
  } else {
    bad('the order could not be read back', `HTTP ${res.status} ${res.text.slice(0, 200)}`)
  }
}

// ------------------------------------------------------------------- 9. result
section('Result')
if (failed === 0) {
  console.log(`\n  ${passed} passed, 0 failed\n`)
  process.exit(0)
}
console.log(`\n  ${passed} passed, ${failed} failed\n`)
process.exit(1)
