/**
 * Fieldwork storefront: wires the pure modules (catalog, cart) to the page.
 *
 * Structure: state at the top, view functions that render from state, then one delegated click
 * handler that dispatches `data-action` attributes to the `actions` table below.
 */
import {
  CATEGORIES,
  PRODUCTS,
  PRODUCTS_BY_ID,
  SORTS,
  queryProducts,
  readView,
  viewToSearch,
} from "./catalog.js";
import {
  MAX_QTY,
  STORAGE_KEY,
  cartCount,
  cartLines,
  cartSubtotal,
  changeQty,
  loadCart,
  saveCart,
} from "./cart.js";
import { html, mount, raw } from "./dom.js";
import { money, plural } from "./format.js";

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ state */

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked by browser settings; the bag then lasts for this visit only
  }
})();
const validIds = [...PRODUCTS_BY_ID.keys()];

let view = readView(location.search); // { category, sort }, mirrored in the URL
let cart = loadCart(storage, validIds); // { [productId]: quantity }
let toastTimer;

/* ------------------------------------------------------------------ views */

const productCard = (product, index) => html`
  <article class="product">
    <button class="product-image" type="button" data-action="open" data-id="${product.id}"
      aria-label="View ${product.name}">
      <img src="${product.id}.svg" alt="" width="480" height="340"
        ${index > 2 ? raw('loading="lazy"') : ""}>
    </button>
    <div class="product-info">
      <div>
        <p class="eyebrow">${product.category}</p>
        <h3>${product.name}</h3>
        <p class="price">${money(product.price)}</p>
      </div>
      <button class="add" type="button" data-action="add" data-id="${product.id}"
        aria-label="Add ${product.name} to bag">+</button>
    </div>
  </article>`;

const cartRow = ({ product, qty, total }) => html`
  <div class="cart-row">
    <img src="${product.id}.svg" alt="" width="480" height="340">
    <div>
      <strong>${product.name}</strong>
      <p class="price">${money(total)}</p>
    </div>
    <div class="qty" role="group" aria-label="${product.name} quantity">
      <button type="button" data-action="adjust" data-id="${product.id}" data-step="-1"
        aria-label="Decrease ${product.name} quantity">−</button>
      <span>${qty}</span>
      <button type="button" data-action="adjust" data-id="${product.id}" data-step="1"
        aria-label="Increase ${product.name} quantity"
        ${qty >= MAX_QTY ? raw("disabled") : ""}>+</button>
    </div>
  </div>`;

const emptyBag = html`
  <p class="empty">Your bag is empty.</p>
  <button class="primary" type="button" data-action="close-cart">Keep shopping</button>`;

function renderControls() {
  mount(
    $("filters"),
    html`${CATEGORIES.map(
      (name) => html`<button type="button" data-action="filter" data-value="${name}"
        aria-pressed="${name === view.category}">${name}</button>`,
    )}`,
  );
  mount(
    $("sort"),
    html`${Object.entries(SORTS).map(
      ([value, label]) => html`<option value="${value}">${label}</option>`,
    )}`,
  );
  syncControls();
}

/** Update pressed state in place so keyboard focus is never lost on a filter click. */
function syncControls() {
  for (const button of $("filters").children) {
    button.setAttribute("aria-pressed", String(button.dataset.value === view.category));
  }
  $("sort").value = view.sort;
}

function renderProducts() {
  const items = queryProducts(PRODUCTS, view);
  mount($("products"), html`${items.map(productCard)}`);
  $("results").textContent = `${plural(items.length, "product")} shown`;
}

function renderCart() {
  const lines = cartLines(cart, PRODUCTS);
  const count = cartCount(cart);
  $("count").textContent = count;
  $("bag").setAttribute("aria-label", `Open bag, ${plural(count, "item")}`);
  mount($("cart-items"), lines.length ? html`${lines.map(cartRow)}` : emptyBag);
  $("subtotal").textContent = money(cartSubtotal(cart, PRODUCTS));
  $("cart-summary").hidden = lines.length === 0;
}

/* ------------------------------------------------------------------ helpers */

function setCart(next) {
  cart = next;
  saveCart(storage, cart);
  renderCart();
}

function commitView() {
  try {
    history.replaceState(null, "", location.pathname + viewToSearch(view) + location.hash);
  } catch {
    /* e.g. sandboxed frame: the shop still works, the URL just is not updated */
  }
  syncControls();
  renderProducts();
}

function notify(message) {
  $("toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").textContent = ""), 2600);
}

function openBag() {
  $("order").hidden = true;
  $("cart-items").hidden = false;
  $("cart-status").textContent = "";
  renderCart();
  $("cart").showModal();
}

const orderRef = () =>
  `FW-${String(crypto.getRandomValues(new Uint32Array(1))[0] % 100000).padStart(5, "0")}`;

/* ------------------------------------------------------------------ actions */

const actions = {
  filter({ value }) {
    view = { ...view, category: value };
    commitView();
  },

  open({ id }) {
    const product = PRODUCTS_BY_ID.get(id);
    if (!product) return;
    mount(
      $("product-detail"),
      html`
        <img src="${product.id}.svg" alt="${product.alt}" width="480" height="340">
        <h2 id="product-title">${product.name}</h2>
        <p>${product.detail}</p>
        <button class="primary" type="button" data-action="add" data-id="${product.id}">
          Add to bag <span>${money(product.price)}</span>
        </button>`,
    );
    // The title is rendered above, so the label reference is only valid from this point on.
    $("product-dialog").setAttribute("aria-labelledby", "product-title");
    $("product-dialog").showModal();
  },

  add({ id }) {
    const product = PRODUCTS_BY_ID.get(id);
    if (!product) return;
    if ((cart[id] || 0) >= MAX_QTY) {
      notify(`Limit of ${MAX_QTY} per item`);
      return;
    }
    setCart(changeQty(cart, id, 1));
    if ($("product-dialog").open) $("product-dialog").close();
    notify(`${product.name} added · ${plural(cartCount(cart), "item")} in bag`);
  },

  adjust({ id, step }) {
    setCart(changeQty(cart, id, Number(step)));
    const name = PRODUCTS_BY_ID.get(id).name;
    $("cart-status").textContent = cart[id] ? `${name}: ${cart[id]} in bag` : `${name} removed`;
    // The row was re-rendered: put focus back on the same control (or its sibling if that one
    // is now disabled at the quantity limit, or the close button if the row is gone).
    const find = (s) =>
      $("cart-items").querySelector(
        `[data-action="adjust"][data-id="${CSS.escape(id)}"][data-step="${s}"]`,
      );
    const target = [step, step === "1" ? "-1" : "1"].map(find).find((b) => b && !b.disabled);
    (target || $("cart").querySelector(".close")).focus();
  },

  "open-bag": openBag,

  "close-cart"() {
    $("cart").close();
  },

  checkout() {
    const count = cartCount(cart);
    if (!count) return;
    const total = cartSubtotal(cart, PRODUCTS);
    setCart({});
    $("cart-items").hidden = true;
    $("order").hidden = false;
    $("order").textContent =
      `Demo order ${orderRef()} placed: ${plural(count, "item")}, ${money(total)}. ` +
      "Thanks for exploring Fieldwork.";
    $("order").focus();
  },
};

/* ------------------------------------------------------------------ events */

document.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (control && Object.hasOwn(actions, control.dataset.action)) {
    actions[control.dataset.action](control.dataset, control);
    return;
  }
  // Clicking the backdrop (outside the dialog's own box) closes a modal dialog.
  const dialog = event.target;
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) dialog.close();
  }
});

$("sort").addEventListener("change", (event) => {
  view = { ...view, sort: event.target.value };
  commitView();
});

// Keep the bag in sync when it changes in another tab or window.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    cart = loadCart(storage, validIds);
    renderCart();
  }
});

/* ------------------------------------------------------------------ start */

renderControls();
renderProducts();
renderCart();
