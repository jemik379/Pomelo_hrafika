(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isEmbedded = window.parent !== window;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* -------------------------------------------------------------------------
     Header
     ------------------------------------------------------------------------- */

  const header = $("[data-header]");
  let scrollTicking = false;

  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    scrollTicking = false;
  }

  if (header) {
    updateHeader();
    window.addEventListener("scroll", () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(updateHeader);
    }, { passive: true });
  }

  /* -------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------- */

  const menu = $("[data-mobile-menu]");
  const menuToggle = $("[data-menu-toggle]");
  const menuClose = $("[data-menu-close]");
  let menuReturnFocus = null;

  function openMenu() {
    if (!menu || !menuToggle) return;
    menuReturnFocus = document.activeElement;
    menu.classList.add("is-open");
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Zavřít menu");
    document.body.classList.add("menu-open");
    window.requestAnimationFrame(() => menuClose?.focus());
  }

  function closeMenu(options = {}) {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("inert", "");
    menu.setAttribute("aria-hidden", "true");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Otevřít menu");
    document.body.classList.remove("menu-open");
    if (options.restoreFocus !== false && menuReturnFocus instanceof HTMLElement) {
      menuReturnFocus.focus({ preventScroll: true });
    }
    menuReturnFocus = null;
  }

  menuToggle?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", () => closeMenu());
  $$(".mobile-nav a").forEach((link) => {
    link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  });

  menu?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = $$("a[href], button:not([disabled])", menu)
      .filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) closeMenu({ restoreFocus: false });
  });

  /* -------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------- */

  const revealItems = $$("[data-reveal]");
  revealItems.forEach((item) => {
    if (item.dataset.revealDelay) item.style.transitionDelay = item.dataset.revealDelay;
  });

  if (!("IntersectionObserver" in window) || reducedMotion.matches) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    document.body.classList.add("js-reveal");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* -------------------------------------------------------------------------
     Gallery lightbox
     ------------------------------------------------------------------------- */

  const lightbox = $("#lightbox");
  const lightboxImage = $("#lightboxImage");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxClose = $("[data-lightbox-close]");
  const lightboxPrev = $("[data-lightbox-prev]");
  const lightboxNext = $("[data-lightbox-next]");
  const photoButtons = $$("[data-photo]");
  let photoIndex = 0;
  let lightboxTrigger = null;

  function getPhoto(index) {
    const button = photoButtons[index];
    const image = $("img", button);
    const caption = $("figcaption", button.closest(".photo-card"));
    return {
      src: image?.getAttribute("src") || "",
      alt: image?.getAttribute("alt") || "",
      caption: caption?.textContent.trim() || ""
    };
  }

  function renderPhoto(index) {
    if (!lightboxImage || !photoButtons.length) return;
    photoIndex = (index + photoButtons.length) % photoButtons.length;
    const photo = getPhoto(photoIndex);
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt;
    if (lightboxCaption) lightboxCaption.textContent = photo.caption;
  }

  function openLightbox(index, trigger) {
    if (!lightbox || typeof lightbox.showModal !== "function") return;
    lightboxTrigger = trigger || document.activeElement;
    renderPhoto(index);
    document.body.classList.add("lightbox-open");
    lightbox.showModal();
    window.requestAnimationFrame(() => lightboxClose?.focus());
  }

  function closeLightbox() {
    if (!lightbox?.open) return;
    lightbox.close();
  }

  photoButtons.forEach((button, index) => {
    button.addEventListener("click", () => openLightbox(index, button));
  });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightboxPrev?.addEventListener("click", () => renderPhoto(photoIndex - 1));
  lightboxNext?.addEventListener("click", () => renderPhoto(photoIndex + 1));

  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      renderPhoto(photoIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      renderPhoto(photoIndex + 1);
    }
  });

  lightbox?.addEventListener("close", () => {
    document.body.classList.remove("lightbox-open");
    if (lightboxTrigger instanceof HTMLElement) lightboxTrigger.focus({ preventScroll: true });
    lightboxTrigger = null;
  });

  /* -------------------------------------------------------------------------
     Contact form (illustrative — nothing is sent anywhere)
     ------------------------------------------------------------------------- */

  const contactForm = $("[data-contact-form]");
  const formStatus = $("#formStatus");
  const contactFields = {
    name: $("#f-name"),
    email: $("#f-mail"),
    msg: $("#f-msg")
  };

  function setStatus(message, type = "") {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", type === "error");
    formStatus.classList.toggle("is-success", type === "success");
  }

  function markField(field, invalid) {
    if (!field) return;
    if (invalid) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  }

  contactForm?.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea")) {
      event.target.removeAttribute("aria-invalid");
      setStatus("");
    }
  });

  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = contactFields.name?.value.trim() || "";
    const email = contactFields.email?.value.trim() || "";
    const message = contactFields.msg?.value.trim() || "";
    let firstInvalid = null;

    const checks = [
      [contactFields.name, name.length >= 2],
      [contactFields.email, emailPattern.test(email)],
      [contactFields.msg, message.length >= 10]
    ];
    checks.forEach(([field, valid]) => {
      markField(field, !valid);
      if (!valid && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      setStatus("Ještě chybí pár údajů. Zkontrolujte zvýrazněná pole.", "error");
      firstInvalid.focus();
      return;
    }

    contactForm.reset();
    Object.values(contactFields).forEach((field) => markField(field, false));
    setStatus("Děkuji! V této ukázce se zpráva nikam neodesílá, ale formulář funguje.", "success");
  });

  /* -------------------------------------------------------------------------
     Escape: close the menu, otherwise let Pomelo close the demo dialog
     ------------------------------------------------------------------------- */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (menu?.classList.contains("is-open")) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }

    if (lightbox?.open) return;

    if (isEmbedded) {
      event.preventDefault();
      window.parent.postMessage({ type: "pomelo-demo-close" }, window.location.origin);
    }
  });
})();
