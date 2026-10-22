import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Package,
} from 'lucide-react'
import { getOrder, type OrderRecord } from '@/lib/orders'
import { getOrderToken } from '@/lib/orderAccess'
import { getRememberedCustomerReference } from '@/lib/onboarding'
import {
  downloadCsvFile,
  getRememberedCsvDownload,
  type CsvDownload,
} from '@/lib/csvExport'
import { formatCents } from '@/lib/format'
import { storefront } from '@/data/product'
import { Button } from '@/components/ui/Button'

type State =
  | { status: 'loading' }
  | { status: 'verified'; order: OrderRecord }
  | { status: 'pending'; order: OrderRecord }
  | { status: 'error'; message: string }

/**
 * Confirmation screen. The success state is only rendered after the server
 * confirms `payment_status = paid` for the order — it can never be entered by
 * a frontend-only state change.
 */
export function OrderSuccessPage() {
  const [params] = useSearchParams()
  const orderNumber = params.get('order') ?? ''
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function verify() {
      if (!orderNumber) {
        setState({ status: 'error', message: 'No order reference was provided.' })
        return
      }
      const token = getOrderToken(orderNumber)
      if (!token) {
        setState({
          status: 'error',
          message:
            'We could not verify this order in this browser session. Check your email for the confirmation, or contact support with your order number.',
        })
        return
      }
      try {
        const order = await getOrder(orderNumber, token)
        if (cancelled) return
        if (order.paymentStatus === 'paid' && order.orderStatus === 'confirmed') {
          setState({ status: 'verified', order })
        } else {
          setState({ status: 'pending', order })
        }
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'We could not verify this order right now.',
        })
      }
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [orderNumber])

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
        {state.status === 'loading' && (
          <div className="panel flex flex-col items-center gap-3 p-10 text-center">
            <Loader2 className="size-8 animate-spin text-ink-3" aria-hidden />
            <p className="text-sm text-ink-2">Verifying your order…</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="panel flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="size-10 text-deal" aria-hidden />
            <h1 className="text-xl font-semibold text-ink">We couldn’t verify this order</h1>
            <p className="max-w-md text-sm leading-relaxed text-ink-3">{state.message}</p>
            <Link to="/" className="mt-3">
              <Button variant="primary">Return to product page</Button>
            </Link>
          </div>
        )}

        {state.status === 'pending' && <PendingPanel order={state.order} />}
        {state.status === 'verified' && <SuccessPanel order={state.order} />}
      </main>
    </div>
  )
}

function SuccessPanel({ order }: { order: OrderRecord }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col items-center gap-2 bg-[#e7f5f1] px-6 py-8 text-center">
        <CheckCircle2 className="size-16 text-success" aria-hidden />
        <h1 className="text-2xl font-semibold text-ink">Order placed successfully!</h1>
        <p className="text-sm text-ink-2">
          Thank you. Your payment was confirmed and a confirmation has been recorded.
        </p>
      </div>

      <OrderDetails order={order} />

      <CustomerReference orderNumber={order.orderNumber} />

      <AccountExport orderNumber={order.orderNumber} />

<div className="px-6 pb-6">
          <Link to="/" className="mt-4 block">
            <Button block size="lg" variant="primary">
              Return to product page
            </Button>
          </Link>
        </div>
    </div>
  )
}

/**
 * The customer reference issued by the backend when the account was created.
 * It is kept in the session so the confirmation screen can show it; nothing
 * is read from the URL, so it cannot be tampered with.
 */
function CustomerReference({ orderNumber }: { orderNumber: string }) {
  const [reference, setReference] = useState<string | null>(null)

  useEffect(() => {
    setReference(getRememberedCustomerReference(orderNumber))
  }, [orderNumber])

  if (!reference) return null

  return (
    <div className="border-t border-line-soft px-6 py-5">
      <p className="text-sm font-semibold text-ink-2">Customer reference</p>
      <p className="mt-0.5 font-mono text-sm text-ink">{reference}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-3">
        Quote this reference if you contact us about your account. Our team will confirm your
        account by phone.
      </p>
    </div>
  )
}

/**
 * The account details were exported to a local CSV file, so the confirmation
 * screen offers the file again — the browser sometimes blocks the automatic
 * download that happened on the checkout page.
 */
function AccountExport({ orderNumber }: { orderNumber: string }) {
  const [download, setDownload] = useState<CsvDownload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDownload(getRememberedCsvDownload(orderNumber))
  }, [orderNumber])

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
      <p className="text-sm font-semibold text-ink-2">Your account details (CSV)</p>
      <p className="text-xs leading-relaxed text-ink-3">
        A copy of your customer reference and username was saved to{' '}
        <span className="font-mono text-ink-2">{download.filename}</span> on this device. Nothing
        was uploaded from your browser.
      </p>
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={<Download className="size-3.5" aria-hidden />}
        onClick={handleDownload}
      >
        Download account details (CSV)
      </Button>
      {error ? (
        <p role="alert" className="text-xs font-medium text-deal">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function PendingPanel({ order }: { order: OrderRecord }) {
  const paid = order.paymentStatus === 'paid'
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col items-center gap-2 bg-[#fdf6e3] px-6 py-8 text-center">
        <Clock className="size-14 text-[#b7791f]" aria-hidden />
        <h1 className="text-2xl font-semibold text-ink">
          {paid ? 'Order confirmed' : 'Order created — payment pending'}
        </h1>
        <p className="text-sm text-ink-2">
          {paid
            ? 'Your order is being prepared.'
            : 'Your order has been saved, but payment has not been completed yet. Your order is not confirmed.'}
        </p>
      </div>

      <OrderDetails order={order} />

      <div className="px-6 pb-6">
        <Link to="/checkout" className="block">
          <Button block size="lg" variant="primary">
            Return to checkout to complete payment
          </Button>
        </Link>
        <Link to="/" className="mt-2 block">
          <Button block size="lg" variant="secondary">
            Continue shopping
          </Button>
        </Link>
      </div>
    </div>
  )
}

function OrderDetails({ order }: { order: OrderRecord }) {
  const quantity = order.items.reduce((total, item) => total + item.quantity, 0)
  return (
    <div className="space-y-4 px-6 py-5">
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <Detail label="Order number" value={order.orderNumber} mono />
        <Detail label="Items" value={String(quantity)} />
        <Detail
          label={order.paymentStatus === 'paid' ? 'Total paid' : 'Order total'}
          value={formatCents(order.totalCents, order.currency)}
          mono
        />
      </div>

      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {order.items.map((item, index) => (
          <li key={`${item.productId}-${index}`} className="flex items-center gap-3 py-3">
            <img
              src={item.image}
              alt=""
              className="size-16 shrink-0 rounded-md border border-line-soft bg-surface object-contain p-1.5"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-ink-3">{item.variant}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tnum text-sm text-ink">Qty {item.quantity}</p>
              <p className="tnum text-xs text-ink-3">
                {formatCents(item.lineTotalCents, order.currency)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-2 text-xs text-ink-3">
        <Package className="size-4" aria-hidden />
        Shipping to {order.shipping?.city ?? 'your address'}
        {order.shipping?.country ? `, ${order.shipping.country}` : ''}.
      </p>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className={'mt-0.5 text-ink ' + (mono ? 'tnum font-semibold' : '')}>{value}</p>
    </div>
  )
}
