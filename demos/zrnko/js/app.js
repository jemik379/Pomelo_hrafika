/* ZRNKO — storefront interactions */
(function () {
  "use strict";

  const { PRODUCTS, CATEGORY_LABELS, bagArt, productById, SUB_VISUAL } = window.ZRNKO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => `${new Intl.NumberFormat("cs-CZ").format(n)} Kč`;
  const FREE_SHIPPING = 1000;
  const SHIPPING = 79;
  const STORE_CART = "zrnko_cart_v1";
  const STORE_WISH = "zrnko_wish_v1";

  const grid = $("#productGrid");
  const resultsCount = $("#resultsCount");
  const cartDrawer = $("#cartDrawer");
  const cartItems = $("#cartItems");
  const cartTitleCount = $("#cartTitleCount");
  const shippingText = $("#shippingText");
  const shippingBar = $("#shippingBar");
  const cartSubtotalEl = $("#cartSubtotal");
  const cartShippingEl = $("#cartShipping");
  const cartTotalEl = $("#cartTotal");
  const checkoutBtn = $("#checkoutBtn");
  const quickView = $("#quickView");
  const quickViewContent = $("#quickViewContent");
  const searchPanel = $("#searchPanel");
  const searchInput = $("#searchInput");
  const searchResults = $("#searchResults");
  const searchLabel = $("#searchLabel");
  const mobileMenu = $("#mobileMenu");
  const checkoutModal = $("#checkoutModal");
  const scrim = $("#scrim");
  const toast = $("#toast");

  const overlays = [cartDrawer, quickView, checkoutModal, searchPanel, mobileMenu];

  let cart = loadJSON(STORE_CART, []);
  const savedWishlist = loadJSON(STORE_WISH, []);
  let wishlist = new Set(Array.isArray(savedWishlist) ? savedWishlist : []);
  let activeFilter = "all";
  let activeOverlay = null;
  let lastFocus = null;
  let toastTimer = null;
  let qvProduct = null;
  let qvQty = 1;
  let currentPlan = { plan: "biweekly", price: 349, label: "Každé 2 týdny" };

  cart = Array.isArray(cart)
    ? cart.filter((i) => i && typeof i.id === "string" && Number(i.qty) > 0)
    : [];

  /* ---------- Utilities ---------- */

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage may be unavailable */
    }
  }

  function normalize(str) {
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function plural(n, one, few, many) {
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return few;
    return many;
  }

  function productOf(item) {
    return productById(item.id) || SUB_VISUAL;
  }

  function linePrice(item) {
    return item.price != null ? item.price : productOf(item).price;
  }

  function lineName(item) {
    return item.name || productOf(item).name;
  }

  function cartKey(item) {
    return [item.id, item.grind || "", item.plan || ""].join("::");
  }

  function totalQty() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function subtotal() {
    return cart.reduce((sum, item) => sum + linePrice(item) * item.qty, 0);
  }

  function shippingCost() {
    const sub = subtotal();
    if (!sub) return 0;
    return sub >= FREE_SHIPPING ? 0 : SHIPPING;
  }

  function persistCart() {
    saveJSON(STORE_CART, cart);
  }

  function showToast(message, icon = "#i-check") {
    toast.innerHTML = `<svg class="icon" aria-hidden="true"><use href="${icon}"/></svg><span>${message}</span>`;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  /* ---------- Overlay management ---------- */

  function openOverlay(el, trigger) {
    if (!el) return;
    if (activeOverlay && activeOverlay !== el) {
      activeOverlay.classList.remove("is-open");
      activeOverlay.setAttribute("aria-hidden", "true");
      activeOverlay.inert = true;
    } else if (!activeOverlay) {
      lastFocus = trigger || document.activeElement;
    }
    activeOverlay = el;
    clearTimeout(toastTimer);
    toast.classList.remove("is-visible");
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    el.inert = false;
    scrim.classList.add("is-visible");
    scrim.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");

    requestAnimationFrame(() => {
      const target =
        el.querySelector("[data-autofocus]") ||
        el.querySelector("input, select, button, [href]") ||
        el;
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    });
  }

  function closeOverlay(restoreFocus = true) {
    if (!activeOverlay) return;
    activeOverlay.classList.remove("is-open");
    activeOverlay.setAttribute("aria-hidden", "true");
    activeOverlay.inert = true;
    activeOverlay = null;
    scrim.classList.remove("is-visible");
    scrim.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (restoreFocus && lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function trapFocus(e) {
    if (!activeOverlay || e.key !== "Tab") return;
    const focusable = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      activeOverlay
    ).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- Products ---------- */

  function cardHTML(p, index) {
    const wished = wishlist.has(p.id);
    return `
      <article class="product-card reveal" style="--tint:${p.tint};--d:${Math.min(index * 45, 220)}ms">
        <div class="product-card__art">
          ${p.badge ? `<span class="badge ${p.badgeClass}">${p.badge}</span>` : ""}
          <button class="wish-btn${wished ? " is-active" : ""}" type="button" data-wish="${p.id}" aria-label="${wished ? "Odebrat" : "Přidat"} ${p.name} ${wished ? "z" : "do"} oblíbených" aria-pressed="${wished}">
            <svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg>
          </button>
          ${bagArt(p)}
          <button class="quick-btn" type="button" data-quick="${p.id}">
            Rychlý náhled <svg class="icon" aria-hidden="true"><use href="#i-arrow-up"/></svg>
          </button>
        </div>
        <div class="product-card__body">
          <p class="product-card__origin">${p.origin} · ${p.roast}</p>
          <h3 class="product-card__name"><button type="button" data-quick="${p.id}" aria-label="Rychlý náhled: ${p.name}">${p.name}</button></h3>
          <p class="product-card__notes">${p.notes.join(" · ")}</p>
          <div class="product-card__footer">
            <span class="price">${money(p.price)}<small>/ ${p.weight}</small></span>
            <button class="add-btn" type="button" data-add="${p.id}" aria-label="Přidat ${p.name} do košíku">
              <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderProducts() {
    const filtered = activeFilter === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeFilter);

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="products-empty">
          <svg class="icon" aria-hidden="true"><use href="#i-search"/></svg>
          <h3>Tady ještě nic není</h3>
          <p>Zkuste jinou kategorii nebo si projděte celý výběr.</p>
          <button class="btn btn--primary" type="button" data-filter="all">Zobrazit vše</button>
        </div>`;
    } else {
      grid.innerHTML = filtered.map(cardHTML).join("");
    }

    grid.classList.toggle("product-grid--few", activeFilter !== "all" && filtered.length < 4);
    resultsCount.textContent = `${filtered.length} ${plural(filtered.length, "káva", "kávy", "káv")}`;
    observeReveals(grid);
  }

  function setFilter(filter) {
    activeFilter = filter;
    $$(".filter").forEach((btn) => {
      const isActive = btn.dataset.filter === filter;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
    renderProducts();
  }

  function toggleWish(id) {
    const p = productById(id);
    if (!p) return;
    const adding = !wishlist.has(id);
    if (adding) wishlist.add(id);
    else wishlist.delete(id);
    saveJSON(STORE_WISH, Array.from(wishlist));
    $$(`[data-wish="${id}"]`).forEach((btn) => {
      btn.classList.toggle("is-active", adding);
      btn.setAttribute("aria-pressed", String(adding));
      btn.setAttribute("aria-label", `${adding ? "Odebrat" : "Přidat"} ${p.name} ${adding ? "z" : "do"} oblíbených`);
    });
    showToast(
      adding ? `<strong>${p.name}</strong> je v oblíbených.` : `<strong>${p.name}</strong> odebráno z oblíbených.`,
      adding ? "#i-heart" : "#i-check"
    );
  }

  function addToCart(item, options = {}) {
    const key = cartKey(item);
    const existing = cart.find((i) => cartKey(i) === key);
    if (existing) existing.qty += item.qty;
    else cart.push({ ...item });
    persistCart();
    renderCart();
    updateCartCount(true);
    if (options.openCart) {
      openOverlay(cartDrawer, options.trigger);
    }
  }

  /* ---------- Cart ---------- */

  function cartItemHTML(item) {
    const p = productOf(item);
    const key = cartKey(item);
    const name = lineName(item);
    const variant = item.variant || item.grind || "Celá zrna";
    const meta = `${variant}${item.weight && !variant.includes(item.weight) ? " · " + item.weight : ""}`;
    const total = linePrice(item) * item.qty;
    return `
      <div class="cart-item">
        <div class="cart-item__thumb" style="--tint:${p.tint}">${bagArt(p)}</div>
        <div class="cart-item__info">
          <h3 class="cart-item__name">${name}</h3>
          <p class="cart-item__meta">${meta}</p>
          <div class="cart-item__qty">
            <button class="qty-btn" type="button" data-cart-minus="${key}" aria-label="Ubrat kus" ${item.qty <= 1 ? "disabled" : ""}>
              <svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg>
            </button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" type="button" data-cart-plus="${key}" aria-label="Přidat kus">
              <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>
            </button>
          </div>
        </div>
        <div class="cart-item__right">
          <span class="cart-item__price">${money(total)}</span>
          <button class="remove-btn" type="button" data-cart-remove="${key}" aria-label="Odebrat ${name} z košíku">
            <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
          </button>
        </div>
      </div>`;
  }

  function renderCart(focus = null) {
    const count = totalQty();
    cartTitleCount.textContent = `${count} ${plural(count, "položka", "položky", "položek")}`;

    if (!cart.length) {
      cartItems.innerHTML = `
        <div class="cart__empty">
          <div class="cart__empty-icon"><svg class="icon" aria-hidden="true"><use href="#i-bag"/></svg></div>
          <h3>Košík je prázdný</h3>
          <p>Ještě chybí to nejdůležitější — vaše ranní káva.</p>
          <button class="btn btn--primary" type="button" data-cart-shop>Prohlédnout kávy</button>
        </div>`;
      shippingText.innerHTML = "Doprava zdarma nad <strong>1 000 Kč</strong>";
      shippingText.classList.remove("is-free");
      shippingBar.style.width = "0%";
      shippingBar.classList.remove("is-free");
    } else {
      cartItems.innerHTML = cart.map(cartItemHTML).join("");
      const sub = subtotal();
      const remaining = Math.max(0, FREE_SHIPPING - sub);
      if (remaining === 0) {
        shippingText.innerHTML = "Doprava zdarma je vaše!";
        shippingText.classList.add("is-free");
        shippingBar.style.width = "100%";
        shippingBar.classList.add("is-free");
      } else {
        shippingText.innerHTML = `Do dopravy zdarma zbývá <strong>${money(remaining)}</strong>`;
        shippingText.classList.remove("is-free");
        shippingBar.style.width = `${Math.min(100, (sub / FREE_SHIPPING) * 100)}%`;
        shippingBar.classList.remove("is-free");
      }
    }

    const sub = subtotal();
    const shipping = shippingCost();
    cartSubtotalEl.textContent = money(sub);
    cartShippingEl.textContent = shipping === 0 ? (sub ? "Zdarma" : "—") : money(shipping);
    cartTotalEl.textContent = money(sub + shipping);
    checkoutBtn.disabled = !cart.length;

    if (focus) {
      const attr = focus.action === "plus" ? "cartPlus" : focus.action === "minus" ? "cartMinus" : "cartRemove";
      const next = $$("button", cartItems).find((b) => b.dataset[attr] === focus.key && !b.disabled);
      if (next) next.focus({ preventScroll: true });
      else $(".cart__head .close-btn", cartDrawer)?.focus({ preventScroll: true });
    }
  }

  function updateCartCount(bump = false) {
    const count = totalQty();
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = count;
      if (bump) {
        el.classList.remove("is-bump");
        void el.offsetWidth;
        el.classList.add("is-bump");
      }
    });
  }

  function findCartItem(key) {
    return cart.find((item) => cartKey(item) === key);
  }

  function changeQty(key, delta) {
    const item = findCartItem(key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((i) => cartKey(i) !== key);
    persistCart();
    renderCart({ key, action: delta > 0 ? "plus" : "minus" });
    updateCartCount();
  }

  function removeItem(key) {
    cart = cart.filter((item) => cartKey(item) !== key);
    persistCart();
    renderCart();
    updateCartCount();
    showToast("Položka byla odebrána z košíku.", "#i-trash");
  }

  /* ---------- Quick view ---------- */

  function openQuick(id, trigger) {
    const p = productById(id);
    if (!p) return;
    qvProduct = p;
    qvQty = 1;
    const grindOptions = ["Celá zrna", "Espresso", "Filtr / V60", "Moka konvička", "French press"];
    quickViewContent.innerHTML = `
      <div class="qv__grid">
        <div class="qv__art" style="--tint:${p.tint}">${bagArt(p)}</div>
        <div class="qv__info">
          <p class="eyebrow">${p.origin} · ${CATEGORY_LABELS[p.category]}</p>
          <h2 id="qvTitle">${p.name}</h2>
          <div class="qv__rating">
            <span class="stars" aria-hidden="true">★★★★★</span>
            <span>4,9 · ${p.reviews} hodnocení</span>
          </div>
          <p class="qv__desc">${p.desc}</p>
          <dl class="qv__specs">
            <div><dt>Pražení</dt><dd>${p.roast}</dd></div>
            <div><dt>Výška</dt><dd>${p.altitude}</dd></div>
            <div><dt>Zpracování</dt><dd>${p.process}</dd></div>
          </dl>
          <div class="qv__notes">${p.notes.map((n) => `<span class="note-chip">${n}</span>`).join("")}</div>
          <div class="qv__controls">
            <div class="qv__field">
              <label for="qvGrind">Mletí</label>
              <div class="select-wrap">
                <select id="qvGrind">${grindOptions.map((g) => `<option>${g}</option>`).join("")}</select>
                <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
              </div>
            </div>
            <div class="qv__qty">
              <label>Množství</label>
              <div class="qty-box">
                <button class="qty-btn" type="button" data-qv-minus aria-label="Ubrat kus" disabled><svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg></button>
                <span class="qty-num" id="qvQty">1</span>
                <button class="qty-btn" type="button" data-qv-plus aria-label="Přidat kus"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></button>
              </div>
            </div>
          </div>
          <div class="qv__buy">
            <span class="qv__price" id="qvPrice">${money(p.price)}</span>
            <button class="btn btn--primary" type="button" data-qv-add>
              Přidat do košíku
              <span class="btn__icon"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span>
            </button>
          </div>
          <p class="qv__shipping"><svg class="icon" aria-hidden="true"><use href="#i-truck"/></svg> Doprava zdarma nad 1 000 Kč · Odesíláme do 24 h</p>
        </div>
      </div>`;
    openOverlay(quickView, trigger);
  }

  function updateQuickQty() {
    if (!qvProduct) return;
    const qtyEl = $("#qvQty", quickView);
    const priceEl = $("#qvPrice", quickView);
    const minus = $("[data-qv-minus]", quickView);
    if (qtyEl) qtyEl.textContent = qvQty;
    if (priceEl) priceEl.textContent = money(qvProduct.price * qvQty);
    if (minus) minus.disabled = qvQty <= 1;
  }

  /* ---------- Search ---------- */

  function productSearchText(p) {
    const extras = p.category === "darky" ? "darek darky gift" : "";
    return normalize(
      `${p.name} ${p.origin} ${p.region} ${p.roast} ${p.notes.join(" ")} ${CATEGORY_LABELS[p.category]} ${extras}`
    );
  }

  function renderSearch(query = "") {
    const q = normalize(query.trim());
    let results = PRODUCTS;
    if (q) results = PRODUCTS.filter((p) => productSearchText(p).includes(q));
    else results = PRODUCTS.slice(0, 3);
    results = results.slice(0, 6);

    searchLabel.textContent = q
      ? `Výsledky (${results.length})`
      : "Doporučujeme";

    if (!results.length) {
      searchResults.innerHTML = `<div class="search__empty">Nic jsme nenašli. Zkuste „espresso“, „Etiopie“ nebo „dárek“.</div>`;
      return;
    }

    searchResults.innerHTML = results.map((p) => `
      <button class="search-result" type="button" data-search-id="${p.id}">
        <span class="search-result__thumb" style="--tint:${p.tint}">${bagArt(p)}</span>
        <span class="search-result__info">
          <strong>${p.name}</strong>
          <span>${p.origin} · ${p.roast}</span>
        </span>
        <span class="search-result__price">${money(p.price)}</span>
      </button>`).join("");
  }

  function openSearch(trigger) {
    openOverlay(searchPanel, trigger);
    renderSearch(searchInput.value);
  }

  /* ---------- Subscription ---------- */

  function choosePlan(btn) {
    const price = Number(btn.dataset.price);
    const label = btn.dataset.label;
    const plan = btn.dataset.plan;
    currentPlan = { plan, price, label };
    $$(".plan-option").forEach((option) => {
      const active = option === btn;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-checked", String(active));
      option.tabIndex = active ? 0 : -1;
    });
    const priceEl = $("#planPrice");
    if (priceEl) {
      priceEl.innerHTML = `${price} <small>Kč</small>`;
      priceEl.classList.remove("is-changing");
      void priceEl.offsetWidth;
      priceEl.classList.add("is-changing");
    }
  }

  function addSubscription() {
    addToCart(
      {
        id: "predplatne",
        qty: 1,
        grind: "Celá zrna",
        plan: currentPlan.plan,
        price: currentPlan.price,
        name: "Předplatné kávy",
        variant: `${currentPlan.label} · 250 g`
      },
      { openCart: true, trigger: $("#addSubscription") }
    );
  }

  /* ---------- Checkout demo ---------- */

  function checkout() {
    if (!cart.length) return;
    const sub = subtotal();
    const shipping = shippingCost();
    const total = sub + shipping;
    const count = totalQty();
    const orderNo = `ZRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    $("#checkoutOrder").innerHTML = `
      <div><span>Číslo objednávky</span><strong>${orderNo}</strong></div>
      <div><span>Položky (${count})</span><strong>${money(sub)}</strong></div>
      <div><span>Doprava</span><strong>${shipping === 0 ? "Zdarma" : money(shipping)}</strong></div>
      <div><span>Celkem</span><strong>${money(total)}</strong></div>`;
    cart = [];
    persistCart();
    renderCart();
    updateCartCount();
    openOverlay(checkoutModal, checkoutBtn);
  }

  /* ---------- Newsletter ---------- */

  function initNewsletter() {
    const form = $("#newsletterForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#newsletterEmail");
      const email = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        form.classList.remove("is-error");
        void form.offsetWidth;
        form.classList.add("is-error");
        input.focus();
        showToast("Zadejte prosím platný e-mail.", "#i-mail");
        return;
      }
      $("#newsletterWrap").innerHTML = `
        <div class="newsletter__success">
          <span class="success-icon"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg></span>
          <div>
            <strong>Hotovo, těšíme se!</strong>
            <span>Váš slevový kód je <b>RANNI10</b>. (Ukázka — e-mail se neodesílá.)</span>
          </div>
        </div>`;
      showToast("Děkujeme! Slevový kód RANNI10 je připraven.");
    });
  }

  /* ---------- Reveal & scroll ---------- */

  let revealObserver = null;

  function observeReveals(root = document) {
    const items = $$(".reveal:not(.is-visible)", root);
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
      );
    }
    items.forEach((el) => revealObserver.observe(el));
  }

  function initScrollEffects() {
    const header = $("#siteHeader");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (!("IntersectionObserver" in window)) return;
    const links = $$("[data-spy]");
    const sections = links
      .map((link) => document.getElementById(link.dataset.spy))
      .filter(Boolean);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) =>
            link.classList.toggle("is-active", link.dataset.spy === entry.target.id)
          );
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Global events ---------- */

  function handleClick(e) {
    const target = e.target;

    if (target.classList && target.classList.contains("modal")) {
      closeOverlay();
      return;
    }

    const openCartBtn = target.closest("[data-open-cart]");
    if (openCartBtn) {
      renderCart();
      openOverlay(cartDrawer, openCartBtn);
      return;
    }

    const openSearchBtn = target.closest("[data-open-search]");
    if (openSearchBtn) {
      openSearch(openSearchBtn);
      return;
    }

    const openMenuBtn = target.closest("[data-open-menu]");
    if (openMenuBtn) {
      openOverlay(mobileMenu, openMenuBtn);
      return;
    }

    if (target.closest("[data-close]")) {
      closeOverlay();
      return;
    }

    if (target.closest("[data-demo-account]")) {
      showToast("Přihlášení je v této ukázce jen ilustrativní.", "#i-user");
      return;
    }

    const filterBtn = target.closest("[data-filter]");
    if (filterBtn) {
      setFilter(filterBtn.dataset.filter);
      return;
    }

    const quickBtn = target.closest("[data-quick]");
    if (quickBtn) {
      openQuick(quickBtn.dataset.quick, quickBtn);
      return;
    }

    const addBtn = target.closest("[data-add]");
    if (addBtn) {
      const p = productById(addBtn.dataset.add);
      if (!p) return;
      addToCart({ id: p.id, qty: 1, grind: "Celá zrna" });
      const original = addBtn.innerHTML;
      addBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';
      addBtn.classList.add("is-added");
      setTimeout(() => {
        addBtn.innerHTML = original;
        addBtn.classList.remove("is-added");
      }, 1300);
      showToast(`<strong>${p.name}</strong> přidáno do košíku.`);
      return;
    }

    const wishBtn = target.closest("[data-wish]");
    if (wishBtn) {
      toggleWish(wishBtn.dataset.wish);
      return;
    }

    const plusBtn = target.closest("[data-cart-plus]");
    if (plusBtn) {
      changeQty(plusBtn.dataset.cartPlus, 1);
      return;
    }

    const minusBtn = target.closest("[data-cart-minus]");
    if (minusBtn) {
      changeQty(minusBtn.dataset.cartMinus, -1);
      return;
    }

    const removeBtn = target.closest("[data-cart-remove]");
    if (removeBtn) {
      removeItem(removeBtn.dataset.cartRemove);
      return;
    }

    if (target.closest("[data-cart-shop]")) {
      closeOverlay(false);
      $("#obchod")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const searchResult = target.closest("[data-search-id]");
    if (searchResult) {
      openQuick(searchResult.dataset.searchId, searchResult);
      return;
    }

    const chip = target.closest("[data-query]");
    if (chip) {
      searchInput.value = chip.dataset.query;
      renderSearch(chip.dataset.query);
      searchInput.focus();
      return;
    }

    const planBtn = target.closest(".plan-option");
    if (planBtn) {
      choosePlan(planBtn);
      return;
    }

    if (target.closest("[data-qv-plus]")) {
      qvQty += 1;
      updateQuickQty();
      return;
    }
    if (target.closest("[data-qv-minus]")) {
      qvQty = Math.max(1, qvQty - 1);
      updateQuickQty();
      return;
    }

    const qvAdd = target.closest("[data-qv-add]");
    if (qvAdd && qvProduct) {
      const grind = $("#qvGrind", quickView)?.value || "Celá zrna";
      addToCart({ id: qvProduct.id, qty: qvQty, grind }, { openCart: true, trigger: qvAdd });
      return;
    }
  }

  function init() {
    overlays.forEach((el) => {
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    });

    renderProducts();
    renderCart();
    updateCartCount();
    observeReveals();
    initScrollEffects();
    initNewsletter();

    const planOptions = $$(".plan-option");
    planOptions.forEach((option, index) => {
      option.tabIndex = option.classList.contains("is-active") ? 0 : -1;
      option.addEventListener("keydown", (e) => {
        if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) return;
        e.preventDefault();
        const direction = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
        const next = planOptions[(index + direction + planOptions.length) % planOptions.length];
        choosePlan(next);
        next.focus();
      });
    });

    const heroProduct = PRODUCTS[0];
    $("#heroMini").innerHTML = `
      <button type="button" data-quick="${heroProduct.id}" aria-label="Rychlý náhled: ${heroProduct.name}">
        <span class="hero__mini-thumb" style="--tint:${heroProduct.tint}">${bagArt(heroProduct)}</span>
        <span class="hero__mini-info">
          <small>Bestseller</small>
          <strong>${heroProduct.name}</strong>
          <span>od ${money(heroProduct.price)}</span>
        </span>
        <svg class="icon" aria-hidden="true"><use href="#i-arrow-up"/></svg>
      </button>`;

    document.addEventListener("click", handleClick);
    scrim.addEventListener("click", () => closeOverlay());
    checkoutBtn.addEventListener("click", checkout);
    $("#addSubscription").addEventListener("click", addSubscription);

    searchInput.addEventListener("input", () => renderSearch(searchInput.value));

    $$("#mobileMenu a[href^='#']").forEach((link) => {
      link.addEventListener("click", () => closeOverlay(false));
    });

    document.addEventListener("keydown", (e) => {
      trapFocus(e);
      if (e.key === "Escape" && activeOverlay) {
        e.preventDefault();
        closeOverlay();
        return;
      }
      if (e.key === "Escape" && window.parent !== window) {
        e.preventDefault();
        window.parent.postMessage({ type: "pomelo-demo-close" }, window.location.origin);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch(document.activeElement);
        return;
      }
      if (
        e.key === "/" &&
        !activeOverlay &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
      ) {
        e.preventDefault();
        openSearch(document.activeElement);
      }
    });
  }

  init();
})();
