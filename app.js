// ============================
// State
// ============================
const state = {
  cart: [],
  currentCategory: "table",
  orders: JSON.parse(localStorage.getItem("gift_orders") || "[]"),
  orderCounter: parseInt(localStorage.getItem("gift_order_counter") || "0"),
  receivedAmount: "",
  paymentMethod: "cash",
  scEnabled: true,
  customIdCounter: 9000,
  tableNumber: null,
  customerType: null,
  source: null,
  cast: null,
  guestCount: 0,
  checkinTime: null,
  pendingTableNumber: null,
  pendingType: null,
  pendingSource: null,
  pendingCast: null,
  confirmItem: null,
  confirmQty: 1,
};

// ============================
// Helpers
// ============================
const fmt = (n) => (n < 0 ? "−¥" + Math.abs(n).toLocaleString() : "¥" + n.toLocaleString());
const pz = (n) => n.toString().padStart(2, "0");
const fmtTime = (d) => `${pz(d.getHours())}:${pz(d.getMinutes())}`;
const fmtDT = (s) => { const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()} ${fmtTime(d)}`; };

function getCartSubtotal() { return state.cart.reduce((s, i) => s + i.price * i.qty, 0); }
function getCartTax() { const s = getCartSubtotal(); return s > 0 ? Math.floor(s * 0.1) : 0; }
function getCartSC() { return state.scEnabled && getCartSubtotal() > 0 ? Math.floor(getCartSubtotal() * 0.15) : 0; }
function getCartCardFee() { if (state.paymentMethod !== "card") return 0; const b = getCartSubtotal()+getCartTax()+getCartSC(); return b > 0 ? Math.floor(b*0.08) : 0; }
function getCartTotal() { return Math.max(0, getCartSubtotal()+getCartTax()+getCartSC()+getCartCardFee()); }

function saveOrders() {
  localStorage.setItem("gift_orders", JSON.stringify(state.orders));
  localStorage.setItem("gift_order_counter", state.orderCounter.toString());
}

const methodLabel = { cash: "💴 現金", card: "💳 カード", qr: "📱 QR決済" };
const getML = (m) => methodLabel[m] || m;

function getBusinessDate(s) {
  const d = s ? new Date(s) : new Date();
  if (d.getHours() < 20) d.setDate(d.getDate() - 1);
  return d.toDateString();
}
function getBusinessMonth(s) {
  const d = s ? new Date(s) : new Date();
  if (d.getDate() === 1 && d.getHours() < 20) d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${pz(d.getMonth()+1)}`;
}

// ============================
// Scroll Lock (mobile fix)
// ============================
let scrollLockY = 0;
function lockScroll() {
  scrollLockY = window.scrollY;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.top = `-${scrollLockY}px`;
}
function unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.top = "";
  window.scrollTo(0, 0);
}

// ============================
// Clock
// ============================
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = `${now.getFullYear()}/${pz(now.getMonth()+1)}/${pz(now.getDate())} ${fmtTime(now)}`;
}
setInterval(updateClock, 1000);
updateClock();

// ============================
// Navigation
// ============================
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const v = btn.dataset.view;
    document.querySelectorAll(".main-content").forEach((el) => el.classList.add("hidden"));
    document.getElementById(`view-${v}`).classList.remove("hidden");
    if (v === "history") renderHistory();
    if (v === "summary") renderSummary();
  });
});

// ============================
// SC Toggle
// ============================
document.getElementById("sc-checkbox").addEventListener("change", (e) => {
  state.scEnabled = e.target.checked;
  renderCart();
});

// ============================
// Categories
// ============================
function renderCategories() {
  const c = document.getElementById("category-tabs");
  c.innerHTML = MENU_DATA.categories.map((cat) =>
    `<button class="category-tab ${cat.id === state.currentCategory ? "active" : ""}" data-category="${cat.id}">${cat.emoji} ${cat.name}</button>`
  ).join("");
  c.querySelectorAll(".category-tab").forEach((t) => {
    t.addEventListener("click", () => { state.currentCategory = t.dataset.category; renderCategories(); renderMenu(); });
  });
}

// ============================
// Menu Grid
// ============================
function renderMenu() {
  const c = document.getElementById("menu-grid");

  if (state.currentCategory === "table") {
    let h = "";
    for (let i = 1; i <= 12; i++) {
      const active = state.tableNumber === i;
      let info = "";
      if (active && state.checkinTime) {
        const t = new Date(state.checkinTime);
        info = `${pz(t.getHours())}:${pz(t.getMinutes())}〜`;
        if (state.cast) info += ` / ${state.cast}`;
        else if (state.customerType === "new") info += ` / 新規`;
        if (state.guestCount > 0) info += ` / ${state.guestCount}名`;
      }
      h += `<button class="menu-item table-btn ${active ? "table-active" : ""}" data-table="${i}">
        <span class="emoji">🪑</span>
        <span class="name">卓 ${i}</span>
        <span class="price">${active ? "✓ 選択中" : "選択"}</span>
        ${info ? `<span class="table-info">${info}</span>` : ""}
      </button>`;
    }
    c.innerHTML = h;
    c.querySelectorAll(".table-btn").forEach((b) => {
      b.addEventListener("click", () => { state.pendingTableNumber = parseInt(b.dataset.table); openTableModal(state.pendingTableNumber); });
    });
    return;
  }

  if (state.currentCategory === "other") {
    c.innerHTML = `<button class="menu-item menu-item-custom" id="btn-open-custom"><span class="emoji">📝</span><span class="name">フリー入力</span><span class="price">自由金額</span></button>`;
    document.getElementById("btn-open-custom").addEventListener("click", () => { if (!guardTable()) return; openCustomModal(); });
    return;
  }

  let items = state.currentCategory === "all" ? MENU_DATA.items : MENU_DATA.items.filter((i) => i.category === state.currentCategory);
  let h = items.map((item) =>
    `<button class="menu-item" data-id="${item.id}"><span class="emoji">${item.emoji}</span><span class="name">${item.name}</span><span class="price">${fmt(item.price)}</span></button>`
  ).join("");

  if (state.currentCategory === "system") {
    h += `<button class="menu-item menu-item-special" id="btn-open-discount"><span class="emoji">🏷️</span><span class="name">特別プラン</span><span class="price">金額入力</span></button>`;
  }
  if (state.currentCategory === "all") {
    h += `<button class="menu-item menu-item-custom" id="btn-open-custom-all"><span class="emoji">📝</span><span class="name">フリー入力</span><span class="price">自由金額</span></button>`;
  }
  c.innerHTML = h;

  c.querySelectorAll(".menu-item:not(.menu-item-custom):not(.menu-item-special)").forEach((el) => {
    if (el.dataset.id) el.addEventListener("click", () => { if (!guardTable()) return; openConfirmItem(parseInt(el.dataset.id)); });
  });
  const db = document.getElementById("btn-open-discount");
  if (db) db.addEventListener("click", () => { if (!guardTable()) return; openDiscountModal(); });
  const cb = document.getElementById("btn-open-custom") || document.getElementById("btn-open-custom-all");
  if (cb) cb.addEventListener("click", () => { if (!guardTable()) return; openCustomModal(); });
}

function guardTable() { if (!state.tableNumber) { alert("先に卓番号を選択してください"); return false; } return true; }

// ============================
// Confirm Item Modal
// ============================
function openConfirmItem(itemId) {
  const item = MENU_DATA.items.find((i) => i.id === itemId);
  if (!item) return;
  state.confirmItem = item;
  state.confirmQty = 1;
  document.getElementById("confirm-item-detail").innerHTML =
    `<span class="confirm-emoji">${item.emoji}</span><span class="confirm-name">${item.name}</span><span class="confirm-price">${fmt(item.price)}</span>`;
  document.getElementById("confirm-qty-num").textContent = "1";
  document.getElementById("modal-confirm-item").classList.remove("hidden");
  lockScroll();
}

document.getElementById("btn-close-confirm").addEventListener("click", () => { document.getElementById("modal-confirm-item").classList.add("hidden"); unlockScroll(); });
document.getElementById("confirm-qty-minus").addEventListener("click", () => { if (state.confirmQty > 1) { state.confirmQty--; document.getElementById("confirm-qty-num").textContent = state.confirmQty; } });
document.getElementById("confirm-qty-plus").addEventListener("click", () => { state.confirmQty++; document.getElementById("confirm-qty-num").textContent = state.confirmQty; });
document.getElementById("btn-confirm-add").addEventListener("click", () => {
  if (!state.confirmItem) return;
  const existing = state.cart.find((i) => i.id === state.confirmItem.id);
  if (existing) existing.qty += state.confirmQty;
  else state.cart.push({ ...state.confirmItem, qty: state.confirmQty });
  renderCart();
  document.getElementById("modal-confirm-item").classList.add("hidden");
  unlockScroll();
});

// ============================
// Table Modal (3 steps)
// ============================
function openTableModal(n) {
  document.getElementById("modal-table-title").textContent = `🪑 卓 ${n}`;
  document.getElementById("table-step1").classList.remove("hidden");
  document.getElementById("table-step2-new").classList.add("hidden");
  document.getElementById("table-step2-repeat").classList.add("hidden");
  document.getElementById("table-step3-guests").classList.add("hidden");
  document.getElementById("table-cast-input").value = "";
  // Build guest buttons
  let gh = "";
  for (let i = 1; i <= 10; i++) gh += `<button class="guest-num-btn" data-guests="${i}">${i}名</button>`;
  document.getElementById("guest-select-btns").innerHTML = gh;
  document.querySelectorAll(".guest-num-btn").forEach((b) => {
    b.addEventListener("click", () => confirmTable(state.pendingType, state.pendingSource, state.pendingCast, parseInt(b.dataset.guests)));
  });
  document.getElementById("modal-table").classList.remove("hidden");
  lockScroll();
}

function closeTableModal() { document.getElementById("modal-table").classList.add("hidden"); unlockScroll(); }
document.getElementById("btn-close-table").addEventListener("click", closeTableModal);

function goToGuestStep(type, source, cast) {
  state.pendingType = type;
  state.pendingSource = source;
  state.pendingCast = cast;
  document.getElementById("table-step1").classList.add("hidden");
  document.getElementById("table-step2-new").classList.add("hidden");
  document.getElementById("table-step2-repeat").classList.add("hidden");
  document.getElementById("table-step3-guests").classList.remove("hidden");
}

document.getElementById("btn-type-new").addEventListener("click", () => {
  document.getElementById("table-step1").classList.add("hidden");
  document.getElementById("table-step2-new").classList.remove("hidden");
});
document.getElementById("btn-type-repeat").addEventListener("click", () => {
  document.getElementById("table-step1").classList.add("hidden");
  document.getElementById("table-step2-repeat").classList.remove("hidden");
  document.getElementById("table-cast-input").focus();
});

document.querySelectorAll(".source-btn").forEach((b) => {
  b.addEventListener("click", () => goToGuestStep("new", b.dataset.source, null));
});

document.getElementById("btn-confirm-cast").addEventListener("click", () => {
  const name = document.getElementById("table-cast-input").value.trim();
  if (!name) { alert("キャスト名を入力してください"); return; }
  goToGuestStep("repeat", null, name);
});
document.getElementById("btn-free-repeat").addEventListener("click", () => goToGuestStep("repeat", null, null));

function confirmTable(type, source, cast, guests) {
  state.tableNumber = state.pendingTableNumber;
  state.customerType = type;
  state.source = source || null;
  state.cast = cast || null;
  state.guestCount = guests;
  state.checkinTime = new Date().toISOString();
  state.cart = [];
  updateTableBadge();
  renderCart();
  closeTableModal();
  state.currentCategory = "system";
  renderCategories();
  renderMenu();
}

function updateTableBadge() {
  const tb = document.getElementById("table-badge");
  const cb = document.getElementById("cast-badge");
  const gr = document.getElementById("cart-guest-row");
  if (state.tableNumber) {
    tb.textContent = `🪑 卓${state.tableNumber}`;
    tb.classList.add("active");
    let info = state.customerType === "new" ? "🆕 新規" : "🔄 リピート";
    if (state.source) info += ` (${state.source})`;
    if (state.cast) info = `👑 ${state.cast}`;
    if (state.checkinTime) { const t = new Date(state.checkinTime); info += ` ｜ ${pz(t.getHours())}:${pz(t.getMinutes())}〜`; }
    cb.textContent = info;
    gr.classList.remove("hidden");
    document.getElementById("guest-count").textContent = state.guestCount;
  } else {
    tb.textContent = "卓未選択"; tb.classList.remove("active"); cb.textContent = ""; gr.classList.add("hidden");
  }
}

// Guest +/- buttons
document.getElementById("guest-minus").addEventListener("click", () => {
  if (state.guestCount > 1) { state.guestCount--; document.getElementById("guest-count").textContent = state.guestCount; }
});
document.getElementById("guest-plus").addEventListener("click", () => {
  state.guestCount++; document.getElementById("guest-count").textContent = state.guestCount;
});

// ============================
// Discount (Special Plan) Modal
// ============================
function openDiscountModal() {
  document.getElementById("modal-discount").classList.remove("hidden");
  document.getElementById("discount-name").value = "";
  document.getElementById("discount-price").value = "";
  document.getElementById("discount-name").focus();
  lockScroll();
}
document.getElementById("btn-close-discount").addEventListener("click", () => { document.getElementById("modal-discount").classList.add("hidden"); unlockScroll(); });
document.getElementById("btn-add-discount").addEventListener("click", () => {
  const name = document.getElementById("discount-name").value.trim() || "特別プラン";
  const price = parseInt(document.getElementById("discount-price").value) || 0;
  if (price <= 0) { alert("料金を入力してください"); return; }
  state.customIdCounter++;
  state.cart.push({ id: state.customIdCounter, name: name, price: price, category: "system", emoji: "🏷️", qty: 1, isCustom: true });
  renderCart();
  document.getElementById("modal-discount").classList.add("hidden");
  unlockScroll();
});

// ============================
// Custom Item Modal
// ============================
function openCustomModal() {
  document.getElementById("modal-custom").classList.remove("hidden");
  document.getElementById("custom-name").value = "";
  document.getElementById("custom-price").value = "";
  document.getElementById("custom-name").focus();
  lockScroll();
}
document.getElementById("btn-close-custom").addEventListener("click", () => { document.getElementById("modal-custom").classList.add("hidden"); unlockScroll(); });
document.getElementById("btn-add-custom").addEventListener("click", () => {
  const name = document.getElementById("custom-name").value.trim();
  const price = parseInt(document.getElementById("custom-price").value) || 0;
  if (!name || price <= 0) { alert("商品名と金額を入力してください"); return; }
  state.customIdCounter++;
  state.cart.push({ id: state.customIdCounter, name, price, category: "other", emoji: "📝", qty: 1, isCustom: true });
  renderCart();
  document.getElementById("modal-custom").classList.add("hidden");
  unlockScroll();
});

// ============================
// Cart
// ============================
function updateQty(id, delta) {
  const item = state.cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== id);
  renderCart();
}

function clearCart() {
  state.cart = [];
  state.tableNumber = null; state.customerType = null; state.source = null; state.cast = null;
  state.guestCount = 0; state.checkinTime = null;
  updateTableBadge(); renderCart();
}

function renderCart() {
  const c = document.getElementById("cart-items");
  const btn = document.getElementById("btn-checkout");
  if (state.cart.length === 0) {
    c.innerHTML = `<div class="cart-empty">${state.tableNumber ? "商品を選択してください" : "卓番号を選択してください"}</div>`;
    btn.disabled = true;
  } else {
    c.innerHTML = state.cart.map((item) =>
      `<div class="cart-item">
        <span class="item-emoji">${item.emoji}</span>
        <div class="item-info"><div class="item-name">${item.name}</div><div class="item-price">${fmt(item.price)}</div></div>
        <div class="item-qty">
          <button class="qty-btn minus" data-id="${item.id}" data-delta="-1">−</button>
          <span class="qty-count">${item.qty}</span>
          <button class="qty-btn plus" data-id="${item.id}" data-delta="1">+</button>
        </div>
        <div class="item-total">${fmt(item.price * item.qty)}</div>
      </div>`
    ).join("");
    btn.disabled = false;
    c.querySelectorAll(".qty-btn").forEach((b) => { b.addEventListener("click", () => updateQty(parseInt(b.dataset.id), parseInt(b.dataset.delta))); });
  }
  document.getElementById("subtotal").textContent = fmt(getCartSubtotal());
  document.getElementById("tax").textContent = fmt(getCartTax());
  document.getElementById("sc").textContent = fmt(getCartSC());
  const cfr = document.getElementById("card-fee-row");
  if (state.paymentMethod === "card" && state.cart.length > 0) { cfr.classList.remove("hidden"); document.getElementById("card-fee").textContent = fmt(getCartCardFee()); }
  else cfr.classList.add("hidden");
  document.getElementById("total").textContent = fmt(getCartTotal());
  updateMobileBadge();
}

document.getElementById("btn-clear-cart").addEventListener("click", clearCart);

// ============================
// Checkout
// ============================
function openCheckout() {
  document.getElementById("modal-checkout").classList.remove("hidden");
  document.getElementById("checkout-amount").textContent = fmt(getCartTotal());
  document.getElementById("checkout-card-fee").classList.toggle("hidden", state.paymentMethod !== "card");
  state.receivedAmount = "";
  updatePaymentUI(); updateReceivedDisplay();
  lockScroll();
}
function closeCheckout() { document.getElementById("modal-checkout").classList.add("hidden"); unlockScroll(); }
document.getElementById("btn-checkout").addEventListener("click", openCheckout);
document.getElementById("btn-close-checkout").addEventListener("click", closeCheckout);

document.querySelectorAll(".payment-btn").forEach((b) => {
  b.addEventListener("click", () => { state.paymentMethod = b.dataset.method; renderCart(); updatePaymentUI(); });
});

function updatePaymentUI() {
  document.querySelectorAll(".payment-btn").forEach((b) => b.classList.toggle("active", b.dataset.method === state.paymentMethod));
  document.getElementById("checkout-amount").textContent = fmt(getCartTotal());
  document.getElementById("checkout-card-fee").classList.toggle("hidden", state.paymentMethod !== "card");
  const cs = document.getElementById("cash-input-section");
  if (state.paymentMethod === "cash") { cs.classList.remove("hidden"); document.getElementById("btn-confirm-payment").disabled = !canPay(); }
  else { cs.classList.add("hidden"); document.getElementById("btn-confirm-payment").disabled = false; }
}

document.querySelectorAll(".num-btn").forEach((b) => {
  b.addEventListener("click", () => {
    const v = b.dataset.val;
    if (v === "del") state.receivedAmount = state.receivedAmount.slice(0, -1);
    else if (state.receivedAmount.length < 8) state.receivedAmount += v;
    updateReceivedDisplay();
  });
});
document.querySelectorAll(".quick-btn:not(.exact)").forEach((b) => { b.addEventListener("click", () => { state.receivedAmount = b.dataset.amount; updateReceivedDisplay(); }); });
document.getElementById("btn-exact").addEventListener("click", () => { state.receivedAmount = getCartTotal().toString(); updateReceivedDisplay(); });

function updateReceivedDisplay() {
  const a = parseInt(state.receivedAmount) || 0;
  document.getElementById("received-display").textContent = fmt(a);
  const ch = a - getCartTotal();
  const cd = document.getElementById("change-display");
  if (ch < 0) { cd.classList.add("negative"); document.getElementById("change-amount").textContent = "−" + fmt(Math.abs(ch)); }
  else { cd.classList.remove("negative"); document.getElementById("change-amount").textContent = fmt(ch); }
  document.getElementById("btn-confirm-payment").disabled = !canPay();
}
function canPay() { return state.paymentMethod !== "cash" || (parseInt(state.receivedAmount) || 0) >= getCartTotal(); }

document.getElementById("btn-confirm-payment").addEventListener("click", () => {
  const total = getCartTotal();
  const received = state.paymentMethod === "cash" ? parseInt(state.receivedAmount) || 0 : total;
  state.orderCounter++;
  const order = {
    id: state.orderCounter,
    items: state.cart.map((i) => ({ ...i })),
    subtotal: getCartSubtotal(), tax: getCartTax(), sc: getCartSC(), cardFee: getCartCardFee(),
    total, received, change: Math.max(0, received - total),
    method: state.paymentMethod, scEnabled: state.scEnabled,
    tableNumber: state.tableNumber, customerType: state.customerType,
    source: state.source, cast: state.cast,
    guestCount: state.guestCount,
    checkinTime: state.checkinTime,
    checkoutTime: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };
  state.orders.push(order);
  saveOrders();
  closeCheckout();
  showReceipt(order);
});

// ============================
// Receipt
// ============================
function showReceipt(order) {
  const itemsH = order.items.map((i) => `<div class="receipt-item"><span>${i.name} x${i.qty}</span><span>${fmt(i.price*i.qty)}</span></div>`).join("");
  const scH = order.scEnabled ? `<div class="receipt-item"><span>SC (15%)</span><span>${fmt(order.sc)}</span></div>` : "";
  const cfH = order.cardFee > 0 ? `<div class="receipt-item"><span>カード手数料 (8%)</span><span>${fmt(order.cardFee)}</span></div>` : "";
  let infoH = `<div class="receipt-cast">🪑 卓${order.tableNumber} ｜ ${order.guestCount}名`;
  if (order.customerType === "new") infoH += ` ｜ 🆕 新規 (${order.source})`;
  if (order.cast) infoH += ` ｜ 👑 ${order.cast}`;
  const cin = order.checkinTime ? fmtDT(order.checkinTime) : "";
  const cout = order.checkoutTime ? fmtDT(order.checkoutTime) : "";
  if (cin) infoH += `<br>⏰ ${cin} → ${cout}`;
  infoH += `</div>`;

  document.getElementById("receipt-content").innerHTML = `
    <div class="receipt-header"><div class="shop-name">Gift</div><div class="shop-info">ご来店ありがとうございます</div></div>
    ${infoH}
    <div class="receipt-items">${itemsH}</div>
    <div class="receipt-totals">
      <div class="receipt-item"><span>小計</span><span>${fmt(order.subtotal)}</span></div>
      <div class="receipt-item"><span>TAX (10%)</span><span>${fmt(order.tax)}</span></div>
      ${scH}${cfH}
      <div class="receipt-item receipt-grand-total"><span>合計</span><span>${fmt(order.total)}</span></div>
    </div>
    <div class="receipt-payment">
      <div class="receipt-item"><span>${getML(order.method)}</span><span>${fmt(order.received)}</span></div>
      ${order.method==="cash"?`<div class="receipt-item"><span>おつり</span><span>${fmt(order.change)}</span></div>`:""}
    </div>
    <div class="receipt-footer">No. #${order.id.toString().padStart(4,"0")}<br>${fmtDT(order.timestamp)}<br>またのご来店をお待ちしております</div>`;
  document.getElementById("modal-receipt").classList.remove("hidden");
  lockScroll();
}

document.getElementById("btn-close-receipt").addEventListener("click", () => { document.getElementById("modal-receipt").classList.add("hidden"); unlockScroll(); clearCart(); closeMobileCart(); });
document.getElementById("btn-done").addEventListener("click", () => { document.getElementById("modal-receipt").classList.add("hidden"); unlockScroll(); clearCart(); closeMobileCart(); });
document.getElementById("btn-print").addEventListener("click", () => window.print());

// ============================
// History
// ============================
function renderHistory() {
  const c = document.getElementById("history-list");
  const orders = [...state.orders].reverse();
  if (orders.length === 0) { c.innerHTML = '<div class="empty-state">まだ注文履歴がありません</div>'; return; }

  c.innerHTML = orders.map((o) => {
    const items = o.items.map((i) => `${i.name}×${i.qty}`).join("、");
    let badges = "";
    if (o.tableNumber) badges += `<span class="order-table-badge">🪑 卓${o.tableNumber}</span>`;
    if (o.guestCount) badges += `<span class="order-source">👥 ${o.guestCount}名</span>`;
    if (o.cast) badges += `<span class="order-cast">👑 ${o.cast}</span>`;
    if (o.source) badges += `<span class="order-source">${o.source}</span>`;
    const cin = o.checkinTime ? fmtDT(o.checkinTime) : "";
    const cout = o.checkoutTime ? fmtDT(o.checkoutTime) : "";
    const timeStr = cin && cout ? `⏰ ${cin} → ${cout}` : fmtDT(o.timestamp);
    return `<div class="history-item">
      <span class="order-num">#${o.id.toString().padStart(4,"0")}</span>
      <div class="order-detail">
        <div class="order-badges">${badges}</div>
        <div class="order-time">${timeStr}</div>
        <div class="order-items-text">${items}</div>
      </div>
      <span class="order-method">${getML(o.method)}</span>
      <span class="order-total">${fmt(o.total)}</span>
      <button class="btn-delete-order" data-order-id="${o.id}" title="削除">🗑️</button>
    </div>`;
  }).join("");

  c.querySelectorAll(".btn-delete-order").forEach((b) => {
    b.addEventListener("click", () => {
      const id = parseInt(b.dataset.orderId);
      if (confirm(`注文 #${id.toString().padStart(4,"0")} を削除しますか？`)) {
        state.orders = state.orders.filter((o) => o.id !== id);
        saveOrders(); renderHistory();
      }
    });
  });
}

// ============================
// Summary
// ============================
function renderSummary() {
  const orders = state.orders;
  const todayBiz = getBusinessDate();
  const thisMonth = getBusinessMonth();
  const todayOrders = orders.filter((o) => getBusinessDate(o.timestamp) === todayBiz);
  const monthOrders = orders.filter((o) => getBusinessMonth(o.timestamp) === thisMonth);
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const monthSales = monthOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = monthOrders.length > 0 ? Math.round(monthSales / monthOrders.length) : 0;
  const todayGuests = todayOrders.reduce((s, o) => s + (o.guestCount || 0), 0);

  document.getElementById("summary-cards").innerHTML = `
    <div class="summary-card primary"><div class="card-label">本日の売上（20時〜）</div><div class="card-value">${fmt(todaySales)}</div><div class="card-sub">${todayOrders.length}件 / ${todayGuests}名</div></div>
    <div class="summary-card"><div class="card-label">今月の売上</div><div class="card-value">${fmt(monthSales)}</div><div class="card-sub">${monthOrders.length}件</div></div>
    <div class="summary-card"><div class="card-label">平均注文額（今月）</div><div class="card-value">${fmt(avgOrder)}</div></div>
    <div class="summary-card"><div class="card-label">本日の来店数</div><div class="card-value">${todayGuests}名</div><div class="card-sub">${todayOrders.length}組</div></div>`;

  // Category sales
  const catSales = {};
  MENU_DATA.categories.filter((c) => c.id !== "all" && c.id !== "table").forEach((c) => { catSales[c.id] = { name: c.name, emoji: c.emoji, total: 0 }; });
  todayOrders.forEach((o) => o.items.forEach((i) => { if (catSales[i.category]) catSales[i.category].total += i.price * i.qty; }));
  const maxCat = Math.max(...Object.values(catSales).map((c) => c.total), 1);
  document.getElementById("category-sales").innerHTML = Object.values(catSales).sort((a, b) => b.total - a.total)
    .map((c) => `<div class="category-sale-row"><span class="sale-label">${c.emoji} ${c.name}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c.total/maxCat)*100}%"></div></div><span class="sale-amount">${fmt(c.total)}</span></div>`).join("");

  // Popular items
  const ic = {};
  todayOrders.forEach((o) => o.items.forEach((i) => { if (i.price <= 0) return; const k = i.name; if (!ic[k]) ic[k] = { name: i.name, emoji: i.emoji, count: 0, total: 0 }; ic[k].count += i.qty; ic[k].total += i.price*i.qty; }));
  const top5 = Object.values(ic).sort((a, b) => b.count - a.count).slice(0, 5);
  const pc = document.getElementById("popular-items");
  if (top5.length === 0) pc.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else { const rc = ["gold","silver","bronze","",""]; pc.innerHTML = top5.map((i, n) => `<div class="popular-item-row"><span class="popular-rank ${rc[n]}">${n+1}</span><span class="popular-name">${i.emoji} ${i.name}</span><span class="popular-count">${i.count}個</span><span class="popular-total">${fmt(i.total)}</span></div>`).join(""); }

  // Cast sales (subtotal)
  const cs = {};
  todayOrders.forEach((o) => { if (o.cast) { if (!cs[o.cast]) cs[o.cast] = { name: o.cast, subtotal: 0, count: 0 }; cs[o.cast].subtotal += (o.subtotal||0); cs[o.cast].count++; } });
  const cl = Object.values(cs).sort((a, b) => b.subtotal - a.subtotal);
  const cc = document.getElementById("cast-sales");
  if (cl.length === 0) cc.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else { const mx = cl[0].subtotal||1; cc.innerHTML = cl.map((c) => `<div class="category-sale-row"><span class="sale-label">👑 ${c.name}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c.subtotal/mx)*100}%"></div></div><span class="sale-amount">${fmt(c.subtotal)} (${c.count}件)</span></div>`).join(""); }

  // Source stats
  const ss = {};
  todayOrders.forEach((o) => { if (o.source) ss[o.source] = (ss[o.source]||0)+1; if (o.customerType==="repeat") ss["リピーター"] = (ss["リピーター"]||0)+1; });
  const sl = Object.entries(ss).sort((a, b) => b[1]-a[1]);
  const sc = document.getElementById("source-stats");
  if (sl.length === 0) sc.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else { const mx = sl[0][1]||1; sc.innerHTML = sl.map(([n, c]) => `<div class="category-sale-row"><span class="sale-label">${n}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c/mx)*100}%"></div></div><span class="sale-amount">${c}組</span></div>`).join(""); }
}

// ============================
// Mobile Cart
// ============================
const mobileCartBtn = document.getElementById("mobile-cart-btn");
const mobileCartOverlay = document.getElementById("mobile-cart-overlay");
const cartPanel = document.querySelector(".cart-panel");
function openMobileCart() { cartPanel.classList.add("open"); mobileCartOverlay.classList.remove("hidden"); mobileCartBtn.classList.add("hidden"); }
function closeMobileCart() { cartPanel.classList.remove("open"); mobileCartOverlay.classList.add("hidden"); mobileCartBtn.classList.remove("hidden"); }
mobileCartBtn.addEventListener("click", openMobileCart);
mobileCartOverlay.addEventListener("click", closeMobileCart);
function updateMobileBadge() { const b = document.getElementById("mobile-cart-badge"); const c = state.cart.reduce((s, i) => s+i.qty, 0); b.textContent = c; b.classList.toggle("hidden-badge", c===0); }

// ============================
// Init
// ============================
renderCategories();
renderMenu();
renderCart();
updateTableBadge();
