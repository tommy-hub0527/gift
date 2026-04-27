// ============================
// Constants & Storage
// ============================
const CAST_LIST_KEY = "gift_cast_names";
const SESSION_KEY = "gift_table_sessions_v2";

function loadCastList() {
  try { return JSON.parse(localStorage.getItem(CAST_LIST_KEY) || "[]"); } catch { return []; }
}
function saveCastList(arr) {
  localStorage.setItem(CAST_LIST_KEY, JSON.stringify(arr));
}
function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}"); } catch { return {}; }
}
function saveSessions(obj) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(obj));
}

function genUkey() {
  return "L" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

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
  castsArr: [],
  guestCount: 0,
  checkinTime: null,
  pendingTableNumber: null,
  pendingType: null,
  pendingSource: null,
  pendingRepeatCasts: [],
  confirmItem: null,
  confirmQty: 1,
  pendingAddItem: null,
  pendingAddQty: 1,
};

const fmt = (n) => (n < 0 ? "−¥" + Math.abs(n).toLocaleString() : "¥" + n.toLocaleString());
const pz = (n) => n.toString().padStart(2, "0");
const fmtTime = (d) => `${pz(d.getHours())}:${pz(d.getMinutes())}`;
const fmtDT = (s) => { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()} ${fmtTime(d)}`; };

function getCartSubtotal() {
  return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
}
function getCartTax() {
  const s = getCartSubtotal();
  return s > 0 ? Math.floor(s * 0.1) : 0;
}
function getCartSC() {
  return state.scEnabled && getCartSubtotal() > 0 ? Math.floor(getCartSubtotal() * 0.15) : 0;
}
function getCartCardFee() {
  if (state.paymentMethod !== "card") return 0;
  const b = getCartSubtotal() + getCartTax() + getCartSC();
  return b > 0 ? Math.floor(b * 0.08) : 0;
}
function getCartTotal() {
  return Math.max(0, getCartSubtotal() + getCartTax() + getCartSC() + getCartCardFee());
}

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
  return `${d.getFullYear()}-${pz(d.getMonth() + 1)}`;
}

// ============================
// Session snapshot (卓ごと)
// ============================
function snapshotSession() {
  return {
    customerType: state.customerType,
    source: state.source,
    cast: state.cast,
    castsArr: [...state.castsArr],
    guestCount: state.guestCount,
    checkinTime: state.checkinTime,
    cart: state.cart.map((i) => ({ ...i })),
    scEnabled: state.scEnabled,
  };
}

function applySession(s) {
  state.customerType = s.customerType || null;
  state.source = s.source || null;
  state.cast = s.cast || null;
  state.castsArr = Array.isArray(s.castsArr) ? [...s.castsArr] : (s.cast ? s.cast.split("・") : []);
  state.guestCount = s.guestCount || 0;
  state.checkinTime = s.checkinTime || null;
  state.cart = Array.isArray(s.cart)
    ? s.cart.map((i) => ({ ...i, ukey: i.ukey || genUkey() }))
    : [];
  state.scEnabled = s.scEnabled !== false;
  document.getElementById("sc-checkbox").checked = state.scEnabled;
}

function saveSessionForTable(tableNum) {
  if (!tableNum) return;
  const all = loadSessions();
  all[String(tableNum)] = snapshotSession();
  saveSessions(all);
}

function clearSessionForTable(tableNum) {
  if (!tableNum) return;
  const all = loadSessions();
  delete all[String(tableNum)];
  saveSessions(all);
}

function loadSessionForTable(tableNum) {
  const all = loadSessions();
  return all[String(tableNum)] || null;
}

// ============================
// Scroll Lock
// ============================
function lockScroll() {
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.top = `-${window.scrollY}px`;
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
  document.getElementById("clock").textContent = `${now.getFullYear()}/${pz(now.getMonth() + 1)}/${pz(now.getDate())} ${fmtTime(now)}`;
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
    if (v === "cast") renderCastPage();
  });
});

document.getElementById("sc-checkbox").addEventListener("change", (e) => {
  state.scEnabled = e.target.checked;
  renderCart();
});

// ============================
// Cast management page
// ============================
function renderCastPage() {
  const list = loadCastList();
  const el = document.getElementById("cast-list");
  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">まだ登録がありません</div>';
    return;
  }
  el.innerHTML = list
    .map(
      (name, idx) =>
        `<div class="cast-list-item"><span class="cast-list-name">${escapeHtml(name)}</span><button class="btn-cast-del" data-idx="${idx}">削除</button></div>`
    )
    .join("");
  el.querySelectorAll(".btn-cast-del").forEach((b) => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.idx, 10);
      const n = list[idx];
      if (n && confirm(`「${n}」を削除しますか？`)) {
        saveCastList(list.filter((_, i) => i !== idx));
        renderCastPage();
      }
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

document.getElementById("btn-cast-add").addEventListener("click", () => {
  const inp = document.getElementById("cast-new-name");
  const name = inp.value.trim();
  if (!name) return;
  const list = loadCastList();
  if (list.includes(name)) {
    alert("すでに登録されています");
    return;
  }
  list.push(name);
  list.sort((a, b) => a.localeCompare(b, "ja"));
  saveCastList(list);
  inp.value = "";
  renderCastPage();
});

// ============================
// Categories & Menu
// ============================
function renderCategories() {
  const c = document.getElementById("category-tabs");
  c.innerHTML = MENU_DATA.categories
    .map(
      (cat) =>
        `<button class="category-tab ${cat.id === state.currentCategory ? "active" : ""}" data-category="${cat.id}">${cat.emoji} ${cat.name}</button>`
    )
    .join("");
  c.querySelectorAll(".category-tab").forEach((t) => {
    t.addEventListener("click", () => {
      state.currentCategory = t.dataset.category;
      renderCategories();
      renderMenu();
    });
  });
}

function renderMenu() {
  const c = document.getElementById("menu-grid");

  if (state.currentCategory === "table") {
    let h = "";
    for (let i = 1; i <= 12; i++) {
      const active = state.tableNumber === i;
      let sess = null;
      if (active && state.checkinTime) {
        sess = {
          checkinTime: state.checkinTime,
          cast: state.cast,
          customerType: state.customerType,
          guestCount: state.guestCount,
        };
      } else if (!active) {
        const s = loadSessionForTable(i);
        if (s && s.checkinTime) sess = s;
      }
      let info = "";
      if (sess) {
        const t = new Date(sess.checkinTime);
        info = `${pz(t.getHours())}:${pz(t.getMinutes())}〜`;
        if (sess.cast) info += ` / ${sess.cast}`;
        else if (sess.customerType === "new") info += ` / 新規`;
        if (sess.guestCount > 0) info += ` / ${sess.guestCount}名`;
      }
      const priceLabel = active ? "✓ 選択中" : sess ? "進行中" : "選択";
      h += `<button class="menu-item table-btn ${active ? "table-active" : ""} ${sess && !active ? "table-has-session" : ""}" data-table="${i}">
        <span class="emoji">🪑</span><span class="name">卓 ${i}</span><span class="price">${priceLabel}</span>
        ${info ? `<span class="table-info">${escapeHtml(info)}</span>` : ""}</button>`;
    }
    c.innerHTML = h;
    c.querySelectorAll(".table-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const n = parseInt(b.dataset.table);
        if (state.tableNumber && state.tableNumber !== n) saveSessionForTable(state.tableNumber);
        state.pendingTableNumber = n;
        openTableModal(n);
      });
    });
    return;
  }

  if (state.currentCategory === "other") {
    c.innerHTML = `<button class="menu-item menu-item-custom" id="btn-open-custom"><span class="emoji">📝</span><span class="name">フリー入力</span><span class="price">自由金額</span></button>`;
    document.getElementById("btn-open-custom").addEventListener("click", () => {
      if (!guardTable()) return;
      openCustomModal();
    });
    return;
  }

  let items =
    state.currentCategory === "all"
      ? MENU_DATA.items
      : MENU_DATA.items.filter((i) => i.category === state.currentCategory);
  let h = items
    .map(
      (item) =>
        `<button class="menu-item" data-id="${item.id}"><span class="emoji">${item.emoji}</span><span class="name">${item.name}</span><span class="price">${fmt(item.price)}</span></button>`
    )
    .join("");

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

function guardTable() {
  if (!state.tableNumber) {
    alert("先に卓番号を選択してください");
    return false;
  }
  return true;
}

// ============================
// Cart lines (ukey)
// ============================
function pushCartLine(obj) {
  const line = { ukey: genUkey(), ...obj };
  state.cart.push(line);
}

function tryMergeSimpleItem(item, qty) {
  if (item.requiresRecipient || item.isShotTracker) return false;
  const ex = state.cart.find((l) => l.id === item.id && l.name === item.name && !l.requiresRecipient && !l.isShotTracker);
  if (ex) {
    ex.qty += qty;
    return true;
  }
  return false;
}

function updateQtyByUkey(ukey, delta) {
  const item = state.cart.find((l) => l.ukey === ukey);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((l) => l.ukey !== ukey);
  renderCart();
}

// ============================
// Confirm item modal
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

document.getElementById("btn-close-confirm").addEventListener("click", () => {
  document.getElementById("modal-confirm-item").classList.add("hidden");
  unlockScroll();
});
document.getElementById("confirm-qty-minus").addEventListener("click", () => {
  if (state.confirmQty > 1) {
    state.confirmQty--;
    document.getElementById("confirm-qty-num").textContent = state.confirmQty;
  }
});
document.getElementById("confirm-qty-plus").addEventListener("click", () => {
  state.confirmQty++;
  document.getElementById("confirm-qty-num").textContent = state.confirmQty;
});

document.getElementById("btn-confirm-add").addEventListener("click", () => {
  if (!state.confirmItem) return;
  const item = state.confirmItem;
  const qty = state.confirmQty;
  document.getElementById("modal-confirm-item").classList.add("hidden");
  unlockScroll();

  if (item.requiresRecipient || item.isShotTracker) {
    state.pendingAddItem = item;
    state.pendingAddQty = qty;
    openRecipientModal();
    return;
  }
  if (!tryMergeSimpleItem(item, qty)) pushCartLine({ ...item, qty });
  renderCart();
});

// ============================
// Recipient modal
// ============================
function openRecipientModal() {
  const item = state.pendingAddItem;
  document.getElementById("recipient-modal-title").textContent = item ? `${item.name} — 誰が？` : "誰が？";
  document.getElementById("recipient-manual").value = "";
  const list = loadCastList();
  const el = document.getElementById("recipient-cast-list");
  if (list.length === 0) {
    el.innerHTML = '<p class="modal-hint">キャストタブで名前を登録するとここに表示されます</p>';
  } else {
    el.innerHTML = list.map((n) => `<button type="button" class="cast-pick-btn" data-name="${escapeAttr(n)}">${escapeHtml(n)}</button>`).join("");
    el.querySelectorAll(".cast-pick-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.getElementById("recipient-manual").value = b.dataset.name;
      });
    });
  }
  document.getElementById("modal-recipient").classList.remove("hidden");
  lockScroll();
}

document.getElementById("btn-close-recipient").addEventListener("click", () => {
  document.getElementById("modal-recipient").classList.add("hidden");
  unlockScroll();
  state.pendingAddItem = null;
});

document.getElementById("btn-recipient-confirm").addEventListener("click", () => {
  const name = document.getElementById("recipient-manual").value.trim();
  if (!name) {
    alert("キャスト名を選択または入力してください");
    return;
  }
  const item = state.pendingAddItem;
  const qty = state.pendingAddQty;
  if (!item) return;

  if (item.isShotTracker) {
    pushCartLine({
      id: item.id,
      name: `キャストショット（カウント）【${name}】`,
      price: 0,
      category: item.category,
      emoji: item.emoji,
      qty,
      isShotTracker: true,
    });
  } else {
    pushCartLine({
      id: item.id,
      name: `${item.name}（${name}）`,
      price: item.price,
      category: item.category,
      emoji: item.emoji,
      qty,
      requiresRecipient: true,
    });
  }
  document.getElementById("modal-recipient").classList.add("hidden");
  unlockScroll();
  state.pendingAddItem = null;
  renderCart();
});

// ============================
// Table modal
// ============================
function hideAllTableSteps() {
  ["table-step0-resume", "table-step1", "table-step2-new", "table-step2-repeat", "table-step3-guests"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
}

function bindGuestButtons() {
  document.querySelectorAll(".guest-num-btn").forEach((b) => {
    b.addEventListener("click", () => finishCheckin(parseInt(b.dataset.guests, 10)));
  });
}

function showFreshTableModal() {
  hideAllTableSteps();
  document.getElementById("table-step1").classList.remove("hidden");
  document.getElementById("table-cast-input").value = "";
  state.pendingRepeatCasts = [];
  renderCastPicker();
  renderSelectedCastChips();
  let gh = "";
  for (let i = 1; i <= 10; i++) gh += `<button class="guest-num-btn" data-guests="${i}">${i}名</button>`;
  document.getElementById("guest-select-btns").innerHTML = gh;
  bindGuestButtons();
}

function openTableModal(n) {
  document.getElementById("modal-table-title").textContent = `🪑 卓 ${n}`;
  const existing = loadSessionForTable(n);

  hideAllTableSteps();
  if (existing && existing.checkinTime) {
    document.getElementById("table-step0-resume").classList.remove("hidden");
  } else {
    showFreshTableModal();
  }
  document.getElementById("modal-table").classList.remove("hidden");
  lockScroll();
}

document.getElementById("btn-resume-session").addEventListener("click", () => {
  const s = loadSessionForTable(state.pendingTableNumber);
  if (!s) return;
  state.tableNumber = state.pendingTableNumber;
  applySession(s);
  document.getElementById("modal-table").classList.add("hidden");
  unlockScroll();
  updateTableBadge();
  renderCart();
  renderMenu();
  state.currentCategory = "system";
  renderCategories();
  renderMenu();
});

document.getElementById("btn-new-session").addEventListener("click", () => {
  clearSessionForTable(state.pendingTableNumber);
  showFreshTableModal();
});

function closeTableModal() {
  document.getElementById("modal-table").classList.add("hidden");
  unlockScroll();
}
document.getElementById("btn-close-table").addEventListener("click", closeTableModal);

function goToGuestStep() {
  hideAllTableSteps();
  document.getElementById("table-step3-guests").classList.remove("hidden");
}

document.getElementById("btn-type-new").addEventListener("click", () => {
  hideAllTableSteps();
  document.getElementById("table-step2-new").classList.remove("hidden");
});
document.getElementById("btn-type-repeat").addEventListener("click", () => {
  hideAllTableSteps();
  state.pendingRepeatCasts = [];
  document.getElementById("table-cast-input").value = "";
  document.getElementById("table-step2-repeat").classList.remove("hidden");
  renderCastPicker();
  renderSelectedCastChips();
});

document.querySelectorAll(".source-btn").forEach((b) => {
  b.addEventListener("click", () => {
    state.pendingType = "new";
    state.pendingSource = b.dataset.source;
    state.pendingRepeatCasts = [];
    goToGuestStep();
  });
});

function renderCastPicker() {
  const list = loadCastList();
  const el = document.getElementById("cast-picker-list");
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<p class="modal-hint">「キャスト」タブで名前を登録してください</p>';
    return;
  }
  el.innerHTML = list
    .map((n) => `<button type="button" class="cast-pick-btn" data-pick="${escapeAttr(n)}">${escapeHtml(n)}</button>`)
    .join("");
  el.querySelectorAll("[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.pick;
      if (state.pendingRepeatCasts.length >= 2) {
        alert("推しキャストは最大2名までです");
        return;
      }
      if (state.pendingRepeatCasts.includes(name)) return;
      state.pendingRepeatCasts.push(name);
      renderSelectedCastChips();
    });
  });
}

function renderSelectedCastChips() {
  const el = document.getElementById("cast-selected-chips");
  if (!el) return;
  if (state.pendingRepeatCasts.length === 0) {
    el.innerHTML = '<span class="modal-hint">名前をタップで追加（最大2名）</span>';
    return;
  }
  el.innerHTML = state.pendingRepeatCasts
    .map(
      (n, i) =>
        `<span class="cast-chip">${escapeHtml(n)}<button type="button" class="cast-chip-x" data-idx="${i}">×</button></span>`
    )
    .join("");
  el.querySelectorAll(".cast-chip-x").forEach((b) => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.idx, 10);
      state.pendingRepeatCasts.splice(idx, 1);
      renderSelectedCastChips();
    });
  });
}

document.getElementById("btn-add-second-cast").addEventListener("click", () => {
  if (state.pendingRepeatCasts.length >= 2) {
    alert("すでに2名選択されています");
    return;
  }
  document.getElementById("cast-picker-list")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.getElementById("btn-confirm-cast").addEventListener("click", () => {
  const manual = document.getElementById("table-cast-input").value.trim();
  if (manual && state.pendingRepeatCasts.length < 2 && !state.pendingRepeatCasts.includes(manual)) {
    state.pendingRepeatCasts.push(manual);
    document.getElementById("table-cast-input").value = "";
  }
  if (state.pendingRepeatCasts.length === 0) {
    alert("推しキャストを1名以上選択するか、手入力してください");
    return;
  }
  state.pendingType = "repeat";
  state.pendingSource = null;
  goToGuestStep();
});

document.getElementById("btn-free-repeat").addEventListener("click", () => {
  state.pendingType = "repeat";
  state.pendingSource = null;
  state.pendingRepeatCasts = [];
  goToGuestStep();
});

function finishCheckin(guests) {
  state.tableNumber = state.pendingTableNumber;
  state.guestCount = guests;

  if (state.pendingType === "new") {
    state.customerType = "new";
    state.source = state.pendingSource;
    state.cast = null;
    state.castsArr = [];
    state.checkinTime = new Date().toISOString();
    state.cart = [];
  } else {
    state.customerType = "repeat";
    state.source = null;
    state.castsArr = [...state.pendingRepeatCasts];
    state.cast = state.castsArr.length ? state.castsArr.join("・") : null;
    state.checkinTime = new Date().toISOString();
    state.cart = [];
    const shimei = MENU_DATA.items.find((i) => i.id === 6);
    if (shimei && state.castsArr.length) {
      state.castsArr.forEach((nm) => {
        pushCartLine({
          id: shimei.id,
          name: `推し指名（${nm}）`,
          price: shimei.price,
          category: shimei.category,
          emoji: shimei.emoji,
          qty: 1,
        });
      });
    }
  }

  updateTableBadge();
  renderCart();
  closeTableModal();
  state.currentCategory = "system";
  renderCategories();
  renderMenu();
}

// ============================
// Discount & Custom modals
// ============================
function openDiscountModal() {
  document.getElementById("modal-discount").classList.remove("hidden");
  document.getElementById("discount-name").value = "";
  document.getElementById("discount-price").value = "";
  document.getElementById("discount-name").focus();
  lockScroll();
}
document.getElementById("btn-close-discount").addEventListener("click", () => {
  document.getElementById("modal-discount").classList.add("hidden");
  unlockScroll();
});
document.getElementById("btn-add-discount").addEventListener("click", () => {
  const name = document.getElementById("discount-name").value.trim() || "特別プラン";
  const price = parseInt(document.getElementById("discount-price").value, 10) || 0;
  if (price <= 0) {
    alert("料金を入力してください");
    return;
  }
  state.customIdCounter++;
  pushCartLine({ id: state.customIdCounter, name, price, category: "system", emoji: "🏷️", qty: 1, isCustom: true });
  renderCart();
  document.getElementById("modal-discount").classList.add("hidden");
  unlockScroll();
});

function openCustomModal() {
  document.getElementById("modal-custom").classList.remove("hidden");
  document.getElementById("custom-name").value = "";
  document.getElementById("custom-price").value = "";
  document.getElementById("custom-name").focus();
  lockScroll();
}
document.getElementById("btn-close-custom").addEventListener("click", () => {
  document.getElementById("modal-custom").classList.add("hidden");
  unlockScroll();
});
document.getElementById("btn-add-custom").addEventListener("click", () => {
  const name = document.getElementById("custom-name").value.trim();
  const price = parseInt(document.getElementById("custom-price").value, 10) || 0;
  if (!name || price <= 0) {
    alert("商品名と金額を入力してください");
    return;
  }
  state.customIdCounter++;
  pushCartLine({ id: state.customIdCounter, name, price, category: "other", emoji: "📝", qty: 1, isCustom: true });
  renderCart();
  document.getElementById("modal-custom").classList.add("hidden");
  unlockScroll();
});

// ============================
// Cart UI
// ============================
function clearCart() {
  if (state.tableNumber) clearSessionForTable(state.tableNumber);
  state.cart = [];
  state.tableNumber = null;
  state.customerType = null;
  state.source = null;
  state.cast = null;
  state.castsArr = [];
  state.guestCount = 0;
  state.checkinTime = null;
  updateTableBadge();
  renderCart();
  renderMenu();
}

function renderCart() {
  const c = document.getElementById("cart-items");
  const btn = document.getElementById("btn-checkout");
  if (state.cart.length === 0) {
    c.innerHTML = `<div class="cart-empty">${state.tableNumber ? "商品を選択してください" : "卓番号を選択してください"}</div>`;
    btn.disabled = true;
  } else {
    c.innerHTML = state.cart
      .map(
        (item) =>
          `<div class="cart-item">
        <span class="item-emoji">${item.emoji}</span>
        <div class="item-info"><div class="item-name">${escapeHtml(item.name)}</div><div class="item-price">${fmt(item.price)}</div></div>
        <div class="item-qty">
          <button class="qty-btn minus" data-ukey="${item.ukey}" data-delta="-1">−</button>
          <span class="qty-count">${item.qty}</span>
          <button class="qty-btn plus" data-ukey="${item.ukey}" data-delta="1">+</button>
        </div>
        <div class="item-total">${fmt(item.price * item.qty)}</div>
      </div>`
      )
      .join("");
    btn.disabled = false;
    c.querySelectorAll(".qty-btn").forEach((b) => {
      b.addEventListener("click", () => updateQtyByUkey(b.dataset.ukey, parseInt(b.dataset.delta, 10)));
    });
  }
  document.getElementById("subtotal").textContent = fmt(getCartSubtotal());
  document.getElementById("tax").textContent = fmt(getCartTax());
  document.getElementById("sc").textContent = fmt(getCartSC());
  const cfr = document.getElementById("card-fee-row");
  if (state.paymentMethod === "card" && state.cart.length > 0) {
    cfr.classList.remove("hidden");
    document.getElementById("card-fee").textContent = fmt(getCartCardFee());
  } else cfr.classList.add("hidden");
  document.getElementById("total").textContent = fmt(getCartTotal());
  updateMobileBadge();
  if (state.tableNumber && state.checkinTime) saveSessionForTable(state.tableNumber);
}

document.getElementById("btn-clear-cart").addEventListener("click", clearCart);

document.getElementById("guest-minus").addEventListener("click", () => {
  if (state.guestCount > 1) {
    state.guestCount--;
    document.getElementById("guest-count").textContent = state.guestCount;
    renderCart();
  }
});
document.getElementById("guest-plus").addEventListener("click", () => {
  state.guestCount++;
  document.getElementById("guest-count").textContent = state.guestCount;
  renderCart();
});

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
    if (state.checkinTime) {
      const t = new Date(state.checkinTime);
      info += ` ｜ 入店 ${pz(t.getHours())}:${pz(t.getMinutes())}`;
    }
    cb.textContent = info;
    gr.classList.remove("hidden");
    document.getElementById("guest-count").textContent = state.guestCount;
  } else {
    tb.textContent = "卓未選択";
    tb.classList.remove("active");
    cb.textContent = "";
    gr.classList.add("hidden");
  }
}

// ============================
// Checkout
// ============================
function openCheckout() {
  document.getElementById("modal-checkout").classList.remove("hidden");
  document.getElementById("checkout-amount").textContent = fmt(getCartTotal());
  document.getElementById("checkout-card-fee").classList.toggle("hidden", state.paymentMethod !== "card");
  state.receivedAmount = "";
  updatePaymentUI();
  updateReceivedDisplay();
  lockScroll();
}
function closeCheckout() {
  document.getElementById("modal-checkout").classList.add("hidden");
  unlockScroll();
}
document.getElementById("btn-checkout").addEventListener("click", openCheckout);
document.getElementById("btn-close-checkout").addEventListener("click", closeCheckout);

document.querySelectorAll(".payment-btn").forEach((b) => {
  b.addEventListener("click", () => {
    state.paymentMethod = b.dataset.method;
    renderCart();
    updatePaymentUI();
  });
});

function updatePaymentUI() {
  document.querySelectorAll(".payment-btn").forEach((b) => b.classList.toggle("active", b.dataset.method === state.paymentMethod));
  document.getElementById("checkout-amount").textContent = fmt(getCartTotal());
  document.getElementById("checkout-card-fee").classList.toggle("hidden", state.paymentMethod !== "card");
  const cs = document.getElementById("cash-input-section");
  if (state.paymentMethod === "cash") {
    cs.classList.remove("hidden");
    document.getElementById("btn-confirm-payment").disabled = !canPay();
  } else {
    cs.classList.add("hidden");
    document.getElementById("btn-confirm-payment").disabled = false;
  }
}

document.querySelectorAll(".num-btn").forEach((b) => {
  b.addEventListener("click", () => {
    const v = b.dataset.val;
    if (v === "del") state.receivedAmount = state.receivedAmount.slice(0, -1);
    else if (state.receivedAmount.length < 8) state.receivedAmount += v;
    updateReceivedDisplay();
  });
});
document.querySelectorAll(".quick-btn:not(.exact)").forEach((b) => {
  b.addEventListener("click", () => {
    state.receivedAmount = b.dataset.amount;
    updateReceivedDisplay();
  });
});
document.getElementById("btn-exact").addEventListener("click", () => {
  state.receivedAmount = getCartTotal().toString();
  updateReceivedDisplay();
});

function updateReceivedDisplay() {
  const a = parseInt(state.receivedAmount, 10) || 0;
  document.getElementById("received-display").textContent = fmt(a);
  const ch = a - getCartTotal();
  const cd = document.getElementById("change-display");
  if (ch < 0) {
    cd.classList.add("negative");
    document.getElementById("change-amount").textContent = "−" + fmt(Math.abs(ch));
  } else {
    cd.classList.remove("negative");
    document.getElementById("change-amount").textContent = fmt(ch);
  }
  document.getElementById("btn-confirm-payment").disabled = !canPay();
}
function canPay() {
  return state.paymentMethod !== "cash" || (parseInt(state.receivedAmount, 10) || 0) >= getCartTotal();
}

document.getElementById("btn-confirm-payment").addEventListener("click", () => {
  const total = getCartTotal();
  const received = state.paymentMethod === "cash" ? parseInt(state.receivedAmount, 10) || 0 : total;
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
    castsArr: [...state.castsArr],
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
  const itemsH = order.items.map((i) => `<div class="receipt-item"><span>${escapeHtml(i.name)} x${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("");
  const scH = order.scEnabled ? `<div class="receipt-item"><span>SC (15%)</span><span>${fmt(order.sc)}</span></div>` : "";
  const cfH = order.cardFee > 0 ? `<div class="receipt-item"><span>カード手数料 (8%)</span><span>${fmt(order.cardFee)}</span></div>` : "";
  let infoH = `<div class="receipt-cast">🪑 卓${order.tableNumber} ｜ ${order.guestCount}名`;
  if (order.customerType === "new") infoH += ` ｜ 🆕 新規 (${order.source})`;
  if (order.cast) infoH += ` ｜ 👑 ${escapeHtml(order.cast)}`;
  const cin = order.checkinTime ? fmtDT(order.checkinTime) : "";
  const cout = order.checkoutTime ? fmtDT(order.checkoutTime) : "";
  if (cin) infoH += `<br>⏰ 入店 ${cin} → 退店 ${cout}`;
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
      ${order.method === "cash" ? `<div class="receipt-item"><span>おつり</span><span>${fmt(order.change)}</span></div>` : ""}
    </div>
    <div class="receipt-footer">No. #${order.id.toString().padStart(4, "0")}<br>${fmtDT(order.timestamp)}<br>またのご来店をお待ちしております</div>`;
  document.getElementById("modal-receipt").classList.remove("hidden");
  lockScroll();
}

function afterReceiptClose() {
  if (state.tableNumber) clearSessionForTable(state.tableNumber);
  document.getElementById("modal-receipt").classList.add("hidden");
  unlockScroll();
  state.cart = [];
  state.tableNumber = null;
  state.customerType = null;
  state.source = null;
  state.cast = null;
  state.castsArr = [];
  state.guestCount = 0;
  state.checkinTime = null;
  updateTableBadge();
  renderCart();
  renderMenu();
  closeMobileCart();
}

document.getElementById("btn-close-receipt").addEventListener("click", afterReceiptClose);
document.getElementById("btn-done").addEventListener("click", afterReceiptClose);
document.getElementById("btn-print").addEventListener("click", () => window.print());

// ============================
// History
// ============================
function renderHistory() {
  const c = document.getElementById("history-list");
  const orders = [...state.orders].reverse();
  if (orders.length === 0) {
    c.innerHTML = '<div class="empty-state">まだ注文履歴がありません</div>';
    return;
  }

  c.innerHTML = orders
    .map((o) => {
      const items = o.items.map((i) => `${i.name}×${i.qty}`).join("、");
      let badges = "";
      if (o.tableNumber) badges += `<span class="order-table-badge">🪑 卓${o.tableNumber}</span>`;
      if (o.guestCount) badges += `<span class="order-source">👥 ${o.guestCount}名</span>`;
      if (o.cast) badges += `<span class="order-cast">👑 ${escapeHtml(o.cast)}</span>`;
      if (o.source) badges += `<span class="order-source">${escapeHtml(o.source)}</span>`;
      const cin = o.checkinTime ? fmtDT(o.checkinTime) : "";
      const cout = o.checkoutTime ? fmtDT(o.checkoutTime) : "";
      const timeStr = cin && cout ? `⏰ 入店 ${cin} → 退店 ${cout}` : fmtDT(o.timestamp);
      return `<div class="history-item">
      <span class="order-num">#${o.id.toString().padStart(4, "0")}</span>
      <div class="order-detail">
        <div class="order-badges">${badges}</div>
        <div class="order-time">${timeStr}</div>
        <div class="order-items-text">${escapeHtml(items)}</div>
      </div>
      <span class="order-method">${getML(o.method)}</span>
      <span class="order-total">${fmt(o.total)}</span>
      <button class="btn-delete-order" data-order-id="${o.id}" title="削除">🗑️</button>
    </div>`;
    })
    .join("");

  c.querySelectorAll(".btn-delete-order").forEach((b) => {
    b.addEventListener("click", () => {
      const id = parseInt(b.dataset.orderId, 10);
      if (confirm(`注文 #${id.toString().padStart(4, "0")} を削除しますか？`)) {
        state.orders = state.orders.filter((o) => o.id !== id);
        saveOrders();
        renderHistory();
      }
    });
  });
}

// ============================
// Summary
// ============================
function parseShotCountName(name) {
  const m = String(name).match(/キャストショット（カウント）【(.+?)】/);
  return m ? m[1] : null;
}

function renderSummary() {
  const orders = state.orders;
  const todayOrders = orders.filter((o) => getBusinessDate(o.timestamp) === getBusinessDate());
  const monthOrders = orders.filter((o) => getBusinessMonth(o.timestamp) === getBusinessMonth());
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const monthSales = monthOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = monthOrders.length > 0 ? Math.round(monthSales / monthOrders.length) : 0;
  const todayGuests = todayOrders.reduce((s, o) => s + (o.guestCount || 0), 0);

  document.getElementById("summary-cards").innerHTML = `
    <div class="summary-card primary"><div class="card-label">本日の売上（20時〜）</div><div class="card-value">${fmt(todaySales)}</div><div class="card-sub">${todayOrders.length}件 / ${todayGuests}名</div></div>
    <div class="summary-card"><div class="card-label">今月の売上</div><div class="card-value">${fmt(monthSales)}</div><div class="card-sub">${monthOrders.length}件</div></div>
    <div class="summary-card"><div class="card-label">平均注文額（今月）</div><div class="card-value">${fmt(avgOrder)}</div></div>
    <div class="summary-card"><div class="card-label">本日の来店数</div><div class="card-value">${todayGuests}名</div><div class="card-sub">${todayOrders.length}組</div></div>`;

  const catSales = {};
  MENU_DATA.categories.filter((c) => c.id !== "all" && c.id !== "table").forEach((c) => {
    catSales[c.id] = { name: c.name, emoji: c.emoji, total: 0 };
  });
  todayOrders.forEach((o) =>
    o.items.forEach((i) => {
      const cat = i.category || "other";
      if (catSales[cat]) catSales[cat].total += i.price * i.qty;
    })
  );
  const maxCat = Math.max(...Object.values(catSales).map((x) => x.total), 1);
  document.getElementById("category-sales").innerHTML = Object.values(catSales)
    .sort((a, b) => b.total - a.total)
    .map(
      (c) =>
        `<div class="category-sale-row"><span class="sale-label">${c.emoji} ${c.name}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c.total / maxCat) * 100}%"></div></div><span class="sale-amount">${fmt(c.total)}</span></div>`
    )
    .join("");

  const ic = {};
  todayOrders.forEach((o) =>
    o.items.forEach((i) => {
      if (i.price <= 0) return;
      if (String(i.name).includes("キャストショット（カウント）")) return;
      const k = i.name;
      if (!ic[k]) ic[k] = { name: i.name, emoji: i.emoji || "📦", count: 0, total: 0 };
      ic[k].count += i.qty;
      ic[k].total += i.price * i.qty;
    })
  );
  const top5 = Object.values(ic).sort((a, b) => b.count - a.count).slice(0, 5);
  const pc = document.getElementById("popular-items");
  if (top5.length === 0) pc.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else {
    const rc = ["gold", "silver", "bronze", "", ""];
    pc.innerHTML = top5
      .map(
        (i, n) =>
          `<div class="popular-item-row"><span class="popular-rank ${rc[n]}">${n + 1}</span><span class="popular-name">${i.emoji} ${escapeHtml(i.name)}</span><span class="popular-count">${i.count}個</span><span class="popular-total">${fmt(i.total)}</span></div>`
      )
      .join("");
  }

  const cs = {};
  todayOrders.forEach((o) => {
    if (o.cast) {
      if (!cs[o.cast]) cs[o.cast] = { name: o.cast, subtotal: 0, count: 0 };
      cs[o.cast].subtotal += o.subtotal || 0;
      cs[o.cast].count++;
    }
  });
  const cl = Object.values(cs).sort((a, b) => b.subtotal - a.subtotal);
  const cc = document.getElementById("cast-sales");
  if (cl.length === 0) cc.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else {
    const mx = cl[0].subtotal || 1;
    cc.innerHTML = cl
      .map(
        (c) =>
          `<div class="category-sale-row"><span class="sale-label">👑 ${escapeHtml(c.name)}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c.subtotal / mx) * 100}%"></div></div><span class="sale-amount">${fmt(c.subtotal)} (${c.count}件)</span></div>`
      )
      .join("");
  }

  const ss = {};
  todayOrders.forEach((o) => {
    if (o.source) ss[o.source] = (ss[o.source] || 0) + 1;
    if (o.customerType === "repeat") ss["リピーター"] = (ss["リピーター"] || 0) + 1;
  });
  const sl = Object.entries(ss).sort((a, b) => b[1] - a[1]);
  const scEl = document.getElementById("source-stats");
  if (sl.length === 0) scEl.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else {
    const mx = sl[0][1] || 1;
    scEl.innerHTML = sl
      .map(
        ([n, c]) =>
          `<div class="category-sale-row"><span class="sale-label">${escapeHtml(n)}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(c / mx) * 100}%"></div></div><span class="sale-amount">${c}組</span></div>`
      )
      .join("");
  }

  const shotAgg = {};
  todayOrders.forEach((o) => {
    o.items.forEach((i) => {
      const castName = parseShotCountName(i.name);
      if (castName) {
        shotAgg[castName] = (shotAgg[castName] || 0) + i.qty;
      }
    });
  });
  const shotList = Object.entries(shotAgg).sort((a, b) => b[1] - a[1]);
  const shotEl = document.getElementById("shot-count-stats");
  if (shotList.length === 0) shotEl.innerHTML = '<div class="empty-state">まだデータがありません</div>';
  else {
    const mx = shotList[0][1] || 1;
    shotEl.innerHTML = shotList
      .map(
        ([n, cnt]) =>
          `<div class="category-sale-row"><span class="sale-label">🥃 ${escapeHtml(n)}</span><div class="sale-bar-container"><div class="sale-bar" style="width:${(cnt / mx) * 100}%"></div></div><span class="sale-amount">${cnt}杯（0円集計）</span></div>`
      )
      .join("");
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
  const b = document.getElementById("mobile-cart-badge");
  const n = state.cart.reduce((s, i) => s + i.qty, 0);
  b.textContent = n;
  b.classList.toggle("hidden-badge", n === 0);
}

// ============================
// Init
// ============================
renderCategories();
renderMenu();
renderCart();
updateTableBadge();
