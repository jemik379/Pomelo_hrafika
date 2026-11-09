/* ZRNKO — product data & packaging illustration */
(function () {
  "use strict";

  const CATEGORY_LABELS = {
    espresso: "Espresso",
    filtr: "Filtr",
    dekaf: "Dekaf",
    darky: "Dárky"
  };

  const PRODUCTS = [
    {
      id: "etiopie-guji",
      name: "Etiopie Guji",
      origin: "Etiopie",
      region: "Guji",
      category: "filtr",
      roast: "Světlé pražení",
      notes: ["meruňka", "jasmín", "bergamot"],
      notesLine: "MERUŇKA · JASMÍN",
      price: 395,
      weight: "250 g",
      badge: "Bestseller",
      badgeClass: "",
      tint: "#dfe5d6",
      body: "#1f3a2c",
      bodyDark: "#142a1f",
      text: "#f3ecdd",
      accent: "#e9a13b",
      motif: "sun",
      bagTitle: "Etiopie",
      bagSub: "GUJI",
      altitude: "2 050 m",
      process: "Promytá",
      intensity: 2,
      reviews: 128,
      desc: "Květnatá a šťavnatá káva z výškových plantáží v regionu Guji. Jasná ovocná kyselinka a dlouhý jasmínový dozvuk — ideální pro filtr a pomalu vychutnávané ráno."
    },
    {
      id: "kolumbie-huila",
      name: "Kolumbie Huila",
      origin: "Kolumbie",
      region: "Huila",
      category: "espresso",
      roast: "Střední pražení",
      notes: ["čokoláda", "karamel", "pomeranč"],
      notesLine: "ČOKOLÁDA · KARAMEL",
      price: 365,
      weight: "250 g",
      badge: null,
      badgeClass: "",
      tint: "#f0d9c9",
      body: "#b4482b",
      bodyDark: "#8a301a",
      text: "#f9e9d6",
      accent: "#f0c08f",
      motif: "arcs",
      bagTitle: "Kolumbie",
      bagSub: "HUILA",
      altitude: "1 750 m",
      process: "Promytá",
      intensity: 3,
      reviews: 96,
      desc: "Vyvážená káva s plným tělem a příjemnou sladkostí. Skvěle funguje jako espresso i s mlékem — každý doušek připomíná tmavou čokoládu s kapkou karamelu."
    },
    {
      id: "kena-nyeri",
      name: "Keňa Nyeri",
      origin: "Keňa",
      region: "Nyeri",
      category: "filtr",
      roast: "Světlé pražení",
      notes: ["černý rybíz", "grep", "třtinový cukr"],
      notesLine: "RYBÍZ · GREP",
      price: 415,
      weight: "250 g",
      badge: "Novinka",
      badgeClass: "badge--new",
      tint: "#d9e1e8",
      body: "#20364a",
      bodyDark: "#142433",
      text: "#eef0e8",
      accent: "#e66a3c",
      motif: "wave",
      bagTitle: "Keňa",
      bagSub: "NYERI",
      altitude: "1 900 m",
      process: "Promytá",
      intensity: 2,
      reviews: 41,
      desc: "Energická a šťavnatá káva s výraznou aciditou, která vás probudí lépe než budík. Černý rybíz, červený grep a dlouhý sladký dozvuk."
    },
    {
      id: "brazilie-cerrado",
      name: "Brazílie Cerrado",
      origin: "Brazílie",
      region: "Cerrado",
      category: "espresso",
      roast: "Středně tmavé",
      notes: ["lískový ořech", "kakao", "med"],
      notesLine: "OŘECH · KAKAO",
      price: 325,
      weight: "250 g",
      badge: "Bestseller",
      badgeClass: "",
      tint: "#eadfc3",
      body: "#c99a3f",
      bodyDark: "#a87a2b",
      text: "#241a0e",
      accent: "#6b4a24",
      motif: "stripes",
      bagTitle: "Brazílie",
      bagSub: "CERRADO",
      altitude: "1 100 m",
      process: "Přírodně zpracovaná",
      intensity: 4,
      reviews: 214,
      desc: "Náš nejoblíbenější espresso pro každodenní rituál. Plné tělo, jemná hořkost a sladkost medu — bez překvapení, ale s charakterem."
    },
    {
      id: "guatemala-antigua",
      name: "Guatemala Antigua",
      origin: "Guatemala",
      region: "Antigua",
      category: "filtr",
      roast: "Střední pražení",
      notes: ["jablko", "karamel", "mandle"],
      notesLine: "JABLKO · MANDLE",
      price: 385,
      weight: "250 g",
      badge: null,
      badgeClass: "",
      tint: "#ecd7d5",
      body: "#8e4b46",
      bodyDark: "#6d3430",
      text: "#f8e9dd",
      accent: "#e8b27c",
      motif: "leaf",
      bagTitle: "Guatemala",
      bagSub: "ANTIGUA",
      altitude: "1 600 m",
      process: "Promytá",
      intensity: 3,
      reviews: 73,
      desc: "Klasika z vulkanických půd Antiguy. Kulatá, sladká káva s ovocnou jiskrou a mandlovým dozvukem. Univerzální favorit pro každou příležitost."
    },
    {
      id: "house-blend",
      name: "House Blend",
      origin: "Směs pražírny",
      region: "Etiopie · Brazílie",
      category: "espresso",
      roast: "Střední pražení",
      notes: ["kakao", "mandle", "karamel"],
      notesLine: "KAKAO · MANDLE",
      price: 315,
      weight: "250 g",
      badge: null,
      badgeClass: "",
      tint: "#ddd2c5",
      body: "#2b211b",
      bodyDark: "#1a1310",
      text: "#f4ecdf",
      accent: "#d95b2b",
      motif: "star",
      bagTitle: "House",
      bagSub: "BLEND",
      altitude: "1 200–2 000 m",
      process: "Směs dvou původů",
      intensity: 3,
      reviews: 302,
      desc: "Každodenní káva, kterou pijeme i my. Vyvážená směs dvou původů, která je příjemná čistá i s mlékem. Poctivá klasika."
    },
    {
      id: "dekaf-kolumbie",
      name: "Dekaf Kolumbie",
      origin: "Kolumbie",
      region: "Huila",
      category: "dekaf",
      roast: "Střední pražení",
      notes: ["mléčná čokoláda", "datle", "ořech"],
      notesLine: "ČOKOLÁDA · DATLE",
      price: 345,
      weight: "250 g",
      badge: null,
      badgeClass: "",
      tint: "#e3e3d8",
      body: "#6d7457",
      bodyDark: "#565c43",
      text: "#f5f0e3",
      accent: "#d9c9a3",
      motif: "moon",
      bagTitle: "Dekaf",
      bagSub: "KOLUMBIE",
      altitude: "1 750 m",
      process: "Švýcarská metoda",
      intensity: 3,
      reviews: 58,
      desc: "Kofein odstraněný šetrně vodou, chuť zůstala. Sametová, sladká káva pro večery, kdy chcete chuť kávy, ale ne bdění do noci."
    },
    {
      id: "darkova-sada",
      name: "Dárková sada Objev",
      origin: "Dárková sada",
      region: "3 × 100 g",
      category: "darky",
      roast: "Mix pražení",
      notes: ["meruňka", "kakao", "karamel"],
      notesLine: "3 KÁVY · 1 PŘÍBĚH",
      price: 690,
      weight: "3 × 100 g",
      badge: "Dárek",
      badgeClass: "badge--gift",
      tint: "#f2e3ce",
      body: "#e9d4ae",
      bodyDark: "#c9ab7b",
      text: "#2a1e12",
      accent: "#b8451f",
      motif: "dots",
      bagTitle: "Dárek",
      bagSub: "3 × 100 G",
      altitude: "—",
      process: "Dárkové balení",
      intensity: 3,
      reviews: 67,
      desc: "Tři naše nejoblíbenější kávy v menším balení, zabalené do dárkové krabice s ručně psanou kartičkou. Pro každého, kdo má rád překvapení."
    }
  ];

  let artSequence = 0;

  function motifMarkup(type, accent) {
    switch (type) {
      case "sun":
        return `<g>
          <circle cx="150" cy="159" r="31" fill="${accent}"/>
          <circle cx="150" cy="159" r="17" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1"/>
          <g stroke="${accent}" stroke-width="1.4" stroke-linecap="round" opacity=".75">
            <path d="M150 116v8M150 194v8M107 159h8M185 159h8M120 129l6 6M174 183l6 6M180 129l-6 6M126 183l-6 6"/>
          </g>
        </g>`;
      case "arcs":
        return `<g fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round">
          <path d="M112 181a38 38 0 0 1 76 0"/>
          <path d="M122 181a28 28 0 0 1 56 0" opacity=".75"/>
          <path d="M132 181a18 18 0 0 1 36 0" opacity=".5"/>
        </g>`;
      case "wave":
        return `<g fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="round">
          <path d="M105 145c9-9 18-9 27 0s18 9 27 0 18-9 27 0 18 9 27 0"/>
          <path d="M105 159c9-9 18-9 27 0s18 9 27 0 18-9 27 0 18 9 27 0" opacity=".72"/>
          <path d="M105 173c9-9 18-9 27 0s18 9 27 0 18-9 27 0 18 9 27 0" opacity=".45"/>
        </g>`;
      case "stripes":
        return `<g stroke="${accent}" stroke-width="5" stroke-linecap="round">
          <path d="m119 177 27-27"/><path d="m132 188 40-40" opacity=".8"/>
          <path d="m148 195 47-47" opacity=".6"/><path d="m166 196 34-34" opacity=".4"/>
        </g>`;
      case "leaf":
        return `<g>
          <path d="M150 181c-2-23 9-36 28-38-1 22-10 35-28 38Z" fill="${accent}"/>
          <path d="M148 183c2-19-6-31-24-33 1 18 9 30 24 33Z" fill="${accent}" opacity=".62"/>
          <path d="M150 191v-10" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
      case "star":
        return `<path d="M150 118c4.5 27 11 33.5 38 39-27 5.5-33.5 12-38 39-4.5-27-11-33.5-38-39 27-5.5 33.5-12 38-39Z" fill="${accent}"/>`;
      case "moon":
        return `<path d="M161 123a36 36 0 1 0 0 72 40 40 0 0 1 0-72Z" fill="${accent}"/>
          <circle cx="178" cy="143" r="2.5" fill="${accent}" opacity=".7"/>
          <circle cx="186" cy="160" r="1.8" fill="${accent}" opacity=".55"/>`;
      case "dots":
      default: {
        let dots = "";
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 5; col++) {
            dots += `<circle cx="${116 + col * 17}" cy="${138 + row * 16}" r="2.7" fill="${accent}" opacity="${0.95 - row * 0.16}"/>`;
          }
        }
        return `<g>${dots}</g>`;
      }
    }
  }

  function bagArt(product) {
    const u = "bag" + (++artSequence);
    const bagPath = "M72 88c0-8 6-14 14-14h128c8 0 14 6 14 14v198c0 13-10 23-23 23H95c-13 0-23-10-23-23V88Z";
    const sealPath = "M78 55h144c5 0 9 4 9 9v19c0 5-4 9-9 9H78c-5 0-9-4-9-9V64c0-5 4-9 9-9Z";
    const crimps = [88, 102, 116, 130, 144, 158, 172, 186, 200, 214]
      .map((x) => `<path d="M${x} 62v18"/>`)
      .join("");

    return `
    <svg class="bag-svg" viewBox="0 0 300 340" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${product.body}"/>
          <stop offset="1" stop-color="${product.bodyDark}"/>
        </linearGradient>
        <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${product.bodyDark}"/>
          <stop offset="1" stop-color="${product.body}"/>
        </linearGradient>
        <clipPath id="${u}c"><path d="${bagPath}"/></clipPath>
      </defs>
      <ellipse cx="150" cy="319" rx="86" ry="11" fill="#1c1510" opacity=".16"/>
      <path d="${bagPath}" fill="url(#${u}b)"/>
      <g clip-path="url(#${u}c)">
        <path d="M72 92c20 9 18 190 0 214V92Z" fill="#000" opacity=".12"/>
        <path d="M228 92c-20 9-18 190 0 214V92Z" fill="#fff" opacity=".07"/>
        <path d="M72 280h156v35H72Z" fill="#000" opacity=".08"/>
      </g>
      <path d="${sealPath}" fill="url(#${u}s)"/>
      <g stroke="${product.text}" stroke-opacity=".18" stroke-width="1.4" stroke-linecap="round">${crimps}</g>
      <path d="M70 93c40 8 120 8 160 0" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="1.5"/>
      <text x="150" y="118" text-anchor="middle" font-family="Manrope, sans-serif" font-size="6.4" font-weight="700" letter-spacing="2.2" fill="${product.text}" fill-opacity=".72">ZRNKO · SPECIALTY</text>
      ${motifMarkup(product.motif, product.accent)}
      <text x="150" y="220" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="20" font-weight="500" letter-spacing=".4" fill="${product.text}">${product.bagTitle}</text>
      <text x="150" y="235" text-anchor="middle" font-family="Manrope, sans-serif" font-size="6.2" font-weight="700" letter-spacing="2.5" fill="${product.text}" fill-opacity=".6">${product.bagSub}</text>
      <path d="M132 245h36" stroke="${product.accent}" stroke-width="1.2"/>
      <text x="150" y="259" text-anchor="middle" font-family="Manrope, sans-serif" font-size="5.6" font-weight="700" letter-spacing="1.1" fill="${product.text}" fill-opacity=".68">${product.notesLine}</text>
      <text x="150" y="292" text-anchor="middle" font-family="Manrope, sans-serif" font-size="5.2" font-weight="700" letter-spacing="1.8" fill="${product.text}" fill-opacity=".5">VÝBĚROVÁ KÁVA · ${product.weight.toUpperCase()}</text>
    </svg>`;
  }

  const SUB_VISUAL = Object.assign({}, PRODUCTS.find((p) => p.id === "house-blend"), {
    tint: "#e2d6c7",
    bagTitle: "Zrnko",
    bagSub: "PŘEDPLATNÉ",
    notesLine: "VAŠE KÁVA · VÁŠ RYTMUS"
  });

  window.ZRNKO = {
    PRODUCTS,
    CATEGORY_LABELS,
    bagArt,
    productById: (id) => PRODUCTS.find((p) => p.id === id) || null,
    SUB_VISUAL
  };
})();
