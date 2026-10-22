/**
 * Tests for the customer onboarding rules.
 *
 * Run with: node scripts/test-onboarding.mjs
 *
 * The module is imported directly from the TypeScript source — Node 22 strips
 * the types at load time. `src/lib/onboarding.ts` deliberately imports
 * nothing, so the rules can be exercised without a browser or a bundler.
 */
import assert from 'node:assert/strict'
import {
  CONNECTION_PERIOD_RE,
  buildOnboardingRecord,
  describeSubmissionError,
  emptyOnboarding,
  newOnboardingReference,
  normalizeConnectionPeriod,
  validateOnboarding,
} from '../src/lib/onboarding.ts'

let passed = 0
const failures = []

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message.split('\n')[0]}`)
  }
}

/** A complete, valid onboarding submission. */
const valid = { connectionPeriod: '18 months' }

/* -------------------------------------------------------------------------- */
/* Connection period                                                           */
/* -------------------------------------------------------------------------- */

check('a connection period in months is normalised', () => {
  assert.equal(normalizeConnectionPeriod('18 months'), '18 months')
  assert.equal(normalizeConnectionPeriod('18 MONTHS'), '18 months')
  assert.equal(normalizeConnectionPeriod('  18   months  '), '18 months')
  assert.equal(normalizeConnectionPeriod('18month'), '18 months')
})

check('a connection period in years is normalised', () => {
  assert.equal(normalizeConnectionPeriod('2 years'), '2 years')
  assert.equal(normalizeConnectionPeriod('2 YEARS'), '2 years')
  assert.equal(normalizeConnectionPeriod('2year'), '2 years')
})

check('a single unit is singular', () => {
  assert.equal(normalizeConnectionPeriod('1 months'), '1 month')
  assert.equal(normalizeConnectionPeriod('1 years'), '1 year')
  assert.equal(normalizeConnectionPeriod('1 month'), '1 month')
  assert.equal(normalizeConnectionPeriod('1 year'), '1 year')
})

check('a value without a unit or without a number is left for validation', () => {
  assert.equal(normalizeConnectionPeriod(''), '')
  assert.equal(normalizeConnectionPeriod('12'), '12')
  assert.equal(normalizeConnectionPeriod('months'), 'months')
  assert.equal(normalizeConnectionPeriod('many months'), 'many months')
})

check('the accepted shape requires a positive whole number and a unit', () => {
  assert.ok(CONNECTION_PERIOD_RE.test('18 months'))
  assert.ok(CONNECTION_PERIOD_RE.test('1 month'))
  assert.ok(CONNECTION_PERIOD_RE.test('2 years'))
  assert.ok(CONNECTION_PERIOD_RE.test('1 year'))
  assert.ok(!CONNECTION_PERIOD_RE.test('0 months'))
  assert.ok(!CONNECTION_PERIOD_RE.test('18'))
  assert.ok(!CONNECTION_PERIOD_RE.test('18 days'))
  assert.ok(!CONNECTION_PERIOD_RE.test('18months'))
  assert.ok(!CONNECTION_PERIOD_RE.test('18.5 months'))
  assert.ok(!CONNECTION_PERIOD_RE.test('-18 months'))
})

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

check('a valid submission has no errors', () => {
  assert.deepEqual(validateOnboarding(valid), {})
})

check('the connection period is required', () => {
  assert.ok(validateOnboarding({ ...emptyOnboarding }).connectionPeriod)
  assert.ok(validateOnboarding({ connectionPeriod: '   ' }).connectionPeriod)
})

check('a number without a unit is rejected', () => {
  assert.ok(validateOnboarding({ connectionPeriod: '12' }).connectionPeriod)
})

check('an unknown unit is rejected', () => {
  assert.ok(validateOnboarding({ connectionPeriod: '12 days' }).connectionPeriod)
})

check('zero is rejected', () => {
  assert.ok(validateOnboarding({ connectionPeriod: '0 months' }).connectionPeriod)
})

check('a normalised but valid value passes', () => {
  assert.deepEqual(validateOnboarding({ connectionPeriod: '  2   YEARS ' }), {})
})

/* -------------------------------------------------------------------------- */
/* The database row                                                             */
/* -------------------------------------------------------------------------- */

const input = {
  id: '6f1c2b3a-3d4e-4f50-8a91-2b3c4d5e6f70',
  fullName: '  Alex Morgan  ',
  email: '  Alex@Example.COM ',
  phone: '  +1 (555) 010-9999 ',
  addressLine1: ' 1 Market Street ',
  addressLine2: ' Apt 4 ',
  city: ' San Francisco ',
  stateRegion: ' CA ',
  postalCode: ' 94105 ',
  country: ' United States ',
  connectionPeriod: ' 18 MONTHS ',
}

const record = buildOnboardingRecord(input)

check('the row contains exactly the columns the browser may write', () => {
  assert.deepEqual(Object.keys(record).sort(), [
    'address_line_1',
    'address_line_2',
    'city',
    'connection_period',
    'country',
    'email',
    'full_name',
    'id',
    'phone',
    'postal_code',
    'state_region',
  ])
})

check('the values are trimmed and the email is lower-cased', () => {
  assert.equal(record.id, input.id)
  assert.equal(record.full_name, 'Alex Morgan')
  assert.equal(record.email, 'alex@example.com')
  assert.equal(record.phone, '+1 (555) 010-9999')
  assert.equal(record.address_line_1, '1 Market Street')
  assert.equal(record.address_line_2, 'Apt 4')
  assert.equal(record.city, 'San Francisco')
  assert.equal(record.state_region, 'CA')
  assert.equal(record.postal_code, '94105')
  assert.equal(record.country, 'United States')
  assert.equal(record.connection_period, '18 months')
})

check('phone numbers and postal codes are never rewritten', () => {
  const kept = buildOnboardingRecord({
    ...input,
    phone: '+44 20 7946 0958',
    postalCode: 'SW1A 1AA',
  })
  assert.equal(kept.phone, '+44 20 7946 0958')
  assert.equal(kept.postal_code, 'SW1A 1AA')
})

check('an empty address line 2 is stored as null', () => {
  assert.equal(buildOnboardingRecord({ ...input, addressLine2: '   ' }).address_line_2, null)
})

check('the team-assigned fields are never sent by the browser', () => {
  // They are omitted, not set to null: PostgREST names every payload key as a
  // target column, and anon has no INSERT privilege on these three columns.
  assert.ok(!('username' in record))
  assert.ok(!('external_user_id' in record))
  assert.ok(!('confirmation_code' in record))
})

check('no card, bank or credential column is part of the row', () => {
  const banned = [
    'cardNumber',
    'card_number',
    'cvv',
    'cvc',
    'pin',
    'expiry',
    'cardholder',
    'billing_zip',
    'bank_account',
    'iban',
    'password',
    'otp',
  ]
  for (const key of Object.keys(record)) {
    assert.ok(!banned.includes(key), `the row has a sensitive column: ${key}`)
  }
})

/* -------------------------------------------------------------------------- */
/* Errors and references                                                        */
/* -------------------------------------------------------------------------- */

check('a duplicate submission is reported without database detail', () => {
  const message = describeSubmissionError({ code: '23505', message: 'duplicate key value violates unique constraint "customer_onboarding_pkey"' })
  assert.equal(message, 'This request was already submitted, so we kept the first copy.')
  assert.ok(!message.includes('constraint'))
})

check('a rejected value is reported without database detail', () => {
  const message = describeSubmissionError({
    code: '23514',
    message: 'new row for relation "customer_onboarding" violates check constraint',
  })
  assert.ok(!message.includes('constraint'))
  assert.ok(!message.includes('customer_onboarding'))
})

check('an unknown failure gets a generic message', () => {
  assert.equal(
    describeSubmissionError(new Error('Failed to fetch')),
    'We could not save your details. Please check your connection and try again.',
  )
  assert.equal(
    describeSubmissionError(null),
    'We could not save your details. Please check your connection and try again.',
  )
})

check('a reference is generated and is unique', () => {
  const first = newOnboardingReference()
  const second = newOnboardingReference()
  assert.equal(typeof first, 'string')
  assert.ok(first.length >= 8)
  assert.notEqual(first, second)
})

console.log(`\nOnboarding: ${passed} passed, ${failures.length} failed`)
for (const failure of failures) console.log(`  FAIL  ${failure}`)
process.exit(failures.length ? 1 : 0)
