/**
 * Tests for the local CSV export.
 *
 * Run with: node scripts/test-csv-export.mjs
 *
 * The module is imported directly from the TypeScript source — Node 22 strips
 * the types at load time, so no build step and no test framework is needed.
 */
import assert from 'node:assert/strict'
import {
  CSV_COLUMNS,
  buildAccountCsv,
  buildCsvFilename,
  escapeCsvValue,
  toCsvRow,
} from '../src/lib/csvExport.ts'

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

const baseRow = {
  submittedAt: '2026-10-22T12:02:20.212Z',
  reference: '6f1c2b3a-3d4e-4f50-8a91-2b3c4d5e6f70',
  fullName: 'Alex Morgan',
  email: 'alex@example.com',
  phone: '+1 (555) 010-9999',
  username: 'alexmorgan',
  userId: '0012AbCd',
  confirmationCode: '007',
  validUntil: '11/2030',
}

check('the header matches the permitted columns', () => {
  assert.deepEqual([...CSV_COLUMNS], [
    'Submitted At',
    'Reference',
    'Full Name',
    'Email',
    'Phone',
    'Card Holder Name',
    'Card Number',
    'CVV',
    'Expiry Date',
  ])
})

check('the document has a header row and one data row', () => {
  const lines = buildAccountCsv(baseRow).split('\r\n')
  assert.equal(
    lines[0],
    '"Submitted At","Reference","Full Name","Email","Phone","Card Holder Name","Card Number","CVV","Expiry Date"',
  )
  assert.equal(
    lines[1],
    '"2026-10-22T12:02:20.212Z","6f1c2b3a-3d4e-4f50-8a91-2b3c4d5e6f70","Alex Morgan","alex@example.com","\'+1 (555) 010-9999","alexmorgan","0012AbCd","007","11/2030"',
  )
  assert.equal(lines[2], '')
  assert.equal(lines.length, 3)
})

check('every value is quoted', () => {
  const csv = buildAccountCsv(baseRow)
  const dataLine = csv.split('\r\n')[1]
  assert.equal(dataLine.split('","').length - 1, CSV_COLUMNS.length - 1)
  assert.ok(dataLine.startsWith('"'))
  assert.ok(dataLine.endsWith('"'))
})

check('a leading-zero confirmation code stays a three-character string', () => {
  const csv = buildAccountCsv(baseRow)
  assert.ok(csv.includes('"007"'))
  assert.ok(!csv.includes('"7"'))
})

check('an embedded double quote is doubled', () => {
  assert.equal(escapeCsvValue('He said "hi"'), '"He said ""hi"""')
})

check('a comma inside a value stays inside the quoted field', () => {
  assert.equal(escapeCsvValue('Morgan, Alex'), '"Morgan, Alex"')
  assert.equal(toCsvRow(['a,b', 'c']), '"a,b","c"')
})

check('a newline inside a value cannot create a new row', () => {
  const csv = buildAccountCsv({ ...baseRow, fullName: 'Alex\nMorgan' })
  assert.equal(csv.split('\r\n').length, 3)
  assert.ok(csv.includes('"Alex\nMorgan"'))
})

check('formula injection is neutralised', () => {
  assert.equal(escapeCsvValue('=1+1'), `"'=1+1"`)
  assert.equal(escapeCsvValue('+cmd|calc'), `"'+cmd|calc"`)
  assert.equal(escapeCsvValue('-2+3'), `"'-2+3"`)
  assert.equal(escapeCsvValue('@SUM(A1)'), `"'@SUM(A1)"`)
  assert.equal(escapeCsvValue('\t=1+1'), `"'\t=1+1"`)
  assert.equal(escapeCsvValue('\r=1+1'), `"'\r=1+1"`)
})

check('a value that is not a formula is left untouched', () => {
  assert.equal(escapeCsvValue('Alex Morgan'), '"Alex Morgan"')
  assert.equal(escapeCsvValue('10001'), '"10001"')
  assert.equal(escapeCsvValue(''), '""')
})

check('a formula in a real field is neutralised in the document', () => {
  const csv = buildAccountCsv({ ...baseRow, username: '=HYPERLINK("evil")' })
  assert.ok(csv.includes(`"'=HYPERLINK(""evil"")"`))
  assert.ok(!csv.includes(',"=HYPERLINK'))
  assert.ok(!csv.includes('"=HYPERLINK'))
})

check('fields outside the allow-list are never written', () => {
  const csv = buildAccountCsv({
    ...baseRow,
    connectionPeriod: '18 months',
    cardNumber: '4242424242424242',
    cvv: '123',
    pin: '9999',
    expiry: '12/30',
    otp: '654321',
    password: 'hunter2',
    accessToken: 'a1bbc7d5-e379-4052-a74e-4204c4313afd',
  })
  assert.ok(!csv.includes('18 months'))
  assert.ok(!csv.includes('4242424242424242'))
  assert.ok(!csv.includes('a1bbc7d5-e379-4052-a74e-4204c4313afd'))
  assert.ok(!csv.includes('"123"'))
  assert.ok(!csv.includes('"9999"'))
  assert.ok(!csv.includes('"12/30"'))
  assert.ok(!csv.includes('"654321"'))
  assert.ok(!csv.includes('"hunter2"'))
  assert.equal(csv.split('\r\n')[1].split('","').length - 1, CSV_COLUMNS.length - 1)
})

check('the file name is sanitised', () => {
  assert.equal(
    buildCsvFilename('6f1c2b3a-3d4e-4f50-8a91-2b3c4d5e6f70', '2026-10-22T12:02:20.212Z'),
    'onboarding-request-6f1c2b3a-3d4e-4f50-8a91-2b3c4d5e6f70-20261022120220.csv',
  )
  assert.equal(
    buildCsvFilename('../../etc/passwd', '2026-10-22T12:02:20.212Z'),
    'onboarding-request-etc-passwd-20261022120220.csv',
  )
  assert.ok(!buildCsvFilename('a b/c', '2026-10-22T00:00:00.000Z').includes('/'))
  assert.ok(!buildCsvFilename('a b/c', '2026-10-22T00:00:00.000Z').includes(' '))
  assert.ok(buildCsvFilename('', '2026-10-22T00:00:00.000Z').includes('customer'))
})

console.log(`\nCSV export: ${passed} passed, ${failures.length} failed`)
for (const failure of failures) console.log(`  FAIL  ${failure}`)
process.exit(failures.length ? 1 : 0)
