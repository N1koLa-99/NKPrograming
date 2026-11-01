/* =========================================================
   NK Programming — interactions & motion
   ========================================================= */
import { PROJECTS, I18N, SOCIALS } from './data.js';
import { createStack } from './stack.js';
import { cardsHTML, pricingHTML, faqHTML } from './render.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

document.documentElement.classList.add('js');
gsap.registerPlugin(ScrollTrigger);
// phone toolbars (Chrome / Safari) slide in and out while scrolling and change the viewport height.
// Nothing on the page depends on that height changing, so ignore it instead of re-laying out.
ScrollTrigger.config({ ignoreMobileResize: true });
// a viewport height that ignores the toolbars: refreshed only when the width changes
let vh = window.innerHeight;
const coarse = window.matchMedia('(pointer: coarse)').matches;
// phones: react only when the device turns; desktops: on a real width change
const onWidthResize = (fn) => {
  let w = window.innerWidth, land = w > window.innerHeight;
  window.addEventListener('resize', () => {
    const l = window.innerWidth > window.innerHeight;
    if (l === land && (coarse || Math.abs(window.innerWidth - w) < 60)) return;
    land = l; w = window.innerWidth; vh = window.innerHeight; fn();
  });
};

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// lite mode: older / weaker machines get the same site without the per-frame extras.
// Picked up front from the hardware. (?lite / ?full in the url force it either way)
const qs = new URLSearchParams(location.search);
const apple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
// in-app browsers (the Google app, Facebook, Instagram…) are the weakest of all: always lite
const inApp = /\bGSA\/|FBAN|FBAV|Instagram|Line\/|; wv\)/.test(navigator.userAgent);
const weak = qs.has('lite') || (!qs.has('full') && (inApp || (!apple && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4))));
// phones and tablets scroll natively; the scroll-linked extras (font-axis scrubs, the grain, blurred glass) are what
// makes them stutter — so every touch device gets the lite build. It looks the same, it just does less per frame.
const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
let lite = weak || (touch && !qs.has('full'));
if (weak) document.documentElement.classList.add('weak');
const goLite = () => { lite = true; document.documentElement.classList.add('lite'); };
if (lite) goLite();
const isMobile = () => window.innerWidth <= 900;

// while the page is being scrolled on a touch device, the decorative loops pause (html.is-scrolling)
let scrolling = false;
if (touch) {
  let t = 0;
  window.addEventListener('scroll', () => {
    if (!scrolling) { scrolling = true; document.documentElement.classList.add('is-scrolling'); }
    clearTimeout(t);
    t = setTimeout(() => { scrolling = false; document.documentElement.classList.remove('is-scrolling'); }, 160);
  }, { passive: true });
}

/* ---------------- language ---------------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
let lang = 'bg'; // the site always opens in Bulgarian; EN is one tap away in the nav
const t = (k) => (I18N[lang] && I18N[lang][k]) ?? I18N.en[k] ?? k;

/* ---------------- hero visual ---------------- */
// the exploded-website stack is plain CSS 3D (js/stack.js), built right away so it is ready behind the loader
let stack = null;

/* ---------------- smooth scroll ---------------- */
let lenis = null;
// (native scrolling in lite mode: it stays smooth even when the main thread is busy)
if (!reduce && !lite && typeof Lenis !== 'undefined') {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4) });
  else {
    const el = typeof target === 'string' ? $(target) : target;
    window.scrollTo({ top: el ? el.getBoundingClientRect().top + window.scrollY : 0, behavior: reduce ? 'auto' : 'smooth' });
  }
};

/* ---------------- text splitting ---------------- */
function splitChars(el) {
  const text = el.textContent;
  el.innerHTML = '';
  [...text].forEach((ch) => {
    const m = document.createElement('span');
    m.className = 'char-mask';
    const c = document.createElement('span');
    c.className = 'char';
    c.textContent = ch === ' ' ? ' ' : ch;
    m.appendChild(c);
    el.appendChild(m);
  });
  return $$('.char', el);
}

function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          // punctuation right after an element (…</em>:) stays glued to its last word, so it can't wrap alone
          const prev = n.previousSibling;
          const glue = !frag.childNodes.length && /^[:;,.!?…]+$/.test(part) && prev && prev.nodeType === 1 && prev.querySelector('.word:last-child');
          if (glue) {
            const p = document.createElement('span');
            p.className = 'punct';
            p.textContent = part;
            glue.appendChild(p);
          }
          else if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else {
            const w = document.createElement('span');
            w.className = 'word';
            w.textContent = part;
            frag.appendChild(w);
          }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  return $$('.word', el);
}

let workRevealed = false;
let flowWork = () => {};

function renderCards() {
  const track = $('.work__track');
  track.innerHTML = cardsHTML(lang, t);
  $('.work__total').textContent = String(PROJECTS.length);

  if (!workRevealed && !reduce) gsap.set($$('.card', track), { opacity: 0, y: 120, rotate: 2 });
  bindTilt();
  flowWork();
}

function bindTilt() {
  if (!fine || lite) return;
  $$('.card__media').forEach((m) => {
    const rx = gsap.quickTo(m, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const ry = gsap.quickTo(m, 'rotationY', { duration: 0.8, ease: 'power3.out' });
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 10);
      rx(-(py - 0.5) * 10);
      m.style.setProperty('--mx', `${px * 100}%`);
      m.style.setProperty('--my', `${py * 100}%`);
    });
    m.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

function renderSocials() {
  $('.footer__socials').innerHTML = SOCIALS
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener" data-scramble>${s.label}</a>`).join('');
}

/* ---------------- about words ---------------- */
let aboutTween = null;
function buildAbout() {
  const el = $('.about__text');
  if (aboutTween) { aboutTween.scrollTrigger && aboutTween.scrollTrigger.kill(); aboutTween.kill(); }
  const words = splitWords(el);
  if (reduce) return;
  aboutTween = gsap.fromTo(words, { opacity: 0.12 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
}

/* ---------------- pricing ---------------- */
const pad2 = (n) => String(n).padStart(2, '0');
function renderPricing() {
  $('.pricing__list').innerHTML = pricingHTML(lang, t);
}
// phones: the cards scroll sideways, starting on the middle (most popular) one
function initPricingCarousel() {
  const list = $('.pricing__list'), dots = $('.pricing__dots');
  const cards = $$('.plan', list);
  dots.innerHTML = cards.map(() => '<i></i>').join('');
  const centre = (card, smooth) => list.scrollTo({ left: card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  const mark = () => {
    const mid = list.scrollLeft + list.clientWidth / 2;
    let best = 0;
    cards.forEach((c, i) => { if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - mid)) best = i; });
    $$('i', dots).forEach((d, i) => d.classList.toggle('is-on', i === best));
  };
  const start = () => { if (!isMobile()) return; const f = cards.find((c) => c.classList.contains('plan--featured')) || cards[0]; centre(f, false); mark(); };
  list.onscroll = mark;
  $$('i', dots).forEach((d, i) => { d.onclick = () => centre(cards[i], true); });
  start();
  return start;
}
let recentrePricing = () => {};

// cursor spotlight on the cards
document.addEventListener('pointermove', (e) => {
  const c = e.target.closest && e.target.closest('.plan');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', `${e.clientX - r.left}px`);
  c.style.setProperty('--my', `${e.clientY - r.top}px`);
});
/* ---------------- faq ---------------- */
function renderFaq() {
  $('.faq__list').innerHTML = faqHTML(lang);
}
document.addEventListener('click', (e) => {
  const q = e.target.closest('.faq__q');
  if (!q) return;
  const item = q.parentElement;
  const open = !item.classList.contains('is-open');
  $$('.faq__item.is-open').forEach((it) => {
    if (it === item) return;
    it.classList.remove('is-open');
    it.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
    gsap.to(it.querySelector('.faq__a'), { height: 0, duration: 0.5, ease: 'expo.inOut' });
  });
  item.classList.toggle('is-open', open);
  q.setAttribute('aria-expanded', String(open));
  const a = item.querySelector('.faq__a');
  if (open) gsap.fromTo(a, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() });
  else gsap.to(a, { height: 0, duration: 0.5, ease: 'expo.inOut', onComplete: () => ScrollTrigger.refresh() });
});

/* ---------------- hero brand ---------------- */
function fitBrand() {
  const line = $('.hero__brand-line'), box = $('.hero__brand');
  line.style.fontSize = '100px';
  const stacked = getComputedStyle($('.hb-gap')).display === 'block';
  const w = stacked ? Math.max($('.hb-solid').offsetWidth, $('.hb-tail').offsetWidth) : line.scrollWidth;
  if (!w) return;
  line.style.fontSize = `${(100 * box.clientWidth / w) * 0.995}px`;
}
const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}<>/#$*+=';
function scrambleChars(chars, delay = 0) {
  chars.forEach((c, i) => {
    const final = c.textContent;
    let n = 0;
    setTimeout(() => {
      const id = setInterval(() => {
        n++;
        c.textContent = n > 9 ? final : SCR[(Math.random() * SCR.length) | 0];
        if (n > 9) clearInterval(id);
      }, 38);
    }, delay + i * 55);
  });
}

/* ---------------- living headline (hero line 1) ---------------- */
function splitLive() {
  const el = $('.hl--dim');
  const text = el.textContent;
  el.innerHTML = text.split(' ').map((w) =>
    `<span style="white-space:nowrap">${[...w].map((c) => `<span class="lch">${c}</span>`).join('')}</span>`).join(' ');
  return $$('.lch', el);
}
let liveChars = [];
function initLiveType() {
  liveChars = splitLive();
  if (reduce) return;
  if (fine) {
    let raf = 0, ex = -9999, ey = -9999;
    const run = () => {
      raf = 0;
      const rects = liveChars.map((c) => c.getBoundingClientRect());
      liveChars.forEach((c, i) => {
        const r = rects[i];
        const d = Math.hypot(ex - (r.left + r.width / 2), ey - (r.top + r.height / 2));
        const k = Math.max(0, 1 - d / (r.height * 2.4));
        const e = Math.round(k * k * (3 - 2 * k) * 40) / 40;
        if (c._e === e) return;
        c._e = e;
        c.style.setProperty('--w', Math.round(400 + 450 * e));
        c.style.setProperty('--sl', (-12 * e).toFixed(1));
        c.style.setProperty('--cr', e > 0.5 ? 1 : 0);
        c.style.setProperty('--sh', Math.round(30 + 70 * e));
        c.classList.toggle('is-hot', e > 0.35);
      });
    };
    window.addEventListener('pointermove', (e) => {
      if (lite || window.scrollY > window.innerHeight) return;
      ex = e.clientX; ey = e.clientY;
      if (!raf) raf = requestAnimationFrame(run);
    }, { passive: true });
  } else {
    // touch: a slow wave of weight + slant runs through the line.
    // Font-axis changes re-lay-out the text, so it runs at ~30 fps with no CSS transition
    // (a transition would interpolate — and re-lay-out — on every frame anyway)
    // and only touches letters whose value actually moved
    $('.hl--dim').classList.add('is-wave');
    const t0 = performance.now();
    let lastT = 0;
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (weak || scrolling || now - lastT < 32 || window.scrollY > window.innerHeight) return;
      lastT = now;
      const t = (now - t0) / 1000;
      liveChars.forEach((c, i) => {
        const k = Math.round(Math.pow((Math.sin(t * 1.5 - i * 0.42) + 1) / 2, 4) * 40) / 40;
        if (c._k === k) return;
        c._k = k;
        c.style.setProperty('--w', Math.round(400 + 420 * k));
        c.style.setProperty('--sl', (-11 * k).toFixed(1));
        c.style.setProperty('--sh', Math.round(30 + 70 * k));
        c.classList.toggle('is-hot', k > 0.5);
      });
    };
    requestAnimationFrame(loop);
  }
}

/* ---------------- apply language ---------------- */
let booted = false;
function applyLang(l) {
  lang = l;
  store.set('nk-lang', l);
  document.documentElement.lang = l;
  $$('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.innerHTML = v;
  });
  $$('.lang button').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === l));
  const words = t('loader');
  renderCards();
  renderPricing();
  recentrePricing = initPricingCarousel();
  renderFaq();
  if ($('.hl--dim .lch') || booted) liveChars = splitLive();
  if (booted) {
    startRotator();
    buildAbout();
    ScrollTrigger.refresh();
  }
}

$$('.lang button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.lang === lang) return;
  const main = $('main');
  gsap.timeline()
    .to(main, { opacity: 0, duration: 0.25, ease: 'power2.in' })
    .add(() => applyLang(b.dataset.lang))
    .to(main, { opacity: 1, duration: 0.5, ease: 'power2.out' });
}));

/* ---------------- cursor ---------------- */
function initCursor() {
  if (!fine) return;
  document.body.classList.add('has-cursor');
  const cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  let lastMode = '';
  const update = (target) => {
    const el = target && target.closest ? target.closest('[data-cursor], a, button') : null;
    let mode = '';
    if (el) mode = el.dataset.cursor ? 'label:' + el.dataset.cursor : 'hover';
    if (mode === lastMode) return;
    lastMode = mode;
    cursor.classList.toggle('is-hover', mode === 'hover');
    cursor.classList.toggle('is-label', mode.startsWith('label'));
    if (mode === 'label:view') label.textContent = t('work.visit');
    else if (mode === 'label:mail') label.textContent = t('cursor.mail');
  };
  let shown = false;
  window.addEventListener('pointermove', (e) => {
    if (!shown) { shown = true; gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); gsap.to(cursor, { opacity: 1, duration: 0.4 }); }
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    update(e.target);
  }, { passive: true });
  window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  document.documentElement.addEventListener('mouseleave', () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));
  document.documentElement.addEventListener('mouseenter', () => { if (shown) gsap.to(cursor, { opacity: 1, duration: 0.3 }); });
  // refresh state after scroll (element under cursor changes without moving)
  if (lenis) lenis.on('scroll', () => { lastMode = '__'; });
}

/* ---------------- magnetic ---------------- */
function initMagnetic() {
  if (!fine) return;
  $$('[data-magnetic]').forEach((el) => {
    const strength = el.classList.contains('contact__cta') ? 0.4 : 0.3;
    const inner = el.firstElementChild;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.6, ease: 'power3.out' });
      if (inner) gsap.to(inner, { x: x * strength * 0.5, y: y * strength * 0.5, duration: 0.6, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to([el, inner].filter(Boolean), { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)' });
    });
  });
}

/* ---------------- scramble ---------------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>';
function initScramble() {
  if (!fine) return;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('[data-scramble]');
    if (!el || el._scr) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    const final = el.textContent;
    let frame = 0;
    const total = Math.min(18, final.length * 2 + 4);
    el._scr = true;
    const step = () => {
      frame++;
      const p = frame / total;
      el.textContent = [...final].map((c, i) => {
        if (c === ' ' || i / final.length < p) return c;
        return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      if (frame < total) requestAnimationFrame(step);
      else { el.textContent = final; el._scr = false; }
    };
    step();
  });
}

/* ---------------- delegated clicks ---------------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll-to]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('#')) return;
  e.preventDefault();
  closeMenu();
  scrollTo(href === '#top' ? 0 : href);
});

/* ---------------- mobile menu ---------------- */
function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  $('.nav').style.top = '';
  $('.menu').setAttribute('aria-hidden', 'true');
  if (lenis) lenis.start();
}
$('.burger').addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  if (!open) return closeMenu();
  // phones: the bar lives at the top of the page; pin it exactly where it is while the menu is open
  if (isMobile()) $('.nav').style.top = `${-window.scrollY}px`;
  document.body.classList.add('menu-open');
  $('.menu').setAttribute('aria-hidden', 'false');
  if (lenis) lenis.stop();
  gsap.fromTo('.menu__links a', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.25 });
});

/* ---------------- clock ---------------- */
function initClock() {
  const el = $('.clock'), tz = el.nextElementSibling;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Sofia', hour: '2-digit', minute: '2-digit' });
  let off = '';
  try {
    off = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Sofia', timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find((p) => p.type === 'timeZoneName').value;
  } catch (e) { off = 'EET'; }
  const tick = () => { el.textContent = fmt.format(new Date()); };
  tz.textContent = off;
  tick();
  setInterval(tick, 10000);
  $('.year').textContent = new Date().getFullYear();
}

/* ---------------- loader ----------------
   A wall of ghost "NK PROGRAMMING" rows fills the screen,
   the wordmark in the middle decodes as the build runs,
   the wall flies apart and the wordmark glides up into
   the logo in the top bar.                                 */
const TASKS = ['resolving packages', 'compiling c#', 'migrating database', 'bundling assets', 'rendering ui', 'deploying to azure', 'ready'];
const ENC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=/<>{}';

function runLoader() {
  return new Promise((resolve) => {
    const loader = $('.loader');
    const heroBrand = $('.hero__brand'), heroLine = $('.hero__brand-line');
    const H = window.innerHeight;
    const D = reduce ? 0.8 : 1.8;
    const SPEED = 2; // whole intro plays this many times faster (count 0→100 ≈ 0.9s)

    // clone the hero wordmark → loader ends pixel-exact where the hero begins
    const r = heroLine.getBoundingClientRect();
    const lb = $('.loader__brand');
    const clone = heroLine.cloneNode(true);
    clone.style.marginLeft = '0';
    lb.appendChild(clone);
    const startY = Math.round((H - r.height) / 2);
    gsap.set(lb, { x: r.left, y: startY });

    const chars = $$('.char', clone);
    const finals = chars.map((c) => c.textContent);
    chars.forEach((c) => { c.classList.add('is-enc'); c.textContent = ENC[(Math.random() * ENC.length) | 0]; });
    const caret = $('.hb-caret', clone);
    gsap.set(caret, { opacity: 0 });

    // ghost wall
    const wall = $('.loader__wall');
    const fs = parseFloat(heroLine.style.fontSize) || 100;
    const rowH = fs * 0.94;
    const rows = [];
    const rowHTML = Array(3).fill('<b>NK</b> PROGRAMMING_').join('&nbsp;&nbsp;&nbsp;');
    const mk = (top, idx) => {
      const el = document.createElement('div');
      el.className = 'wall-row';
      el.style.fontSize = `${fs}px`;
      el.style.top = `${top}px`;
      el.innerHTML = rowHTML;
      wall.appendChild(el);
      rows.push({ el, idx, dir: idx % 2 ? 1 : -1 });
    };
    if (!reduce) {
      const up = Math.ceil(startY / rowH) + 1;
      const down = Math.ceil((H - startY - r.height) / rowH) + 1;
      for (let i = 1; i <= up; i++) mk(startY - i * rowH, -i);
      for (let i = 0; i < down; i++) mk(startY + r.height + i * rowH, i + 1);
    }
    const maxIdx = rows.reduce((m, x) => Math.max(m, Math.abs(x.idx)), 1);
    rows.forEach(({ el, dir }) => {
      const x0 = -Math.random() * fs * 5;
      gsap.fromTo(el, { x: x0 + dir * fs * 3, opacity: 0 }, { x: x0, opacity: 1, duration: 1.6 / SPEED, ease: 'expo.out', delay: (0.05 + Math.random() * 0.25) / SPEED });
      gsap.to(el, { x: `+=${dir * fs * 1.6}`, duration: (D + 2) / SPEED, ease: 'none', delay: 1.6 / SPEED });
    });

    // where the wordmark lands: up, shrinking into the logo in the top bar
    // (phones: right onto the "NK PROGRAMMING_" name there; desktop: into the NK mark, fading as it arrives)
    const landing = () => {
      const navName = $('.nav__logo .mono');
      if (!isMobile()) {
        const n = $('.nav__logo').getBoundingClientRect();
        const s = n.height / r.height;
        return { x: n.left, y: n.top, scale: s, opacity: 0, transformOrigin: '0 0', duration: 1.2, ease: 'expo.inOut' };
      }
      const n = navName.getBoundingClientRect();
      const s = parseFloat(getComputedStyle(navName).fontSize) / fs;
      return { x: n.left, y: n.top + (n.height - r.height * s) / 2, scale: s, transformOrigin: '0 0', duration: 1.2, ease: 'expo.inOut' };
    };

    const countEl = $('.loader__count'), mods = $('.loader__mods'), task = $('.loader__task b');
    const st = { p: 0 };
    let lastEnc = 0, lastLit = -1;

    const tl = gsap.timeline().timeScale(SPEED);
    tl.fromTo(['.loader__top', '.loader__bottom'], { opacity: 0, y: (i) => (i ? 20 : -20) }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0)
      .fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.025 }, 0.1)
      .to(st, {
        p: 1, duration: D, ease: 'power2.inOut',
        onUpdate: () => {
          const p = st.p;
          countEl.textContent = String(Math.round(p * 100)).padStart(3, '0');
          mods.textContent = `${Math.round(p * 128)} / 128 modules`;
          task.textContent = TASKS[Math.min(TASKS.length - 1, Math.floor(p * (TASKS.length - 1)))];
          const now = performance.now();
          const tick = now - lastEnc > 55;
          if (tick) lastEnc = now;
          chars.forEach((c, i) => {
            if (!c.classList.contains('is-enc')) return;
            if (p >= ((i + 1) / (chars.length + 1)) * 0.94) {
              c.classList.remove('is-enc');
              c.textContent = finals[i];
              gsap.fromTo(c, { yPercent: -30 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' });
            } else if (tick) c.textContent = ENC[(Math.random() * ENC.length) | 0];
          });
          const lit = Math.min(maxIdx, 1 + Math.floor(p * maxIdx));
          if (lit !== lastLit) {
            lastLit = lit;
            rows.forEach((x) => x.el.classList.toggle('is-lit', Math.abs(x.idx) === lit));
          }
        },
      }, 0)
      .to('.loader__bar i', { scaleX: 1, duration: D, ease: 'power2.inOut' }, 0)
      .add(() => {
        chars.forEach((c, i) => { c.classList.remove('is-enc'); c.textContent = finals[i]; });
        rows.forEach((x) => x.el.classList.remove('is-lit'));
        gsap.set(caret, { opacity: 1 });
      }, D)
      .to(rows.filter((x) => x.idx < 0).map((x) => x.el), { yPercent: -180, opacity: 0, duration: 0.8, ease: 'expo.in', stagger: 0.035 }, D + 0.05)
      .to(rows.filter((x) => x.idx > 0).map((x) => x.el), { yPercent: 180, opacity: 0, duration: 0.8, ease: 'expo.in', stagger: 0.035 }, D + 0.05)
      .to(['.loader__top', '.loader__bottom'], { opacity: 0, duration: 0.4, ease: 'power2.in' }, D + 0.05)
      .to(lb, landing(), D + 0.55)
      .to('.loader__bg', { opacity: 0, duration: 1, ease: 'power2.inOut' }, D + 0.75)
      .add(resolve, D + 1.05)
      .add(() => {
        heroBrand.classList.remove('is-pending');
        loader.remove();
        document.body.classList.remove('is-loading');
      }, D + 1.8);
  });
}

/* ---------------- hero: rotating word ---------------- */
let rotGen = 0;
function startRotator() {
  const rot = $('.rot'), txt = $('.rot__txt'), sel = $('.rot__sel');
  const gen = ++rotGen;
  const alive = () => gen === rotGen;
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  gsap.set(sel, { scaleX: 0 });
  rot.classList.remove('is-selected', 'is-typing');
  if (reduce) { txt.textContent = t('hero.words')[0]; return; }
  txt.textContent = '';
  let i = 0;
  (async () => {
    while (alive()) {
      const words = t('hero.words');
      const w = words[i % words.length];
      rot.classList.add('is-typing');
      for (let k = 1; k <= w.length; k++) {
        if (!alive()) return;
        txt.textContent = w.slice(0, k);
        await sleep(60 + Math.random() * 50);
      }
      rot.classList.remove('is-typing');
      await sleep(2300);
      if (!alive()) return;
      rot.classList.add('is-selected');
      gsap.to(sel, { scaleX: 1, duration: 0.32, ease: 'power3.out' });
      await sleep(520);
      if (!alive()) return;
      txt.textContent = '';
      gsap.set(sel, { scaleX: 0 });
      rot.classList.remove('is-selected');
      await sleep(160);
      i++;
    }
  })();
}

/* ---------------- hero intro ---------------- */
function heroIntro() {
  const tl = gsap.timeline();
  if (!reduce) {
    tl.fromTo('.nav', { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', clearProps: 'transform' }, 0.2);
    tl.fromTo('[data-hero-fade]', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09 }, 0.1);
  } else {
    gsap.set(['[data-hero-fade]', '.nav'], { opacity: 1 });
  }
  tl.add(startRotator, reduce ? 0 : 0.7);
  if (stack) stack.reveal();
  return tl;
}

/* ---------------- scroll scenes ---------------- */
function initScroll() {
  // generic reveals
  if (reduce) {
    gsap.set('[data-reveal]', { opacity: 1, y: 0 });
  } else {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    });
  }


  // nav: hide on scroll down, colour over light section
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const nav = $('.nav');
      if (document.body.classList.contains('menu-open')) return;
      nav.classList.toggle('is-scrolled', y > 40);
      // touch: the bar stays put — sliding it in and out on every small change of direction is what
      // made a slow scroll up shudder (it fights the browser's own toolbar coming back)
      if (touch) { lastY = y; return; }
      if (y > 300 && y > lastY + 4) nav.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 300) nav.classList.remove('is-hidden');
      lastY = y;
    },
  });

  if (!reduce) {
    // hero parallax out
    const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__content', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { ...heroST, end: '60% top' } });

    // variable-font weight grows as section titles come in.
    // Every axis change re-lays-out the title, so the values move in small steps
    // (~35 per title over the whole range) instead of on every scrolled pixel.
    if (!lite) $$('[data-wght], .contact__title').forEach((el) => {
      const o = { w: 140, sl: -12, sh: 0 };
      let last = '';
      const apply = () => {
        const w = Math.round(o.w / 20) * 20, sl = Math.round(o.sl), sh = Math.round(o.sh / 10) * 10;
        const key = `${w}|${sl}|${sh}`;
        if (key === last) return;
        last = key;
        el.style.setProperty('--w', w);
        el.style.setProperty('--sl', sl);
        el.style.setProperty('--sh', sh);
      };
      apply();
      gsap.to(o, { w: 800, sl: 0, sh: 100, ease: 'none', onUpdate: apply, scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 45%', scrub: true } });
    });

    // pricing: the cards rise in a fan, then the prices count up
    ScrollTrigger.batch('[data-plan]', {
      start: 'top 90%', once: true,
      onEnter: (b) => b.forEach((card, i) => {
        const k = [...card.parentElement.children].indexOf(card), d = i * 0.12;
        gsap.fromTo(card, { y: 140, rotate: (k - 1) * 4, opacity: 0 },
          { y: 0, rotate: 0, opacity: 1, duration: 1.5, ease: 'expo.out', delay: d, clearProps: 'transform,rotate' });
        gsap.fromTo(card.querySelectorAll('.plan__top, .plan__name, .plan__for, .plan__price, .plan__inc, .plan__list li, .plan__cta'), { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.045, delay: d + 0.25, clearProps: 'transform' });
        card.querySelectorAll('[data-to]').forEach((el) => {
          const o = { v: 0 }, to = +el.dataset.to;
          gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', delay: d + 0.35, onUpdate: () => { el.textContent = Math.round(o.v); } });
        });
      }),
    });
    gsap.set('[data-plan]', { opacity: 0 });

    // faq entrances
    gsap.set('.faq__item', { opacity: 0, y: 60 });
    ScrollTrigger.batch('.faq__item', {
      start: 'top 92%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }),
    });

    // stats count up
    $$('[data-count]').forEach((el) => {
      const n = +el.dataset.count, o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: n, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }),
      });
    });

    // light panels expand to full-bleed. A clip-path change repaints the whole panel,
    // so it is desktop-only (on a phone the 5vw inset is barely visible anyway)
    // and stepped to whole pixels, so idle scroll frames repaint nothing
    const expand = (sel, end) => {
      const el = $(sel), o = { k: 1 };
      let last = -1;
      const apply = () => {
        const inset = Math.round(o.k * window.innerWidth * 0.05);
        if (inset === last) return;
        last = inset;
        el.style.setProperty('--inset', `${inset}px`);
        el.style.setProperty('--radius', `${Math.round(o.k * 48)}px`);
      };
      apply();
      const tw = gsap.to(o, { k: 0, ease: 'none', onUpdate: apply, scrollTrigger: { trigger: el, start: 'top bottom', end, scrub: true } });
      return () => { tw.scrollTrigger.kill(); tw.kill(); el.style.removeProperty('--inset'); el.style.removeProperty('--radius'); };
    };
    if (!lite) gsap.matchMedia().add('(min-width: 901px)', () => {
      const off = [expand('.work', 'top top'), expand('.services', 'top 15%'), expand('.faq', 'top 15%')];
      return () => off.forEach((f) => f());
    });
    ScrollTrigger.batch('[data-svc]', {
      start: 'top 88%', once: true,
      onEnter: (b) => gsap.fromTo(b.map((x) => [...x.children]).flat(), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.04 }),
    });
    gsap.set($$('[data-svc] > *'), { opacity: 0 });

    // contact title
    gsap.fromTo('.contact__title .mask > span', { yPercent: 110 }, {
      yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.contact__title', start: 'top 88%' },
    });
    // the form card rises in, then its fields follow one by one
    gsap.fromTo('.cform', { y: 90, opacity: 0, rotate: 2.5, transformOrigin: '100% 100%' }, {
      y: 0, opacity: 1, rotate: 0, duration: 1.5, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact__row', start: 'top 92%' },
    });
    gsap.fromTo('.cform__head > *, .cform__f, .cform__consent, .cform__foot > *', { y: 28, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.25, clearProps: 'transform',
      scrollTrigger: { trigger: '.contact__row', start: 'top 92%' },
    });
  } else {
    $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
  }

  // work — horizontal on desktop, stacked on mobile
  const mm = gsap.matchMedia();
  const revealCards = () => {
    if (workRevealed) return;
    workRevealed = true;
    gsap.to($$('.work__track .card'), { opacity: 1, y: 0, rotate: 0, duration: 1.4, ease: 'expo.out', stagger: 0.08 });
  };
  mm.add('(min-width: 901px)', () => {
    const track = $('.work__track');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const bar = $('.work__bar i'), cur = $('.work__cur');
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.work', start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (s) => {
          bar.style.transform = `scaleX(${s.progress})`;
          const idx = Math.min(PROJECTS.length, Math.floor(s.progress * PROJECTS.length) + 1);
          cur.textContent = String(idx);
        },
      },
    });
    ScrollTrigger.create({ trigger: '.work', start: 'top 70%', once: true, onEnter: revealCards });
  });
  mm.add('(max-width: 900px)', () => {
    workRevealed = true;
    gsap.set('.work__track .card', { opacity: 1, y: 0, rotate: 0 });
    if (reduce) return;
    ScrollTrigger.batch('.work__track .card', {
      start: 'top 92%', once: true,
      onEnter: (b) => b.forEach((c) => {
        gsap.fromTo(c.querySelectorAll('.card__meta, .card__cat, .card__info'), { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.2, clearProps: 'transform' });
      }),
    });
  });
  if (reduce) { workRevealed = true; gsap.set('.work__track .card', { opacity: 1, y: 0, rotate: 0 }); }

  initProcessPath();

  // phones: the projects stack — each card sticks under the bar and the next one slides over it,
  // while the one underneath dims. Never scaled: rescaling a screenshot every frame makes it shimmer.
  let stackTweens = [];
  const stackCards = () => {
    stackTweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
    stackTweens = [];
    if (!isMobile() || reduce) return;
    const cards = $$('.work__track .card');
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return;
      stackTweens.push(gsap.to(c, {
        '--cover': 0.35, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top 45%', end: 'top 15%', scrub: true },
      }));
    });
  };
  // the project in view grows to full size, the rest settle back a little. Only a class flips when the
  // current card changes — the size change itself is a short CSS transition, never a per-frame rescale.
  let focusRaf = 0, focused = -1;
  const focusCard = () => {
    focusRaf = 0;
    if (!isMobile()) return;
    const cards = $$('.work__track .card');
    let best = -1, bestV = 0;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const coverTop = cards[i + 1] ? cards[i + 1].getBoundingClientRect().top : Infinity;
      const v = Math.min(r.bottom, coverTop, vh) - Math.max(r.top, 0); // the part of this card you actually see
      if (v > bestV) { bestV = v; best = i; }
    });
    if (best === focused) return;
    focused = best;
    cards.forEach((c, i) => c.classList.toggle('is-focus', i === best));
  };
  window.addEventListener('scroll', () => { if (!focusRaf) focusRaf = requestAnimationFrame(focusCard); }, { passive: true });
  flowWork = () => { stackCards(); focused = -1; focusCard(); ScrollTrigger.refresh(); };
  focusCard();
  onWidthResize(stackCards);
  stackCards();

  // positions the per-frame scroll handlers need — measured once per refresh, never inside a scroll frame
  // (reading layout right after other handlers wrote styles forces a synchronous re-layout every frame)
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  const pos = { heroEnd: 0, contact: 0 };
  const measure = () => {
    pos.heroEnd = $('.hero').offsetHeight * 0.7;
    pos.contact = docTop($('#contact'));
  };
  ScrollTrigger.addEventListener('refresh', measure);
  measure();

  // floating price-calculator pill — after the hero, gone once contact is on screen
  // (a plain scroll listener: a start:0/end:'max' trigger stopped updating once its end was measured early)
  const mcta = $('.m-cta');
  const mctaUpdate = () => {
    const y = window.scrollY;
    mcta.classList.toggle('is-on', y > pos.heroEnd && pos.contact - y > vh * 0.75);
  };
  window.addEventListener('scroll', mctaUpdate, { passive: true });
  mctaUpdate();

  // active nav link
  $$('[data-nav]').forEach((a) => {
    const sec = document.getElementById(a.dataset.nav);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => a.classList.toggle('is-active', self.isActive),
    });
  });

  // touch: Safari (and Chrome) tint their toolbars — and Safari's fade at the bottom — from the page colour.
  // Follow whichever section sits at the bottom edge of the screen, so the fade is light over the light panels.
  if (touch) {
    const meta = $('meta[name="theme-color"]'), root = document.documentElement;
    let on = false;
    const set = (v) => {
      if (v === on) return;
      on = v;
      root.classList.toggle('edge-light', v);
      if (meta) meta.setAttribute('content', v ? '#f2f2ee' : '#0a0a0a');
    };
    const light = $$('.work, .services, .faq');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: () => {
        const y = vh - 2; // a hair above the bottom edge
        set(light.some((el) => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
      },
    });
  }

  // nav colour over the light sections
  ScrollTrigger.create({
    trigger: '.services', start: 'top 40px', end: 'bottom 40px',
    toggleClass: { targets: '.nav', className: 'is-light' },
  });
  ScrollTrigger.create({
    trigger: '.work', start: 'top 40px', end: 'bottom 40px',
    toggleClass: { targets: '.nav', className: 'is-light' },
  });
  ScrollTrigger.create({
    trigger: '.faq', start: 'top 40px', end: 'bottom 40px',
    toggleClass: { targets: '.nav', className: 'is-light' },
  });
}

/* ---------------- marquee ---------------- */
function initMarquee() {
  const track = $('.marquee__track'), row = $('.marquee__row');
  const spans = $$('.marquee__row span');
  let x = 0, speed = 1, dir = 1, rowW = row.offsetWidth;
  onWidthResize(() => { rowW = row.offsetWidth; });
  let lean = 0, leanSet = 0, visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(track.parentElement);
  gsap.ticker.add((_, dt) => {
    if (!visible) return;
    const v = lenis ? lenis.velocity : 0;
    if (Math.abs(v) > 0.1) dir = v > 0 ? 1 : -1;
    const target = 1 + Math.min(Math.abs(v) * 0.35, 9);
    speed += (target - speed) * 0.08;
    if (!reduce) x -= speed * dir * dt * 0.05;
    if (x <= -rowW) x += rowW;
    if (x > 0) x -= rowW;
    track.style.transform = `translate3d(${x}px,0,0)`;
    if (!reduce) {
      const tgt = -Math.min(12, Math.abs(v) * 0.9);
      lean += (tgt - lean) * 0.12;
      // slant is a font axis → every change re-lays-out the whole row; only touch it in whole steps
      const q = Math.round(lean);
      if (q !== leanSet) { leanSet = q; track.style.setProperty('--mq-sl', q); }
    }
  });
}

/* ---------------- process: a line drawn by scroll ----------------
   The dots are laid out by CSS (zigzag on every screen; on phones
   the line also runs down beside each step before crossing over);
   the path is rebuilt from their centres. Its head
   follows a fixed line on the screen, so the line always reaches
   the next point exactly when you scroll to it.                 */
function initProcessPath() {
  const wrap = $('.process__path');
  const svg = $('.process__svg', wrap), base = $('.pp-base', svg), line = $('.pp-line', svg);
  const runner = $('.process__runner', wrap);
  const steps = $$('[data-step]', wrap);
  const HEAD = 0.62; // where on the screen the line's head sits
  const wide = window.matchMedia('(min-width: 901px)');
  let pts = [], stepY = [], cum = [], total = 0, wrapTop = 0;

  const typeIn = (step) => {
    if (step.dataset.typed) return;
    step.dataset.typed = '1';
    const title = $('.step__title', step);
    title.innerHTML = [...title.textContent].map((c) => `<span class="tc">${c}</span>`).join('');
    gsap.set(title, { opacity: 1 });
    const rest = [$('.step__num', step), $('.step__desc', step), $('.step__out', step)];
    if (reduce) { gsap.set($$('.tc', title), { opacity: 1 }); gsap.set(rest, { opacity: 1, y: 0 }); return; }
    gsap.to(rest[0], { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
    gsap.to($$('.tc', title), { opacity: 1, duration: 0.01, stagger: 0.035, delay: 0.1 });
    gsap.to(rest.slice(1), { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.25 + title.textContent.length * 0.035 * 0.6 });
  };

  const build = () => {
    const box = wrap.getBoundingClientRect();
    wrapTop = box.top + window.scrollY;
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    pts = []; stepY = [];
    steps.forEach((st) => {
      const r = $('.step__dot', st).getBoundingClientRect();
      const x = r.left + r.width / 2 - box.left, y = r.top + r.height / 2 - box.top;
      pts.push([x, y]);
      stepY.push(y);
      // phones: the line first runs straight down beside the step's text, then crosses over
      if (!wide.matches) pts.push([x, Math.max(y + 1, st.getBoundingClientRect().bottom - box.top)]);
    });
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    base.setAttribute('d', d);
    line.setAttribute('d', d);
    cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    total = cum[cum.length - 1] || 1;
    line.style.strokeDasharray = `${total} ${total}`;
    update();
  };

  // head y (in wrap coords) → length along the path; segments only go downwards, so this is exact
  const lengthAt = (y) => {
    if (y <= pts[0][1]) return 0;
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i][1]) return cum[i - 1] + (cum[i] - cum[i - 1]) * (y - pts[i - 1][1]) / (pts[i][1] - pts[i - 1][1]);
    }
    return total;
  };

  // the path is straight segments, so the point at a length is a plain lerp (no SVG geometry query per frame)
  const pointAt = (len) => {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < len) i++;
    const f = (len - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  };

  // scroll frames only use positions cached in build() — no layout reads here
  const update = () => {
    if (!pts.length) return;
    const y = reduce ? Infinity : vh * HEAD - (wrapTop - window.scrollY);
    const len = lengthAt(y);
    line.style.strokeDashoffset = total - len;
    const live = len > 0 && len < total;
    runner.classList.toggle('is-live', live);
    if (live) {
      const [px, py] = pointAt(len);
      runner.style.transform = `translate(${px}px, ${py}px)`;
    }
    steps.forEach((st, i) => {
      const on = y >= stepY[i] - 1;
      st.classList.toggle('is-on', on);
      if (on) typeIn(st);
    });
  };

  // hidden until the line reaches them (a language switch later just swaps in plain text)
  steps.forEach((st) => {
    gsap.set($('.step__title', st), { opacity: 0 });
    gsap.set([$('.step__num', st), $('.step__desc', st), $('.step__out', st)], { opacity: 0, y: 24 });
  });

  ScrollTrigger.create({ trigger: wrap, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: build });
  new ResizeObserver(() => build()).observe(wrap);
  build();
}

/* ---------------- contact form ----------------
   No backend: the form posts to Formspree, which forwards it to the
   account's inbox. The visitor's email (if given) becomes the reply-to.
   FORM_ID is the last part of the form's endpoint: formspree.io/f/<id> */
const FORM_ID = 'mnpnrqpb';
function initContactForm() {
  const form = $('.cform');
  if (!form) return;
  const msg = $('.cform__msg', form), btn = $('.cform__send', form), done = $('.cform__done', form);
  const say = (key, cls) => { msg.textContent = key ? t(key) : ''; msg.className = `cform__msg${cls ? ` ${cls}` : ''}`; };
  const field = (name) => form.elements[name];
  const mark = (name, bad) => field(name).closest('.cform__f').classList.toggle('is-bad', bad);

  form.addEventListener('input', (e) => { const f = e.target.closest('.cform__f, .cform__consent'); if (f) f.classList.remove('is-bad'); });
  form.addEventListener('change', (e) => { const f = e.target.closest('.cform__consent'); if (f) f.classList.remove('is-bad'); });
  $('.cform__again', form).addEventListener('click', () => {
    form.classList.remove('is-sent');
    done.setAttribute('aria-hidden', 'true');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (field('_honey').value) return; // bots fill the hidden field
    const v = Object.fromEntries(['name', 'phone', 'email', 'message'].map((k) => [k, field(k).value.trim()]));
    // name + message + one way to reach the person are required; whatever is filled in must look right
    const digits = v.phone.replace(/\D/g, '');
    const noContact = !v.phone && !v.email;
    const bad = {
      name: v.name.length < 2,
      phone: noContact || (!!v.phone && (!/^\+?[\d\s().-]+$/.test(v.phone) || digits.length < 7 || digits.length > 15)),
      email: noContact || (!!v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)),
      message: v.message.length < 10,
    };
    Object.entries(bad).forEach(([k, b]) => mark(k, b));
    const first = noContact ? 'contact' : Object.keys(bad).find((k) => bad[k]);
    if (bad.name) { say('form.e.name', 'is-err'); field('name').focus(); return; }
    if (first) { say(`form.e.${first}`, 'is-err'); field(first === 'contact' ? 'phone' : first).focus(); return; }
    // GDPR: the visitor has to agree before the details are sent
    const consentBox = field('consent');
    if (!consentBox.checked) { consentBox.closest('.cform__consent').classList.add('is-bad'); say('form.e.consent', 'is-err'); consentBox.focus(); return; }

    btn.disabled = true;
    say('form.hint');
    try {
      const body = { name: v.name, phone: v.phone || '—', message: v.message, consent: 'yes', _subject: `NK Programming — ${v.name}` };
      if (v.email) body.email = v.email;
      const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error((out.errors && out.errors.map((x) => x.message).join(', ')) || res.status);
      }
      form.reset();
      say('form.hint');
      form.classList.add('is-sent');
      done.setAttribute('aria-hidden', 'false');
    } catch (err) {
      console.error('contact form:', err);
      say('form.err', 'is-err');
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- boot ---------------- */
async function boot() {
  // hero title → chars (name is the same in both languages)
  $$('.hero__brand [data-split]').forEach(splitChars);
  $('.hero__brand').classList.add('is-pending');
  $('.rot__txt').textContent = '';
  if (!reduce) gsap.set('.nav', { opacity: 0 });
  renderSocials();
  applyLang(lang);
  try { stack = createStack($('.hero'), { before: $('.hero__brand'), lite, reduce }); } catch (e) { stack = null; }
  initClock();
  initMagnetic();
  initScramble();
  initMarquee();
  initContactForm();
  initLiveType();

  window.scrollTo(0, 0);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 600))]);
  fitBrand();
  onWidthResize(fitBrand);
  onWidthResize(() => recentrePricing());
  await runLoader();

  buildAbout();
  initScroll();
  booted = true;
  heroIntro();
  if (lenis) lenis.start();
  ScrollTrigger.sort(); // two pins now (work, process) — refresh top to bottom
  ScrollTrigger.refresh();
}

boot();
