import { createContext, useContext } from 'react'
import { price, protectionPlan, variants } from '@/data/product'

export type SelectedStorage = (typeof variants.storages)[number]
export type SelectedConfiguration = (typeof variants.configurations)[number]

export type PdpContextValue = {
  storage: SelectedStorage
  setStorage: (s: SelectedStorage) => void
  configuration: SelectedConfiguration
  setConfiguration: (c: SelectedConfiguration) => void
  /** True when the `With Apple Care` configuration adds the Protect+ plan. */
  hasProtection: boolean
  quantity: number
  setQuantity: (q: number) => void
  /** Unit price before the optional Protect+ plan. `null` when unpublished. */
  unitPrice: number | null
  /** Unit price including the selected protection plan. */
  totalPrice: number | null
  protectionPrice: number
  savingsPercent: string
  cartCount: number
  addToCart: () => void
  wishlisted: boolean
  toggleWishlist: () => void
  /** Announcement surfaced by the buy box after a cart action. */
  cartMessage: string | null
  dismissCartMessage: () => void
}

export const PdpContext = createContext<PdpContextValue | null>(null)

export function usePdp(): PdpContextValue {
  const ctx = useContext(PdpContext)
  if (!ctx) throw new Error('usePdp must be used within <PdpProvider>')
  return ctx
}

/** Base deal badge from the reference, recomputed when protection changes the total. */
export const basePrice = price.amount
export const protectionPlanPrice = protectionPlan.price