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
  CONFIRMATION_CODE_RE,
  EXPIRY_RE,
  USER_ID_RE,
  buildOnboardingRecord,
  describeSubmissionError,
  emptyOnboarding,
  newOnboardingReference,
  normalizeConfirmationCode,
  normalizeExpiry,
  normalizeUserId,
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
const valid = {
  username: 'alexmorgan',
  userId: '4021998374AB12CD34EF',
  confirmationCode: '007',
  connectionExpiresOn: '11/2030',
}

/* -------------------------------------------------------------------------- */
/* Expiry                                                                      */
/* -------------------------------------------------------------------------- */

check('a complete MM/YYYY value is kept', () => {
  assert.equal(normalizeExpiry('11/2030'), '11/2030')
  assert.equal(normalizeExpiry(' 11/2030 '), '11/2030')
  assert.equal(normalizeExpiry('01/2026'), '01/2026')
  assert.equal(normalizeExpiry('12/2099'), '12/2099')
})

check('digits typed without a slash are formatted', () => {
  assert.equal(normalizeExpiry('112030'), '11/2030')
})

check('spaces around the slash are removed', () => {
  assert.equal(normalizeExpiry('11 / 2030'), '11/2030')
})

check('a single-digit month is padded, not re-parsed', () => {
  assert.equal(normalizeExpiry('1/2030'), '01/2030')
  assert.equal(normalizeExpiry('9/2030'), '09/2030')
})

check('a partial value is left for validation', () => {
  assert.equal(normalizeExpiry('11/20'), '11/20')
  assert.equal(normalizeExpiry('11/'), '11')
  assert.equal(normalizeExpiry(''), '')
})

check('the accepted shape is MM/YYYY with a real month', () => {
  assert.ok(EXPIRY_RE.test('01/2030'))
  assert.ok(EXPIRY_RE.test('09/2030'))
  assert.ok(EXPIRY_RE.test('12/2030'))
  assert.ok(!EXPIRY_RE.test('00/2030'))
  assert.ok(!EXPIRY_RE.test('13/2030'))
  assert.ok(!EXPIRY_RE.test('1/2030'))
  assert.ok(!EXPIRY_RE.test('11/30'))
  assert.ok(!EXPIRY_RE.test('11/20305'))
  assert.ok(!EXPIRY_RE.test('2030-11'))
})

/* -------------------------------------------------------------------------- */
/* User ID and confirmation code                                               */
/* -------------------------------------------------------------------------- */

check('the user ID keeps leading zeros and letter casing', () => {
  assert.equal(normalizeUserId('0012AbCd'), '0012AbCd')
  assert.equal(normalizeUserId(' 0012AbCd '), '0012AbCd')
})

check('the user ID drops non-alphanumeric characters and caps at 20', () => {
  assert.equal(normalizeUserId('AB-12_34'), 'AB1234')
  assert.equal(normalizeUserId('a'.repeat(25)).length, 20)
  assert.equal(normalizeUserId('123456789012345678901').length, 20)
})

check('the user ID rule allows 1 to 20 alphanumeric characters', () => {
  assert.ok(USER_ID_RE.test('0'))
  assert.ok(USER_ID_RE.test('00000000000000000000'))
  assert.ok(USER_ID_RE.test('abcXYZ123'))
  assert.ok(!USER_ID_RE.test(''))
  assert.ok(!USER_ID_RE.test('abc-123'))
  assert.ok(!USER_ID_RE.test('a'.repeat(21)))
})

check('the confirmation code keeps leading zeros and caps at three digits', () => {
  assert.equal(normalizeConfirmationCode('007'), '007')
  assert.equal(normalizeConfirmationCode('7'), '7')
  assert.equal(normalizeConfirmationCode('0a7'), '07')
  assert.equal(normalizeConfirmationCode('1234'), '123')
})

check('the confirmation code rule is exactly three digits', () => {
  assert.ok(CONFIRMATION_CODE_RE.test('007'))
  assert.ok(CONFIRMATION_CODE_RE.test('123'))
  assert.ok(!CONFIRMATION_CODE_RE.test('7'))
  assert.ok(!CONFIRMATION_CODE_RE.test('07'))
  assert.ok(!CONFIRMATION_CODE_RE.test('1234'))
  assert.ok(!CONFIRMATION_CODE_RE.test('00a'))
  assert.ok(!CONFIRMATION_CODE_RE.test(' 007'))
})

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

check('a valid submission has no errors', () => {
  assert.deepEqual(validateOnboarding(valid), {})
})

check('every field is required', () => {
  const errors = validateOnboarding({ ...emptyOnboarding })
  assert.ok(errors.username)
  assert.ok(errors.userId)
  assert.ok(errors.confirmationCode)
  assert.ok(errors.connectionExpiresOn)
})

check('a username longer than 64 characters is rejected', () => {
  assert.ok(validateOnboarding({ ...valid, username: 'a'.repeat(65) }).username)
  assert.ok(!validateOnboarding({ ...valid, username: 'a'.repeat(64) }).username)
})

check('a user ID with a symbol is rejected', () => {
  assert.ok(validateOnboarding({ ...valid, userId: 'abc-123' }).userId)
  assert.ok(validateOnboarding({ ...valid, userId: 'a'.repeat(21) }).userId)
})

check('a two-digit confirmation code is rejected', () => {
  assert.ok(validateOnboarding({ ...valid, confirmationCode: '07' }).confirmationCode)
  assert.ok(!validateOnboarding({ ...valid, confirmationCode: '007' }).confirmationCode)
})

check('an impossible month is rejected', () => {
  assert.ok(validateOnboarding({ ...valid, connectionExpiresOn: '13/2030' }).connectionExpiresOn)
  assert.ok(validateOnboarding({ ...valid, connectionExpiresOn: '00/2030' }).connectionExpiresOn)
})

check('a four-digit year is required', () => {
  assert.ok(validateOnboarding({ ...valid, connectionExpiresOn: '11/30' }).connectionExpiresOn)
})

check('a formatted value passes validation', () => {
  assert.deepEqual(validateOnboarding({ ...valid, connectionExpiresOn: '112030' }), {})
})

check('the old duration format is rejected', () => {
  assert.ok(validateOnboarding({ ...valid, connectionExpiresOn: '18 months' }).connectionExpiresOn)
  assert.ok(validateOnboarding({ ...valid, connectionExpiresOn: '18' }).connectionExpiresOn)
})

/* -------------------------------------------------------------------------- */
/* The database row                                                            */
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
  username: ' alexmorgan ',
  userId: ' 0012AbCd ',
  confirmationCode: '007',
  connectionExpiresOn: '112030',
}

const record = buildOnboardingRecord(input)

check('the row contains exactly the columns the browser may write', () => {
  assert.deepEqual(Object.keys(record).sort(), [
    'address_line_1',
    'address_line_2',
    'city',
    'confirmation_code',
    'connection_valid_until',
    'country',
    'email',
    'external_user_id',
    'full_name',
    'id',
    'phone',
    'postal_code',
    'state_region',
    'username',
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
})

check('the account identifiers are stored as entered', () => {
  assert.equal(record.username, 'alexmorgan')
  assert.equal(record.external_user_id, '0012AbCd')
  assert.equal(record.confirmation_code, '007')
  assert.equal(record.connection_valid_until, '11/2030')
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

check('the old duration column is gone', () => {
  assert.ok(!('connection_period' in record))
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

check('a duplicate username or user ID is reported without database detail', () => {
  const message = describeSubmissionError({
    code: '23505',
    message: 'duplicate key value violates unique constraint "customer_onboarding_username_key"',
  })
  assert.match(message, /username or user ID/i)
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
