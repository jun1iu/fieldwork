/** Product data and the pure functions that filter, sort and (de)serialise the shop view. */

const freeze = Object.freeze;

export const PRODUCTS = freeze(
  [
    {
      id: "pack",
      name: "Ridgeline Pack",
      category: "Carry",
      price: 8600,
      alt: "Illustration of an olive roll-top daypack with a front pocket",
      detail: "A compact daypack with a roll-top closure and an easy-access front pocket.",
    },
    {
      id: "mug",
      name: "Camp Enamel Mug",
      category: "Camp",
      price: 2400,
      alt: "Illustration of a rust-red enamel mug with a dark rim",
      detail: "An enamel-coated camp mug with a generous handle and a dark rolled rim.",
    },
    {
      id: "cap",
      name: "Switchback Cap",
      category: "Wear",
      price: 3200,
      alt: "Illustration of an olive five-panel cap",
      detail: "A soft five-panel cap with an adjustable back for sunny walks and early starts.",
    },
    {
      id: "bottle",
      name: "Alpine Flask",
      category: "Carry",
      price: 3800,
      alt: "Illustration of a slate-green insulated flask with a carry loop",
      detail: "A narrow insulated flask with a screw-top lid and a carry loop.",
    },
    {
      id: "lantern",
      name: "Afterglow Lantern",
      category: "Camp",
      price: 5400,
      alt: "Illustration of a lantern with a warm glowing diffuser",
      detail: "A compact lantern with a warm diffuser and a folding carry handle.",
    },
    {
      id: "blanket",
      name: "Meadow Blanket",
      category: "Camp",
      price: 6800,
      alt: "Illustration of a striped camp blanket rolled up",
      detail: "A striped camp blanket that rolls down neatly for a picnic or a cool evening.",
    },
  ].map(freeze),
);

export const PRODUCTS_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const CATEGORIES = freeze(["All", ...new Set(PRODUCTS.map((p) => p.category))]);
export const SORTS = freeze({
  featured: "Featured",
  low: "Price: low to high",
  high: "Price: high to low",
});

export const DEFAULT_VIEW = freeze({ category: "All", sort: "featured" });

/** Filter by category and sort by price. Never mutates its input; ties keep catalogue order. */
export function queryProducts(products, { category = "All", sort = "featured" } = {}) {
  const list = category === "All" ? [...products] : products.filter((p) => p.category === category);
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list.sort((a, b) => b.price - a.price);
  return list;
}

/** Parse `?category=Camp&sort=low`. Anything unrecognised falls back to the default. */
export function readView(search) {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  const sort = params.get("sort");
  return {
    category: CATEGORIES.includes(category) ? category : DEFAULT_VIEW.category,
    sort: Object.keys(SORTS).includes(sort) ? sort : DEFAULT_VIEW.sort,
  };
}

/** Inverse of readView. Defaults are omitted so the plain shop URL stays clean. */
export function viewToSearch(view) {
  const params = new URLSearchParams();
  if (view.category !== DEFAULT_VIEW.category) params.set("category", view.category);
  if (view.sort !== DEFAULT_VIEW.sort) params.set("sort", view.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}
