/* =========================================================
   NK Programming — SEO build. No dependencies, just Node 18+:

     node tools/build.mjs

   1. Writes the Bulgarian text, projects, prices and FAQ straight into
      index.html, so Google reads the real content without running JS.
      (main.js still renders them in the browser — same HTML, same result.)
   2. Sets title / description / canonical / JSON-LD on index.html.
   3. Builds every service page from tools/pages.mjs → /<slug>/index.html.
   4. Writes sitemap.xml and robots.txt.

   Run it again after changing js/data.js or tools/pages.mjs.
   When the site moves to its own domain, change BASE and run again.
   ========================================================= */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18N, FAQ } from '../js/data.js';
import { cardsHTML, pricingHTML, faqHTML } from '../js/render.js';
import { PAGES } from './pages.mjs';

const BASE = 'https://nkprogramming.com'; // ← no trailing slash
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);
const EMAIL = 'nikola.klimentow@gmail.com';
const VIBER = 'viber://chat?number=%2B359893951260';
const ICO_VIBER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5c4.7 0 8.5 3.2 8.5 7.6s-3.8 7.6-8.5 7.6c-.9 0-1.8-.1-2.6-.4L5 20.5l.9-3.7A7.2 7.2 0 0 1 3.5 11.1C3.5 6.7 7.3 3.5 12 3.5Z"/><path d="M9.5 9.2c.3 1.9 1.4 3.4 3.3 4.3M12.5 7.7a2.6 2.6 0 0 1 2.3 2.3"/></svg>';

const HOME = {
  title: 'Изработка на сайт и онлайн магазин | NK Programming',
  desc: 'Изработка на сайтове, онлайн магазини и платформи по поръчка за бизнеси от цяла България. Сайт от 50 €, поддръжка от 35 €/мес. Собствен дизайн, не шаблон. Виж цената за 2 минути.',
};

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const write = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const t = (k) => I18N.bg[k] ?? I18N.en[k] ?? k;
const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

/* ---------- replace the inside of an element, found by its opening tag ---------- */
function closeOf(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[0].endsWith('/>')) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index;
  }
  throw new Error(`no closing </${tag}> after ${from}`);
}
function fillAll(html, openRe, inner) {
  let out = '', pos = 0, m;
  openRe.lastIndex = 0;
  while ((m = openRe.exec(html))) {
    const tag = m[1], start = m.index + m[0].length, end = closeOf(html, tag, start);
    const v = inner(m);
    out += html.slice(pos, start) + (v ?? html.slice(start, end));
    pos = end; openRe.lastIndex = end;
  }
  return out + html.slice(pos);
}
const byClass = (cls) => new RegExp(`<([a-z0-9]+)\\b[^>]*\\bclass="${cls}"[^>]*>`, 'gi');
function between(html, name, content, fallbackBefore) {
  const a = `<!-- seo:${name} -->`, b = `<!-- /seo:${name} -->`;
  const block = `${a}\n${content}\n  ${b}`;
  if (html.includes(a)) return html.slice(0, html.indexOf(a)) + block + html.slice(html.indexOf(b) + b.length);
  return html.replace(fallbackBefore, `  ${block}\n${fallbackBefore}`);
}
const setMeta = (html, re, val) => { if (!re.test(html)) throw new Error('meta not found: ' + re); return html.replace(re, val); };

/* ---------- shared structured data ---------- */
const ORG = {
  '@type': 'ProfessionalService',
  '@id': `${BASE}/#business`,
  name: 'NK Programming',
  url: `${BASE}/`,
  email: EMAIL,
  image: `${BASE}/assets/og-image.jpg`,
  logo: `${BASE}/assets/favicon.svg`,
  description: HOME.desc,
  founder: { '@type': 'Person', name: 'Никола Климентов', jobTitle: 'Fullstack разработчик' },
  address: { '@type': 'PostalAddress', addressLocality: 'Горна Оряховица', addressRegion: 'Велико Търново', addressCountry: 'BG' },
  areaServed: { '@type': 'Country', name: 'България' },
  priceRange: '€€',
  knowsAbout: ['Изработка на сайт', 'Онлайн магазин', 'WooCommerce', 'ASP.NET Core', 'SQL Server', 'Azure', 'SEO'],
};

/* =========================================================
   1–2. index.html
   ========================================================= */
let home = read('index.html');

home = fillAll(home, /<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>/gi, (m) => {
  const v = t(m[2]);
  return typeof v === 'string' && v !== m[2] ? v : null;
});
home = fillAll(home, byClass('work__track'), () => cardsHTML('bg', t));
home = fillAll(home, byClass('pricing__list'), () => pricingHTML('bg', t));
home = fillAll(home, byClass('faq__list'), () => faqHTML('bg'));

home = setMeta(home, /<title>[\s\S]*?<\/title>/, `<title>${esc(HOME.title)}</title>`);
home = setMeta(home, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(HOME.desc)}">`);
home = setMeta(home, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${BASE}/">`);
home = setMeta(home, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${BASE}/">`);
home = setMeta(home, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${BASE}/assets/og-image.jpg">`);

home = between(home, 'jsonld', '  ' + [
  jsonld({ '@context': 'https://schema.org', '@graph': [
    ORG,
    { '@type': 'WebSite', '@id': `${BASE}/#site`, url: `${BASE}/`, name: 'NK Programming', inLanguage: 'bg', publisher: { '@id': `${BASE}/#business` } },
    { '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: strip(f.q.bg), acceptedAnswer: { '@type': 'Answer', text: strip(f.a.bg) } })) },
  ] }),
].join('\n'), '</head>');

/* links to every service page, at the bottom of the home page (internal links for Google) */
home = between(home, 'services', `  <nav class="seo-links" aria-label="Услуги">
    <p class="seo-links__t mono">Услуги</p>
    <ul>
${PAGES.map((p) => `      <li><a href="${p.slug}/">${esc(p.nav)}</a></li>`).join('\n')}
      <li><a href="zapitvane.html">Калкулатор за цена</a></li>
    </ul>
  </nav>`, '  <footer class="footer mono">');

write('index.html', home);

/* =========================================================
   3. service pages
   ========================================================= */
const calcUrl = (type) => `/zapitvane.html${type ? `?type=${type}` : ''}`;
const arrow = '<span class="btn__arrow" aria-hidden="true">↗</span>';

function pageHTML(p) {
  const url = `${BASE}/${p.slug}/`;
  const others = PAGES.filter((o) => o.slug !== p.slug);
  const ex = p.example;
  const ld = jsonld({ '@context': 'https://schema.org', '@graph': [
    { ...ORG },
    { '@type': 'Service', name: p.h1, serviceType: p.nav, description: p.desc, url, areaServed: { '@type': 'Country', name: 'България' }, provider: { '@id': `${BASE}/#business` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Начало', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: p.nav, item: url },
    ] },
    { '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ] });

  return `<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.desc)}">
  <meta name="theme-color" content="#0a0a0a">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="NK Programming">
  <meta property="og:locale" content="bg_BG">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(p.desc)}">
  <meta property="og:image" content="${BASE}/${ex.img || 'assets/og-image.jpg'}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/geologica-cyrillic-full-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/fonts.css">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/legal.css">
  <link rel="stylesheet" href="/css/page.css">
  ${ld}
</head>
<body class="sp">
  <!-- generated by tools/build.mjs from tools/pages.mjs — edit there, not here -->
  <header class="sp-top">
    <a href="/" class="sp-logo" aria-label="NK Programming — начало">
      <svg viewBox="0 0 160 110" fill="none" aria-hidden="true"><path d="M8 102 V8 L68 102 V8 M94 8 V102 M94 64 L152 8 M114 46 L154 102"/></svg>
      <span><b>NK</b><br><i>Programming</i></span>
    </a>
    <nav class="sp-nav" aria-label="Основно меню">
      <a href="/izrabotka-na-sayt/">Услуги</a>
      <a href="/#work">Проекти</a>
      <a href="/#pricing">Цени</a>
      <a href="/#contact">Контакт</a>
    </nav>
    <a href="${VIBER}" class="sp-tel" aria-label="Пиши ми във Viber">${ICO_VIBER}<span>Viber</span></a>
    <a href="${calcUrl(p.calc)}" class="btn btn--accent btn--sm"><span class="btn__txt">Сметни цената</span>${arrow}</a>
  </header>

  <main>
    <section class="sp-hero">
      <nav class="sp-crumbs mono" aria-label="Навигация"><a href="/">Начало</a><span>/</span><span aria-current="page">${esc(p.nav)}</span></nav>
      <h1 class="sp-h1">${esc(p.h1)}</h1>
      <p class="sp-lead">${esc(p.lead)}</p>
      <div class="sp-ctas">
        <a href="${calcUrl(p.calc)}" class="btn btn--accent"><span class="btn__txt">Виж цената за 2 минути</span>${arrow}</a>
        <span class="sp-from mono">Цена: <b>${esc(p.from)}</b></span>
      </div>
    </section>

    <section class="sp-sec sp-intro">
      <h2 class="sp-h2">${esc(p.intro.h2)}</h2>
      <div class="sp-prose">${p.intro.p.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
    </section>

    <section class="sp-sec">
      <p class="sp-k mono">// какво получаваш</p>
      <h2 class="sp-h2">Какво включва</h2>
      <ul class="sp-feats">
${p.features.map(([a, b], i) => `        <li><span class="mono">${String(i + 1).padStart(2, '0')}</span><h3>${esc(a)}</h3><p>${esc(b)}</p></li>`).join('\n')}
      </ul>
    </section>

    <section class="sp-sec">
      <p class="sp-k mono">// колко струва</p>
      <h2 class="sp-h2">Цени</h2>
      <ul class="sp-prices">
${p.prices.map(([a, b, c]) => `        <li><div><h3>${esc(a)}</h3><p>${esc(c)}</p></div><b>${esc(b)}</b></li>`).join('\n')}
      </ul>
      <p class="sp-note">Цените са ориентировъчни. Точната сума я пиша в офертата — след като знам какво точно ти трябва.</p>
      <a href="${calcUrl(p.calc)}" class="btn btn--ghost sp-btn"><span class="btn__txt">Сметни точната цена</span>${arrow}</a>
    </section>

    <section class="sp-sec">
      <p class="sp-k mono">// пример от моята работа</p>
      <h2 class="sp-h2">${esc(ex.name)}</h2>
      <div class="sp-ex">
        ${ex.img
          ? `<${ex.url ? `a href="${ex.url}" target="_blank" rel="noopener"` : 'div'} class="sp-ex__img"><img src="/${ex.img}" alt="${esc(ex.name)} — ${esc(ex.cat)}" loading="lazy" decoding="async" width="1600" height="800"></${ex.url ? 'a' : 'div'}>`
          : `<div class="sp-ex__img sp-ex__img--soon"><span class="mono">● очаквайте скоро</span><b>${esc(ex.name)}</b></div>`}
        <div class="sp-ex__txt">
          <p class="sp-ex__cat mono">${esc(ex.cat)}${ex.concept ? ' · концептуален проект' : ''}</p>
          <p>${esc(ex.text)}</p>
          ${ex.url ? `<a href="${ex.url}" target="_blank" rel="noopener" class="sp-link">${esc(ex.url.replace(/^https?:\/\//, ''))} ↗</a>` : ''}
          <a href="/#work" class="sp-link">Всички проекти →</a>
        </div>
      </div>
    </section>

    <section class="sp-sec">
      <p class="sp-k mono">// как работим</p>
      <h2 class="sp-h2">От разговор до готов сайт</h2>
      <ol class="sp-steps">
        <li><b>Разговор</b><span>Какъв е бизнесът ти и какво трябва да постигне сайтът.</span></li>
        <li><b>Оферта</b><span>Страници, функции, срок и цена — всичко е ясно предварително.</span></li>
        <li><b>Дизайн и изработка</b><span>Всяка седмица виждаш напредъка онлайн.</span></li>
        <li><b>Пускане и поддръжка</b><span>Тествам, пускам и оставам на разположение след това.</span></li>
      </ol>
    </section>

    <section class="sp-sec">
      <p class="sp-k mono">// въпроси</p>
      <h2 class="sp-h2">Често задавани въпроси</h2>
      <div class="sp-faq">
${p.faq.map(([q, a]) => `        <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
      </div>
    </section>

    <section class="sp-cta">
      <h2>Колко ще струва твоят сайт?</h2>
      <p>4 кратки стъпки, около минута — и виждаш цената веднага.</p>
      <a href="${calcUrl(p.calc)}" class="btn btn--accent"><span class="btn__txt">Сметни цената</span>${arrow}</a>
      <p class="sp-cta__alt mono">или пиши ми във <a href="${VIBER}">Viber</a> · <a href="mailto:${EMAIL}">${EMAIL}</a></p>
    </section>

    <nav class="sp-sec sp-more" aria-label="Още услуги">
      <p class="sp-k mono">// още</p>
      <ul>
${others.map((o) => `        <li><a href="/${o.slug}/">${esc(o.nav)} →</a></li>`).join('\n')}
      </ul>
    </nav>
  </main>

  <footer class="legal-foot">
    <span>© ${new Date().getFullYear()} NK Programming</span>
    <nav><a href="/">Начало</a><a href="/privacy.html">Поверителност</a><a href="/terms.html">Общи условия</a></nav>
  </footer>
</body>
</html>
`;
}

for (const p of PAGES) write(`${p.slug}/index.html`, pageHTML(p));

/* =========================================================
   3b. 404 page (Netlify serves /404.html for every missing address)
   A paper plane — the page — flies out of an empty browser window.
   ========================================================= */
const FLIGHT = 'M200 178 C 250 150, 300 108, 372 118 C 440 128, 492 96, 500 62 C 508 30, 470 18, 448 40 C 424 64, 452 104, 500 112 C 556 122, 610 92, 680 52';
write('404.html', `<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Тази страница отлетя — NK Programming</title>
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#0a0a0a">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/fonts.css">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/legal.css">
  <link rel="stylesheet" href="/css/page.css">
</head>
<body class="sp nf">
  <!-- generated by tools/build.mjs — edit there, not here -->
  <header class="sp-top">
    <a href="/" class="sp-logo" aria-label="NK Programming — начало">
      <svg viewBox="0 0 160 110" fill="none" aria-hidden="true"><path d="M8 102 V8 L68 102 V8 M94 8 V102 M94 64 L152 8 M114 46 L154 102"/></svg>
      <span><b>NK</b><br><i>Programming</i></span>
    </a>
    <a href="${VIBER}" class="sp-tel" aria-label="Пиши ми във Viber">${ICO_VIBER}<span>Viber</span></a>
    <a href="/zapitvane.html" class="btn btn--accent btn--sm"><span class="btn__txt">Сметни цената</span>${arrow}</a>
  </header>

  <main class="nf-main">
    <p class="nf-big" aria-hidden="true">4<span>0</span>4</p>
    <p class="nf-code mono">страницата не е намерена</p>

    <svg class="nf-scene" viewBox="0 0 680 300" role="img" aria-label="Хартиено самолетче излита от празен прозорец на браузър">
      <defs>
        <mask id="nf-trail-mask"><path class="nf-reveal" d="${FLIGHT}" fill="none" stroke="#fff" stroke-width="8"/></mask>
      </defs>
      <!-- clouds -->
      <g class="nf-cloud" opacity=".5">
        <path d="M520 236 a18 18 0 0 1 34 -8 a14 14 0 0 1 24 10 h-58 z" fill="rgba(242,242,238,.07)"/>
        <animateTransform attributeName="transform" type="translate" values="0 0; -60 0; 0 0" dur="18s" repeatCount="indefinite"/>
      </g>
      <g class="nf-cloud" opacity=".7">
        <path d="M560 168 a22 22 0 0 1 42 -10 a17 17 0 0 1 30 12 h-72 z" fill="rgba(242,242,238,.06)"/>
        <animateTransform attributeName="transform" type="translate" values="0 0; 50 0; 0 0" dur="22s" repeatCount="indefinite"/>
      </g>

      <!-- browser window -->
      <g class="nf-win">
        <rect x="40" y="56" width="300" height="220" rx="16" fill="#111" stroke="rgba(242,242,238,.18)"/>
        <path d="M40 72 a16 16 0 0 1 16 -16 h268 a16 16 0 0 1 16 16 v18 h-300 z" fill="rgba(242,242,238,.05)"/>
        <circle cx="60" cy="73" r="4" fill="#ff5f57"/><circle cx="74" cy="73" r="4" fill="#febc2e"/><circle cx="88" cy="73" r="4" fill="#28c840"/>
        <rect x="104" y="65" width="220" height="16" rx="8" fill="rgba(242,242,238,.06)"/>
        <text class="nf-url" x="114" y="77">nkprogramming / …</text>
        <!-- what is left of the page -->
        <rect x="64" y="110" width="120" height="10" rx="5" fill="rgba(242,242,238,.12)"/>
        <rect x="64" y="128" width="80" height="8" rx="4" fill="rgba(242,242,238,.08)"/>
        <rect class="nf-hole" x="150" y="150" width="104" height="70" rx="10" fill="none" stroke="#ccff00" stroke-dasharray="6 6"/>
        <text class="nf-q" x="202" y="196" text-anchor="middle">?</text>
        <rect x="64" y="238" width="252" height="8" rx="4" fill="rgba(242,242,238,.06)"/>
        <rect x="64" y="254" width="180" height="8" rx="4" fill="rgba(242,242,238,.05)"/>
      </g>

      <!-- dotted trail, drawn as the plane flies -->
      <path class="nf-trail" d="${FLIGHT}" fill="none" stroke="rgba(242,242,238,.45)" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round" mask="url(#nf-trail-mask)"/>

      <!-- the paper plane (= the page) -->
      <g class="nf-plane">
        <g transform="translate(-14 -10)">
          <path d="M0 10 L28 0 L18 22 L13 13 Z" fill="#ccff00"/>
          <path d="M0 10 L13 13 L28 0" fill="none" stroke="#0a0a0a" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M13 13 L14 20 L18 22" fill="#a8d100"/>
        </g>
        <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto" path="${FLIGHT}" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .35 1"/>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.9;1" dur="5.5s" repeatCount="indefinite"/>
      </g>
    </svg>

    <h1 class="nf-t">Тази страница отлетя.</h1>
    <p class="nf-p">Адресът е сгрешен или страницата вече я няма.</p>
    <div class="nf-ctas">
      <a href="/" class="btn btn--accent"><span class="btn__txt">Обратно към началото</span>${arrow}</a>
      <a href="/zapitvane.html" class="btn btn--ghost"><span class="btn__txt">Колко ще струва моят сайт?</span></a>
    </div>
  </main>

  <script>
    (function () {
      var svg = document.querySelector('.nf-scene');
      /* the address they tried, in the fake browser bar */
      var p = location.pathname; try { p = decodeURIComponent(p); } catch (e) {}
      if (p.length > 26) p = p.slice(0, 25) + '…';
      svg.querySelector('.nf-url').textContent = 'nkprogramming' + p;
      /* the trail is revealed in step with the plane */
      var r = svg.querySelector('.nf-reveal'), L = Math.ceil(r.getTotalLength());
      r.setAttribute('stroke-dasharray', L + ' ' + L);
      r.setAttribute('stroke-dashoffset', L);
      var a = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      [['attributeName', 'stroke-dashoffset'], ['values', L + ';0;0;' + L], ['keyTimes', '0;.62;.9;1'], ['dur', '5.5s'], ['repeatCount', 'indefinite']]
        .forEach(function (kv) { a.setAttribute(kv[0], kv[1]); });
      r.appendChild(a);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { svg.pauseAnimations(); svg.setCurrentTime(2.6); }
    })();
  </script>
</body>
</html>
`);

/* =========================================================
   4. sitemap + robots
   ========================================================= */
const urls = [`${BASE}/`, ...PAGES.map((p) => `${BASE}/${p.slug}/`), `${BASE}/zapitvane.html`];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /
Disallow: /tools/
Disallow: /reklama/

Sitemap: ${BASE}/sitemap.xml
`);

console.log(`✓ index.html prerendered (BG)\n✓ ${PAGES.length} service pages + 404.html\n✓ sitemap.xml (${urls.length} urls), robots.txt\nBASE = ${BASE}`);
