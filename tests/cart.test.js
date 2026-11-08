import { PRODUCTS } from "../dist/js/catalog.js";
import {
  MAX_QTY,
  STORAGE_KEY,
  cartCount,
  cartLines,
  cartSubtotal,
  changeQty,
  loadCart,
  sanitizeCart,
  saveCart,
} from "../dist/js/cart.js";
import { assert, equal, test } from "./harness.js";

const ids = PRODUCTS.map((p) => p.id);

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = String(v)),
    removeItem: (k) => void delete data[k],
  };
}
const broken = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("quota"); },
  removeItem() { throw new Error("blocked"); },
};

test("cart: the storage key is unchanged, so existing bags carry over", () => {
  equal(STORAGE_KEY, "fieldwork-bag-v1");
});

test("cart: sanitizeCart keeps valid lines", () => {
  equal(sanitizeCart({ pack: 2, mug: 1 }, ids), { pack: 2, mug: 1 });
});

test("cart: sanitizeCart drops invalid quantities and unknown products", () => {
  const dirty = { pack: -3, mug: 0, cap: 1.5, bottle: "2", lantern: NaN, blanket: null, ghost: 4 };
  equal(sanitizeCart(dirty, ids), {});
  equal(sanitizeCart({ pack: Infinity }, ids), {});
});

test("cart: sanitizeCart clamps oversized quantities", () => {
  equal(sanitizeCart({ pack: 500 }, ids), { pack: MAX_QTY });
});

test("cart: sanitizeCart rejects non-objects and cannot be prototype-polluted", () => {
  for (const bad of [null, undefined, [], "x", 5, true]) equal(sanitizeCart(bad, ids), {});
  const polluted = JSON.parse('{"__proto__":{"pack":3},"constructor":{"mug":2}}');
  equal(sanitizeCart(polluted, ids), {});
  assert(({}).pack === undefined, "Object.prototype untouched");
});

test("cart: changeQty adds, removes at zero, and clamps to the limit", () => {
  let cart = changeQty({}, "pack", 1);
  equal(cart, { pack: 1 });
  cart = changeQty(cart, "pack", 1);
  equal(cart, { pack: 2 });
  cart = changeQty(cart, "pack", -2);
  equal(cart, {}, "line removed at zero");
  equal(changeQty({}, "pack", -1), {}, "cannot go negative");
  equal(changeQty({ pack: MAX_QTY }, "pack", 1), { pack: MAX_QTY }, "limit holds");
});

test("cart: changeQty is immutable", () => {
  const original = Object.freeze({ pack: 1 });
  const next = changeQty(original, "mug", 1);
  equal(original, { pack: 1 });
  assert(next !== original);
});

test("cart: counts, lines and subtotal (exact, in cents, in catalogue order)", () => {
  const cart = { mug: 2, pack: 1 }; // inserted out of catalogue order
  equal(cartCount(cart), 3);
  equal(cartLines(cart, PRODUCTS).map((l) => [l.product.id, l.qty, l.total]), [
    ["pack", 1, 8600],
    ["mug", 2, 4800],
  ]);
  equal(cartSubtotal(cart, PRODUCTS), 13400);
  equal(cartSubtotal({}, PRODUCTS), 0);
});

test("cart: loadCart reads, sanitises, and survives bad storage", () => {
  equal(loadCart(fakeStorage({ [STORAGE_KEY]: '{"pack":2}' }), ids), { pack: 2 });
  equal(loadCart(fakeStorage({ [STORAGE_KEY]: "not json{" }), ids), {}, "corrupt JSON");
  equal(loadCart(fakeStorage(), ids), {}, "nothing saved");
  equal(loadCart(broken, ids), {}, "storage throws");
  equal(loadCart(null, ids), {}, "storage unavailable");
});

test("cart: saveCart writes, clears when empty, and never throws", () => {
  const storage = fakeStorage();
  saveCart(storage, { pack: 1 });
  equal(JSON.parse(storage.data[STORAGE_KEY]), { pack: 1 });
  saveCart(storage, {});
  assert(!(STORAGE_KEY in storage.data), "empty cart removes the key");
  saveCart(broken, { pack: 1 });
  saveCart(null, { pack: 1 });
});
