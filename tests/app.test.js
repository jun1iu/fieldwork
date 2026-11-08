/**
 * Integration tests: load the real page in a same-origin iframe and drive it like a user.
 * Each test gets a fresh page and an empty bag.
 */
import { STORAGE_KEY } from "../dist/js/cart.js";
import { assert, equal, sleep, test } from "./harness.js";

async function withApp(fn, { search = "", stored, width = 1200 } = {}) {
  localStorage.removeItem(STORAGE_KEY);
  if (stored !== undefined) {
    localStorage.setItem(STORAGE_KEY, typeof stored === "string" ? stored : JSON.stringify(stored));
  }
  const frame = document.createElement("iframe");
  frame.style.width = `${width}px`;
  const loaded = new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
  frame.src = `../dist/index.html${search}`;
  document.body.append(frame);
  await loaded;

  const { contentWindow: win, contentDocument: doc } = frame;
  const $ = (selector) => doc.querySelector(selector);
  const app = {
    win,
    doc,
    $,
    $$: (selector) => [...doc.querySelectorAll(selector)],
    click(target) {
      const el = typeof target === "string" ? $(target) : target;
      assert(el, `nothing matches ${target}`);
      el.click();
    },
    names: () => [...doc.querySelectorAll(".product h3")].map((h) => h.textContent),
    prices: () => [...doc.querySelectorAll(".product .price")].map((p) => p.textContent),
    count: () => $("#count").textContent,
    stored: () => JSON.parse(localStorage.getItem(STORAGE_KEY)),
    addButton: (index = 0) => doc.querySelectorAll(".product [data-action=add]")[index],
  };
  try {
    await fn(app);
  } finally {
    frame.remove();
    localStorage.removeItem(STORAGE_KEY);
  }
}
const scenario = (name, fn, options) => test(`app: ${name}`, () => withApp(fn, options));

/* ------------------------------------------------------------------ browsing */

scenario("renders the whole catalogue with sensible defaults", async (a) => {
  equal(a.names(), [
    "Ridgeline Pack",
    "Camp Enamel Mug",
    "Switchback Cap",
    "Alpine Flask",
    "Afterglow Lantern",
    "Meadow Blanket",
  ]);
  equal(a.prices(), ["$86", "$24", "$32", "$38", "$54", "$68"]);
  equal(a.$("#results").textContent, "6 products shown");
  equal(a.count(), "0");
  equal(a.$("#filters [aria-pressed=true]").textContent, "All");
});

scenario("filtering updates the grid, pressed state, announcement and URL", async (a) => {
  a.click('#filters [data-value="Camp"]');
  equal(a.names(), ["Camp Enamel Mug", "Afterglow Lantern", "Meadow Blanket"]);
  equal(a.$("#results").textContent, "3 products shown");
  equal(a.$$("#filters [aria-pressed=true]").map((b) => b.textContent), ["Camp"]);
  equal(a.win.location.search, "?category=Camp");
  a.click('#filters [data-value="All"]');
  equal(a.win.location.search, "", "default view leaves the URL clean");
});

scenario("sorting by price reorders the grid and updates the URL", async (a) => {
  a.$("#sort").value = "low";
  a.$("#sort").dispatchEvent(new Event("change", { bubbles: true }));
  equal(a.prices(), ["$24", "$32", "$38", "$54", "$68", "$86"]);
  equal(a.win.location.search, "?sort=low");
  a.$("#sort").value = "high";
  a.$("#sort").dispatchEvent(new Event("change", { bubbles: true }));
  equal(a.prices(), ["$86", "$68", "$54", "$38", "$32", "$24"]);
});

scenario("the view is restored from the URL (shareable links)", async (a) => {
  equal(a.names(), ["Switchback Cap"]);
  equal(a.$("#sort").value, "high");
  equal(a.$("#filters [aria-pressed=true]").textContent, "Wear");
}, { search: "?category=Wear&sort=high" });

scenario("garbage in the URL is ignored", async (a) => {
  equal(a.names().length, 6);
  equal(a.$("#sort").value, "featured");
}, { search: "?category=<script>&sort=evil" });

/* ------------------------------------------------------------------ the bag */

scenario("adding to the bag updates count, label, storage and the toast", async (a) => {
  a.addButton(0).click();
  equal(a.count(), "1");
  equal(a.$("#bag").getAttribute("aria-label"), "Open bag, 1 item");
  equal(a.stored(), { pack: 1 });
  assert(/Ridgeline Pack added/.test(a.$("#toast").textContent), a.$("#toast").textContent);
  a.addButton(0).click();
  equal(a.$("#bag").getAttribute("aria-label"), "Open bag, 2 items");
});

scenario("bag: quantities, subtotal, focus handling and the empty state", async (a) => {
  a.addButton(0).click();
  a.click("#bag");
  assert(a.$("#cart").open, "the drawer opens");
  equal(a.$("#subtotal").textContent, "$86");

  a.click('[data-action=adjust][data-step="1"]');
  equal(a.$(".qty span").textContent, "2");
  equal(a.$("#subtotal").textContent, "$172");
  assert(a.doc.activeElement.matches('[data-step="1"]'), "focus stays on the + control");
  assert(/Ridgeline Pack: 2 in bag/.test(a.$("#cart-status").textContent), "change is announced");

  a.click('[data-action=adjust][data-step="-1"]');
  a.click('[data-action=adjust][data-step="-1"]');
  assert(a.$(".empty"), "empty message appears");
  assert(a.$("#cart-summary").hidden, "checkout is hidden when empty");
  assert(a.doc.activeElement.matches(".close"), "focus moves to a safe control when the row is gone");
  equal(localStorage.getItem(STORAGE_KEY), null, "empty bag clears storage");
});

scenario("bag: quantity is capped at 9 and the limit is explained", async (a) => {
  for (let i = 0; i < 9; i++) a.addButton(0).click();
  equal(a.count(), "9");
  a.addButton(0).click();
  equal(a.count(), "9");
  assert(/Limit of 9/.test(a.$("#toast").textContent), a.$("#toast").textContent);
  equal(a.stored(), { pack: 9 });
  a.click("#bag");
  assert(a.$('[data-step="1"]').disabled, "+ is disabled at the limit");
});

scenario("bag persists across reloads", async (a) => {
  equal(a.count(), "2");
  equal(a.$("#bag").getAttribute("aria-label"), "Open bag, 2 items");
}, { stored: { mug: 2 } });

scenario("corrupt or hostile stored data is ignored", async (a) => {
  equal(a.count(), "0");
}, { stored: '{"pack":-3,"ghost":4,"mug":"x"}' });

scenario("unparseable stored data is ignored", async (a) => {
  equal(a.count(), "0");
}, { stored: "not json{" });

scenario("the bag stays in sync with other tabs", async (a) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lantern: 2 })); // as another tab would
  await sleep(100);
  equal(a.count(), "2");
});

scenario("checkout places a demo order, clears the bag, and resets on reopen", async (a) => {
  a.addButton(0).click(); // pack  $86
  a.addButton(1).click(); // mug   $24 x2
  a.addButton(1).click();
  a.click("#bag");
  a.click("#checkout");
  const order = a.$("#order");
  assert(!order.hidden, "confirmation is visible");
  assert(/^Demo order FW-\d{5} placed: 3 items, \$134\./.test(order.textContent), order.textContent);
  equal(a.count(), "0");
  equal(localStorage.getItem(STORAGE_KEY), null);
  assert(a.$("#cart-items").hidden, "line items are hidden");
  equal(a.doc.activeElement.id, "order", "focus moves to the confirmation");

  a.$("#cart").close();
  a.click("#bag");
  assert(a.$("#order").hidden && !a.$("#cart-items").hidden, "reopening starts fresh");
  assert(a.$(".empty"));
});

/* ------------------------------------------------------------------ dialogs */

scenario("product dialog: details, descriptive alt text, add-to-bag closes it", async (a) => {
  a.click(".product-image");
  const dialog = a.$("#product-dialog");
  assert(dialog.open, "dialog opens");
  equal(a.$("#product-title").textContent, "Ridgeline Pack");
  assert(a.$("#product-detail img").alt.length > 15, "detail image has real alt text");
  assert(a.$$(".product img").every((img) => img.alt === ""), "grid images are decorative");
  a.click("#product-detail [data-action=add]");
  assert(!dialog.open, "dialog closes after adding");
  equal(a.count(), "1");
});

scenario("clicking the backdrop closes a dialog, clicking inside does not", async (a) => {
  a.click(".product-image");
  const dialog = a.$("#product-dialog");
  const box = dialog.getBoundingClientRect();
  const click = (x, y) =>
    dialog.dispatchEvent(new a.win.MouseEvent("click", { bubbles: true, clientX: x, clientY: y }));
  click(box.left + 10, box.top + 10);
  assert(dialog.open, "a click inside keeps it open");
  click(2, 2);
  assert(!dialog.open, "a click on the backdrop closes it");
});

/* ------------------------------------------------------------------ quality gates */

scenario("accessibility basics: names, alt text, landmarks, headings, dialogs", async (a) => {
  for (const el of a.$$("button, a[href], select")) {
    const name =
      el.getAttribute("aria-label") || el.textContent.trim() || el.labels?.[0]?.textContent.trim();
    assert(name, `unnamed control: ${el.outerHTML.slice(0, 70)}`);
  }
  assert(a.$$("img").every((img) => img.hasAttribute("alt")), "every image has an alt attribute");
  equal(a.$$("h1").length, 1, "exactly one h1");
  for (const tag of ["header", "nav", "main", "footer"]) assert(a.$(tag), `<${tag}> landmark`);
  equal(a.doc.documentElement.lang, "en");
});

scenario("every dialog is labelled by a real element while it is open", async (a) => {
  const labelled = (dialog) => {
    const label = a.doc.getElementById(dialog.getAttribute("aria-labelledby"));
    return label && label.textContent.trim();
  };
  a.click(".product-image");
  assert(labelled(a.$("#product-dialog")), "product dialog has an accessible name");
  a.$("#product-dialog").close();
  a.click("#bag");
  equal(labelled(a.$("#cart")), "Your bag");
});

scenario("no horizontal overflow on a 320px phone", async (a) => {
  const { scrollWidth } = a.doc.documentElement;
  assert(scrollWidth <= 320, `page is ${scrollWidth}px wide`);
}, { width: 320 });

scenario("no horizontal overflow on a desktop", async (a) => {
  const { scrollWidth } = a.doc.documentElement;
  assert(scrollWidth <= 1200, `page is ${scrollWidth}px wide`);
});
