/* Product details and a persistent, guest shopping bag. */
(() => {
  const products = window.VELORA_PRODUCTS || [];
  const byId = (id) => products.find((product) => product.id === id);
  const money = (product, quantity = 1) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: product.currency,
      maximumFractionDigits: 0,
    }).format(product.price * quantity);
  let cart = [];
  try {
    const stored = JSON.parse(localStorage.getItem("velora-cart") || "[]");
    if (Array.isArray(stored))
      cart = stored.filter(
        (item) =>
          byId(item.id) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 99,
      );
  } catch (_) {
    /* The bag still works when browser storage is unavailable. */
  }
  const notice = document.createElement("p");
  notice.className = "shop-notice";
  notice.hidden = true;
  notice.setAttribute("role", "status");
  document.body.append(notice);
  let noticeTimer;
  const announce = (message) => {
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.hidden = true;
    }, 3000);
  };
  const save = () => {
    try {
      localStorage.setItem("velora-cart", JSON.stringify(cart));
    } catch (_) {}
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll(".cart-count,.mobile-bag-button b").forEach((badge) => {
      badge.textContent = count;
      badge.hidden = false;
    });
    document
      .querySelectorAll(".bag-button,.mobile-bag-button")
      .forEach((link) => link.setAttribute("aria-label", `Shopping cart, ${count} items`));
  };
  const add = (id) => {
    const product = byId(id);
    if (!product) return;
    const item = cart.find((item) => item.id === id);
    if (item && item.quantity >= 99) {
      announce("Maximum quantity is 99 per product.");
      return;
    }
    if (item) item.quantity++;
    else cart.push({ id, quantity: 1 });
    save();
    announce(`${product.name} added to cart.`);
  };
  const createDialog = (id) => {
    const dialog = document.createElement("dialog");
    dialog.id = id;
    dialog.className = "shop-dialog";
    dialog.innerHTML =
      '<button class="shop-dialog__close" type="button">Close</button><div data-dialog-content></div>';
    document.body.append(dialog);
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dialog.close();
      }
    });
    return dialog;
  };
  const details = createDialog("product-details"),
    bag = createDialog("cart");
  details.setAttribute("aria-labelledby", "detail-title");
  bag.setAttribute("aria-labelledby", "cart-title");
  let returnFocus;
  const open = (dialog) => {
    returnFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
  };
  [details, bag].forEach((dialog) =>
    dialog.addEventListener("close", () => {
      if (returnFocus?.isConnected) returnFocus.focus();
    }),
  );
  const showProduct = (id) => {
    const product = byId(id);
    if (!product) {
      announce("This product could not be found. Browse the collection for available shoes.");
      return;
    }
    details.querySelector("[data-dialog-content]").innerHTML =
      `<div class="shop-detail"><img src="${product.image}" alt="${product.name}"><div><p class="shop-eyebrow">VELORA / ${product.category}</p><h2 id="detail-title">${product.name}</h2><strong>${money(product)}</strong><p>Explore this ${product.category} style from the VELORA collection. Contact our team for sizing, materials and availability.</p><button type="button" data-detail-add="${product.id}">Add to Cart</button><a href="contact.html">Ask about this pair →</a><a href="Collections.html?category=${product.category}#products">Browse similar shoes →</a></div></div>`;
    open(details);
  };
  const renderBag = () => {
    const content = bag.querySelector("[data-dialog-content]");
    content.innerHTML = '<h2 id="cart-title">Your shopping bag</h2>';
    if (!cart.length) {
      content.insertAdjacentHTML(
        "beforeend",
        '<p>Your bag is empty. Find your next favourite pair.</p><a class="shop-primary" href="Collections.html#products">Shop Shoes →</a>',
      );
      return;
    }
    const totals = {};
    for (const item of cart) {
      const p = byId(item.id);
      totals[p.currency] = (totals[p.currency] || 0) + p.price * item.quantity;
      content.insertAdjacentHTML(
        "beforeend",
        `<article class="shop-cart-item"><img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>${money(p)} each · ${money(p, item.quantity)}</p><label>Quantity for ${p.name} <input type="number" min="1" max="99" step="1" value="${item.quantity}" data-cart-quantity="${p.id}"></label></div><button type="button" data-cart-remove="${p.id}" aria-label="Remove ${p.name} from cart">Remove</button></article>`,
      );
    }
    Object.entries(totals).forEach(([currency, price]) =>
      content.insertAdjacentHTML(
        "beforeend",
        `<p class="shop-cart-total">Subtotal (${currency}): ${money({ currency, price })}</p>`,
      ),
    );
    content.insertAdjacentHTML(
      "beforeend",
      '<p>Prices are shown in their listed currencies. Payment and online checkout are not available on this website. Contact VELORA for sizing, availability and ordering.</p><a class="shop-primary" href="contact.html">Contact to Order →</a>',
    );
  };
  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-shop-add],[data-detail-add],[data-quick-add]");
    if (addButton) {
      const id =
        addButton.dataset.shopAdd ||
        addButton.dataset.detailAdd ||
        products.find((p) => p.name === addButton.dataset.product)?.id;
      add(id);
      return;
    }
    const cartLink = event.target.closest('a[href="#cart"]');
    if (cartLink) {
      event.preventDefault();
      renderBag();
      open(bag);
      return;
    }
    const remove = event.target.closest("[data-cart-remove]");
    if (remove) {
      cart = cart.filter((item) => item.id !== remove.dataset.cartRemove);
      save();
      renderBag();
      bag.querySelector("[data-cart-remove],.shop-primary")?.focus();
      announce("Product removed from cart.");
      return;
    }
    const link = event.target.closest('a[href*="?product="]');
    if (link) {
      const url = new URL(link.href);
      if (url.origin === location.origin) {
        event.preventDefault();
        showProduct(url.searchParams.get("product"));
      }
    }
  });
  bag.addEventListener("change", (event) => {
    const input = event.target.closest("[data-cart-quantity]");
    if (!input) return;
    const item = cart.find((item) => item.id === input.dataset.cartQuantity);
    if (!item) return;
    if (!input.validity.valid) {
      input.value = item.quantity;
      announce("Choose a whole quantity between 1 and 99.");
      return;
    }
    item.quantity = Number(input.value);
    save();
    renderBag();
    bag.querySelector(`[data-cart-quantity="${item.id}"]`)?.focus();
  });
  const params = new URLSearchParams(location.search);
  const aliases = { casual: "everyday", street: "sneakers", running: "performance" };
  const requested =
    params.get("category") ||
    { performance: "performance", street: "sneakers", trail: "trail" }[location.hash.slice(1)];
  const category = aliases[requested] || requested;
  const cards = [...document.querySelectorAll("[data-shop-card]")];
  const search = document.querySelector("[data-shop-search]");
  const applyFilter = () => {
    let wishlist = [];
    try {
      wishlist = JSON.parse(localStorage.getItem("veloraWishlist") || "[]");
      if (!Array.isArray(wishlist)) wishlist = [];
    } catch (_) {}
    let count = 0;
    cards.forEach((card) => {
      card.hidden = !!(
        (category && card.dataset.category !== category) ||
        (search?.value && !card.dataset.name.includes(search.value.trim().toLowerCase())) ||
        (params.has("wishlist") && !wishlist.includes(card.querySelector("h3").textContent.trim()))
      );
      if (!card.hidden) count++;
    });
    const status = document.querySelector("[data-result-count]");
    if (status)
      status.textContent = `${count} ${count === 1 ? "style" : "styles"}${category ? " / " + category : ""}${params.has("wishlist") ? " / Wishlist" : ""}`;
    const empty = document.querySelector("[data-shop-empty]");
    if (empty) empty.hidden = count !== 0;
  };
  search?.addEventListener("input", applyFilter);
  document.querySelector("[data-shop-sort]")?.addEventListener("change", (event) => {
    const sorted =
      event.target.value === "name"
        ? [...cards].sort((a, b) => a.dataset.name.localeCompare(b.dataset.name))
        : cards;
    sorted.forEach((card) => card.parentElement.append(card));
  });
  document.querySelectorAll(".shop-categories a").forEach((link) => {
    const selected = new URL(link.href).searchParams.get("category");
    if ((selected || null) === (category || null)) link.setAttribute("aria-current", "page");
  });
  document.querySelectorAll("[data-wishlist]").forEach((button) =>
    button.addEventListener("click", () => {
      if (params.has("wishlist")) applyFilter();
    }),
  );
  document.querySelectorAll(".nav-link[href]").forEach((link) => {
    if (decodeURIComponent(new URL(link.href).pathname) === decodeURIComponent(location.pathname)) {
      link.classList.add("nav-link--active");
      link.setAttribute("aria-current", "page");
    }
  });
  document.querySelectorAll(".primary-nav a").forEach((link) =>
    link.addEventListener("click", () => {
      document.querySelector("[data-site-header]")?.classList.remove("menu-open");
      document.querySelector("[data-menu-toggle]")?.setAttribute("aria-expanded", "false");
    }),
  );
  save();
  applyFilter();
  if (params.has("product")) showProduct(params.get("product"));
  if (location.hash === "#cart") {
    renderBag();
    open(bag);
  }
  window.addEventListener("storage", (event) => {
    if (event.key === "velora-cart") {
      try {
        const value = JSON.parse(event.newValue || "[]");
        if (Array.isArray(value))
          cart = value.filter(
            (item) =>
              byId(item.id) &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              item.quantity <= 99,
          );
        save();
        if (bag.open) renderBag();
      } catch (_) {}
    }
    if (event.key === "veloraWishlist") applyFilter();
  });
})();
