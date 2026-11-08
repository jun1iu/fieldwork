/**
 * Tiny HTML templating with automatic escaping.
 *
 * Every interpolated value is escaped unless it is itself the result of `html` (or `raw`),
 * so product names, ids and any future user-supplied text can never inject markup.
 *
 *   html`<h3>${name}</h3>`              // name is escaped
 *   html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`   // nested templates are not double-escaped
 */

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

function toHtml(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toHtml).join("");
  // null/undefined render as nothing. `false` deliberately renders as "false" so boolean
  // attributes such as aria-pressed="${isActive}" work; use `cond ? x : ""` for optional chunks.
  if (value === null || value === undefined) return "";
  return escapeHtml(value);
}

/** Mark a trusted string (e.g. a static attribute) as already-safe markup. */
export const raw = (value) => new SafeHtml(String(value));

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += toHtml(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Replace an element's contents. Only accepts `html` results, never plain strings. */
export function mount(element, template) {
  if (!(template instanceof SafeHtml)) {
    throw new TypeError("mount() needs an html`...` template; plain strings are refused");
  }
  element.innerHTML = template.value;
}
