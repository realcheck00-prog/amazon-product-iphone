import { useMemo, useState, type ReactNode } from 'react'
import { price, product, protectionPlan, variants } from '@/data/product'
import {
  PdpContext,
  protectionPlanPrice,
  type PdpContextValue,
  type SelectedConfiguration,
  type SelectedStorage,
} from './pdp'

const initialStorage = variants.storages[0]
const initialConfiguration = variants.configurations[0]

export function PdpProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<SelectedStorage>(initialStorage)
  const [configuration, setConfiguration] =
    useState<SelectedConfiguration>(initialConfiguration)
  const [quantity, setQuantityState] = useState(1)
  const [cartCount, setCartCount] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [cartMessage, setCartMessage] = useState<string | null>(null)

  const hasProtection = configuration.name === 'With Apple Care'

  const unitPrice = storage.price
  const totalPrice = unitPrice === null ? null : unitPrice + (hasProtection ? protectionPlanPrice : 0)

  const savingsPercent = useMemo(() => {
    if (totalPrice === null) return price.dealBadge
    return String(Math.round((1 - totalPrice / price.mrp) * 100))
  }, [totalPrice])

  function setQuantity(q: number) {
    setQuantityState(Math.min(10, Math.max(1, q)))
  }

  function addToCart() {
    if (totalPrice === null) return
    setCartCount((c) => c + quantity)
    setCartMessage(`Added ${quantity} × ${product.brand} iPhone 17 Pro Max (${storage.name})`)
  }

  const value: PdpContextValue = {
    storage,
    setStorage,
    configuration,
    setConfiguration,
    hasProtection,
    quantity,
    setQuantity,
    unitPrice,
    totalPrice,
    protectionPrice: protectionPlan.price,
    savingsPercent,
    cartCount,
    addToCart,
    wishlisted,
    toggleWishlist: () => setWishlisted((w) => !w),
    cartMessage,
    dismissCartMessage: () => setCartMessage(null),
  }

  return <PdpContext.Provider value={value}>{children}</PdpContext.Provider>
}