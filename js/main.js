(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* -------------------------------------------------------------------------
     Header
     ------------------------------------------------------------------------- */

  const header = $("[data-header]");
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* -------------------------------------------------------------------------
     Scroll progress
     ------------------------------------------------------------------------- */

  const progressBar = $("[data-scroll-progress]");
  let progressFrame = null;

  function updateProgress() {
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    progressFrame = null;
  }

  function requestProgress() {
    if (progressFrame !== null) return;
    progressFrame = requestAnimationFrame(updateProgress);
  }

  if (progressBar) {
    updateProgress();
    window.addEventListener("scroll", requestProgress, { passive: true });
    window.addEventListener("resize", requestProgress, { passive: true });
  }

  /* -------------------------------------------------------------------------
     Current year
     ------------------------------------------------------------------------- */

  const year = $("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  /* -------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------- */

  const menu = $("[data-mobile-menu]");
  const menuToggle = $("[data-menu-toggle]");
  const menuClose = $("[data-menu-close]");
  const main = $("#main");
  const footer = $(".site-footer");
  const mobileBreakpoint = window.matchMedia("(min-width: 981px)");
  let lastMenuTrigger = null;

  const focusableInMenu = () =>
    $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', menu).filter(
      (element) => element.offsetParent !== null
    );

  function setPageInert(value) {
    [main, footer, header].forEach((element) => {
      if (element) element.inert = value;
    });
  }

  function focusMenuClose() {
    if (!menu || !menuClose || !menu.classList.contains("is-open")) return;
    if (menu.contains(document.activeElement)) return;
    menuClose.focus({ preventScroll: true });
  }

  function openMenu() {
    if (!menu || !menuToggle) return;
    lastMenuTrigger = document.activeElement;
    setPageInert(true);
    menu.inert = false;
    menu.setAttribute("aria-hidden", "false");
    menu.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    focusMenuClose();
    window.requestAnimationFrame(focusMenuClose);
    window.setTimeout(focusMenuClose, 80);
  }

  function closeMenu(restoreFocus = true) {
    if (!menu || !menuToggle || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    setPageInert(false);
    if (restoreFocus) {
      const target = lastMenuTrigger instanceof HTMLElement ? lastMenuTrigger : menuToggle;
      target.focus({ preventScroll: true });
    }
    window.setTimeout(() => {
      menu.inert = true;
    }, 360);
  }

  if (menu && menuToggle && menuClose) {
    menuToggle.addEventListener("click", openMenu);
    menuClose.addEventListener("click", () => closeMenu());
    $$("a[href]", menu).forEach((link) => {
      link.addEventListener("click", () => closeMenu(false));
    });

    document.addEventListener("keydown", (event) => {
      if (!menu.classList.contains("is-open")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = focusableInMenu();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!menu.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    mobileBreakpoint.addEventListener("change", (event) => {
      if (event.matches) closeMenu(false);
    });
  }

  /* -------------------------------------------------------------------------
     Scrollspy
     ------------------------------------------------------------------------- */

  const navLinks = $$(".desktop-nav .nav-link");
  const navSections = navLinks
    .map((link) => {
      const href = link.getAttribute("href");
      return href && href.startsWith("#") ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  function setActiveNav(id) {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window && navSections.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActiveNav(entry.target.id);
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    navSections.forEach((section) => spyObserver.observe(section));
  }

  /* -------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------- */

  const revealElements = $$("[data-reveal]");
  if (revealElements.length) {
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealElements.forEach((element) => revealObserver.observe(element));
    }
  }

  /* -------------------------------------------------------------------------
     Pointer depth
     ------------------------------------------------------------------------- */

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const heroScene = $("[data-hero-scene]");

  if (heroScene && finePointer.matches && !reducedMotion.matches) {
    const layers = $$("[data-depth]", heroScene);
    let heroFrame = null;

    const moveHero = (x, y) => {
      heroScene.style.setProperty("--site-rx", `${(-y * 2.2).toFixed(2)}deg`);
      heroScene.style.setProperty("--site-ry", `${(x * 3.2).toFixed(2)}deg`);

      layers.forEach((layer) => {
        const depth = Number(layer.dataset.depth) || 1;
        layer.style.setProperty("--shift-x", `${(x * depth * 13).toFixed(2)}px`);
        layer.style.setProperty("--shift-y", `${(y * depth * 9).toFixed(2)}px`);
      });
    };

    heroScene.addEventListener("pointermove", (event) => {
      const rect = heroScene.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      if (heroFrame) cancelAnimationFrame(heroFrame);
      heroFrame = requestAnimationFrame(() => moveHero(x, y));
    });

    heroScene.addEventListener("pointerleave", () => {
      if (heroFrame) cancelAnimationFrame(heroFrame);
      heroFrame = requestAnimationFrame(() => moveHero(0, 0));
    });
  }

  if (finePointer.matches && !reducedMotion.matches) {
    $$(".service-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
        card.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* -------------------------------------------------------------------------
     Service preselection
     ------------------------------------------------------------------------- */

  const serviceSelect = $("#service");

  function selectService(value) {
    if (!serviceSelect || !value) return;
    const option = Array.from(serviceSelect.options).find((item) => item.value === value);
    if (option) serviceSelect.value = value;
  }

  $$("[data-service]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      selectService(trigger.getAttribute("data-service"));
    });
  });

  /* -------------------------------------------------------------------------
     Case study dialog
     ------------------------------------------------------------------------- */

  const projects = {
    kvasek: {
      title: "Kvásek",
      meta: "Pekárna & kavárna · Web + e-shop",
      theme: "warm",
      artNote: "Nový web a e-shop pro pekárnu, která se probouzí v pět ráno.",
      lead: "Kvásek měl výborný chléb a web, který to neuměl říct. Cílem bylo spojit příběh pekárny s jednoduchým objednáváním — a udělat to tak, aby se v něm vyznali zákazníci i Jana za pultem.",
      services: ["Strategie", "Webdesign", "Vývoj", "E-shop"],
      blocks: [
        {
          title: "Výzva",
          text: "Poptávky se ztrácely mezi telefonem, e-maily a Instagramem. Web měl být teplý jako pekárna, ale zároveň přehledný, rychlý a snadno spravovatelný."
        },
        {
          title: "Řešení",
          text: "Postavili jsme novou strukturu od nabídky po objednávku. Vizuál vychází z barev pečiva a papírových sáčků, produktové karty jsou krátké a jasné. Administraci zvládne obsluha sama."
        }
      ],
      service: "eshop"
    },
    dycha: {
      title: "Dýcha",
      meta: "Jóga & dechové studio · Web + rezervace",
      theme: "sage",
      artNote: "Digitální prostor, který dýchá stejně klidně jako samotné studio.",
      lead: "Studio Dýcha potřebovalo, aby si nový člověk našel lekci bez pěti e-mailů a telefonátů. Web měl být vzdušný, srozumitelný a hlavně měl umět přijímat rezervace.",
      services: ["Struktura", "Webdesign", "Rezervace", "Vývoj"],
      blocks: [
        {
          title: "Výzva",
          text: "Rezervace dřív probíhaly přes zprávy na Instagramu. Majitelka trávila večery přepisováním jmen do tabulky a klienti často netušili, která lekce je pro ně vhodná."
        },
        {
          title: "Řešení",
          text: "Rozvrh, popisy lekcí a rezervační tok jsme složili do jednoho klidného celku. Každá lekce má svoji náladu i jasnou informaci o náročnosti. Rezervace se potvrzují automaticky."
        }
      ],
      service: "app"
    },
    punkt: {
      title: "Punkt",
      meta: "Fyzioterapie · Web + značka",
      theme: "butter",
      artNote: "Web pro fyzioterapii, která dává pohyb zase do pohody.",
      lead: "Punkt chtěl působit odborně, ale ne nemocničně. Nový web proto staví na lidském tónu, jasných informacích a jednoduché cestě k objednání.",
      services: ["Značka", "Webdesign", "Vývoj", "UX"],
      blocks: [
        {
          title: "Výzva",
          text: "Původní web působil jako obecná vizitka. Klienti nevěděli, s čím přesně mohou přijít ani jak dlouho bude první návštěva trvat."
        },
        {
          title: "Řešení",
          text: "Připravili jsme novou vizuální identitu a web, který vysvětluje služby bez zbytečné lékařské mluvy. Objednání zabere tři kliknutí a na mobilu je stejně příjemné jako na počítači."
        }
      ],
      service: "web"
    }
  };

  const dialog = $("#caseModal");
  const modalArt = $("#caseModalArt");
  const modalMeta = $("#caseModalMeta");
  const modalTitle = $("#caseModalTitle");
  const modalLead = $("#caseModalLead");
  const modalServices = $("#caseModalServices");
  const modalBody = $("#caseModalBody");
  const modalClose = $("[data-modal-close]", dialog || document);
  const modalContact = $("[data-modal-contact]", dialog || document);
  let lastDialogTrigger = null;
  let currentProject = null;

  function openCaseDialog(key, trigger) {
    const project = projects[key];
    if (!project || !dialog) return;
    currentProject = project;
    lastDialogTrigger = trigger || document.activeElement;

    modalArt.className = `case-modal-art case-modal-art--${project.theme}`;
    modalArt.innerHTML = `
      <span class="modal-art-kicker">${project.meta.split(" · ")[0]}</span>
      <div class="modal-art-word">${project.title}</div>
      <p class="modal-art-note">${project.artNote}</p>
    `;
    modalMeta.textContent = project.meta;
    modalTitle.textContent = project.title;
    modalLead.textContent = project.lead;
    modalServices.innerHTML = project.services.map((service) => `<span>${service}</span>`).join("");
    modalBody.innerHTML = project.blocks
      .map(
        (block) => `
          <div class="modal-block">
            <h3>${block.title}</h3>
            <p>${block.text}</p>
          </div>
        `
      )
      .join("");

    document.body.classList.add("modal-open");
    dialog.showModal();
  }

  function closeCaseDialog() {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  $$(".js-case-open").forEach((trigger) => {
    trigger.addEventListener("click", () => openCaseDialog(trigger.dataset.case, trigger));
  });

  if (dialog) {
    modalClose?.addEventListener("click", closeCaseDialog);

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeCaseDialog();
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      if (lastDialogTrigger instanceof HTMLElement) {
        lastDialogTrigger.focus({ preventScroll: true });
      }
    });

    modalContact?.addEventListener("click", () => {
      if (currentProject) selectService(currentProject.service);
      closeCaseDialog();
    });
  }

  /* -------------------------------------------------------------------------
     Interactive demos
     ------------------------------------------------------------------------- */

  const demoData = {
    zrnko: {
      index: 1,
      tabId: "demoTabZrnko",
      name: "Zrnko",
      kicker: "Pražírna & e-shop",
      url: "zrnko.cz",
      tag: "Živý web",
      cta: "Otevřít celý web",
      favicon: "demos/zrnko/assets/favicon.svg",
      stageText: "Opravdový e-shop s katalogem káv, košíkem, vyhledáváním i demo pokladnou. Otevřete ho přímo tady a projděte celý.",
      modalText: "Živý e-shop s katalogem, košíkem, vyhledáváním a demo pokladnou. Projděte ho celý přímo v náhledu.",
      full: "demos/zrnko/",
      service: "eshop"
    },
    lentilka: {
      index: 2,
      tabId: "demoTabLentilka",
      name: "Lentilka",
      kicker: "Školka & dětská skupina",
      url: "skolkalentilka.cz",
      tag: "Živý web",
      cta: "Otevřít celý web",
      favicon: "demos/lentilka/assets/favicon.svg",
      stageText: "Živá školka s časovou osou dne, jídelníčkem, zápisem i rezervací prohlídky. Otevřete ji přímo tady a projděte celou.",
      modalText: "Světlá školka s interaktivní časovou osou dne, týdenním jídelníčkem, zápisem ve čtyřech krocích a rezervací prohlídky. Projděte ji celou přímo v náhledu.",
      full: "demos/lentilka/",
      service: "app"
    },
    prostor: {
      index: 3,
      tabId: "demoTabProstor",
      name: "Prostor Studio",
      kicker: "Webdesign &amp; vývoj",
      url: "prostor.cz",
      tag: "Živý web",
      cta: "Otevřít celý web",
      favicon: "assets/demos/prostor-favicon.svg",
      stageText: "One-page digitální agentura s plátnem Three.js. Kaméra létá po křivce mezi pěti světy, barvy a mlha se přelévají podle polohy. Projekty, služby a kontakt v jednom plynulém sledu.",
      modalText: "Prostor Studio je ukázkový web pro digitální agenturu. Celý běží na jednom plátně WebGL s plynulým přechodem mezi pěti zónami — úvod, služby, postup, práce a kontakt. Vypracován jako zcela odlišný typ ukázky oproti zbylým e-shopům a službám.",
      full: "demos/prostor/",
      service: "web"
    },
    pohled: {
      index: 4,
      tabId: "demoTabPohled",
      name: "Pohled",
      kicker: "Fotografické portfolio",
      url: "pohled.cz",
      tag: "Živý web",
      cta: "Otevřít celý web",
      favicon: "demos/pohled/assets/favicon.svg",
      stageText: "Minimalistické černobílé fotografické portfolio s velkými snímky a čistou typografií. Galerie, projekty a kontakt v jedné sekci.",
      modalText: "Pohled je ukázkový web pro fotografa — černobílé portfolio s velkými celoobrazovkovými fotografiemi, galerií snímků, vybranými zakázkami a kontaktním formulářem. Graficky i funkčně zcela odlišný typ webu oproti e-shopu, školce a agentuře.",
      full: "demos/pohled/",
      service: "web"
    }
  };

  const demoOrder = Object.keys(demoData);
  const demoStage = $("[data-demo-stage]");
  const demoBrowser = $("[data-demo-browser]");
  const demoBrowserFavicons = $$(".demo-browser-favicon");
  const demoPanel = $("#demoPanel");
  const demoTabs = $$(".demo-tab");
  const demoPanels = $$("[data-demo-panel]");
  const demoIndexLabel = $("[data-demo-index]");
  const demoUrlLabel = $("[data-demo-url]");
  const demoTagLabel = $("[data-demo-tag]");
  const demoLiveLabel = $("[data-demo-live]");
  const demoKickerLabel = $("[data-demo-kicker]");
  const demoDescLabel = $("[data-demo-desc]");
  const demoDialog = $("#demoModal");
  const demoDialogViewport = $("[data-demo-modal-viewport]");
  const demoDialogTitle = $("#demoModalTitle");
  const demoDialogIndex = $("[data-demo-modal-index]");
  const demoDialogUrl = $("[data-demo-modal-url]");
  const demoDialogTag = $("[data-demo-modal-tag]");
  const demoDialogBarTag = $("[data-demo-modal-bar-tag]");
  const demoDialogKicker = $("[data-demo-modal-kicker]");
  const demoDialogDesc = $("[data-demo-modal-desc]");
  const demoDialogLoading = $("[data-demo-modal-loading]");
  const demoDialogClose = $("[data-demo-close]");
  const demoDialogPrev = $("[data-demo-prev]");
  const demoDialogNext = $("[data-demo-next]");
  const demoDialogContact = $("[data-demo-contact]");
  let activeDemo = "zrnko";
  let lastDemoTrigger = null;
  let restoreDemoFocus = true;
  let demoTimer = null;

  function setDemoLoading(isLoading) {
    if (demoDialogLoading) demoDialogLoading.hidden = !isLoading;
    demoDialogViewport?.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function updateDemoDialog(key) {
    const demo = demoData[key];
    if (!demo || !demoDialog) return;

    if (demoDialogTitle) demoDialogTitle.textContent = demo.name;
    if (demoDialogIndex) demoDialogIndex.textContent = String(demo.index).padStart(2, "0");
    if (demoDialogUrl) demoDialogUrl.textContent = demo.url;
    if (demoDialogKicker) demoDialogKicker.textContent = demo.kicker;
    if (demoDialogDesc) demoDialogDesc.textContent = demo.modalText;
    if (demoDialogTag) demoDialogTag.textContent = demo.tag;
    if (demoDialogBarTag) demoDialogBarTag.textContent = demo.tag;
    if (demoDialogContact) demoDialogContact.setAttribute("data-service", demo.service);
    demoDialog.dataset.demo = key;
    demoDialog.classList.toggle("has-live-demo", Boolean(demo.full));

    if (demoDialogViewport) {
      demoDialogViewport.replaceChildren();
      setDemoLoading(false);

      if (demo.full) {
        setDemoLoading(true);
        const frame = document.createElement("iframe");
        frame.className = "demo-live-frame";
        frame.src = demo.full;
        frame.title = `Interaktivní ukázka webu ${demo.name}`;
        frame.referrerPolicy = "same-origin";
        frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
        frame.addEventListener("load", () => {
          if (demoDialog.dataset.demo === key) setDemoLoading(false);
        }, { once: true });
        demoDialogViewport.appendChild(frame);
        return;
      }

      const source = demoPanels.find((panel) => panel.dataset.demoPanel === key);
      if (source) {
        const clone = source.cloneNode(true);
        clone.classList.add("is-active");
        clone.setAttribute("aria-hidden", "true");
        demoDialogViewport.appendChild(clone);
      }
    }
  }

  function setDemo(key, options = {}) {
    const demo = demoData[key];
    if (!demo) return;

    activeDemo = key;

    demoTabs.forEach((tab) => {
      const isActive = tab.dataset.demo === key;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive && options.focusTab) tab.focus();
    });

    demoPanels.forEach((panel) => {
      const isActive = panel.dataset.demoPanel === key;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    if (demoPanel) demoPanel.setAttribute("aria-labelledby", demo.tabId);
    if (demoIndexLabel) demoIndexLabel.textContent = String(demo.index).padStart(2, "0");
    if (demoUrlLabel) demoUrlLabel.textContent = demo.url;
    if (demoTagLabel) demoTagLabel.textContent = demo.tag;
    demoBrowserFavicons.forEach((img) => { img.src = demo.favicon || ""; });
    if (demoLiveLabel) demoLiveLabel.textContent = demo.full ? "Živý náhled" : "Vizuální studie";
    if (demoKickerLabel) demoKickerLabel.textContent = demo.kicker;
    if (demoDescLabel) demoDescLabel.textContent = demo.stageText;

    $$(".js-demo-open").forEach((button) => {
      button.dataset.demo = key;
      const label = button.querySelector("[data-demo-open-label]");
      if (label) label.textContent = demo.cta;
      button.setAttribute("aria-label", `${demo.cta} – ${demo.name}`);
    });

    if (demoDialog?.open) updateDemoDialog(key);

    if (demoStage && !reducedMotion.matches) {
      demoStage.classList.remove("is-switching");
      void demoStage.offsetWidth;
      demoStage.classList.add("is-switching");
      if (demoTimer) window.clearTimeout(demoTimer);
      demoTimer = window.setTimeout(() => demoStage.classList.remove("is-switching"), 950);
    }
  }

  function openDemoDialog(key, trigger) {
    if (!demoDialog) return;
    const demo = demoData[key];
    if (!demo) return;

    if (key !== activeDemo) setDemo(key);
    updateDemoDialog(key);

    lastDemoTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
    restoreDemoFocus = true;
    document.body.classList.add("modal-open");
    demoDialog.showModal();
    window.setTimeout(() => demoDialogClose?.focus(), 30);
  }

  function closeDemoDialog(restoreFocus = true) {
    if (!demoDialog || !demoDialog.open) return;
    restoreDemoFocus = restoreFocus;
    document.body.classList.remove("modal-open");
    demoDialog.close();
  }

  function cycleDemo(direction) {
    const current = demoOrder.indexOf(activeDemo);
    const next = (current + direction + demoOrder.length) % demoOrder.length;
    setDemo(demoOrder[next]);
  }

  demoTabs.forEach((tab) => {
    tab.addEventListener("click", () => setDemo(tab.dataset.demo));

    tab.addEventListener("keydown", (event) => {
      const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();

      const current = demoOrder.indexOf(activeDemo);
      let next = current;

      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = demoOrder.length - 1;
      else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        next = (current + 1) % demoOrder.length;
      } else {
        next = (current - 1 + demoOrder.length) % demoOrder.length;
      }

      setDemo(demoOrder[next], { focusTab: true });
    });
  });

  $$(".js-demo-open").forEach((button) => {
    button.addEventListener("click", () => openDemoDialog(button.dataset.demo, button));
  });

  demoBrowser?.addEventListener("click", () => {
    const button = $(".js-demo-open");
    openDemoDialog(activeDemo, button);
  });

  if (demoDialog) {
    demoDialogClose?.addEventListener("click", () => closeDemoDialog());
    demoDialogPrev?.addEventListener("click", () => cycleDemo(-1));
    demoDialogNext?.addEventListener("click", () => cycleDemo(1));

    demoDialog.addEventListener("click", (event) => {
      if (event.target === demoDialog) closeDemoDialog();
    });

    demoDialog.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      cycleDemo(event.key === "ArrowRight" ? 1 : -1);
    });

    demoDialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      demoDialogViewport?.replaceChildren();
      setDemoLoading(false);
      const trigger = lastDemoTrigger;
      lastDemoTrigger = null;
      if (restoreDemoFocus && trigger instanceof HTMLElement) {
        trigger.focus({ preventScroll: true });
      }
      restoreDemoFocus = true;
    });

    demoDialogContact?.addEventListener("click", () => {
      const demo = demoData[activeDemo];
      if (demo) selectService(demo.service);
      closeDemoDialog(false);
    });

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      if (!demoDialog.open || event.data?.type !== "pomelo-demo-close") return;
      const frame = demoDialogViewport?.querySelector("iframe");
      if (!frame || event.source !== frame.contentWindow) return;
      closeDemoDialog();
    });
  }

  if (demoStage && demoBrowser && finePointer.matches && !reducedMotion.matches) {
    let tiltFrame = null;
    let tiltX = 0;
    let tiltY = 0;

    demoBrowser.addEventListener("pointermove", (event) => {
      const rect = demoBrowser.getBoundingClientRect();
      tiltX = (event.clientX - rect.left) / rect.width - 0.5;
      tiltY = (event.clientY - rect.top) / rect.height - 0.5;

      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(() => {
        demoBrowser.style.setProperty("--demo-rx", `${(-tiltY * 3.2).toFixed(2)}deg`);
        demoBrowser.style.setProperty("--demo-ry", `${(tiltX * 4.4).toFixed(2)}deg`);
        demoBrowser.style.setProperty("--demo-lift", "-4px");
      });
    });

    demoBrowser.addEventListener("pointerleave", () => {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      demoBrowser.style.setProperty("--demo-rx", "0deg");
      demoBrowser.style.setProperty("--demo-ry", "0deg");
      demoBrowser.style.setProperty("--demo-lift", "0px");
    });

    demoStage.addEventListener("pointermove", (event) => {
      const rect = demoStage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      demoStage.style.setProperty("--demo-glow-x", `${x.toFixed(1)}%`);
      demoStage.style.setProperty("--demo-glow-y", `${y.toFixed(1)}%`);
    });

    demoStage.addEventListener("pointerleave", () => {
      demoStage.style.setProperty("--demo-glow-x", "80%");
      demoStage.style.setProperty("--demo-glow-y", "8%");
    });
  }

  /* -------------------------------------------------------------------------
     Contact form
     ------------------------------------------------------------------------- */

  const form = $("#contactForm");
  const formCard = $(".form-card");
  const formSuccess = $("[data-form-success]");
  const formStatus = $("[data-form-status]");
  const submitButton = $("[data-submit-button]");
  const successHeading = $("[data-success-heading]");
  const successText = $("[data-success-text]");
  const resetButton = $("[data-form-reset]");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldError(field) {
    return document.getElementById(`${field.id}Error`);
  }

  function setFieldError(field, message) {
    const error = fieldError(field);
    if (error) error.textContent = message || "";
    field.classList.toggle("is-invalid", Boolean(message));
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearFormErrors() {
    $$(".is-invalid", form).forEach((field) => setFieldError(field, ""));
    const consent = $("#consent");
    if (consent) consent.setAttribute("aria-invalid", "false");
    const consentError = document.getElementById("consentError");
    if (consentError) consentError.textContent = "";
    if (formStatus) {
      formStatus.classList.remove("is-error");
      formStatus.textContent = "Ozveme se do jednoho pracovního dne. Slibujeme.";
    }
  }

  function validateForm() {
    const errors = [];
    const name = $("#name");
    const email = $("#email");
    const service = $("#service");
    const message = $("#message");
    const consent = $("#consent");

    if (name.value.trim().length < 2) {
      setFieldError(name, "Napište nám prosím své jméno.");
      errors.push(name);
    }

    if (!emailPattern.test(email.value.trim())) {
      setFieldError(email, "Zkontrolujte prosím e-mailovou adresu.");
      errors.push(email);
    }

    if (!service.value) {
      setFieldError(service, "Vyberte prosím, co potřebujete.");
      errors.push(service);
    }

    if (message.value.trim().length < 10) {
      setFieldError(message, "Napište nám prosím alespoň pár slov o projektu.");
      errors.push(message);
    }

    if (!consent.checked) {
      const error = document.getElementById("consentError");
      if (error) error.textContent = "Potvrďte prosím souhlas se zpracováním údajů.";
      consent.setAttribute("aria-invalid", "true");
      errors.push(consent);
    }

    return errors;
  }

  if (form) {
    $$("input, select, textarea", form).forEach((field) => {
      const eventName = field.tagName === "SELECT" || field.type === "checkbox" ? "change" : "input";
      field.addEventListener(eventName, () => {
        if (field.type === "checkbox") {
          field.setAttribute("aria-invalid", "false");
          const error = document.getElementById("consentError");
          if (error) error.textContent = "";
        } else {
          setFieldError(field, "");
        }
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFormErrors();

      const errors = validateForm();
      if (errors.length) {
        errors[0].focus({ preventScroll: false });
        if (formStatus) {
          formStatus.classList.add("is-error");
          formStatus.textContent = "Ještě prosím zkontrolujte zvýrazněná pole.";
        }
        return;
      }

      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        company: String(formData.get("company") || "").trim(),
        service: String(formData.get("service") || ""),
        budget: String(formData.get("budget") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        consent: formData.get("consent") === "on",
        company_website: String(formData.get("company_website") || "").trim()
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("is-loading");
        const label = $("[data-submit-label]", submitButton);
        if (label) label.textContent = "Odesílám…";
      }
      if (formStatus) {
        formStatus.classList.remove("is-error");
        formStatus.textContent = "Odesílám vaši poptávku…";
      }

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          if (result.errors) {
            Object.entries(result.errors).forEach(([key, message]) => {
              const field = document.getElementById(key);
              if (field && field.tagName !== "SELECT" && field.type !== "checkbox") {
                setFieldError(field, message);
              }
            });
          }
          throw new Error(result.message || "Poptávku se nepodařilo odeslat.");
        }

        const firstName = payload.name.split(" ")[0] || payload.name;
        if (successHeading) successHeading.textContent = `Máme to, ${firstName}!`;
        if (successText) {
          successText.textContent =
            "Díky za poptávku. Ozveme se co nejdřív, obvykle do jednoho pracovního dne, a domluvíme další krok.";
        }

        form.hidden = true;
        if (formSuccess) {
          formSuccess.hidden = false;
          formSuccess.setAttribute("tabindex", "-1");
          formSuccess.focus({ preventScroll: true });
        }
        formCard?.classList.add("is-success");
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        formCard?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
        });
        form.status = "";
      } catch (error) {
        if (formStatus) {
          formStatus.classList.add("is-error");
          formStatus.innerHTML =
            "Zprávu se nepodařilo odeslat. Zkuste to znovu, nebo napište přímo na <a href=\"mailto:ahoj@pomelostudio.cz\">ahoj@pomelostudio.cz</a>.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove("is-loading");
          const label = $("[data-submit-label]", submitButton);
          if (label) label.textContent = "Poslat poptávku";
        }
      }
    });
  }

  if (resetButton && form) {
    resetButton.addEventListener("click", () => {
      form.reset();
      form.hidden = false;
      if (formSuccess) formSuccess.hidden = true;
      formCard?.classList.remove("is-success");
      clearFormErrors();
      const name = $("#name");
      if (name) name.focus({ preventScroll: true });
    });
  }
})();
