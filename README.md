# Pomelo studio

Ukázkový jednostránkový web fiktivního digitálního studia. Čisté HTML, CSS a JavaScript bez build kroku, doplněné malým Node serverem pro lokální spuštění a příjem poptávek.

> **Důležité:** veškerý obsah je smyšlený. Názvy firem, případové studie, čísla, ceny, kontakty i identita studia jsou ukázkové. Před ostrým spuštěním je nahraďte skutečnými údaji a nechte zkontrolovat právní texty.

## Požadavky

- Node.js 18 nebo novější
- žádné závislosti ani build krok

## Lokální spuštění

```bash
npm start
```

Web poběží na [http://127.0.0.1:4177](http://127.0.0.1:4177).

Port a rozhraní lze změnit proměnnými prostředí:

```powershell
$env:PORT = "3000"
$env:HOST = "127.0.0.1"
npm start
```

## Co web obsahuje

- responzivní jednostránkovou prezentaci v češtině,
- výrazné 3D dekorace, aurora pozadí, scroll progress a jemné interakce s respektem k `prefers-reduced-motion`,
- interaktivní sekci ukázkových webů se čtyřmi taby a zvětšeným náhledem v dialogu, který neopustí stránku,
- čtyři živé ukázky — e-shop **Zrnko**, školku **Lentilka**, digitální agenturu **Prostor Studio** a fotografické portfolio **Pohled**: malé náhledy jsou optimalizované WebP obrázky, plná verze se načte až po otevření dialogu,
- mobilní navigaci, scrollspy, reveal animace a modální detail případových studií,
- poptávkový formulář s klientskou i serverovou validací, honeypotem a rate limitingem,
- samostatnou stránku se zásadami ochrany osobních údajů a vlastní 404,
- SEO metadata, JSON-LD, Open Graph obrázek, manifest, `robots.txt` a `sitemap.xml`.

Odeslané poptávky se ukládají do `data/inquiries.jsonl`. Soubor i celá složka `data/` jsou v `.gitignore` a server je veřejně nezpřístupňuje.

### Ukázkové weby

Sekce `#ukazky` předvádí čtyři smyšlené weby. **Zrnko**, **Lentilka**, **Prostor Studio** a **Pohled** jsou plnohodnotné weby (živé ukázky). **Zrnko** je plnohodnotný statický e-shop pražírny kávy, **Lentilka** plnohodnotný web školky a dětské skupiny s interaktivní časovou osou dne, týdenním jídelníčkem, zápisem ve čtyřech krocích a rezervací prohlídky, **Prostor Studio** je one-page digitální agentura s plátnem Three.js a pěti zónami, **Pohled** je minimalistické černobílé fotografické portfolio s velkými snímky a čistou typografií.

- Taby se ovládají myší i klávesnicí (`Arrow`, `Home`, `End`) a používají roving tabindex.
- Malý náhled je optimalizovaný WebP obrázek s deklarovanými rozměry. Plná verze všech čtyř ukázek se načítá lazy až při otevření dialogu, takže běžná návštěva stránky nestahuje celý e-shop, školku, agenturu ani portfolio.
- Tlačítko **Otevřít živý web** nebo **Zvětšit náhled** otevře ukázku v nativním `<dialog>` téměř přes celou obrazovku. Živé ukázky běží v same-origin `<iframe>` se sandboxem, takže v nich funguje scroll, filtry, vyhledávání, košík, quick view i pokladna, aniž by návštěvník opustil Pomelo. Lentilka v iframe nabízí přepínání průběhu dne, jídelníčku, validovaný zápis a rezervaci prohlídky.
- Dialog lze zavřít křížkem nebo klávesou `Escape`. Escape uvnitř iframe pošle rodiči `postMessage` a dialog zavře také. Fokus se po zavření vrátí na tlačítko, které dialog otevřel.
- V dialogu lze přepínat ukázky tlačítky předchozí/další. Pro všechny čtyři ukázky se vytvoří živý iframe. CTA **Chci podobný web** dialog zavře, posune na kontakt a předvyplní odpovídající službu.
- Ukázky jsou dostupné i bez animací, při `prefers-reduced-motion: reduce` se vypínají přechody i dekorativní pohyb.
- Zrnko používá lokální fonty **Archivo** (display) a **Space Grotesk** (text), Lentilka **Fredoka** a **Nunito**, hlavní Pomelo **Fraunces** a **Manrope** — všechny fonty jsou v `assets/fonts/`, takže se v iframe načtou z cache a nestahují se znovu. Prohlížeč si košík Zrnka pamatuje v `localStorage` pod klíčem `zrnko_cart_v1`. Lentilka kreslí veškerou grafiku pomocí SVG a CSS a neposílá žádné externí požadavky. Pohled používá systémový patkový fallback a lokální černobílé WebP fotografie z Unsplash (viz `demos/pohled/img/CREDITS.md`).
- Demo soubory posílá server s `X-Frame-Options: SAMEORIGIN`, CSP s `frame-ancestors 'self'` a `X-Robots-Tag: noindex, nofollow`. Hlavní stránka zůstává `X-Frame-Options: DENY`.

## Produkční nasazení

Web je navržený pro běh za TLS reverzní proxy (nginx, Caddy nebo hosting s Node podporou).

1. Nastavte produkční prostředí:

   ```bash
   NODE_ENV=production HOST=0.0.0.0 PORT=4177 TRUST_PROXY=1 npm start
   ```

   - `NODE_ENV=production` zapne HSTS.
   - `TRUST_PROXY=1` použijte pouze tehdy, když server skutečně běží za důvěryhodnou proxy. Server pak čte `X-Forwarded-For` a `X-Forwarded-Proto`.
   - Bez proxy nechte `TRUST_PROXY` vypnuté a `HOST` ideálně `127.0.0.1`.

2. Proxy musí předávat `X-Forwarded-Proto: https` a ukončovat TLS. Přesměrujte HTTP na HTTPS.

3. Ověřte, že proces může zapisovat do `data/`. Server vytváří složku s právy `700` a soubor s právy `600`. Na hostingu bez podpory těchto práv zajistěte ekvivalentní omezení přístupu.

4. Nastavte zálohování a retenci souboru `data/inquiries.jsonl`. Poptávky obsahují osobní údaje, proto s nimi zacházejte jako s důvěrným materiálem.

5. Před spuštěním nahraďte doménu `https://www.pomelostudio.cz/` ve `index.html`, `privacy.html`, `sitemap.xml`, `robots.txt` a v JSON-LD. Pokud používáte jinou doménu, upravte také Open Graph a canonical adresy.

6. Zkontrolujte, že hosting správně servíruje `404.html` pro neexistující adresy. Node server to dělá automaticky.

### Co server zajišťuje

- allowlist veřejných souborů a složek (`assets/`, `css/`, `js/`, vyjmenované soubory v kořeni),
- samostatný allowlist pro `demos/` (Zrnko a Lentilka), který zpřístupní jen soubory ukázek,
- blokaci `/data`, zdrojáků, konfigurace a skrytých souborů,
- bezpečnostní hlavičky včetně CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` a `Permissions-Policy`,
- pro demo navíc `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'` v CSP a `X-Robots-Tag: noindex, nofollow`; hlavní stránka zůstává `DENY`,
- HSTS v produkci nebo při požadavku přes HTTPS,
- Brotli a gzip kompresi textových souborů s variantními ETagy (`-br`, `-gzip`) a `Vary: Accept-Encoding`,
- validaci JSONu, same-origin kontrolu, limit velikosti těla a honeypot,
- rate limiting 8 poptávek na 15 minut pro jednu IP adresu,
- ETag a 304 odpovědi pro statické soubory,
- vlastní 404 stránku a JSON chyby pro API.

Rate limiting je uložený v paměti procesu. Při více instancích nebo po restartu se počítadla resetují. Pro větší provoz použijte sdílené úložiště (např. Redis) nebo rate limiting na proxy.

### Odesílání poptávek

Server ukládá poptávky pouze lokálně do JSONL. Neodesílá e-maily ani je neposílá do CRM. Pro produkci doporučujeme napojit odesílání na transakční e-mailovou službu nebo CRM a nastavit monitoring selhání. Do textu zásad ochrany údajů pak doplňte skutečné příjemce a dobu uchování.

## Obsah a právní náležitosti

Před ostrým spuštěním je nutné:

- doplnit skutečnou identitu správce (obchodní jméno, IČO, adresa, případně DIČ),
- nahradit ukázkové kontakty, ceny a případové studie,
- upravit zásady ochrany osobních údajů podle skutečného hostingu, nástrojů a doby uchování,
- nechat právní texty zkontrolovat právníkem,
- ověřit, zda formulář nevyžaduje jiný právní základ než souhlas,
- doplnit informace o cookies, pokud přidáte analytiku nebo marketingové nástroje.

Současný web nenastavuje žádné cookies a nepoužívá analytiku. Pokud je přidáte, aktualizujte zásady i případný cookie banner.

## Přístupnost a chování

- klávesnicová navigace, skip link a viditelné focus stavy,
- mobilní menu a oba modální dialogy řeší focus a zavírání klávesou Escape,
- taby ukázek používají `tablist`/`tab`/`tabpanel`, roving tabindex a klávesy `Arrow`, `Home`, `End`,
- formulář má popisky, `aria-invalid` a oznámení chyb,
- animace se vypnou při `prefers-reduced-motion: reduce`,
- dekorativní 3D objekty a aurora jsou skryté před čtečkami.

## Struktura

```text
index.html          Obsah jednostránkového webu
privacy.html        Zásady ochrany osobních údajů
404.html            Vlastní chybová stránka
site.webmanifest    Manifest pro instalaci na plochu
robots.txt          Pravidla pro crawlery
sitemap.xml         Mapa stránek
css/style.css       Hlavní styly, 3D scéna, ukázkové weby a responsivita
css/legal.css       Styly právních stránek a 404
js/boot.js          Včasné přidání třídy js
js/main.js          Navigace, animace, ukázkové taby, modály a formulář
server.js           Statický server a POST /api/contact
assets/             Favicon, fonty, OG obrázek a ikony pro Apple/PWA
assets/demos/       Optimalizované WebP náhledy ukázkových webů
demos/zrnko/        Plnohodnotný statický e-shop Zrnko
demos/lentilka/     Plnohodnotný web školky Lentilka
data/               Uložené poptávky (vytváří se za běhu, mimo git)
```

## Rychlá kontrola po nasazení

- Načtěte `/`, `/privacy.html` a neexistující adresu.
- Ověřte, že `http://` se přesměruje na `https://` a v odpovědi je HSTS.
- Zkontrolujte konzoli prohlížeče, jestli nehlásí CSP chyby.
- Odešlete testovací poptávku a ověřte zápis v `data/inquiries.jsonl`.
- Zkuste neplatný e-mail, příliš krátkou zprávu a chybějící souhlas.
- Ověřte, že `/data/inquiries.jsonl`, `/server.js` a `/.gitignore` vrací 404.
- Proklikejte taby v sekci Ukázkové weby, otevřete všechny čtyři živé weby a vyzkoušejte filtry, přidání do košíku, přepínání dne i jídelníčku, zápis dítěte, lightbox fotografií, formuláře a Escape. Ověřte, že se fokus po zavření vrátí na tlačítko.
- Zkontrolujte, že se dema načítají z `demos/zrnko/`, `demos/lentilka/`, `demos/prostor/` a `demos/pohled/`, nemají externí požadavky a v hlavičkách mají `X-Frame-Options: SAMEORIGIN` a `X-Robots-Tag: noindex, nofollow`.
- Ověřte kompresi: `curl -I -H "Accept-Encoding: br" http://127.0.0.1:4177/css/style.css` má vrátit `Content-Encoding: br`, `Vary: Accept-Encoding` a ETag s příponou `-br`. Opakovaný požadavek s `If-None-Match` má vrátit 304.
- Zkontrolujte Open Graph náhled a `sitemap.xml` po změně domény.
- Otestujte web na šířkách 390, 768 a 1440 px a klávesnicí bez myši.

## Známá omezení

- jde o ukázkový web s fiktivním obsahem,
- všechny čtyři ukázky jsou plnohodnotné živé weby,
- poptávky se ukládají do lokálního souboru, nikoli do databáze,
- rate limiting je pouze v paměti jednoho procesu,
- chybí automatické e-mailové notifikace a integrace CRM,
- chybí produkční monitoring a zálohovací politika,
- právní texty je před použitím nutné přizpůsobit skutečnému provozu.
