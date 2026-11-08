/** Formatting helpers. Money is always handled as integer cents to avoid float drift. */

// Intl formatters are comparatively expensive to build, so create each one once.
const whole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const exact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 8600 -> "$86", 8650 -> "$86.50" */
export function money(cents) {
  return (cents % 100 === 0 ? whole : exact).format(cents / 100);
}

/** plural(1, "item") -> "1 item", plural(3, "item") -> "3 items" */
export function plural(count, noun, pluralNoun = `${noun}s`) {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}
