/**
 * Client-side store of per-order capability tokens.
 *
 * The server never exposes order data to anonymous readers; confirmation and
 * lookup require the opaque token returned when the order was created. Tokens
 * are scoped to the browser session and keyed by order number.
 */
const KEY = 'shopfront.orderTokens.v1'

type TokenMap = Record<string, string>

function read(): TokenMap {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: TokenMap = {}
    for (const [order, token] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof token === 'string') result[order] = token
    }
    return result
  } catch {
    return {}
  }
}

export function rememberOrderToken(orderNumber: string, accessToken: string): void {
  try {
    const map = read()
    map[orderNumber] = accessToken
    window.sessionStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // no-op
  }
}

export function getOrderToken(orderNumber: string): string | null {
  return read()[orderNumber] ?? null
}

export function forgetOrderToken(orderNumber: string): void {
  try {
    const map = read()
    delete map[orderNumber]
    window.sessionStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // no-op
  }
}
