/* VELORA header controls */
(() => {
  const root = document.documentElement;
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  const dropdownToggle = header.querySelector('.nav-dropdown-toggle');
  const dropdownItem = header.querySelector('.nav-item--has-menu');
  const menuToggle = header.querySelector('[data-menu-toggle]');
  const themeToggles = header.querySelectorAll('[data-theme-toggle]');
  const rtlToggles = header.querySelectorAll('[data-rtl-toggle]');
  const closeDropdown = () => { dropdownItem?.classList.remove('is-open'); dropdownToggle?.setAttribute('aria-expanded', 'false'); };
  const closeMenu = () => { header.classList.remove('menu-open'); menuToggle?.setAttribute('aria-expanded', 'false'); menuToggle?.setAttribute('aria-label', 'Open navigation menu'); };

  const currentPage = decodeURIComponent(window.location.pathname.split('/').pop() || '').toLowerCase();
  const isHomePage = currentPage === 'home page1.html' || currentPage === 'home page 2.html' || currentPage === '' || currentPage === 'index.html';
  header.querySelectorAll('.nav-link,.home-menu__link').forEach((link) => {
    link.classList.remove('nav-link--active', 'home-menu__link--active');
    link.removeAttribute('aria-current');
  });
  if (isHomePage) {
    dropdownToggle?.classList.add('nav-link--active');
    const activeHomeLink = [...header.querySelectorAll('.home-menu__link')].find((link) => decodeURIComponent(link.getAttribute('href') || '').toLowerCase() === currentPage) || header.querySelector('.home-menu__link');
    activeHomeLink?.classList.add('home-menu__link--active');
    activeHomeLink?.setAttribute('aria-current', 'page');
  } else {
    const activeLink = [...header.querySelectorAll('.nav-item > .nav-link[href]')].find((link) => decodeURIComponent((link.getAttribute('href') || '').split('/').pop()).toLowerCase() === currentPage);
    activeLink?.classList.add('nav-link--active');
    activeLink?.setAttribute('aria-current', 'page');
  }

  dropdownToggle?.addEventListener('click', () => {
    const isOpen = dropdownItem.classList.toggle('is-open');
    dropdownToggle.setAttribute('aria-expanded', String(isOpen));
  });
  menuToggle?.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  });
  document.addEventListener('click', (event) => { if (!header.contains(event.target)) { closeDropdown(); closeMenu(); } });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDropdown(); closeMenu(); menuToggle?.focus(); } });

  const savedTheme = localStorage.getItem('velora-theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    themeToggles.forEach((toggle) => toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'));
  };
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  themeToggles.forEach((toggle) => toggle.addEventListener('click', () => { const next = root.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(next); localStorage.setItem('velora-theme', next); }));

  rtlToggles.forEach((toggle) => toggle.addEventListener('click', () => {
    const enabled = root.dir !== 'rtl';
    root.dir = enabled ? 'rtl' : 'ltr';
    rtlToggles.forEach((control) => {
      control.setAttribute('aria-pressed', String(enabled));
      control.textContent = control.classList.contains('mobile-rtl-button') ? (enabled ? 'Switch to LTR' : 'Switch to RTL') : (enabled ? 'LTR' : 'RTL');
      control.setAttribute('aria-label', enabled ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout');
    });
  }));

  document.querySelectorAll('[data-newsletter-form]').forEach((newsletterForm) => {
    newsletterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = newsletterForm.elements.email;
      const message = newsletterForm.querySelector('[data-newsletter-message]');
      const valid = email.value.trim() && email.validity.valid;
      message.classList.remove('is-error', 'is-success');
      if (!valid) {
        message.textContent = 'Enter a valid email address to subscribe.';
        message.classList.add('is-error');
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        return;
      }
      email.removeAttribute('aria-invalid');
      message.textContent = 'You’re on the list. Welcome to VELORA.';
      message.classList.add('is-success');
      newsletterForm.reset();
    });
  });

  const productAnnouncement = document.querySelector('[data-product-announcement]');
  const wishlistButtons = [...document.querySelectorAll('[data-wishlist]')];
  const wishlistProductName = (button) => (button.dataset.product || button.getAttribute('aria-label') || '').replace(/^(Add|Remove) /, '').replace(/ (to|from) wishlist$/, '');
  const updateHeaderBadge = (badge, count) => {
    badge.textContent = String(count);
    badge.hidden = false;
  };
  document.querySelectorAll('.cart-count').forEach((badge) => updateHeaderBadge(badge, Number(badge.textContent) || 0));
  let savedWishlist = new Set();
  try { savedWishlist = new Set(JSON.parse(localStorage.getItem('veloraWishlist') || '[]')); } catch (_) { savedWishlist = new Set(); }
  const updateWishlistHeader = () => {
    const count = savedWishlist.size;
    document.querySelectorAll('.wishlist-count').forEach((badge) => updateHeaderBadge(badge, count));
    document.querySelectorAll('.mobile-wishlist-button b').forEach((badge) => { badge.textContent = String(count); });
    document.querySelectorAll('.wishlist-header-button,.mobile-wishlist-button').forEach((control) => {
      control.setAttribute('aria-label', `Wishlist, ${count} ${count === 1 ? 'item' : 'items'}`);
    });
  };
  wishlistButtons.forEach((button) => {
    const product = wishlistProductName(button);
    if (savedWishlist.has(product)) {
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', `Remove ${product} from wishlist`);
    }
    button.addEventListener('click', () => {
      const selected = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${selected ? 'Remove' : 'Add'} ${product} ${selected ? 'from' : 'to'} wishlist`);
      if (selected) savedWishlist.add(product); else savedWishlist.delete(product);
      try { localStorage.setItem('veloraWishlist', JSON.stringify([...savedWishlist])); } catch (_) { /* Storage may be unavailable in privacy mode. */ }
      updateWishlistHeader();
      if (productAnnouncement) productAnnouncement.textContent = `${product} ${selected ? 'added to' : 'removed from'} wishlist.`;
    });
  });
  updateWishlistHeader();

  document.querySelectorAll('[data-quick-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const product = button.dataset.product;
      const label = button.querySelector('span');
      const cartCounts = document.querySelectorAll('.cart-count, .mobile-bag-button b');
      const isArrivalQuickAdd = button.classList.contains('arrival-product__quick');
      const isHomepageQuickAdd = button.classList.contains('product-card__quick-add');
      const canToggleQuickAdd = isArrivalQuickAdd || isHomepageQuickAdd;
      const originalLabel = button.dataset.quickAddLabel || label?.textContent || 'Quick Add';
      button.dataset.quickAddLabel = originalLabel;
      const isAdded = button.classList.contains('is-added');
      if (isAdded && canToggleQuickAdd) {
        button.classList.remove('is-added');
        button.setAttribute('aria-label', `Add ${product} to cart`);
        if (label) label.textContent = originalLabel;
        cartCounts.forEach((count) => {
          const nextCount = Math.max(0, Number(count.textContent) - 1);
          if (count.classList.contains('cart-count')) updateHeaderBadge(count, nextCount);
          else count.textContent = String(nextCount);
        });
        const remainingItems = Number(cartCounts[0]?.textContent || 0);
        document.querySelectorAll('.bag-button, .mobile-bag-button').forEach((bag) => bag.setAttribute('aria-label', `Shopping cart, ${remainingItems} ${remainingItems === 1 ? 'item' : 'items'}`));
        if (productAnnouncement) productAnnouncement.textContent = `${product} removed from cart.`;
        return;
      }
      if (isAdded) return;
      button.classList.add('is-added');
      button.setAttribute('aria-label', `${product} added to cart`);
      if (label) label.textContent = 'Added';
      cartCounts.forEach((count) => {
        const nextCount = Number(count.textContent) + 1;
        if (count.classList.contains('cart-count')) updateHeaderBadge(count, nextCount);
        else count.textContent = String(nextCount);
      });
      document.querySelectorAll('.bag-button, .mobile-bag-button').forEach((bag) => bag.setAttribute('aria-label', 'Shopping cart with added items'));
      if (productAnnouncement) productAnnouncement.textContent = `${product} added to cart.`;
    });
  });

  const collectionTabs = [...document.querySelectorAll('[data-collection-tab]')];
  const collectionPreview = document.querySelector('#collection-preview');
  const collectionImage = collectionPreview?.querySelector('[data-collection-image]');
  const collectionName = collectionPreview?.querySelector('[data-collection-name]');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let collectionSwapTimer;
  const selectCollection = (tab) => {
    if (!tab || tab.getAttribute('aria-selected') === 'true') return;
    collectionTabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    collectionPreview?.setAttribute('aria-labelledby', tab.id);
    collectionPreview?.classList.add('is-changing');
    window.clearTimeout(collectionSwapTimer);
    collectionSwapTimer = window.setTimeout(() => {
      if (collectionImage) {
        collectionImage.src = tab.dataset.image;
        collectionImage.alt = tab.dataset.alt;
      }
      if (collectionName) collectionName.textContent = tab.querySelector('strong').textContent;
      collectionPreview?.classList.remove('is-changing');
    }, reduceMotion ? 0 : 120);
  };
  collectionTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectCollection(tab));
    tab.addEventListener('focus', () => selectCollection(tab));
    tab.addEventListener('pointerenter', () => selectCollection(tab));
    tab.addEventListener('keydown', (event) => {
      const previousKey = root.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      const nextKey = root.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      let targetIndex;
      if (event.key === previousKey || event.key === 'ArrowUp') targetIndex = (index - 1 + collectionTabs.length) % collectionTabs.length;
      if (event.key === nextKey || event.key === 'ArrowDown') targetIndex = (index + 1) % collectionTabs.length;
      if (event.key === 'Home') targetIndex = 0;
      if (event.key === 'End') targetIndex = collectionTabs.length - 1;
      if (targetIndex === undefined) return;
      event.preventDefault();
      collectionTabs[targetIndex].focus();
    });
  });

  document.querySelectorAll('[data-product-rail]').forEach((rail) => {
    const viewport = rail.querySelector('[data-rail-viewport]');
    const previous = rail.querySelector('[data-rail-previous]');
    const next = rail.querySelector('[data-rail-next]');
    if (!viewport || !previous || !next) return;
    const move = (forward) => {
      const item = viewport.querySelector('.drop-product');
      const gap = parseFloat(getComputedStyle(viewport.querySelector('.new-drop-rail__track')).columnGap) || 0;
      const distance = (item?.getBoundingClientRect().width || viewport.clientWidth * .8) + gap;
      const rtlFactor = root.dir === 'rtl' ? -1 : 1;
      viewport.scrollBy({ left: distance * (forward ? 1 : -1) * rtlFactor, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    previous.addEventListener('click', () => move(false));
    next.addEventListener('click', () => move(true));
  });

  const servicesHero = document.querySelector('[data-services-hero]');
  if (servicesHero && !reduceMotion) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => servicesHero.classList.add('is-ready')));
  }

  const contactHero = document.querySelector('[data-contact-hero]');
  if (contactHero && !reduceMotion) {
    const contactImage = contactHero.querySelector('.contact-concierge-hero__visual img');
    const revealContactHero = () => window.requestAnimationFrame(() => contactHero.classList.add('is-ready'));
    if (contactImage?.complete) revealContactHero();
    else {
      contactImage?.addEventListener('load', revealContactHero, { once:true });
      contactImage?.addEventListener('error', revealContactHero, { once:true });
    }
  }

  const newDropHero = document.querySelector('[data-new-drop-hero]');
  if (newDropHero && !reduceMotion) {
    const dropProduct = newDropHero.querySelector('.new-drop-hero__visual img');
    const revealDrop = () => window.requestAnimationFrame(() => newDropHero.classList.add('is-ready'));
    if (dropProduct?.complete) revealDrop();
    else {
      dropProduct?.addEventListener('load', revealDrop, { once:true });
      dropProduct?.addEventListener('error', revealDrop, { once:true });
    }
  }

  const categorySelector = document.querySelector('[data-category-selector]');
  if (categorySelector && !reduceMotion && 'IntersectionObserver' in window) {
    categorySelector.setAttribute('data-reveal-ready', '');
    const categorySelectorObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      categorySelector.classList.add('is-visible');
      observer.disconnect();
    }, { threshold:0.14 });
    categorySelectorObserver.observe(categorySelector);
  }

  const arrivalsSort = document.querySelector('[data-arrivals-sort]');
  const arrivalsFilter = document.querySelector('[data-arrivals-filter]');
  const arrivalsNavigation = document.querySelector('[data-arrivals-navigation]');
  const arrivalsFilterPanel = document.querySelector('[data-arrivals-filter-panel]');
  const arrivalsGrid = document.querySelector('.arrival-gallery__grid');
  if (arrivalsSort && arrivalsGrid) {
    const arrivalProducts = [...arrivalsGrid.querySelectorAll('.arrival-product')];
    const originalOrder = new Map(arrivalProducts.map((product, index) => [product, index]));
    const priceOf = (product) => Number((product.querySelector('.arrival-product__meta > strong')?.textContent || '').replace(/[^0-9.]/g, '')) || 0;
    const sortToggle = arrivalsSort.querySelector('.drop-navigation__sort-toggle');
    const sortMenu = arrivalsSort.querySelector('.drop-navigation__sort-menu');
    const sortLabel = arrivalsSort.querySelector('[data-arrivals-sort-label]');
    const sortOptions = [...arrivalsSort.querySelectorAll('[data-sort-value]')];
    const closeSort = (restoreFocus = false) => {
      sortMenu.hidden = true;
      sortToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) sortToggle.focus();
    };
    const openSort = () => {
      sortMenu.hidden = false;
      sortToggle.setAttribute('aria-expanded', 'true');
    };
    const sortProducts = (value) => {
      const products = [...arrivalProducts];
      if (value === 'price-low') products.sort((a, b) => priceOf(a) - priceOf(b));
      else if (value === 'price-high') products.sort((a, b) => priceOf(b) - priceOf(a));
      else products.sort((a, b) => originalOrder.get(a) - originalOrder.get(b));
      products.forEach((product) => arrivalsGrid.append(product));
    };
    sortToggle.addEventListener('click', () => {
      const opening = sortToggle.getAttribute('aria-expanded') !== 'true';
      if (opening) {
        openSort();
        if (arrivalsFilterPanel) arrivalsFilterPanel.hidden = true;
        arrivalsFilter?.setAttribute('aria-expanded', 'false');
      } else closeSort();
    });
    sortToggle.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      openSort();
      const selected = sortOptions.find((option) => option.getAttribute('aria-selected') === 'true');
      (selected || sortOptions[0])?.focus();
    });
    sortOptions.forEach((option, index) => {
      option.addEventListener('click', () => {
        sortOptions.forEach((item) => item.setAttribute('aria-selected', String(item === option)));
        sortLabel.textContent = option.textContent;
        sortProducts(option.dataset.sortValue);
        closeSort(true);
      });
      option.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); closeSort(true); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? sortOptions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + sortOptions.length) % sortOptions.length;
        sortOptions[nextIndex].focus();
      });
    });
    document.addEventListener('click', (event) => { if (!arrivalsSort.contains(event.target)) closeSort(); });
  }
  if (arrivalsFilter && arrivalsFilterPanel) {
    const filterInputs = [...arrivalsFilterPanel.querySelectorAll('input')];
    const clearFilters = arrivalsFilterPanel.querySelector('[data-arrivals-filter-clear]');
    const applyFilters = arrivalsFilterPanel.querySelector('[data-arrivals-filter-apply]');
    const filterStatus = arrivalsFilterPanel.querySelector('[data-arrivals-filter-status]');
    const closeFilters = (restoreFocus = false) => {
      arrivalsFilterPanel.hidden = true;
      arrivalsFilter.setAttribute('aria-expanded', 'false');
      if (restoreFocus) arrivalsFilter.focus();
    };
    arrivalsFilter.addEventListener('click', () => {
      const active = arrivalsFilter.getAttribute('aria-expanded') !== 'true';
      arrivalsFilterPanel.hidden = !active;
      arrivalsFilter.setAttribute('aria-expanded', String(active));
      arrivalsFilter.setAttribute('aria-label', active ? 'Close arrival filters' : 'Open arrival filters');
      if (active) {
        const sortToggle = arrivalsSort?.querySelector('.drop-navigation__sort-toggle');
        const sortMenu = arrivalsSort?.querySelector('.drop-navigation__sort-menu');
        if (sortMenu) sortMenu.hidden = true;
        sortToggle?.setAttribute('aria-expanded', 'false');
      }
    });
    clearFilters?.addEventListener('click', () => {
      filterInputs.forEach((input) => { input.checked = input.type === 'radio' && input.value === 'all'; });
      if (filterStatus) filterStatus.textContent = 'All filters cleared.';
    });
    applyFilters?.addEventListener('click', () => {
      const count = filterInputs.filter((input) => input.checked && input.value !== 'all').length;
      if (filterStatus) filterStatus.textContent = count ? `${count} filter${count === 1 ? '' : 's'} selected.` : 'Showing all new arrivals.';
      closeFilters(true);
    });
    arrivalsNavigation?.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !arrivalsFilterPanel.hidden) closeFilters(true); });
  }

  const formaStyleStudy = document.querySelector('[data-forma-style-study]');
  if (formaStyleStudy && !reduceMotion && 'IntersectionObserver' in window) {
    formaStyleStudy.setAttribute('data-reveal-ready', '');
    const formaStudyObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      formaStyleStudy.classList.add('is-visible');
      observer.disconnect();
    }, { threshold:0.12 });
    formaStudyObserver.observe(formaStyleStudy);
  }

  const weeklyStyles = document.querySelector('[data-weekly-styles]');
  if (weeklyStyles && !reduceMotion && 'IntersectionObserver' in window) {
    weeklyStyles.setAttribute('data-reveal-ready', '');
    const weeklyStylesObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      weeklyStyles.classList.add('is-visible');
      observer.disconnect();
    }, { threshold:0.12 });
    weeklyStylesObserver.observe(weeklyStyles);
  }

  const arrivalNewsletter = document.querySelector('[data-arrival-newsletter]');
  if (arrivalNewsletter && !reduceMotion && 'IntersectionObserver' in window) {
    arrivalNewsletter.setAttribute('data-reveal-ready', '');
    const arrivalNewsletterObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      arrivalNewsletter.classList.add('is-visible');
      observer.disconnect();
    }, { threshold:0.14 });
    arrivalNewsletterObserver.observe(arrivalNewsletter);
  }

  const arrivalNewsletterForm = document.querySelector('[data-arrival-newsletter-form]');
  if (arrivalNewsletterForm) {
    arrivalNewsletterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = arrivalNewsletterForm.elements.email;
      const message = arrivalNewsletterForm.querySelector('[data-arrival-newsletter-message]');
      message.classList.remove('is-error');
      if (!email.value.trim() || !email.validity.valid) {
        email.setAttribute('aria-invalid', 'true');
        message.textContent = 'Please enter a valid email address.';
        message.classList.add('is-error');
        email.focus();
        return;
      }
      email.removeAttribute('aria-invalid');
      message.textContent = 'Email validated — newsletter service connection required.';
    });
  }

  const featuredDrop = document.querySelector('[data-featured-drop]');
  if (featuredDrop && !reduceMotion && 'IntersectionObserver' in window) {
    const featuredProduct = featuredDrop.querySelector('.featured-drop__product img');
    featuredDrop.setAttribute('data-reveal-ready', '');
    const showFeaturedDrop = () => window.requestAnimationFrame(() => featuredDrop.classList.add('is-visible'));
    const featuredObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (featuredProduct?.complete) showFeaturedDrop();
      else {
        featuredProduct?.addEventListener('load', showFeaturedDrop, { once:true });
        featuredProduct?.addEventListener('error', showFeaturedDrop, { once:true });
      }
    }, { threshold:0.18 });
    featuredObserver.observe(featuredDrop);
  }

  const serviceOffers = document.querySelector('[data-service-offers]');
  if (serviceOffers && !reduceMotion && 'IntersectionObserver' in window) {
    serviceOffers.setAttribute('data-reveal-ready', '');
    const serviceOffersObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      serviceOffers.classList.add('is-visible');
      observer.disconnect();
    }, { threshold:0.1 });
    serviceOffersObserver.observe(serviceOffers);
  }

  const sizeConsultation = document.querySelector('[data-size-consultation]');
  if (sizeConsultation) {
    const sizeValues = { US: '9', UK: '8', EU: '42' };
    const sizeButtons = [...sizeConsultation.querySelectorAll('[data-size-unit]')];
    const primaryUnit = sizeConsultation.querySelector('[data-primary-unit]');
    const primarySize = sizeConsultation.querySelector('[data-primary-size]');
    const converter = sizeConsultation.querySelector('.size-consultation__converter');
    let sizeTimer;

    const selectSizeUnit = (button, moveFocus = false) => {
      const unit = button.dataset.sizeUnit;
      sizeButtons.forEach((item) => {
        const active = item === button;
        item.setAttribute('aria-checked', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      if (moveFocus) button.focus();
      converter.classList.add('is-changing');
      window.clearTimeout(sizeTimer);
      sizeTimer = window.setTimeout(() => {
        primaryUnit.textContent = unit;
        primarySize.textContent = sizeValues[unit];
        sizeConsultation.querySelectorAll('[data-size-equivalent]').forEach((item) => {
          item.hidden = item.dataset.sizeEquivalent === unit;
        });
        converter.classList.remove('is-changing');
      }, reduceMotion ? 0 : 140);
    };

    sizeButtons.forEach((button, index) => {
      button.tabIndex = button.getAttribute('aria-checked') === 'true' ? 0 : -1;
      button.addEventListener('click', () => selectSizeUnit(button));
      button.addEventListener('keydown', (event) => {
        const previousKey = root.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        const nextKey = root.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        let targetIndex;
        if (event.key === previousKey || event.key === 'ArrowUp') targetIndex = (index - 1 + sizeButtons.length) % sizeButtons.length;
        if (event.key === nextKey || event.key === 'ArrowDown') targetIndex = (index + 1) % sizeButtons.length;
        if (event.key === 'Home') targetIndex = 0;
        if (event.key === 'End') targetIndex = sizeButtons.length - 1;
        if (targetIndex === undefined) return;
        event.preventDefault();
        selectSizeUnit(sizeButtons[targetIndex], true);
      });
    });
  }

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    const enquiryType = contactForm.querySelector('#contact-type');
    const orderField = contactForm.querySelector('[data-order-number]');
    const orderInput = orderField?.querySelector('input');
    const status = contactForm.querySelector('[data-contact-status]');
    const fields = [...contactForm.querySelectorAll('input:not([type="hidden"]), select, textarea')];

    if (enquiryType) {
      const field = enquiryType.closest('.contact-field--select');
      const label = field?.querySelector('label');
      const custom = document.createElement('div');
      const trigger = document.createElement('button');
      const menu = document.createElement('div');
      const options = [...enquiryType.options];
      const menuId = `${enquiryType.id}-menu`;

      custom.className = 'contact-select';
      trigger.className = 'contact-select__trigger';
      trigger.id = `${enquiryType.id}-button`;
      trigger.type = 'button';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', menuId);
      trigger.innerHTML = `<span>${enquiryType.selectedOptions[0]?.textContent || options[0].textContent}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg>`;

      menu.className = 'contact-select__menu';
      menu.id = menuId;
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-label', 'Enquiry Type');
      menu.hidden = true;

      const optionButtons = options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.role = 'option';
        button.dataset.value = option.value;
        button.textContent = option.textContent;
        button.setAttribute('aria-selected', String(option.selected));
        button.tabIndex = index === enquiryType.selectedIndex ? 0 : -1;
        menu.append(button);
        return button;
      });

      const closeMenu = (restoreFocus = false) => {
        custom.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        if (restoreFocus) trigger.focus();
      };
      const openMenu = () => {
        custom.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
        (optionButtons[enquiryType.selectedIndex] || optionButtons[0])?.focus();
      };
      const chooseOption = (button) => {
        enquiryType.value = button.dataset.value;
        trigger.querySelector('span').textContent = button.textContent;
        optionButtons.forEach((item) => {
          const selected = item === button;
          item.setAttribute('aria-selected', String(selected));
          item.tabIndex = selected ? 0 : -1;
        });
        enquiryType.dispatchEvent(new Event('change', { bubbles:true }));
        closeMenu(true);
      };

      trigger.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu());
      trigger.addEventListener('keydown', (event) => {
        if (['ArrowDown','ArrowUp','Enter',' '].includes(event.key)) {
          event.preventDefault();
          openMenu();
        }
      });
      optionButtons.forEach((button) => {
        button.addEventListener('click', () => chooseOption(button));
        button.addEventListener('keydown', (event) => {
          const current = optionButtons.indexOf(button);
          if (event.key === 'Escape' || event.key === 'Tab') {
            if (event.key === 'Escape') event.preventDefault();
            closeMenu(event.key === 'Escape');
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            chooseOption(button);
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            optionButtons[(current + offset + optionButtons.length) % optionButtons.length].focus();
          }
        });
      });
      document.addEventListener('pointerdown', (event) => {
        if (!custom.contains(event.target)) closeMenu();
      });

      enquiryType.classList.add('contact-select__native');
      field?.classList.add('has-custom-select');
      label?.setAttribute('for', trigger.id);
      custom.append(trigger, menu);
      enquiryType.insertAdjacentElement('afterend', custom);
    }

    const errorMessage = (field) => {
      if (field.validity.valueMissing) return field.tagName === 'SELECT' ? 'Please choose an enquiry type.' : `Please enter your ${field.name === 'name' ? 'name' : field.name}.`;
      if (field.validity.typeMismatch) return 'Enter a valid email address.';
      return 'Check this field and try again.';
    };

    const validateContactField = (field) => {
      if (field.disabled || field.hidden) return true;
      const error = document.getElementById(`${field.id}-error`);
      const valid = field.checkValidity();
      if (valid) {
        field.removeAttribute('aria-invalid');
        if (error) error.textContent = '';
      } else {
        field.setAttribute('aria-invalid', 'true');
        if (error) error.textContent = errorMessage(field);
      }
      return valid;
    };

    const updateOrderField = () => {
      const showOrder = enquiryType?.value === 'order-support';
      if (orderField) orderField.hidden = !showOrder;
      if (orderInput) {
        orderInput.disabled = !showOrder;
        if (!showOrder) {
          orderInput.value = '';
          orderInput.removeAttribute('aria-invalid');
          const error = document.getElementById('contact-order-error');
          if (error) error.textContent = '';
        }
      }
    };

    enquiryType?.addEventListener('change', () => {
      updateOrderField();
      validateContactField(enquiryType);
    });
    fields.forEach((field) => {
      field.addEventListener('blur', () => validateContactField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateContactField(field);
        if (status) {
          status.textContent = '';
          status.classList.remove('is-error', 'is-success');
        }
      });
    });
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const activeFields = fields.filter((field) => !field.disabled);
      const valid = activeFields.map(validateContactField).every(Boolean);
      status?.classList.remove('is-error', 'is-success');
      if (!valid) {
        const firstInvalid = activeFields.find((field) => field.getAttribute('aria-invalid') === 'true');
        firstInvalid?.focus();
        if (status) {
          status.textContent = 'Please correct the highlighted fields before continuing.';
          status.classList.add('is-error');
        }
        return;
      }
      if (status) {
        status.textContent = 'Details checked. Demo form only—connect a form endpoint to transmit this enquiry.';
        status.classList.add('is-success');
      }
    });
    updateOrderField();
  }

  const contactFaq = document.querySelector('[data-contact-faq]');
  if (contactFaq) {
    const faqButtons = [...contactFaq.querySelectorAll('.contact-faq__item button')];
    const closeFaq = (button) => {
      button.setAttribute('aria-expanded', 'false');
      button.closest('.contact-faq__item')?.classList.remove('is-open');
    };

    faqButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const willOpen = button.getAttribute('aria-expanded') !== 'true';
        faqButtons.forEach(closeFaq);
        button.setAttribute('aria-expanded', String(willOpen));
        button.closest('.contact-faq__item')?.classList.toggle('is-open', willOpen);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
        event.preventDefault();
        closeFaq(button);
        button.focus();
      });
    });
  }

  const aboutStory = document.querySelector('[data-about-story]');
  if (aboutStory && !reduceMotion && 'IntersectionObserver' in window) {
    aboutStory.setAttribute('data-reveal-ready', '');
    const aboutStoryObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      aboutStory.classList.add('is-visible');
      observer.disconnect();
    }, { threshold:0.14 });
    aboutStoryObserver.observe(aboutStory);
  }

  const fadeUpSections = [
    ...document.querySelectorAll('main > section:not(:first-of-type)'),
    ...document.querySelectorAll('body > section'),
    ...document.querySelectorAll('.site-footer')
  ];
  if (fadeUpSections.length) {
    fadeUpSections.forEach((section) => section.classList.add('section-fade-up'));

    if (reduceMotion || !('IntersectionObserver' in window)) {
      fadeUpSections.forEach((section) => section.classList.add('is-visible'));
    } else {
      const fadeUpObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold:0.08, rootMargin:'0px 0px -8% 0px' });

      fadeUpSections.forEach((section) => fadeUpObserver.observe(section));
    }
  }

})();

/* Native lazy images with cached-load, fade-in and error-state handling */
(() => {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]:not([aria-hidden="true"]):not([alt=""])');

  lazyImages.forEach((img) => {
    const shell = img.parentElement;
    if (!shell) return;

    shell.classList.add('image-loading');

    const finish = () => {
      shell.classList.remove('image-error');
      shell.classList.add('image-loaded');
      window.setTimeout(() => {
        shell.classList.remove('image-loading', 'image-loaded');
      }, 280);
    };
    const fail = () => {
      shell.classList.remove('image-loaded');
      shell.classList.add('image-error');
      img.setAttribute('aria-hidden', 'true');
    };

    if (img.complete) {
      if (img.naturalWidth > 0) finish();
      else fail();
      return;
    }

    img.addEventListener('load', finish, { once:true });
    img.addEventListener('error', fail, { once:true });
  });
})();

/* Coming Soon launch countdown and access form */
(() => {
  const countdown = document.querySelector('[data-countdown]');
  const accessForm = document.querySelector('[data-coming-form]');
  if (!countdown && !accessForm) return;

  if (countdown) {
    // Edit this data attribute in coming soon.html to change the launch date.
    const launchAt = new Date(countdown.dataset.launchDate).getTime();
    const outputs = {
      days:countdown.querySelector('[data-countdown-days]'),
      hours:countdown.querySelector('[data-countdown-hours]'),
      minutes:countdown.querySelector('[data-countdown-minutes]'),
      seconds:countdown.querySelector('[data-countdown-seconds]')
    };
    let timer;
    const renderCountdown = () => {
      const remaining = Math.max(0, launchAt - Date.now());
      const seconds = Math.floor(remaining / 1000);
      const values = {
        days:Math.floor(seconds / 86400),
        hours:Math.floor((seconds % 86400) / 3600),
        minutes:Math.floor((seconds % 3600) / 60),
        seconds:seconds % 60
      };
      Object.entries(values).forEach(([unit, value]) => { outputs[unit].textContent = String(value).padStart(2, '0'); });
      if (remaining > 0) return;
      countdown.classList.add('is-live');
      countdown.setAttribute('aria-label', "We're live");
      window.clearInterval(timer);
    };
    renderCountdown();
    if (!countdown.classList.contains('is-live')) timer = window.setInterval(renderCountdown, 1000);
  }

  if (accessForm) {
    const email = accessForm.elements.email;
    const message = accessForm.querySelector('[data-coming-message]');
    accessForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const valid = email.value.trim() && email.validity.valid;
      email.toggleAttribute('aria-invalid', !valid);
      message.classList.toggle('is-error', !valid);
      message.classList.toggle('is-success', valid);
      message.textContent = valid ? "You're on the list." : 'Enter a valid email address.';
      if (!valid) email.focus();
      else accessForm.reset();
    });
    email.addEventListener('input', () => {
      if (email.getAttribute('aria-invalid') !== 'true') return;
      email.removeAttribute('aria-invalid');
      message.textContent = '';
      message.classList.remove('is-error');
    });
  }
})();

/* 404 recovery action */
(() => {
  const backButton = document.querySelector('[data-error-back]');
  if (!backButton) return;
  backButton.addEventListener('click', () => {
    const hasPreviousPage = window.history.length > 1 && Boolean(document.referrer);
    if (hasPreviousPage) window.history.back();
    else window.location.href = 'Home page1.html';
  });
})();

/* Register page validation and password controls */
(() => {
  const form = document.querySelector('[data-register-form]');
  if (!form) return;

  const password = form.querySelector('#register-password');
  const confirmPassword = form.querySelector('#register-confirm-password');
  const strength = form.querySelector('[data-password-strength]');
  const status = form.querySelector('[data-register-status]');
  const submit = form.querySelector('.register-submit');
  const submitLabel = form.querySelector('[data-register-submit-label]');

  form.querySelectorAll('[data-register-password-toggle]').forEach((toggle) => {
    const input = toggle.previousElementSibling;
    toggle.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      toggle.setAttribute('aria-pressed', String(show));
    });
  });

  const passwordLevel = (value) => {
    if (!value) return '';
    const variety = [/[a-z]/i, /[0-9]/, /[^a-z0-9]/i].filter((pattern) => pattern.test(value)).length;
    if (value.length >= 10 && variety >= 2) return 'strong';
    if (value.length >= 8 && variety >= 2) return 'medium';
    return 'weak';
  };
  password?.addEventListener('input', () => {
    const level = passwordLevel(password.value);
    strength.dataset.level = level;
    const label = strength.querySelector('small');
    label.textContent = level ? `${level[0].toUpperCase()}${level.slice(1)}` : 'Strength';
  });

  const messageFor = (field) => {
    if (field.id === 'register-confirm-password' && field.value !== password.value) return 'Passwords must match.';
    if (field.id === 'register-phone' && field.value && !/^[+()\d\s-]{7,20}$/.test(field.value)) return 'Enter a valid phone number.';
    if (field.type === 'checkbox' && !field.checked) return 'Please accept the terms to continue.';
    if (field.validity.valueMissing) return 'This field is required.';
    if (field.validity.typeMismatch) return 'Enter a valid email address.';
    if (field.validity.tooShort) return 'Use at least 8 characters.';
    return '';
  };
  const validate = (field) => {
    const message = messageFor(field);
    const error = document.querySelector(`#${field.id}-error`);
    field.toggleAttribute('aria-invalid', Boolean(message));
    if (error) error.textContent = message;
    return !message;
  };

  const fields = [...form.querySelectorAll('input')];
  fields.forEach((field) => {
    field.addEventListener('blur', () => validate(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
      if (field === password && confirmPassword.value) validate(confirmPassword);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit.classList.remove('is-loading');
    submit.disabled = false;
    submitLabel.textContent = 'Create Account';
    const results = fields.map((field) => ({ field, valid:validate(field) }));
    const firstInvalid = results.find((result) => !result.valid)?.field;
    status.classList.toggle('is-error', Boolean(firstInvalid));
    if (firstInvalid) {
      status.textContent = 'Please review the highlighted details.';
      firstInvalid.focus();
      return;
    }

    submit.classList.add('is-loading');
    submit.disabled = true;
    submitLabel.textContent = 'Creating account…';
    window.requestAnimationFrame(() => {
      status.textContent = 'Details validated. Connect your account endpoint to complete registration.';
      submit.classList.remove('is-loading');
      submit.disabled = false;
      submitLabel.textContent = 'Create Account';
    });
  });
})();

/* Standalone authentication page controls */
(() => {
  const page = document.querySelector('.auth-page');
  if (!page) return;

  const root = document.documentElement;
  const themeButton = document.querySelector('[data-auth-theme]');
  const rtlButton = document.querySelector('[data-auth-rtl]');
  const savedTheme = localStorage.getItem('velora-theme');
  const savedDirection = localStorage.getItem('velora-direction');

  const applyAuthTheme = (theme) => {
    root.dataset.theme = theme;
    themeButton?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  };
  const applyAuthDirection = (direction) => {
    root.dir = direction;
    const isRtl = direction === 'rtl';
    if (rtlButton) {
      rtlButton.setAttribute('aria-pressed', String(isRtl));
      rtlButton.setAttribute('aria-label', isRtl ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout');
      rtlButton.innerHTML = `${isRtl ? 'LTR' : 'RTL'} <span aria-hidden="true">↔</span>`;
    }
  };

  applyAuthTheme(savedTheme || 'dark');
  applyAuthDirection(savedDirection || 'ltr');
  themeButton?.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyAuthTheme(theme);
    localStorage.setItem('velora-theme', theme);
  });
  rtlButton?.addEventListener('click', () => {
    const direction = root.dir === 'rtl' ? 'ltr' : 'rtl';
    applyAuthDirection(direction);
    localStorage.setItem('velora-direction', direction);
  });

  const password = document.querySelector('#login-password');
  const passwordToggle = document.querySelector('[data-password-toggle]');
  passwordToggle?.addEventListener('click', () => {
    const show = password?.type === 'password';
    password.type = show ? 'text' : 'password';
    passwordToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    passwordToggle.setAttribute('aria-pressed', String(show));
  });

  const form = document.querySelector('[data-auth-form]');
  const status = document.querySelector('[data-auth-status]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = [...form.querySelectorAll('input[required]')];
    let firstInvalid;
    fields.forEach((field) => {
      const error = document.querySelector(`#${field.id}-error`);
      const valid = field.checkValidity();
      field.toggleAttribute('aria-invalid', !valid);
      if (error) error.textContent = valid ? '' : (field.type === 'email' ? 'Enter a valid email address.' : 'Enter at least 6 characters.');
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    status?.classList.toggle('is-error', Boolean(firstInvalid));
    if (firstInvalid) {
      status.textContent = 'Please check the highlighted fields.';
      firstInvalid.focus();
      return;
    }
    status.textContent = 'Sign-in details validated. Connect your authentication service to continue.';
  });
})();
