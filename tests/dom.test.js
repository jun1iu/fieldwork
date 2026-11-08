import { escapeHtml, html, mount, raw } from "../dist/js/dom.js";
import { assert, equal, test, throws } from "./harness.js";

test("dom: escapes markup in interpolated text", () => {
  equal(
    String(html`<p>${"<script>alert(1)</script>"}</p>`),
    "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
  );
});

test("dom: escapes quotes so values cannot break out of attributes", () => {
  const out = String(html`<a title="${'" onmouseover="alert(1)'}">x</a>`);
  assert(!out.includes('" onmouseover'), `attribute escaped: ${out}`);
  equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});

test("dom: nested templates are not double-escaped", () => {
  const list = html`<ul>${[1, 2].map((n) => html`<li>${n}</li>`)}</ul>`;
  equal(String(list), "<ul><li>1</li><li>2</li></ul>");
});

test("dom: plain strings inside arrays are still escaped", () => {
  equal(String(html`${["<b>", html`<i></i>`]}`), "&lt;b&gt;<i></i>");
});

test("dom: raw() passes trusted markup through", () => {
  equal(String(html`<p ${raw("hidden")}></p>`), "<p hidden></p>");
});

test("dom: null/undefined render nothing, false and 0 render as text", () => {
  equal(String(html`[${null}][${undefined}][${false}][${0}]`), "[][][false][0]");
});

test("dom: mount refuses plain strings", async () => {
  const el = document.createElement("div");
  await throws(() => mount(el, "<img src=x onerror=1>"), /html`/);
  equal(el.innerHTML, "");
});

test("dom: injected markup never becomes live elements", () => {
  const el = document.createElement("div");
  window.__pwned = false;
  mount(el, html`<p>${"<img src=x onerror=window.__pwned=true>"}</p>`);
  assert(el.querySelector("img") === null, "no <img> element was created");
  assert(window.__pwned === false, "no handler ran");
  equal(el.textContent, "<img src=x onerror=window.__pwned=true>");
});
