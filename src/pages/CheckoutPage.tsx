import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { isSupabaseConfigured, supabaseConfigProblem } from '@/lib/supabase'
import {
  createOrder,
  confirmDemoPayment,
  type OrderRecord,
} from '@/lib/orders'
import { rememberOrderToken } from '@/lib/orderAccess'
import {
  emptyCheckoutForm,
  hasErrors,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutFormValues,
} from '@/lib/validation'
import { formatCents } from '@/lib/format'
import { getBuyNowItems, clearBuyNowItems } from '@/lib/buyNow'
import { useCart } from '@/state/cart'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { FormField } from '@/components/checkout/FormField'
import { OrderSummary, type SummaryItem } from '@/components/checkout/OrderSummary'

type Step = 'details' | 'payment'

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function CheckoutPage() {
  const { items: cartItems, clear, openCart } = useCart()
  const navigate = useNavigate()

  // Snapshot the checkout source once so a late cart edit can't change an order.
  const [source] = useState<'buy-now' | 'cart'>(() =>
    getBuyNowItems().length > 0 ? 'buy-now' : 'cart',
  )
  const [checkoutItems] = useState(() => {
    const buyNow = getBuyNowItems()
    return buyNow.length > 0 ? buyNow : cartItems
  })

  const [values, setValues] = useState<CheckoutFormValues>(emptyCheckoutForm)
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [step, setStep] = useState<Step>('details')
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderRecord | null>(null)
  const idempotencyRef = useRef<string>(newIdempotencyKey())

  const summaryItems: SummaryItem[] = useMemo(
    () =>
      checkoutItems.map((item) => ({
        id: item.id,
        title: item.title,
        image: item.image,
        variant: item.variant,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.unitPriceCents * item.quantity,
      })),
    [checkoutItems],
  )

  const subtotalCents = useMemo(
    () => summaryItems.reduce((total, item) => total + item.lineTotalCents, 0),
    [summaryItems],
  )
  const shippingCents = 0
  const totalCents = subtotalCents + shippingCents

  function updateField(field: CheckoutField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function handleBlur(field: CheckoutField) {
    const next = validateCheckout(values)
    setErrors((current) => ({ ...current, [field]: next[field] }))
  }

  async function handleContinue(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setServerError(null)

    const nextErrors = validateCheckout(values)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      const first = Object.keys(nextErrors)[0]
      document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const created = await createOrder({
        idempotencyKey: idempotencyRef.current,
        customer: {
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
        },
        shipping: {
          line1: values.line1.trim(),
          line2: values.line2.trim(),
          city: values.city.trim(),
          region: values.region.trim(),
          postalCode: values.postalCode.trim(),
          country: values.country.trim(),
        },
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          variant: item.variant,
          quantity: item.quantity,
        })),
      })
      rememberOrderToken(created.orderNumber, created.accessToken)
      setOrder(created)
      setStep('payment')
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'We could not create your order. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleEditDetails() {
    // Editing starts a fresh order intent; the abandoned unpaid order stays
    // pending on the server rather than being duplicated or overwritten.
    idempotencyRef.current = newIdempotencyKey()
    setOrder(null)
    setPaymentError(null)
    setStep('details')
  }

  async function handlePay(outcome: 'succeeded' | 'failed') {
    if (!order || paying) return
    setPaying(true)
    setPaymentError(null)
    try {
      const updated = await confirmDemoPayment(
        order.orderNumber,
        order.accessToken,
        outcome,
      )
      setOrder(updated)
      if (updated.paymentStatus === 'paid' && updated.orderStatus === 'confirmed') {
        if (source === 'cart') clear()
        clearBuyNowItems()
        navigate(`/order-success?order=${encodeURIComponent(updated.orderNumber)}`, {
          replace: true,
        })
      } else {
        setPaymentError(
          'Payment was not completed. Your order is still pending and you can safely try again.',
        )
      }
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : 'Payment could not be processed. Try again.',
      )
    } finally {
      setPaying(false)
    }
  }

  if (checkoutItems.length === 0) {
    return (
      <CheckoutShell>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <ShoppingBag className="mx-auto size-10 text-ink-4" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold text-ink">Your cart is empty</h2>
          <p className="mt-1 text-sm text-ink-3">
            Add the iPhone Pro Max to your cart to continue to checkout.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/">
              <Button variant="primary">Continue shopping</Button>
            </Link>
            <Button variant="secondary" onClick={openCart}>
              Open cart
            </Button>
          </div>
        </div>
      </CheckoutShell>
    )
  }

  return (
    <CheckoutShell>
      {!isSupabaseConfigured && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-card border border-[#f0d38a] bg-[#fdf6e3] px-4 py-3 text-sm text-[#7a5b00]"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Checkout backend is not configured</p>
            <p className="mt-0.5 leading-relaxed">
              {supabaseConfigProblem} Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in a <code className="font-mono">.env</code>{' '}
              file and deploy the <code className="font-mono">create-order</code> Edge Function. Until then, placing
              an order will fail rather than report a false success.
            </p>
          </div>
        </div>
      )}

      <ol className="mb-5 flex items-center gap-2 text-xs font-medium">
        <StepMarker index={1} label="Contact & shipping" state={step === 'details' ? 'active' : 'done'} />
        <li className="h-px w-6 bg-line-strong" aria-hidden />
        <StepMarker index={2} label="Payment" state={step === 'payment' ? 'active' : 'todo'} />
      </ol>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {step === 'details' ? (
            <form onSubmit={handleContinue} noValidate className="space-y-4">
              <Panel title="Contact details" headingLevel={2}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    id="fullName"
                    label="Full name"
                    autoComplete="name"
                    className="sm:col-span-2"
                    value={values.fullName}
                    onChange={(v) => updateField('fullName', v)}
                    onBlur={() => handleBlur('fullName')}
                    error={errors.fullName}
                  />
                  <FormField
                    id="email"
                    label="Email address"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={(v) => updateField('email', v)}
                    onBlur={() => handleBlur('email')}
                    error={errors.email}
                  />
                  <FormField
                    id="phone"
                    label="Phone number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={values.phone}
                    onChange={(v) => updateField('phone', v)}
                    onBlur={() => handleBlur('phone')}
                    error={errors.phone}
                  />
                </div>
              </Panel>

              <Panel title="Shipping address" headingLevel={2}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    id="line1"
                    label="Address line 1"
                    autoComplete="address-line1"
                    className="sm:col-span-2"
                    value={values.line1}
                    onChange={(v) => updateField('line1', v)}
                    onBlur={() => handleBlur('line1')}
                    error={errors.line1}
                  />
                  <FormField
                    id="line2"
                    label="Address line 2"
                    optional
                    autoComplete="address-line2"
                    className="sm:col-span-2"
                    value={values.line2}
                    onChange={(v) => updateField('line2', v)}
                    onBlur={() => handleBlur('line2')}
                    error={errors.line2}
                  />
                  <FormField
                    id="city"
                    label="City"
                    autoComplete="address-level2"
                    value={values.city}
                    onChange={(v) => updateField('city', v)}
                    onBlur={() => handleBlur('city')}
                    error={errors.city}
                  />
                  <FormField
                    id="region"
                    label="State / Region"
                    autoComplete="address-level1"
                    value={values.region}
                    onChange={(v) => updateField('region', v)}
                    onBlur={() => handleBlur('region')}
                    error={errors.region}
                  />
                  <FormField
                    id="postalCode"
                    label="Postal / ZIP code"
                    autoComplete="postal-code"
                    value={values.postalCode}
                    onChange={(v) => updateField('postalCode', v)}
                    onBlur={() => handleBlur('postalCode')}
                    error={errors.postalCode}
                  />
                  <FormField
                    id="country"
                    label="Country"
                    autoComplete="country-name"
                    value={values.country}
                    onChange={(v) => updateField('country', v)}
                    onBlur={() => handleBlur('country')}
                    error={errors.country}
                  />
                </div>
              </Panel>

              {serverError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-[#fdecea] px-3 py-2 text-sm text-deal"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {serverError}
                </p>
              )}

              <div className="panel flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-3">
                  No account needed — continue as a guest.
                  <br />
                  Total due now: <span className="tnum font-semibold text-ink">{formatCents(totalCents)}</span>
                </p>
                <Button type="submit" size="lg" variant="primary" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {submitting ? 'Creating order…' : 'Continue to payment'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Panel
                title="Review your details"
                headingLevel={2}
                action={
                  <button
                    type="button"
                    onClick={handleEditDetails}
                    className="link text-sm"
                  >
                    Edit details
                  </button>
                }
              >
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Review label="Name" value={values.fullName} />
                  <Review label="Email" value={values.email} />
                  <Review label="Phone" value={values.phone} />
                  <Review
                    label="Shipping address"
                    className="sm:col-span-2"
                    value={[
                      values.line1,
                      values.line2,
                      `${values.city}, ${values.region} ${values.postalCode}`,
                      values.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  />
                </div>
              </Panel>

              <Panel title="Payment" headingLevel={2}>
                <div className="rounded-md border border-line-strong bg-surface-sunken p-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked
                      readOnly
                      className="mt-0.5 size-4 accent-link"
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                        <CreditCard className="size-4" aria-hidden />
                        Demo payment (simulated)
                        <span className="chip bg-[#fdf6e3] text-[#7a5b00]">DEMO</span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-3">
                        Payment is simulated for this demo store. No card number, CVV or banking
                        credentials are collected or stored, and no money is charged.
                      </span>
                    </span>
                  </label>
                </div>

                {order && (
                  <p className="mt-3 text-xs text-ink-3">
                    Order reference{' '}
                    <span className="tnum font-semibold text-ink">{order.orderNumber}</span> ·
                    amount{' '}
                    <span className="tnum font-semibold text-ink">
                      {formatCents(order.totalCents, order.currency)}
                    </span>
                  </p>
                )}

                {paymentError && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-md bg-[#fdecea] px-3 py-2 text-sm text-deal"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {paymentError}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="primary"
                    size="lg"
                    className="sm:flex-1"
                    disabled={paying}
                    onClick={() => handlePay('succeeded')}
                  >
                    {paying && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {paying ? 'Processing…' : `Pay ${formatCents(totalCents)} (demo)`}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={paying}
                    onClick={() => handlePay('failed')}
                  >
                    Simulate failed payment
                  </Button>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-2xs text-ink-4">
                  <Lock className="size-3.5" aria-hidden />
                  The order is only marked paid after the server confirms the payment step.
                </p>
              </Panel>

              <div className="panel p-4">
                <p className="flex items-center gap-2 text-sm text-ink-2">
                  <ShieldCheck className="size-4 text-success" aria-hidden />
                  Placing your order is safe — you can retry payment if it fails.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6">
          <OrderSummary
            items={summaryItems}
            subtotalCents={order ? order.subtotalCents : subtotalCents}
            shippingCents={order ? order.shippingCents : shippingCents}
            totalCents={order ? order.totalCents : totalCents}
            currency={order ? order.currency : 'USD'}
          />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-2xs text-ink-4">
            <BadgeCheck className="size-3.5" aria-hidden />
            Order total is recalculated and verified on the server.
          </p>
        </div>
      </div>
    </CheckoutShell>
  )
}

function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-page">
      <CheckoutHeader />
      <main className="page-gutter mx-auto max-w-page py-5">{children}</main>
    </div>
  )
}

function StepMarker({
  index,
  label,
  state,
}: {
  index: number
  label: string
  state: 'active' | 'done' | 'todo'
}) {
  return (
    <li
      className={
        'flex items-center gap-2 ' +
        (state === 'active' ? 'text-ink' : state === 'done' ? 'text-success' : 'text-ink-4')
      }
    >
      <span
        className={
          'flex size-5 items-center justify-center rounded-full text-2xs font-bold ' +
          (state === 'active'
            ? 'bg-ink text-white'
            : state === 'done'
              ? 'bg-success text-white'
              : 'bg-surface-muted text-ink-4')
        }
      >
        {index}
      </span>
      {label}
    </li>
  )
}

function Review({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value || '—'}</p>
    </div>
  )
}
