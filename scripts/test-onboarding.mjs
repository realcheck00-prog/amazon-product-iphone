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
  BIRTH_MONTHS,
  MIN_BIRTH_YEAR,
  USERNAME_RE,
  buildOnboardingPayload,
  birthYearOptions,
  emptyOnboarding,
  normalizeUsername,
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

const NOW = new Date('2026-10-22T00:00:00.000Z')

/* -------------------------------------------------------------------------- */
/* Username                                                                    */
/* -------------------------------------------------------------------------- */

check('a username is lowercased and stripped of non-alphanumerics', () => {
  assert.equal(normalizeUsername('Alex.Morgan'), 'alexmorgan')
  assert.equal(normalizeUsername('alex morgan'), 'alexmorgan')
  assert.equal(normalizeUsername('alex-morgan_99'), 'alexmorgan99')
  assert.equal(normalizeUsername('a<b>c'), 'abc')
})

check('a username is capped at 32 characters', () => {
  assert.equal(normalizeUsername('x'.repeat(40)).length, 32)
})

check('a valid username passes', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan' },
    NOW,
  )
  assert.deepEqual(errors, {})
})

check('a username shorter than 3 characters is rejected', () => {
  const errors = validateOnboarding({ ...emptyOnboarding, username: 'ab' }, NOW)
  assert.ok(errors.username)
  assert.ok(errors.username.includes('3'))
})

check('an empty username is rejected', () => {
  const errors = validateOnboarding(emptyOnboarding, NOW)
  assert.ok(errors.username)
})

check('a username longer than 32 characters is truncated, not accepted as-is', () => {
  const tooLong = 'x'.repeat(33)
  assert.equal(normalizeUsername(tooLong).length, 32)
  const errors = validateOnboarding({ ...emptyOnboarding, username: tooLong }, NOW)
  assert.deepEqual(errors, {})
})

check('the accepted username shape is lowercase alphanumeric', () => {
  assert.ok(USERNAME_RE.test('alexmorgan'))
  assert.ok(USERNAME_RE.test('alex99'))
  assert.ok(!USERNAME_RE.test('alex morgan'))
  assert.ok(!USERNAME_RE.test('ALEXMORGAN'))
})

/* -------------------------------------------------------------------------- */
/* Date of birth — optional                                                    */
/* -------------------------------------------------------------------------- */

check('the date of birth may be left empty', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan' },
    NOW,
  )
  assert.deepEqual(errors, {})
})

check('a month and a year are accepted', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan', birthMonth: '4', birthYear: '1990' },
    NOW,
  )
  assert.deepEqual(errors, {})
})

check('a month without a year is rejected', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan', birthMonth: '4' },
    NOW,
  )
  assert.ok(errors.birthYear)
})

check('a year without a month is rejected', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan', birthYear: '1990' },
    NOW,
  )
  assert.ok(errors.birthMonth)
})

check('an impossible month is rejected', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan', birthMonth: '13', birthYear: '1990' },
    NOW,
  )
  assert.ok(errors.birthMonth)
})

check('a future year is rejected', () => {
  const errors = validateOnboarding(
    { ...emptyOnboarding, username: 'alexmorgan', birthMonth: '1', birthYear: '2999' },
    NOW,
  )
  assert.ok(errors.birthYear)
})

check('a year before the earliest allowed year is rejected', () => {
  const errors = validateOnboarding(
    {
      ...emptyOnboarding,
      username: 'alexmorgan',
      birthMonth: '1',
      birthYear: String(MIN_BIRTH_YEAR - 1),
    },
    NOW,
  )
  assert.ok(errors.birthYear)
})

check('the year list starts at the current year and stops at the floor', () => {
  const years = birthYearOptions(NOW)
  assert.equal(years[0], 2026)
  assert.equal(years[years.length - 1], MIN_BIRTH_YEAR)
})

check('all twelve months are offered', () => {
  assert.equal(BIRTH_MONTHS.length, 12)
  assert.equal(BIRTH_MONTHS[0].label, 'January')
  assert.equal(BIRTH_MONTHS[11].value, '12')
})

/* -------------------------------------------------------------------------- */
/* The request payload                                                         */
/* -------------------------------------------------------------------------- */

const input = {
  orderNumber: 'SF-20261022-9CC80474',
  accessToken: 'a1bbc7d5-e379-4052-a74e-4204c4313afd',
  username: 'Alex.Morgan',
  fullName: '  Alex Morgan  ',
  email: '  Alex@Example.COM ',
  phone: '  +1 (555) 010-9999 ',
  birthMonth: 4,
  birthYear: 1990,
  addressLine1: ' 1 Market Street ',
  addressLine2: ' Apt 4 ',
  city: ' San Francisco ',
  region: ' CA ',
  postalCode: ' 94105 ',
  country: ' United States ',
}

const payload = buildOnboardingPayload(input)

check('the payload contains exactly the permitted fields', () => {
  assert.deepEqual(Object.keys(payload).sort(), [
    'accessToken',
    'addressLine1',
    'addressLine2',
    'birthMonth',
    'birthYear',
    'city',
    'country',
    'email',
    'fullName',
    'orderNumber',
    'phone',
    'postalCode',
    'region',
    'username',
  ])
})

check('the values are trimmed and normalised', () => {
  assert.equal(payload.username, 'alexmorgan')
  assert.equal(payload.fullName, 'Alex Morgan')
  assert.equal(payload.email, 'alex@example.com')
  assert.equal(payload.phone, '+1 (555) 010-9999')
  assert.equal(payload.addressLine1, '1 Market Street')
  assert.equal(payload.city, 'San Francisco')
  assert.equal(payload.postalCode, '94105')
})

check('no card or credential field is part of the payload', () => {
  const bannedKeys = [
    'cardNumber',
    'card_number',
    'cvv',
    'cvc',
    'pin',
    'expiry',
    'expiryMonth',
    'expiryYear',
    'password',
    'otp',
    'verificationCode',
    'code',
    'secret',
  ]
  for (const key of Object.keys(payload)) {
    assert.ok(!bannedKeys.includes(key), `payload has a sensitive key: ${key}`)
  }
})

check('the customer reference is never part of the payload', () => {
  assert.ok(!('customerReference' in payload))
  assert.ok(!('customer_reference' in payload))
})

check('an absent date of birth is sent as null', () => {
  const empty = buildOnboardingPayload({
    ...input,
    birthMonth: null,
    birthYear: null,
  })
  assert.equal(empty.birthMonth, null)
  assert.equal(empty.birthYear, null)
})

console.log(`\nOnboarding: ${passed} passed, ${failures.length} failed`)
for (const failure of failures) console.log(`  FAIL  ${failure}`)
process.exit(failures.length ? 1 : 0)
