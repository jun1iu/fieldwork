/**
 * Shopping bag logic. A cart is a plain `{ [productId]: quantity }` object.
 *
 * Everything here is pure (no DOM, no globals) except load/save, which take the storage object
 * as an argument so they can be tested with a fake, including one that throws.
 */

export const MAX_QTY = 9;
export const STORAGE_KEY = "fieldwork-bag-v1"; // format unchanged, so existing bags carry over

const clamp = (n) => Math.min(MAX_QTY, Math.max(0, n));

/** Keep only known products with whole-number quantities, clamped to 1..MAX_QTY. */
export function sanitizeCart(raw, validIds) {
  const clean = {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return clean;
  for (const id of validIds) {
    const qty = raw[id];
    if (Number.isSafeInteger(qty) && qty > 0) clean[id] = clamp(qty);
  }
  return clean;
}

/** Return a new cart with `delta` added to one line. Lines at 0 are removed. */
export function changeQty(cart, id, delta) {
  const next = { ...cart };
  const qty = clamp((cart[id] || 0) + delta);
  if (qty === 0) delete next[id];
  else next[id] = qty;
  return next;
}

export const cartCount = (cart) => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

/** Lines in catalogue order: [{ product, qty, total }] with totals in cents. */
export function cartLines(cart, products) {
  return products
    .filter((product) => cart[product.id])
    .map((product) => ({
      product,
      qty: cart[product.id],
      total: product.price * cart[product.id],
    }));
}

export const cartSubtotal = (cart, products) =>
  cartLines(cart, products).reduce((sum, line) => sum + line.total, 0);

export function loadCart(storage, validIds) {
  try {
    return sanitizeCart(JSON.parse(storage.getItem(STORAGE_KEY)), validIds);
  } catch {
    return {}; // storage blocked, empty, or corrupted JSON
  }
}

export function saveCart(storage, cart) {
  try {
    if (cartCount(cart) === 0) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* private mode or quota exceeded: the bag still works for this visit */
  }
}
