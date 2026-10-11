/** Consistent serialization of a DB order row + its items to the client shape. */
export function mapOrder(
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
) {
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    accessToken: order.access_token,
    currency: order.currency,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    shipping: {
      line1: order.shipping_address_line1,
      line2: order.shipping_address_line2,
      city: order.shipping_city,
      region: order.shipping_region,
      postalCode: order.shipping_postal_code,
      country: order.shipping_country,
    },
    items: items.map((item) => ({
      productId: item.product_id,
      title: item.product_title,
      image: item.product_image,
      variant: item.selected_variant,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      lineTotalCents: item.line_total_cents,
    })),
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
