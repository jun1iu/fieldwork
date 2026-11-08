import {
  CATEGORIES,
  PRODUCTS,
  SORTS,
  queryProducts,
  readView,
  viewToSearch,
} from "../dist/js/catalog.js";
import { assert, equal, test } from "./harness.js";

test("catalog: data is frozen and well formed", () => {
  assert(Object.isFrozen(PRODUCTS) && PRODUCTS.every(Object.isFrozen), "frozen");
  equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length, "unique ids");
  for (const p of PRODUCTS) {
    assert(Number.isInteger(p.price) && p.price > 0, `${p.id}: price is positive integer cents`);
    assert(p.name && p.detail && p.alt, `${p.id}: has name, detail and alt text`);
    assert(CATEGORIES.includes(p.category), `${p.id}: category is listed`);
  }
});

test("catalog: every product has its illustration on the server", async () => {
  for (const p of PRODUCTS) {
    const response = await fetch(`../dist/${p.id}.svg`);
    assert(response.ok, `${p.id}.svg returned ${response.status}`);
  }
});

test("catalog: categories keep first-appearance order, All first", () => {
  equal(CATEGORIES, ["All", "Carry", "Camp", "Wear"]);
});

test("catalog: queryProducts filters by category", () => {
  const camp = queryProducts(PRODUCTS, { category: "Camp" });
  equal(camp.map((p) => p.id), ["mug", "lantern", "blanket"]);
  equal(queryProducts(PRODUCTS, { category: "Nope" }), []);
});

test("catalog: queryProducts sorts by price, low and high", () => {
  const low = queryProducts(PRODUCTS, { sort: "low" }).map((p) => p.price);
  const high = queryProducts(PRODUCTS, { sort: "high" }).map((p) => p.price);
  equal(low, [...low].sort((a, b) => a - b));
  equal(high, [...high].sort((a, b) => b - a));
  equal(queryProducts(PRODUCTS).map((p) => p.id), PRODUCTS.map((p) => p.id), "featured order");
});

test("catalog: queryProducts never mutates its input and keeps ties in order", () => {
  const input = [
    { id: "a", price: 100, category: "X" },
    { id: "b", price: 100, category: "X" },
    { id: "c", price: 50, category: "X" },
  ];
  const before = JSON.stringify(input);
  const out = queryProducts(input, { sort: "low" });
  equal(out.map((p) => p.id), ["c", "a", "b"], "stable sort");
  assert(out !== input && JSON.stringify(input) === before, "input untouched");
});

test("catalog: readView falls back to defaults for bad input", () => {
  const defaults = { category: "All", sort: "featured" };
  equal(readView(""), defaults);
  equal(readView("?category=Nope&sort=evil"), defaults);
  equal(readView("?sort=toString"), defaults, "prototype keys are not valid sorts");
  equal(readView("?category=Camp&sort=low"), { category: "Camp", sort: "low" });
});

test("catalog: viewToSearch omits defaults and round-trips every combination", () => {
  equal(viewToSearch({ category: "All", sort: "featured" }), "");
  equal(viewToSearch({ category: "Camp", sort: "featured" }), "?category=Camp");
  for (const category of CATEGORIES) {
    for (const sort of Object.keys(SORTS)) {
      const view = { category, sort };
      equal(readView(viewToSearch(view)), view, `${category}/${sort}`);
    }
  }
});
