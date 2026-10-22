/**
 * Local CSV export for the onboarding form.
 *
 * The onboarding details are stored in Supabase. This file renders a copy of
 * the summary for the customer's own machine — it is a copy for the customer,
 * not a second store, and it never leaves the device.
 *
 * SECURITY — the export is an allow-list, not a deny-list: only the fields
 * listed in `CSV_COLUMNS` are ever written. Card numbers, CVVs, PINs, bank
 * details and every other secret are not part of the row type, so they cannot
 * reach the file.
 *
 * SPREADSHEET SAFETY — every value is quoted, embedded quotes are doubled and
 * a value that a spreadsheet would evaluate as a formula (it starts with
 * `=`, `+`, `-`, `@`, TAB or CR) is prefixed with a single quote so Excel,
 * LibreOffice and Google Sheets show it as text instead of executing it.
 */

/** The one and only row shape that can be exported. */
export type AccountCsvRow = {
  /** ISO-8601 submission timestamp, generated on the client. */
  submittedAt: string
  /** The reference the customer quotes when they call us. */
  reference: string
  fullName: string
  email: string
  phone: string
  /** The connection period, e.g. `18 months`. */
  connectionPeriod: string
}

/** Column order and header labels of the exported file. */
export const CSV_COLUMNS = [
  'Submitted At',
  'Reference',
  'Full Name',
  'Email',
  'Phone',
  'Connection Period',
] as const

/**
 * Characters that make a spreadsheet treat a cell as a formula. Excel and
 * LibreOffice both evaluate a leading `=`, `+`, `-` or `@`; TAB and CR are
 * included because they are stripped by some parsers and turn the rest of the
 * cell into a formula.
 */
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/

/**
 * Escapes a single CSV field: formula-injection guard first, then RFC 4180
 * quoting (double quotes doubled, the whole value wrapped in quotes).
 */
export function escapeCsvValue(value: string): string {
  const safe = FORMULA_PREFIX_RE.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

/** Renders one row of values as a CSV line (no trailing newline). */
export function toCsvRow(values: readonly string[]): string {
  return values.map(escapeCsvValue).join(',')
}

/**
 * Builds the complete CSV document, with a header line, CRLF line endings
 * (what Excel expects) and a trailing newline.
 */
export function buildAccountCsv(row: AccountCsvRow): string {
  const lines = [
    toCsvRow([...CSV_COLUMNS]),
    toCsvRow([
      row.submittedAt,
      row.reference,
      row.fullName,
      row.email,
      row.phone,
      row.connectionPeriod,
    ]),
  ]
  return `${lines.join('\r\n')}\r\n`
}

/**
 * Builds a file name that is safe on every platform: only letters, digits,
 * dashes and underscores, so nothing can be injected through the reference.
 */
export function buildCsvFilename(reference: string, submittedAt: string): string {
  const safeReference = reference
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stamp = submittedAt.replace(/[^0-9]/g, '').slice(0, 14)
  return `onboarding-request-${safeReference || 'customer'}-${stamp}.csv`
}

/**
 * Triggers a browser download of the given CSV text.
 *
 * Returns `true` when the download was started. Browsers may block a
 * programmatic download that happens outside a direct user gesture, so the
 * caller keeps the file around and offers an explicit button as well.
 */
export function downloadCsvFile(filename: string, csv: string): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false
  }

  // The BOM makes Excel read the file as UTF-8 instead of the local codepage.
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Give the browser a moment to start the download before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

/**
 * A generated file, kept for the browser session so the user can download it
 * again from the confirmation screen (the checkout page navigates away right
 * after the export).
 */
export type CsvDownload = {
  filename: string
  csv: string
}

const STORAGE_KEY = 'shopfront.accountCsv.v1'

/** Remembers the exported file for this session only. Never leaves the browser. */
export function rememberCsvDownload(reference: string, download: CsvDownload): void {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const map: Record<string, CsvDownload> = {}
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          const entry = value as Partial<CsvDownload> | null
          if (entry && typeof entry.filename === 'string' && typeof entry.csv === 'string') {
            map[key] = { filename: entry.filename, csv: entry.csv }
          }
        }
      }
    }
    map[reference] = download
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // no-op — the download itself already happened
  }
}

/** Returns the file exported for this reference in this session, if any. */
export function getRememberedCsvDownload(reference: string): CsvDownload | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const entry = (parsed as Record<string, unknown>)[reference] as Partial<CsvDownload> | null
    if (!entry || typeof entry.filename !== 'string' || typeof entry.csv !== 'string') return null
    return { filename: entry.filename, csv: entry.csv }
  } catch {
    return null
  }
}
