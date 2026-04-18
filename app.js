// ============================
// State
// ============================
const state = {
  cart: [],
  currentCategory: "all",
  orders: JSON.parse(localStorage.getItem("gift_orders") || "[]"),
  orderCounter: parseInt(localStorage.getItem("gift_order_counter") || "0"),
  receivedAmount: "",
  paymentMethod: "cash",
  scEnabled: true,
};

// ============================
// Helpers
// ============================
function formatPrice(n) {
  return "¥" + n.toLocaleString();
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartTax() {
  return Math.floor(getCartSubtotal() * 0.1);
}

function getCartSC() {
  if (!state.scEnabled) return 0;
  return Math.floor(getCartSubtotal() * 0.15);
}

function getCartTotal() {
  return getCartSubtotal() + getCartTax() + getCartSC();
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
  const items =
    state.currentCategory === "all"
      ? MENU_DATA.items
      : MENU_DATA.items.filter((i) => i.category === state.currentCategory);

  container.innerHTML = items
    .map(
      (item) =>
        `<button class="menu-item" data-id="${item.id}">
          <span class="emoji">${item.emoji}</span>
          <span class="name">${item.name}</span>
          <span class="price">${formatPrice(item.price)}</span>
        </button>`
    )
    .join("");

  container.querySelectorAll(".menu-item").forEach((el) => {
    el.addEventListener("click", () => addToCart(parseInt(el.dataset.id)));
  });
}

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
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const btnCheckout = document.getElementById("btn-checkout");

  if (state.cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">商品を選択してください</div>';
    btnCheckout.disabled = true;
  } else {
    container.innerHTML = state.cart
      .map(
        (item) =>
          `<div class="cart-item">
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
  document.getElementById("total").textContent = formatPrice(getCartTotal());
}

document.getElementById("btn-clear-cart").addEventListener("click", clearCart);

// ============================
// Checkout Modal
// ============================
function openCheckout() {
  const modal = document.getElementById("modal-checkout");
  modal.classList.remove("hidden");
  document.getElementById("checkout-amount").textContent = formatPrice(getCartTotal());
  state.receivedAmount = "";
  state.paymentMethod = "cash";
  updatePaymentUI();
  updateReceivedDisplay();
}

function closeCheckout() {
  document.getElementById("modal-checkout").classList.add("hidden");
}

document.getElementById("btn-checkout").addEventListener("click", openCheckout);
document.getElementById("btn-close-checkout").addEventListener("click", closeCheckout);

// Payment method
document.querySelectorAll(".payment-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.paymentMethod = btn.dataset.method;
    updatePaymentUI();
  });
});

function updatePaymentUI() {
  document.querySelectorAll(".payment-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.method === state.paymentMethod);
  });

  const cashSection = document.getElementById("cash-input-section");
  const confirmBtn = document.getElementById("btn-confirm-payment");

  if (state.paymentMethod === "cash") {
    cashSection.classList.remove("hidden");
    confirmBtn.disabled = !canConfirmPayment();
  } else {
    cashSection.classList.add("hidden");
    confirmBtn.disabled = false;
  }
}

// Numpad
document.querySelectorAll(".num-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.dataset.val;
    if (val === "del") {
      state.receivedAmount = state.receivedAmount.slice(0, -1);
    } else {
      if (state.receivedAmount.length < 8) {
        state.receivedAmount += val;
      }
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
  const received = parseInt(state.receivedAmount) || 0;
  return received >= getCartTotal();
}

// Confirm payment
document.getElementById("btn-confirm-payment").addEventListener("click", () => {
  const total = getCartTotal();
  const received = state.paymentMethod === "cash" ? parseInt(state.receivedAmount) || 0 : total;
  const change = received - total;

  state.orderCounter++;
  const order = {
    id: state.orderCounter,
    items: state.cart.map((i) => ({ ...i })),
    subtotal: getCartSubtotal(),
    tax: getCartTax(),
    sc: getCartSC(),
    total,
    received,
    change: Math.max(0, change),
    method: state.paymentMethod,
    scEnabled: state.scEnabled,
    timestamp: new Date().toISOString(),
  };

  state.orders.push(order);
  saveOrders();

  closeCheckout();
  showReceipt(order);
});

// ============================
// Receipt Modal
// ============================
function showReceipt(order) {
  const modal = document.getElementById("modal-receipt");
  const content = document.getElementById("receipt-content");

  const itemsHtml = order.items
    .map(
      (i) =>
        `<div class="receipt-item">
          <span>${i.name} x${i.qty}</span>
          <span>${formatPrice(i.price * i.qty)}</span>
        </div>`
    )
    .join("");

  const scHtml = order.scEnabled
    ? `<div class="receipt-item"><span>SC (15%)</span><span>${formatPrice(order.sc)}</span></div>`
    : "";

  content.innerHTML = `
    <div class="receipt-header">
      <div class="shop-name">Gift</div>
      <div class="shop-info">ご来店ありがとうございます</div>
    </div>
    <div class="receipt-items">${itemsHtml}</div>
    <div class="receipt-totals">
      <div class="receipt-item">
        <span>小計</span>
        <span>${formatPrice(order.subtotal)}</span>
      </div>
      <div class="receipt-item">
        <span>TAX (10%)</span>
        <span>${formatPrice(order.tax)}</span>
      </div>
      ${scHtml}
      <div class="receipt-item receipt-grand-total">
        <span>合計</span>
        <span>${formatPrice(order.total)}</span>
      </div>
    </div>
    <div class="receipt-payment">
      <div class="receipt-item">
        <span>${getMethodLabel(order.method)}</span>
        <span>${formatPrice(order.received)}</span>
      </div>
      ${order.method === "cash" ? `<div class="receipt-item"><span>おつり</span><span>${formatPrice(order.change)}</span></div>` : ""}
    </div>
    <div class="receipt-footer">
      No. #${order.id.toString().padStart(4, "0")}<br>
      ${formatDateTime(order.timestamp)}<br>
      またのご来店をお待ちしております
    </div>
  `;

  modal.classList.remove("hidden");
}

document.getElementById("btn-close-receipt").addEventListener("click", () => {
  document.getElementById("modal-receipt").classList.add("hidden");
  clearCart();
});

document.getElementById("btn-done").addEventListener("click", () => {
  document.getElementById("modal-receipt").classList.add("hidden");
  clearCart();
});

document.getElementById("btn-print").addEventListener("click", () => {
  window.print();
});

// ============================
// History View
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
      return `
        <div class="history-item">
          <span class="order-num">#${order.id.toString().padStart(4, "0")}</span>
          <div class="order-detail">
            <div class="order-items-text">${itemsText}</div>
            <div class="order-time">${formatDateTime(order.timestamp)}</div>
          </div>
          <span class="order-method">${getMethodLabel(order.method)}</span>
          <span class="order-total">${formatPrice(order.total)}</span>
        </div>`;
    })
    .join("");
}

// ============================
// Summary View
// ============================
function renderSummary() {
  const orders = state.orders;
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.timestamp).toDateString() === today);

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = orders.length > 0 ? Math.round(totalSales / orders.length) : 0;

  const cardsContainer = document.getElementById("summary-cards");
  cardsContainer.innerHTML = `
    <div class="summary-card primary">
      <div class="card-label">本日の売上</div>
      <div class="card-value">${formatPrice(todaySales)}</div>
      <div class="card-sub">${todayOrders.length}件の注文</div>
    </div>
    <div class="summary-card">
      <div class="card-label">累計売上</div>
      <div class="card-value">${formatPrice(totalSales)}</div>
      <div class="card-sub">${orders.length}件の注文</div>
    </div>
    <div class="summary-card">
      <div class="card-label">平均注文額</div>
      <div class="card-value">${formatPrice(avgOrder)}</div>
    </div>
    <div class="summary-card">
      <div class="card-label">本日の注文数</div>
      <div class="card-value">${todayOrders.length}</div>
    </div>
  `;

  // Category sales
  const categorySales = {};
  MENU_DATA.categories.filter((c) => c.id !== "all").forEach((c) => {
    categorySales[c.id] = { name: c.name, emoji: c.emoji, total: 0 };
  });
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (categorySales[item.category]) {
        categorySales[item.category].total += item.price * item.qty;
      }
    });
  });
  const maxCatSales = Math.max(...Object.values(categorySales).map((c) => c.total), 1);
  const catContainer = document.getElementById("category-sales");
  catContainer.innerHTML = Object.values(categorySales)
    .sort((a, b) => b.total - a.total)
    .map(
      (cat) =>
        `<div class="category-sale-row">
          <span class="sale-label">${cat.emoji} ${cat.name}</span>
          <div class="sale-bar-container">
            <div class="sale-bar" style="width: ${(cat.total / maxCatSales) * 100}%"></div>
          </div>
          <span class="sale-amount">${formatPrice(cat.total)}</span>
        </div>`
    )
    .join("");

  // Popular items
  const itemCounts = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (!itemCounts[item.id]) {
        itemCounts[item.id] = { name: item.name, emoji: item.emoji, count: 0, total: 0 };
      }
      itemCounts[item.id].count += item.qty;
      itemCounts[item.id].total += item.price * item.qty;
    });
  });
  const top5 = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const popContainer = document.getElementById("popular-items");

  if (top5.length === 0) {
    popContainer.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  } else {
    const rankClass = ["gold", "silver", "bronze", "", ""];
    popContainer.innerHTML = top5
      .map(
        (item, i) =>
          `<div class="popular-item-row">
            <span class="popular-rank ${rankClass[i]}">${i + 1}</span>
            <span class="popular-name">${item.emoji} ${item.name}</span>
            <span class="popular-count">${item.count}個</span>
            <span class="popular-total">${formatPrice(item.total)}</span>
          </div>`
      )
      .join("");
  }
}

// ============================
// Init
// ============================
renderCategories();
renderMenu();
renderCart();
