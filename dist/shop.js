"use strict";
const catalog = [
  {id:"pack",name:"Ridgeline Pack",category:"Carry",price:86,detail:"A compact daypack with a roll-top closure and an easy-access front pocket."},
  {id:"mug",name:"Camp Enamel Mug",category:"Camp",price:24,detail:"An enamel-coated camp mug with a generous handle and a dark rolled rim."},
  {id:"cap",name:"Switchback Cap",category:"Wear",price:32,detail:"A soft five-panel cap with an adjustable back for sunny walks and early starts."},
  {id:"bottle",name:"Alpine Flask",category:"Carry",price:38,detail:"A narrow insulated flask with a screw-top lid and a carry loop."},
  {id:"lantern",name:"Afterglow Lantern",category:"Camp",price:54,detail:"A compact lantern with a warm diffuser and a folding carry handle."},
  {id:"blanket",name:"Meadow Blanket",category:"Camp",price:68,detail:"A striped camp blanket that rolls down neatly for a picnic or a cool evening."}
];
const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const product = id => catalog.find(item => item.id === id);
const art = item => '<img src="' + item.id + '.svg" alt="' + item.name + ' product illustration">';
const storageKey = "fieldwork-bag-v1";
let bag = {};
try {
  const stored = JSON.parse(localStorage.getItem(storageKey)) || {};
  for (const {id} of catalog) {
    if (Number.isSafeInteger(stored[id]) && stored[id] > 0) bag[id] = stored[id];
  }
} catch {}
let filter = "All";
let toastTimer;
function renderProducts() {
  const items = catalog.filter(item => filter === "All" || item.category === filter);
  const order = byId("sort").value;
  if (order !== "featured") items.sort((a,b) => order === "low" ? a.price-b.price : b.price-a.price);
  byId("products").innerHTML = items.map(item => `<article class="product">
    <button class="product-image" data-detail="${item.id}" aria-label="View ${item.name}">${art(item)}</button>
    <div class="product-info"><div><p class="eyebrow">${item.category}</p><h3>${item.name}</h3><p class="price">${money(item.price)}</p></div>
    <button class="add" data-add="${item.id}" aria-label="Add ${item.name} to bag">+</button></div></article>`).join("");
  byId("results").textContent = `${items.length} products shown`;
}
function renderCart() {
  const items = catalog.filter(item => bag[item.id]);
  byId("count").textContent = items.reduce((sum,item) => sum + bag[item.id],0);
  byId("cart-items").innerHTML = items.map(item => `<div class="cart-row">${art(item)}
    <div><strong>${item.name}</strong><p class="price">${money(item.price * bag[item.id])}</p></div>
    <div class="qty"><button data-adjust="${item.id}" data-step="-1" aria-label="Decrease ${item.name} quantity">−</button>
    <span>${bag[item.id]}</span><button data-adjust="${item.id}" data-step="1" aria-label="Increase ${item.name} quantity">+</button></div></div>`).join("") || "<p>Your bag is empty.</p>";
  byId("subtotal").textContent = money(items.reduce((sum,item) => sum + item.price * bag[item.id],0));
  byId("cart-summary").hidden = !items.length;
}
function updateBag(id, amount) {
  bag[id] = (bag[id] || 0) + amount;
  if (bag[id] <= 0) delete bag[id];
  try {localStorage.setItem(storageKey,JSON.stringify(bag));} catch {}
  renderCart();
}
function notify(message) {
  byId("toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => byId("toast").textContent = "",2400);
}
byId("filters").innerHTML = ["All",...new Set(catalog.map(item => item.category))]
  .map(category => `<button data-category="${category}" aria-pressed="${category === filter}">${category}</button>`).join("");
byId("filters").addEventListener("click",event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  filter = button.dataset.category;
  for (const option of byId("filters").children) option.setAttribute("aria-pressed", option === button);
  renderProducts();
});
byId("sort").addEventListener("change",renderProducts);
byId("bag").addEventListener("click",() => {
  byId("order").hidden = true;
  byId("cart-items").hidden = false;
  byId("cart").showModal();
});
document.addEventListener("click",event => {
  const button = event.target.closest("button");
  if (!button) return;
  const {add,detail,adjust,step} = button.dataset;
  if (add) {
    updateBag(add,1);
    if (byId("product-dialog").open) byId("product-dialog").close();
    notify(`${product(add).name} added to your bag`);
  }
  if (detail) {
    const item = product(detail);
    byId("product-detail").innerHTML = `${art(item)}<h2 id="product-title">${item.name}</h2><p>${item.detail}</p>
      <button class="primary" data-add="${item.id}">Add to bag <span>${money(item.price)}</span></button>`;
    byId("product-dialog").showModal();
  }
  if (adjust) {
    updateBag(adjust,Number(step));
    (byId("cart-items").querySelector(`[data-adjust="${adjust}"][data-step="${step}"]`) || byId("cart").querySelector(".close")).focus();
  }
});
byId("checkout").addEventListener("click",() => {
  for (const id of Object.keys(bag)) delete bag[id];
  try {localStorage.removeItem(storageKey);} catch {}
  renderCart();
  byId("cart-items").hidden = true;
  byId("order").textContent = "Demo order placed. Thanks for exploring Fieldwork.";
  byId("order").hidden = false;
  byId("cart").querySelector(".close").focus();
});
renderProducts();
renderCart();
