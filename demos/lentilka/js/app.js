(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isEmbedded = window.parent !== window;

  /* -------------------------------------------------------------------------
     Header + current year
     ------------------------------------------------------------------------- */

  const header = $("[data-head]");
  let scrollTicking = false;

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
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

  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  /* -------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------- */

  const menu = $("[data-mobile-menu]");
  const menuOpen = $("[data-menu-open]");
  const menuClose = $("[data-menu-close]");
  let menuReturnFocus = null;

  function openMenu() {
    if (!menu || !menuOpen) return;
    menuReturnFocus = document.activeElement;
    menu.classList.add("is-open");
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    menuOpen.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    window.requestAnimationFrame(() => menuClose?.focus());
  }

  function closeMenu(options = {}) {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("inert", "");
    menu.setAttribute("aria-hidden", "true");
    menuOpen?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    if (options.restoreFocus !== false && menuReturnFocus instanceof HTMLElement) {
      menuReturnFocus.focus();
    }
    menuReturnFocus = null;
  }

  menuOpen?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", () => closeMenu());

  $$(".mobile-nav a, .mobile-menu-foot a[href^='#']").forEach((link) => {
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
    if (window.innerWidth > 980) closeMenu({ restoreFocus: false });
  });

  /* -------------------------------------------------------------------------
     Tabs (day + weekly menu)
     ------------------------------------------------------------------------- */

  function setupTabs(tabSelector, panelSelector, attribute, options = {}) {
    const tabs = $$(tabSelector);
    const panels = $$(panelSelector);
    if (!tabs.length || tabs.length !== panels.length) return;

    function activate(index, moveFocus = false) {
      const safe = (index + tabs.length) % tabs.length;
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === safe;
        tab.classList.toggle("is-active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel, panelIndex) => {
        const selected = panelIndex === safe;
        panel.classList.toggle("is-active", selected);
        panel.hidden = !selected;
      });
      if (moveFocus) tabs[safe].focus();
      options.onChange?.(safe);
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index));
      tab.addEventListener("keydown", (event) => {
        const vertical = tab.getAttribute("aria-orientation") !== "horizontal";
        const nextKey = vertical ? "ArrowDown" : "ArrowRight";
        const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
        let next = null;
        if (event.key === nextKey) next = index + 1;
        else if (event.key === previousKey) next = index - 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        activate(next, true);
      });
    });
  }

  setupTabs("[data-day-tab]", "[data-day-panel]", "day");
  setupTabs("[data-menu-tab]", "[data-menu-panel]", "menu");

  /* -------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------- */

  const revealItems = $$(".reveal");

  if (!("IntersectionObserver" in window) || reducedMotion.matches) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
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
     Shared validation helpers
     ------------------------------------------------------------------------- */

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const errorIds = {
    childName: "childNameError",
    childBirth: "childBirthError",
    classChoice: "classChoiceError",
    parentName: "parentNameError",
    parentEmail: "parentEmailError",
    parentPhone: "parentPhoneError",
    relationship: "relationshipError",
    startMonth: "startMonthError",
    attendance: "attendanceError",
    consent: "consentError",
    tourDate: "tourDateError",
    tourTime: "tourTimeError",
    tourName: "tourNameError",
    tourEmail: "tourEmailError"
  };

  function setFieldError(form, name, message = "") {
    if (!form || !name) return;
    const error = document.getElementById(errorIds[name]);
    if (error) error.textContent = message;

    const inputs = $$(`[name="${name}"]`, form);
    inputs.forEach((input) => {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    });

    const group = inputs[0]?.closest(".class-options, .attendance-options, .tour-options");
    if (group) group.classList.toggle("is-invalid", Boolean(message));
  }

  function focusField(form, name) {
    const input = $(`[name="${name}"]`, form);
    if (!input) return;
    input.focus({ preventScroll: true });
    const wrapper = input.closest(".field, .class-picker, .attendance-picker, .tour-picker");
    wrapper?.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "center"
    });
  }

  function clearFormErrors(form) {
    Object.keys(errorIds).forEach((name) => setFieldError(form, name, ""));
  }

  /* -------------------------------------------------------------------------
     Enrollment wizard
     ------------------------------------------------------------------------- */

  const enrollForm = $("[data-enroll-form]");
  const wizard = $(".wizard");
  const enrollSuccess = $("[data-enroll-success]");
  const appNumber = $("[data-app-number]");
  const formStatus = $("[data-form-status]");
  const stepLabels = $$("[data-step-label]");
  const stepFields = $$("[data-step]", enrollForm || document);
  const backButton = $("[data-step-back]", enrollForm || document);
  const nextButton = $("[data-step-next]", enrollForm || document);
  const submitButton = $("[data-step-submit]", enrollForm || document);
  const stepsList = $(".wizard-steps", wizard || document);
  let currentStep = 1;

  function wizardValidators(name) {
    if (!enrollForm) return "";
    const value = (selector) => $(selector, enrollForm)?.value.trim() || "";
    const checked = (selector) => Boolean($(`${selector}:checked`, enrollForm));
    switch (name) {
      case "childName":
        return value("#childName").length >= 2 ? "" : "Zadejte prosím jméno dítěte.";
      case "childBirth": {
        const date = value("#childBirth");
        if (!date) return "Zadejte datum narození.";
        if (new Date(`${date}T00:00:00`) > new Date()) return "Datum narození nemůže být v budoucnosti.";
        return "";
      }
      case "classChoice":
        return checked('input[name="classChoice"]') ? "" : "Vyberte prosím třídu.";
      case "parentName":
        return value("#parentName").length >= 2 ? "" : "Zadejte prosím jméno rodiče.";
      case "parentEmail":
        return emailPattern.test(value("#parentEmail")) ? "" : "Zadejte platný e-mail.";
      case "parentPhone": {
        const digits = value("#parentPhone").replace(/\D/g, "");
        return digits.length >= 9 && digits.length <= 15 ? "" : "Zadejte platné telefonní číslo.";
      }
      case "relationship":
        return value("#relationship") ? "" : "Vyberte prosím vztah k dítěti.";
      case "startMonth":
        return value("#startMonth") ? "" : "Vyberte preferovaný nástup.";
      case "attendance":
        return checked('input[name="attendance"]') ? "" : "Vyberte prosím docházku.";
      case "consent":
        return checked('input[name="consent"]') ? "" : "Pro odeslání je potřeba souhlas.";
      default:
        return "";
    }
  }

  function validateStep(step) {
    if (!enrollForm) return true;
    const names = {
      1: ["childName", "childBirth", "classChoice"],
      2: ["parentName", "parentEmail", "parentPhone", "relationship"],
      3: ["startMonth", "attendance"],
      4: ["consent"]
    }[step] || [];
    let firstInvalid = null;
    names.forEach((name) => {
      const message = wizardValidators(name);
      setFieldError(enrollForm, name, message);
      if (message && !firstInvalid) firstInvalid = name;
    });
    if (firstInvalid) {
      if (formStatus) formStatus.textContent = "Ještě chybí pár údajů. Zkontrolujte zvýrazněná pole.";
      focusField(enrollForm, firstInvalid);
      return false;
    }
    return true;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  }

  function fillSummary() {
    if (!enrollForm) return;
    const value = (selector) => $(selector, enrollForm)?.value.trim() || "";
    const set = (key, text) => {
      const target = $(`[data-summary="${key}"]`, enrollForm);
      if (target) target.textContent = text || "—";
    };
    const attendance = $('input[name="attendance"]:checked', enrollForm)?.value || "";
    const classChoice = $('input[name="classChoice"]:checked', enrollForm)?.value || "";

    set("child", value("#childName"));
    set("birth", formatDate(value("#childBirth")));
    set("class", classChoice);
    set("parent", `${value("#parentName")}${value("#relationship") ? ` (${value("#relationship")})` : ""}`);
    set("contact", [value("#parentEmail"), value("#parentPhone")].filter(Boolean).join(", "));
    set("start", value("#startMonth"));
    set("attendance", attendance);
    set("note", value("#enrollNote"));
  }

  function showStep(step, moveFocus = false) {
    if (!enrollForm) return;
    currentStep = Math.min(4, Math.max(1, step));
    stepFields.forEach((field) => {
      field.hidden = Number(field.dataset.step) !== currentStep;
    });
    stepLabels.forEach((label, index) => {
      const indexNumber = index + 1;
      label.classList.toggle("is-active", indexNumber === currentStep);
      label.classList.toggle("is-done", indexNumber < currentStep);
    });
    if (backButton) backButton.hidden = currentStep === 1;
    if (nextButton) nextButton.hidden = currentStep === 4;
    if (submitButton) submitButton.hidden = currentStep !== 4;
    if (formStatus) formStatus.textContent = "";
    if (currentStep === 4) fillSummary();

    if (moveFocus) {
      window.requestAnimationFrame(() => {
        const field = $(`[data-step="${currentStep}"]`, enrollForm);
        const target = $("input:not([type=radio]):not([type=checkbox]), select, textarea, input[type=radio]", field);
        target?.focus({ preventScroll: true });
      });
    }
  }

  nextButton?.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1, true);
  });

  backButton?.addEventListener("click", () => {
    if (formStatus) formStatus.textContent = "";
    showStep(currentStep - 1, true);
  });

  enrollForm?.addEventListener("input", (event) => {
    if (event.target.name) setFieldError(enrollForm, event.target.name, "");
  });

  enrollForm?.addEventListener("change", (event) => {
    if (event.target.name) setFieldError(enrollForm, event.target.name, "");
  });

  enrollForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateStep(4)) return;

    // Ukázka: data zůstávají pouze v prohlížeči, nikam se neodesílají.
    const number = `L-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
    if (appNumber) appNumber.textContent = number;
    if (formStatus) formStatus.textContent = "";
    enrollForm.hidden = true;
    if (stepsList) stepsList.hidden = true;
    if (enrollSuccess) {
      enrollSuccess.hidden = false;
      enrollSuccess.setAttribute("tabindex", "-1");
      enrollSuccess.focus({ preventScroll: true });
      enrollSuccess.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center"
      });
    }
  });

  $("[data-enroll-reset]")?.addEventListener("click", () => {
    if (!enrollForm) return;
    enrollForm.reset();
    clearFormErrors(enrollForm);
    if (formStatus) formStatus.textContent = "";
    enrollForm.hidden = false;
    if (stepsList) stepsList.hidden = false;
    if (enrollSuccess) enrollSuccess.hidden = true;
    showStep(1, true);
  });

  if ($("#childBirth")) {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    $("#childBirth").setAttribute("max", iso);
  }

  if (enrollForm) showStep(1);

  /* -------------------------------------------------------------------------
     Tour reservation
     ------------------------------------------------------------------------- */

  const tourForm = $("[data-tour-form]");
  const tourSuccess = $("[data-tour-success]");
  const tourSummary = $("[data-tour-summary]");

  function tourValidators(name) {
    if (!tourForm) return "";
    switch (name) {
      case "tourDate":
        return $('input[name="tourDate"]:checked', tourForm) ? "" : "Vyberte prosím den.";
      case "tourTime":
        return $('input[name="tourTime"]:checked', tourForm) ? "" : "Vyberte prosím čas.";
      case "tourName":
        return ($("#tourName", tourForm)?.value.trim().length || 0) >= 2 ? "" : "Zadejte prosím jméno.";
      case "tourEmail":
        return emailPattern.test($("#tourEmail", tourForm)?.value.trim() || "") ? "" : "Zadejte platný e-mail.";
      default:
        return "";
    }
  }

  function validateTour() {
    let firstInvalid = null;
    ["tourDate", "tourTime", "tourName", "tourEmail"].forEach((name) => {
      const message = tourValidators(name);
      setFieldError(tourForm, name, message);
      if (message && !firstInvalid) firstInvalid = name;
    });
    if (firstInvalid) focusField(tourForm, firstInvalid);
    return !firstInvalid;
  }

  tourForm?.addEventListener("input", (event) => {
    if (event.target.name) setFieldError(tourForm, event.target.name, "");
  });

  tourForm?.addEventListener("change", (event) => {
    if (event.target.name) setFieldError(tourForm, event.target.name, "");
  });

  tourForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateTour()) return;

    const date = $('input[name="tourDate"]:checked', tourForm)?.value || "";
    const time = $('input[name="tourTime"]:checked', tourForm)?.value || "";
    const name = $("#tourName", tourForm)?.value.trim() || "";
    if (tourSummary) {
      tourSummary.textContent = `${name}, prohlídka je rezervovaná na ${date} v ${time}. Ukázkově — nic se neodesílá.`;
    }
    tourForm.hidden = true;
    if (tourSuccess) {
      tourSuccess.hidden = false;
      tourSuccess.setAttribute("tabindex", "-1");
      tourSuccess.focus({ preventScroll: true });
      tourSuccess.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center"
      });
    }
  });

  $("[data-tour-reset]")?.addEventListener("click", () => {
    if (!tourForm) return;
    tourForm.reset();
    clearFormErrors(tourForm);
    tourForm.hidden = false;
    if (tourSuccess) tourSuccess.hidden = true;
    $("#tourName", tourForm)?.focus({ preventScroll: true });
  });

  /* -------------------------------------------------------------------------
     Escape: close menu, otherwise let Pomelo close the demo dialog
     ------------------------------------------------------------------------- */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (menu?.classList.contains("is-open")) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }

    if (isEmbedded) {
      event.preventDefault();
      window.parent.postMessage({ type: "pomelo-demo-close" }, window.location.origin);
    }
  });

  /* -------------------------------------------------------------------------
     Tab navigation
     ------------------------------------------------------------------------- */

  const tabBtns = $$(".tab-btn");
  const tabPanels = $$(".tab-panel");

  function showTab(targetId) {
    tabBtns.forEach((btn) => {
      const isActive = btn.dataset.tab === targetId;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
      if (isActive && !reducedMotion.matches) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showTab(btn.dataset.tab);
    });

    btn.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = tabBtns.indexOf(btn);
      let next = current;
      if (event.key === "ArrowRight") next = (current + 1) % tabBtns.length;
      else if (event.key === "ArrowLeft") next = (current - 1 + tabBtns.length) % tabBtns.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabBtns.length - 1;
      tabBtns[next].focus();
      showTab(tabBtns[next].dataset.tab);
    });
  });

  // Keyboard navigation for reduced motion: skip smooth scroll
  if (reducedMotion.matches) {
    const origShowTab = showTab;
    showTab = (targetId) => {
      tabBtns.forEach((btn) => {
        const isActive = btn.dataset.tab === targetId;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.tabIndex = isActive ? 0 : -1;
      });
      tabPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === targetId);
        panel.hidden = panel.id !== targetId;
      });
    };
  }

  // Anchor links anywhere on the page switch to the matching tab
  function tabIdForHash(hash) {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return null;
    if (tabBtns.some((btn) => btn.dataset.tab === id)) return id;
    const target = document.getElementById(id);
    const panel = target?.closest(".tab-panel");
    return panel?.id || null;
  }

  function activateHash(hash, options = {}) {
    const tabId = tabIdForHash(hash);
    if (!tabId) return false;
    showTab(tabId);
    if (options.updateHistory !== false) {
      history.replaceState(null, "", `#${tabId}`);
    }
    return true;
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;
    const tabId = tabIdForHash(hash);
    if (!tabId) return;

    event.preventDefault();
    closeMenu({ restoreFocus: false });
    showTab(tabId);
    history.replaceState(null, "", hash);

    const targetId = decodeURIComponent(hash.slice(1));
    if (targetId !== tabId) {
      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "start"
        });
      });
    }
  });

  window.addEventListener("hashchange", () => {
    if (location.hash) activateHash(location.hash, { updateHistory: false });
  });

  if (location.hash) {
    window.requestAnimationFrame(() => activateHash(location.hash, { updateHistory: false }));
  }
})();
