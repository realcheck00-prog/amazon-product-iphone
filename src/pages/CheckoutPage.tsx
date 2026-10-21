import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, Loader2, Lock, ShoppingBag } from 'lucide-react'
import { isSupabaseConfigured, supabaseConfigProblem } from '@/lib/supabase'
import {
  createOrder,
  confirmDemoPayment,
  saveBillingDetails,
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
import {
  emptyPaymentCard,
  validatePaymentCard,
  type PaymentCardErrors,
  type PaymentCardField,
  type PaymentCardForm,
} from '@/lib/paymentCard'
import { formatCents } from '@/lib/format'
import { getBuyNowItems, clearBuyNowItems } from '@/lib/buyNow'
import { useCart } from '@/state/cart'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { FormField } from '@/components/checkout/FormField'
import { PaymentDetailsForm, type PaymentNotice } from '@/components/checkout/PaymentDetailsForm'
import { OrderSummary, type SummaryItem } from '@/components/checkout/OrderSummary'

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
  const [card, setCard] = useState<PaymentCardForm>(emptyPaymentCard)
  const [cardErrors, setCardErrors] = useState<PaymentCardErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [billingNotice, setBillingNotice] = useState<PaymentNotice | null>(null)
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

  function updateCardField(field: PaymentCardField, value: string) {
    setCard((current) => ({ ...current, [field]: value }))
    setCardErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function handleCardBlur(field: PaymentCardField) {
    const next = validatePaymentCard(card)
    setCardErrors((current) => ({ ...current, [field]: next[field] }))
  }

  async function handleContinue(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setServerError(null)

    const nextErrors = validateCheckout(values)
    const nextCardErrors = validatePaymentCard(card)
    setErrors(nextErrors)
    setCardErrors(nextCardErrors)
    if (hasErrors(nextErrors) || Object.keys(nextCardErrors).length > 0) {
      const firstInvalid = [
        ...Object.keys(nextErrors),
        ...Object.keys(nextCardErrors),
      ][0]
      document.getElementById(firstInvalid)?.focus()
      return
    }

    // Snapshot the only two card fields we are allowed to persist. The card
    // number, expiry and CVV never leave this component's state.
    const cardholderName = card.cardholderName.trim()
    const billingPostalCode = card.billingZip.trim()

    setBillingNotice(null)
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

      // Persist only non-sensitive billing metadata (name + ZIP + timestamp).
      // Success is shown ONLY after the server confirms the insert. If the
      // save fails we stop here so the error stays on screen instead of being
      // wiped by navigation. Retrying is safe: the idempotency key reuses the
      // same order and the table's unique order_id upserts in place.
      setBillingNotice({ tone: 'info', message: 'Saving your billing details…' })
      try {
        const saved = await saveBillingDetails({
          orderNumber: created.orderNumber,
          accessToken: created.accessToken,
          cardholderName,
          billingPostalCode,
        })
        if (!saved.ok) throw new Error('The server did not confirm the save.')
        setBillingNotice({
          tone: 'success',
          message: 'Billing details saved with your order. This is not a payment confirmation.',
        })
      } catch (error) {
        setBillingNotice({
          tone: 'error',
          message: `Your billing details were NOT saved: ${
            error instanceof Error ? error.message : 'unknown error'
          } Fix the cause and press Pay again — no duplicate order will be created.`,
        })
        return
      }

      // No payment provider is configured: the demo payment is confirmed
      // immediately on submit. Card numbers, expiry and CVVs are never sent
      // anywhere — a real integration would send the customer to the provider.
      const confirmed = await confirmDemoPayment(
        created.orderNumber,
        created.accessToken,
        'succeeded',
      )
      setOrder(confirmed)

      if (confirmed.paymentStatus === 'paid' && confirmed.orderStatus === 'confirmed') {
        // Card details are never transmitted, stored or logged — drop them
        // from memory now that they are no longer needed.
        setCard(emptyPaymentCard)
        if (source === 'cart') clear()
        clearBuyNowItems()
        navigate(`/order-success?order=${encodeURIComponent(confirmed.orderNumber)}`, {
          replace: true,
        })
      } else {
        setServerError(
          'Payment was not completed. Your order is still pending and you can safely try again.',
        )
      }
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'We could not place your order. Please try again.',
      )
    } finally {
      setSubmitting(false)
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
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

            <PaymentDetailsForm
              values={card}
              errors={cardErrors}
              onChange={updateCardField}
              onBlur={handleCardBlur}
              disabled={submitting}
              notice={billingNotice}
            />

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
              <Button
                type="submit"
                size="lg"
                variant="primary"
                className="btn-pay"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Lock className="size-4" aria-hidden />
                )}
                {submitting ? 'Processing payment…' : `Pay ${formatCents(totalCents)}`}
              </Button>
            </div>
          </form>
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