import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Download, UserRound } from 'lucide-react'
import { getSubmittedSummary, type SubmittedSummary } from '@/lib/onboarding'
import {
  downloadCsvFile,
  getRememberedCsvDownload,
  type CsvDownload,
} from '@/lib/csvExport'
import { storefront } from '@/data/product'
import { Button } from '@/components/ui/Button'

/**
 * Confirmation screen.
 *
 * It is only reached after the database accepted the insert on the checkout
 * page. It reads nothing from the database: the public role has no SELECT
 * privilege, so there is nothing here to leak. The reference in the URL is the
 * one the browser generated for this submission.
 */
export function OrderSuccessPage() {
  const [params] = useSearchParams()
  const reference = params.get('ref') ?? ''

  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line bg-navy-800 text-white">
        <div className="page-gutter mx-auto flex max-w-page items-center py-3">
          <Link to="/" className="flex items-baseline gap-1.5 text-xl font-bold tracking-tight">
            <span>{storefront.name}</span>
          </Link>
        </div>
      </header>

      <main className="page-gutter mx-auto max-w-2xl py-8">
        <div className="panel overflow-hidden">
          <div className="flex flex-col items-center gap-2 bg-[#e7f5f1] px-6 py-8 text-center">
            <CheckCircle2 className="size-16 text-success" aria-hidden />
            <h1 className="text-2xl font-semibold text-ink">Request received</h1>
            <p className="max-w-md text-sm leading-relaxed text-ink-2">
              Thank you. Your connection details were saved.
            </p>
          </div>

          <ReferencePanel reference={reference} />
          <AccountPanel reference={reference} />
          <AccountExport reference={reference} />

          <div className="px-6 pb-6">
            <Link to="/" className="mt-4 block">
              <Button block size="lg" variant="primary">
                Return to product page
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function ReferencePanel({ reference }: { reference: string }) {
  if (!reference) return null

  return (
    <div className="border-t border-line-soft px-6 py-5">
      <p className="text-sm font-semibold text-ink-2">Your reference</p>
      <p className="mt-0.5 break-all font-mono text-sm text-ink">{reference}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-3">
        Keep this reference. Quote it if you contact us about your account.
      </p>
    </div>
  )
}

function AccountPanel({ reference }: { reference: string }) {
  const [summary, setSummary] = useState<SubmittedSummary | null>(null)

  useEffect(() => {
    setSummary(getSubmittedSummary(reference))
  }, [reference])

  if (!summary) return null

  return (
    <div className="flex items-start gap-3 border-t border-line-soft px-6 py-5">
      <UserRound className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-2">The details you submitted</p>
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
          <dt className="text-ink-3">Card Holder Name</dt>
          <dd className="break-all font-mono text-ink">{summary.username}</dd>
          <dt className="text-ink-3">Card Number</dt>
          <dd className="break-all font-mono text-ink">{summary.userId}</dd>
          <dt className="text-ink-3">Expiry Date</dt>
          <dd className="font-mono text-ink">{summary.validUntil}</dd>
          <dt className="text-ink-3">Phone</dt>
          <dd className="font-mono text-ink">{summary.phone}</dd>
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          If anything here is wrong, contact us and quote the reference above.
        </p>
      </div>
    </div>
  )
}

/**
 * The details were exported to a local CSV file, so the confirmation screen
 * offers the file again — the browser sometimes blocks the automatic download
 * that happened on the checkout page.
 */
function AccountExport({ reference }: { reference: string }) {
  const [download, setDownload] = useState<CsvDownload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDownload(getRememberedCsvDownload(reference))
  }, [reference])

  if (!download) return null

  function handleDownload() {
    if (!download) return
    try {
      const started = downloadCsvFile(download.filename, download.csv)
      setError(
        started
          ? null
          : 'Your browser blocked the download. Allow downloads for this site and try again.',
      )
    } catch {
      setError('Your browser blocked the download. Allow downloads for this site and try again.')
    }
  }

  return (
    <div className="space-y-2 border-t border-line-soft px-6 py-5">
      <p className="text-sm font-semibold text-ink-2">Your details (CSV)</p>
      <p className="text-xs leading-relaxed text-ink-3">
        A copy of the details you submitted was saved to{' '}
        <span className="font-mono text-ink-2">{download.filename}</span> on this device. Nothing
        else was downloaded.
      </p>
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={<Download className="size-3.5" aria-hidden />}
        onClick={handleDownload}
      >
        Download my details (CSV)
      </Button>
      {error ? (
        <p role="alert" className="text-xs font-medium text-deal">
          {error}
        </p>
      ) : null}
    </div>
  )
}
