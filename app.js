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
  pendingTableNumber: null,
};

// ============================
// Helpers
// ============================
function formatPrice(n) {
  return (n < 0 ? "−¥" + Math.abs(n).toLocaleString() : "¥" + n.toLocaleString());
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartTax() {
  const sub = getCartSubtotal();
  return sub > 0 ? Math.floor(sub * 0.1) : 0;
}

function getCartSC() {
  if (!state.scEnabled) return 0;
  const sub = getCartSubtotal();
  return sub > 0 ? Math.floor(sub * 0.15) : 0;
}

function getCartCardFee() {
  if (state.paymentMethod !== "card") return 0;
  const base = getCartSubtotal() + getCartTax() + getCartSC();
  return base > 0 ? Math.floor(base * 0.08) : 0;
}

function getCartTotal() {
  return Math.max(0, getCartSubtotal() + getCartTax() + getCartSC() + getCartCardFee());
}

function saveOrders() {
  localStorage.setItem("gift_orders", JSON.stringify(state.orders));
  localStorage.setItem("gift_order_counter", state.orderCounter.toString());
}

function getMethodLabel(method) {
  const labels = { cash: "💴 現金", card: "💳 カード", qr: "📱 QR決済" };
  return labels[method] || method;
}

function padZero(n) {
  return n.toString().padStart(2, "0");
}

function formatTime(date) {
  return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${formatTime(d)}`;
}

// 20時を基準にした「営業日」を取得
function getBusinessDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const adjusted = new Date(d.getTime());
  if (adjusted.getHours() < 20) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  return adjusted.toDateString();
}

// 20時基準の「営業月」を取得（毎月1日20時リセット）
function getBusinessMonth(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const adjusted = new Date(d.getTime());
  if (adjusted.getDate() === 1 && adjusted.getHours() < 20) {
    adjusted.setMonth(adjusted.getMonth() - 1);
  } else if (adjusted.getHours() < 20) {
    // same month
  }
  return `${adjusted.getFullYear()}-${padZero(adjusted.getMonth() + 1)}`;
}

// ============================
// Clock
// ============================
function updateClock() {
  const now = new Date();
  const el = document.getElementById("clock");
  el.textContent = `${now.getFullYear()}/${padZero(now.getMonth() + 1)}/${padZero(now.getDate())} ${formatTime(now)}`;
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
    const view = btn.dataset.view;
    document.querySelectorAll(".main-content").forEach((v) => v.classList.add("hidden"));
    document.getElementById(`view-${view}`).classList.remove("hidden");
    if (view === "history") renderHistory();
    if (view === "summary") renderSummary();
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
// Category Tabs
// ============================
function renderCategories() {
  const container = document.getElementById("category-tabs");
  container.innerHTML = MENU_DATA.categories
    .map(
      (cat) =>
        `<button class="category-tab ${cat.id === state.currentCategory ? "active" : ""}"
                data-category="${cat.id}">${cat.emoji} ${cat.name}</button>`
    )
    .join("");

  container.querySelectorAll(".category-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.currentCategory = tab.dataset.category;
      renderCategories();
      renderMenu();
    });
  });
}

// ============================
// Menu Grid
// ============================
function renderMenu() {
  const container = document.getElementById("menu-grid");

  // 卓番号タブ
  if (state.currentCategory === "table") {
    let html = "";
    for (let i = 1; i <= 12; i++) {
      const isActive = state.tableNumber === i;
      html += `<button class="menu-item table-btn ${isActive ? "table-active" : ""}" data-table="${i}">
        <span class="emoji">🪑</span>
        <span class="name">卓 ${i}</span>
        <span class="price">${isActive ? "✓ 選択中" : "選択"}</span>
      </button>`;
    }
    container.innerHTML = html;
    container.querySelectorAll(".table-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.pendingTableNumber = parseInt(btn.dataset.table);
        openTableModal(state.pendingTableNumber);
      });
    });
    return;
  }

  // その他タブ
  if (state.currentCategory === "other") {
    container.innerHTML =
      `<button class="menu-item menu-item-custom" id="btn-open-custom">
        <span class="emoji">📝</span>
        <span class="name">フリー入力</span>
        <span class="price">自由金額</span>
      </button>`;
    document.getElementById("btn-open-custom").addEventListener("click", openCustomModal);
    return;
  }

  // システムタブ（特別割引ボタン付き）
  let items =
    state.currentCategory === "all"
      ? MENU_DATA.items
      : MENU_DATA.items.filter((i) => i.category === state.currentCategory);

  let html = items
    .map(
      (item) =>
        `<button class="menu-item" data-id="${item.id}">
          <span class="emoji">${item.emoji}</span>
          <span class="name">${item.name}</span>
          <span class="price">${formatPrice(item.price)}</span>
        </button>`
    )
    .join("");

  if (state.currentCategory === "system") {
    html += `<button class="menu-item menu-item-discount" id="btn-open-discount">
      <span class="emoji">🏷️</span>
      <span class="name">特別割引</span>
      <span class="price">金額入力</span>
    </button>`;
  }

  if (state.currentCategory === "all") {
    html += `<button class="menu-item menu-item-custom" id="btn-open-custom-all">
      <span class="emoji">📝</span>
      <span class="name">フリー入力</span>
      <span class="price">自由金額</span>
    </button>`;
  }

  container.innerHTML = html;

  container.querySelectorAll(".menu-item:not(.menu-item-custom):not(.menu-item-discount)").forEach((el) => {
    if (el.dataset.id) {
      el.addEventListener("click", () => {
        if (!state.tableNumber) {
          alert("先に卓番号を選択してください");
          return;
        }
        addToCart(parseInt(el.dataset.id));
      });
    }
  });

  const discountBtn = document.getElementById("btn-open-discount");
  if (discountBtn) {
    discountBtn.addEventListener("click", () => {
      if (!state.tableNumber) { alert("先に卓番号を選択してください"); return; }
      openDiscountModal();
    });
  }

  const customBtn = document.getElementById("btn-open-custom") || document.getElementById("btn-open-custom-all");
  if (customBtn) {
    customBtn.addEventListener("click", () => {
      if (!state.tableNumber) { alert("先に卓番号を選択してください"); return; }
      openCustomModal();
    });
  }
}

// ============================
// Table Selection Modal
// ============================
function lockScroll() {
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.top = `-${window.scrollY}px`;
}

function unlockScroll() {
  const scrollY = document.body.style.top;
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.top = "";
  window.scrollTo(0, 0);
}

function openTableModal(tableNum) {
  document.getElementById("modal-table-title").textContent = `🪑 卓 ${tableNum}`;
  document.getElementById("table-step1").classList.remove("hidden");
  document.getElementById("table-step2-new").classList.add("hidden");
  document.getElementById("table-step2-repeat").classList.add("hidden");
  document.getElementById("table-cast-input").value = "";
  document.getElementById("modal-table").classList.remove("hidden");
  lockScroll();
}

function closeTableModal() {
  document.getElementById("modal-table").classList.add("hidden");
  unlockScroll();
}

function confirmTable(type, source, cast) {
  state.tableNumber = state.pendingTableNumber;
  state.customerType = type;
  state.source = source || null;
  state.cast = cast || null;
  state.cart = [];

  updateTableBadge();
  renderCart();
  closeTableModal();

  state.currentCategory = "system";
  renderCategories();
  renderMenu();

  // モバイルでスクロール位置がずれる問題を修正
  window.scrollTo(0, 0);
  document.querySelector(".menu-grid").scrollTop = 0;
}

function updateTableBadge() {
  const tableBadge = document.getElementById("table-badge");
  const castBadge = document.getElementById("cast-badge");

  if (state.tableNumber) {
    tableBadge.textContent = `🪑 卓${state.tableNumber}`;
    tableBadge.classList.add("active");

    let info = state.customerType === "new" ? "🆕 新規" : "🔄 リピート";
    if (state.source) info += ` (${state.source})`;
    if (state.cast) info = `👑 ${state.cast}`;
    castBadge.textContent = info;
  } else {
    tableBadge.textContent = "卓未選択";
    tableBadge.classList.remove("active");
    castBadge.textContent = "";
  }
}

document.getElementById("btn-close-table").addEventListener("click", closeTableModal);

document.getElementById("btn-type-new").addEventListener("click", () => {
  document.getElementById("table-step1").classList.add("hidden");
  document.getElementById("table-step2-new").classList.remove("hidden");
});

document.getElementById("btn-type-repeat").addEventListener("click", () => {
  document.getElementById("table-step1").classList.add("hidden");
  document.getElementById("table-step2-repeat").classList.remove("hidden");
  document.getElementById("table-cast-input").focus();
});

document.querySelectorAll(".source-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    confirmTable("new", btn.dataset.source, null);
  });
});

document.getElementById("btn-confirm-cast").addEventListener("click", () => {
  const castName = document.getElementById("table-cast-input").value.trim();
  if (!castName) { alert("キャスト名を入力してください"); return; }
  confirmTable("repeat", null, castName);
});

document.getElementById("btn-free-repeat").addEventListener("click", () => {
  confirmTable("repeat", null, null);
});

// ============================
// Discount Modal
// ============================
function openDiscountModal() {
  document.getElementById("modal-discount").classList.remove("hidden");
  document.getElementById("discount-price").value = "";
  document.getElementById("discount-price").focus();
}

document.getElementById("btn-close-discount").addEventListener("click", () => {
  document.getElementById("modal-discount").classList.add("hidden");
});

document.getElementById("btn-add-discount").addEventListener("click", () => {
  const price = parseInt(document.getElementById("discount-price").value) || 0;
  if (price <= 0) { alert("割引金額を入力してください"); return; }
  state.customIdCounter++;
  state.cart.push({
    id: state.customIdCounter,
    name: "特別割引",
    price: -price,
    category: "system",
    emoji: "🏷️",
    qty: 1,
    isCustom: true,
  });
  renderCart();
  document.getElementById("modal-discount").classList.add("hidden");
});

// ============================
// Custom Item Modal
// ============================
function openCustomModal() {
  document.getElementById("modal-custom").classList.remove("hidden");
  document.getElementById("custom-name").value = "";
  document.getElementById("custom-price").value = "";
  document.getElementById("custom-name").focus();
}

document.getElementById("btn-close-custom").addEventListener("click", () => {
  document.getElementById("modal-custom").classList.add("hidden");
});

document.getElementById("btn-add-custom").addEventListener("click", () => {
  const name = document.getElementById("custom-name").value.trim();
  const price = parseInt(document.getElementById("custom-price").value) || 0;
  if (!name || price <= 0) { alert("商品名と金額を入力してください"); return; }
  state.customIdCounter++;
  state.cart.push({
    id: state.customIdCounter,
    name: name,
    price: price,
    category: "other",
    emoji: "📝",
    qty: 1,
    isCustom: true,
  });
  renderCart();
  document.getElementById("modal-custom").classList.add("hidden");
});

// ============================
// Cart
// ============================
function addToCart(itemId) {
  const menuItem = MENU_DATA.items.find((i) => i.id === itemId);
  if (!menuItem) return;
  const existing = state.cart.find((i) => i.id === itemId);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ ...menuItem, qty: 1 });
  }
  renderCart();
}

function updateQty(itemId, delta) {
  const item = state.cart.find((i) => i.id === itemId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((i) => i.id !== itemId);
  }
  renderCart();
}

function clearCart() {
  state.cart = [];
  state.tableNumber = null;
  state.customerType = null;
  state.source = null;
  state.cast = null;
  updateTableBadge();
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const btnCheckout = document.getElementById("btn-checkout");

  if (state.cart.length === 0) {
    container.innerHTML = `<div class="cart-empty">${state.tableNumber ? "商品を選択してください" : "卓番号を選択してください"}</div>`;
    btnCheckout.disabled = true;
  } else {
    container.innerHTML = state.cart
      .map(
        (item) =>
          `<div class="cart-item ${item.price < 0 ? "cart-item-discount" : ""}">
            <span class="item-emoji">${item.emoji}</span>
            <div class="item-info">
              <div class="item-name">${item.name}</div>
              <div class="item-price">${formatPrice(item.price)}</div>
            </div>
            <div class="item-qty">
              <button class="qty-btn minus" data-id="${item.id}" data-delta="-1">−</button>
              <span class="qty-count">${item.qty}</span>
              <button class="qty-btn plus" data-id="${item.id}" data-delta="1">+</button>
            </div>
            <div class="item-total">${formatPrice(item.price * item.qty)}</div>
          </div>`
      )
      .join("");
    btnCheckout.disabled = false;

    container.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        updateQty(parseInt(btn.dataset.id), parseInt(btn.dataset.delta));
      });
    });
  }

  document.getElementById("subtotal").textContent = formatPrice(getCartSubtotal());
  document.getElementById("tax").textContent = formatPrice(getCartTax());
  document.getElementById("sc").textContent = formatPrice(getCartSC());

  const cardFeeRow = document.getElementById("card-fee-row");
  if (state.paymentMethod === "card" && state.cart.length > 0) {
    cardFeeRow.classList.remove("hidden");
    document.getElementById("card-fee").textContent = formatPrice(getCartCardFee());
  } else {
    cardFeeRow.classList.add("hidden");
  }

  document.getElementById("total").textContent = formatPrice(getCartTotal());
  updateMobileBadge();
}

document.getElementById("btn-clear-cart").addEventListener("click", clearCart);

// ============================
// Checkout Modal
// ============================
function openCheckout() {
  const modal = document.getElementById("modal-checkout");
  modal.classList.remove("hidden");
  document.getElementById("checkout-amount").textContent = formatPrice(getCartTotal());
  const cardFeeNotice = document.getElementById("checkout-card-fee");
  cardFeeNotice.classList.toggle("hidden", state.paymentMethod !== "card");
  state.receivedAmount = "";
  updatePaymentUI();
  updateReceivedDisplay();
}

function closeCheckout() {
  document.getElementById("modal-checkout").classList.add("hidden");
}

document.getElementById("btn-checkout").addEventListener("click", openCheckout);
document.getElementById("btn-close-checkout").addEventListener("click", closeCheckout);

document.querySelectorAll(".payment-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.paymentMethod = btn.dataset.method;
    renderCart();
    updatePaymentUI();
  });
});

function updatePaymentUI() {
  document.querySelectorAll(".payment-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.method === state.paymentMethod);
  });
  const cashSection = document.getElementById("cash-input-section");
  const confirmBtn = document.getElementById("btn-confirm-payment");
  const cardFeeNotice = document.getElementById("checkout-card-fee");
  document.getElementById("checkout-amount").textContent = formatPrice(getCartTotal());
  cardFeeNotice.classList.toggle("hidden", state.paymentMethod !== "card");

  if (state.paymentMethod === "cash") {
    cashSection.classList.remove("hidden");
    confirmBtn.disabled = !canConfirmPayment();
  } else {
    cashSection.classList.add("hidden");
    confirmBtn.disabled = false;
  }
}

document.querySelectorAll(".num-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.dataset.val;
    if (val === "del") {
      state.receivedAmount = state.receivedAmount.slice(0, -1);
    } else {
      if (state.receivedAmount.length < 8) state.receivedAmount += val;
    }
    updateReceivedDisplay();
  });
});

document.querySelectorAll(".quick-btn:not(.exact)").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.receivedAmount = btn.dataset.amount;
    updateReceivedDisplay();
  });
});

document.getElementById("btn-exact").addEventListener("click", () => {
  state.receivedAmount = getCartTotal().toString();
  updateReceivedDisplay();
});

function updateReceivedDisplay() {
  const amount = parseInt(state.receivedAmount) || 0;
  document.getElementById("received-display").textContent = formatPrice(amount);
  const change = amount - getCartTotal();
  const changeDisplay = document.getElementById("change-display");
  document.getElementById("change-amount").textContent = formatPrice(Math.abs(change));
  if (change < 0) {
    changeDisplay.classList.add("negative");
    document.getElementById("change-amount").textContent = "−" + formatPrice(Math.abs(change));
  } else {
    changeDisplay.classList.remove("negative");
  }
  document.getElementById("btn-confirm-payment").disabled = !canConfirmPayment();
}

function canConfirmPayment() {
  if (state.paymentMethod !== "cash") return true;
  return (parseInt(state.receivedAmount) || 0) >= getCartTotal();
}

document.getElementById("btn-confirm-payment").addEventListener("click", () => {
  const total = getCartTotal();
  const received = state.paymentMethod === "cash" ? parseInt(state.receivedAmount) || 0 : total;

  state.orderCounter++;
  const order = {
    id: state.orderCounter,
    items: state.cart.map((i) => ({ ...i })),
    subtotal: getCartSubtotal(),
    tax: getCartTax(),
    sc: getCartSC(),
    cardFee: getCartCardFee(),
    total,
    received,
    change: Math.max(0, received - total),
    method: state.paymentMethod,
    scEnabled: state.scEnabled,
    tableNumber: state.tableNumber,
    customerType: state.customerType,
    source: state.source,
    cast: state.cast,
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
  const content = document.getElementById("receipt-content");
  const itemsHtml = order.items
    .map((i) => `<div class="receipt-item"><span>${i.name} x${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>`)
    .join("");

  const scHtml = order.scEnabled ? `<div class="receipt-item"><span>SC (15%)</span><span>${formatPrice(order.sc)}</span></div>` : "";
  const cardFeeHtml = order.cardFee > 0 ? `<div class="receipt-item"><span>カード手数料 (8%)</span><span>${formatPrice(order.cardFee)}</span></div>` : "";

  let infoHtml = `<div class="receipt-cast">🪑 卓${order.tableNumber}`;
  if (order.customerType === "new") infoHtml += ` ｜ 🆕 新規 (${order.source})`;
  if (order.cast) infoHtml += ` ｜ 👑 ${order.cast}`;
  infoHtml += `</div>`;

  content.innerHTML = `
    <div class="receipt-header">
      <div class="shop-name">Gift</div>
      <div class="shop-info">ご来店ありがとうございます</div>
    </div>
    ${infoHtml}
    <div class="receipt-items">${itemsHtml}</div>
    <div class="receipt-totals">
      <div class="receipt-item"><span>小計</span><span>${formatPrice(order.subtotal)}</span></div>
      <div class="receipt-item"><span>TAX (10%)</span><span>${formatPrice(order.tax)}</span></div>
      ${scHtml}${cardFeeHtml}
      <div class="receipt-item receipt-grand-total"><span>合計</span><span>${formatPrice(order.total)}</span></div>
    </div>
    <div class="receipt-payment">
      <div class="receipt-item"><span>${getMethodLabel(order.method)}</span><span>${formatPrice(order.received)}</span></div>
      ${order.method === "cash" ? `<div class="receipt-item"><span>おつり</span><span>${formatPrice(order.change)}</span></div>` : ""}
    </div>
    <div class="receipt-footer">No. #${order.id.toString().padStart(4, "0")}<br>${formatDateTime(order.timestamp)}<br>またのご来店をお待ちしております</div>
  `;
  document.getElementById("modal-receipt").classList.remove("hidden");
}

document.getElementById("btn-close-receipt").addEventListener("click", () => {
  document.getElementById("modal-receipt").classList.add("hidden");
  clearCart();
  closeMobileCart();
});
document.getElementById("btn-done").addEventListener("click", () => {
  document.getElementById("modal-receipt").classList.add("hidden");
  clearCart();
  closeMobileCart();
});
document.getElementById("btn-print").addEventListener("click", () => window.print());

// ============================
// History
// ============================
function renderHistory() {
  const container = document.getElementById("history-list");
  const orders = [...state.orders].reverse();

  if (orders.length === 0) {
    container.innerHTML = '<div class="empty-state">まだ注文履歴がありません</div>';
    return;
  }

  container.innerHTML = orders
    .map((order) => {
      const itemsText = order.items.map((i) => `${i.name}×${i.qty}`).join("、");
      let badges = "";
      if (order.tableNumber) badges += `<span class="order-table-badge">🪑 卓${order.tableNumber}</span>`;
      if (order.cast) badges += `<span class="order-cast">👑 ${order.cast}</span>`;
      if (order.source) badges += `<span class="order-source">${order.source}</span>`;
      return `
        <div class="history-item">
          <span class="order-num">#${order.id.toString().padStart(4, "0")}</span>
          <div class="order-detail">
            <div class="order-badges">${badges}</div>
            <div class="order-items-text">${itemsText}</div>
            <div class="order-time">${formatDateTime(order.timestamp)}</div>
          </div>
          <span class="order-method">${getMethodLabel(order.method)}</span>
          <span class="order-total">${formatPrice(order.total)}</span>
          <button class="btn-delete-order" data-order-id="${order.id}" title="削除">🗑️</button>
        </div>`;
    })
    .join("");

  container.querySelectorAll(".btn-delete-order").forEach((btn) => {
    btn.addEventListener("click", () => {
      const orderId = parseInt(btn.dataset.orderId);
      if (confirm(`注文 #${orderId.toString().padStart(4, "0")} を削除しますか？\nこの操作は取り消せません。`)) {
        state.orders = state.orders.filter((o) => o.id !== orderId);
        saveOrders();
        renderHistory();
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

  document.getElementById("summary-cards").innerHTML = `
    <div class="summary-card primary">
      <div class="card-label">本日の売上（20時〜）</div>
      <div class="card-value">${formatPrice(todaySales)}</div>
      <div class="card-sub">${todayOrders.length}件</div>
    </div>
    <div class="summary-card">
      <div class="card-label">今月の売上</div>
      <div class="card-value">${formatPrice(monthSales)}</div>
      <div class="card-sub">${monthOrders.length}件</div>
    </div>
    <div class="summary-card">
      <div class="card-label">平均注文額（今月）</div>
      <div class="card-value">${formatPrice(avgOrder)}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">本日の注文数</div>
      <div class="card-value">${todayOrders.length}</div>
    </div>
  `;

  // Category sales
  const categorySales = {};
  MENU_DATA.categories.filter((c) => c.id !== "all" && c.id !== "table").forEach((c) => {
    categorySales[c.id] = { name: c.name, emoji: c.emoji, total: 0 };
  });
  todayOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (categorySales[item.category]) categorySales[item.category].total += item.price * item.qty;
    });
  });
  const maxCat = Math.max(...Object.values(categorySales).map((c) => c.total), 1);
  document.getElementById("category-sales").innerHTML = Object.values(categorySales)
    .sort((a, b) => b.total - a.total)
    .map((cat) => `<div class="category-sale-row"><span class="sale-label">${cat.emoji} ${cat.name}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(cat.total / maxCat) * 100}%"></div></div><span class="sale-amount">${formatPrice(cat.total)}</span></div>`)
    .join("");

  // Popular items
  const itemCounts = {};
  todayOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.price < 0) return;
      const key = item.name;
      if (!itemCounts[key]) itemCounts[key] = { name: item.name, emoji: item.emoji, count: 0, total: 0 };
      itemCounts[key].count += item.qty;
      itemCounts[key].total += item.price * item.qty;
    });
  });
  const top5 = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);
  const popContainer = document.getElementById("popular-items");
  if (top5.length === 0) {
    popContainer.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  } else {
    const rankClass = ["gold", "silver", "bronze", "", ""];
    popContainer.innerHTML = top5.map((item, i) =>
      `<div class="popular-item-row"><span class="popular-rank ${rankClass[i]}">${i + 1}</span><span class="popular-name">${item.emoji} ${item.name}</span><span class="popular-count">${item.count}個</span><span class="popular-total">${formatPrice(item.total)}</span></div>`
    ).join("");
  }

  // Cast sales (小計ベース)
  const castSales = {};
  todayOrders.forEach((order) => {
    if (order.cast) {
      if (!castSales[order.cast]) castSales[order.cast] = { name: order.cast, subtotal: 0, count: 0 };
      castSales[order.cast].subtotal += (order.subtotal || 0);
      castSales[order.cast].count++;
    }
  });
  const castContainer = document.getElementById("cast-sales");
  const castList = Object.values(castSales).sort((a, b) => b.subtotal - a.subtotal);
  if (castList.length === 0) {
    castContainer.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  } else {
    const maxCast = castList[0].subtotal || 1;
    castContainer.innerHTML = castList.map((c) =>
      `<div class="category-sale-row"><span class="sale-label">👑 ${c.name}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c.subtotal / maxCast) * 100}%"></div></div><span class="sale-amount">${formatPrice(c.subtotal)} (${c.count}件)</span></div>`
    ).join("");
  }

  // Source stats
  const sourceCounts = {};
  todayOrders.forEach((order) => {
    if (order.source) {
      sourceCounts[order.source] = (sourceCounts[order.source] || 0) + 1;
    }
    if (order.customerType === "repeat") {
      sourceCounts["リピーター"] = (sourceCounts["リピーター"] || 0) + 1;
    }
  });
  const srcContainer = document.getElementById("source-stats");
  const srcList = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  if (srcList.length === 0) {
    srcContainer.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  } else {
    const maxSrc = srcList[0][1] || 1;
    srcContainer.innerHTML = srcList.map(([name, count]) =>
      `<div class="category-sale-row"><span class="sale-label">${name}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(count / maxSrc) * 100}%"></div></div><span class="sale-amount">${count}組</span></div>`
    ).join("");
  }
}

// ============================
// Mobile Cart
// ============================
const mobileCartBtn = document.getElementById("mobile-cart-btn");
const mobileCartOverlay = document.getElementById("mobile-cart-overlay");
const cartPanel = document.querySelector(".cart-panel");

function openMobileCart() {
  cartPanel.classList.add("open");
  mobileCartOverlay.classList.remove("hidden");
  mobileCartBtn.classList.add("hidden");
}
function closeMobileCart() {
  cartPanel.classList.remove("open");
  mobileCartOverlay.classList.add("hidden");
  mobileCartBtn.classList.remove("hidden");
}
mobileCartBtn.addEventListener("click", openMobileCart);
mobileCartOverlay.addEventListener("click", closeMobileCart);

function updateMobileBadge() {
  const badge = document.getElementById("mobile-cart-badge");
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
  badge.classList.toggle("hidden-badge", count === 0);
}

// ============================
// Init
// ============================
renderCategories();
renderMenu();
renderCart();
updateTableBadge();
