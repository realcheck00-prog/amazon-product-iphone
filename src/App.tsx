import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { ProductPage } from '@/pages/ProductPage'

// Checkout is code-split so the product page stays lightweight.
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const OrderSuccessPage = lazy(() =>
  import('@/pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page text-sm text-ink-3">
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<ProductPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <CartDrawer />
    </>
  )
}
