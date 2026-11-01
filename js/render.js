/* =========================================================
   NK Programming — HTML templates for projects, pricing and FAQ.
   Pure functions (no DOM): js/main.js uses them in the browser and
   tools/build.mjs uses them to write the Bulgarian version straight
   into index.html, so search engines see the content without JS.
   ========================================================= */
import { PROJECTS, PRICING, FAQ } from './data.js';

const pad2 = (n) => String(n).padStart(2, '0');

function pattern(type) {
  const W = 400, H = 300;
  const st = 'stroke="rgba(242,242,238,.16)" fill="none" stroke-width="1"';
  const ac = 'stroke="#ccff00" fill="none" stroke-width="1.4"';
  let s = '';
  switch (type) {
    case 'rings':
      for (let r = 14; r < 360; r += 16) s += `<circle cx="300" cy="140" r="${r}" ${r === 110 ? ac : st}/>`;
      s += '<circle cx="300" cy="140" r="4" fill="#ccff00"/>';
      break;
    case 'grid': {
      const vx = 200, vy = 130;
      for (let i = -14; i <= 14; i++) s += `<line x1="${vx}" y1="${vy}" x2="${vx + i * 55}" y2="${H}" ${st}/>`;
      for (let k = 1; k < 10; k++) {
        const y = vy + Math.pow(k / 9, 2) * (H - vy);
        s += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" ${st}/>`;
      }
      s += `<line x1="0" y1="${vy}" x2="${W}" y2="${vy}" stroke="rgba(242,242,238,.35)"/>`;
      for (let r = 58; r > 8; r -= 10) s += `<path d="M${vx - r} ${vy} A${r} ${r} 0 0 1 ${vx + r} ${vy}" ${r === 58 ? ac : st}/>`;
      break;
    }
    case 'petals':
      for (let i = 0; i < 12; i++) s += `<ellipse cx="290" cy="140" rx="120" ry="26" transform="rotate(${i * 15} 290 140)" ${i === 4 ? ac : st}/>`;
      s += '<circle cx="290" cy="140" r="5" fill="#ccff00"/>';
      break;
    case 'wave':
      for (let j = 0; j < 17; j++) {
        let d = '';
        for (let x = 0; x <= W; x += 8) {
          const y = 40 + j * 15 + Math.sin(x / 42 + j * 0.45) * 14 * Math.sin(j * 0.28 + 0.9);
          d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
        }
        s += `<path d="${d}" ${j === 8 ? ac : st}/>`;
      }
      break;
    case 'dots':
      for (let y = 50; y < H; y += 16) {
        for (let x = 8; x < W; x += 16) {
          const dd = Math.hypot(x - 290, y - 150);
          const r = Math.max(0.7, 3.4 - dd / 55);
          const on = Math.abs(dd - 80) < 6;
          s += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${on ? '#ccff00' : 'rgba(242,242,238,.28)'}"/>`;
        }
      }
      break;
    case 'lanes':
      for (let k = 0; k < 7; k++) {
        const y = 62 + k * 36;
        s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(242,242,238,.2)" stroke-dasharray="7 7"/>`;
      }
      s += `<line x1="46" y1="32" x2="46" y2="${H}" ${st}/><line x1="354" y1="32" x2="354" y2="${H}" ${st}/>`;
      s += `<path d="M46 188 H262" ${ac}/><circle cx="262" cy="188" r="4.5" fill="#ccff00"/>`;
      break;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
}

/* Construction-site overlay for projects still being built (`soon: true`). */
function building(t) {
  const Y = '#ffc21a', D = '#141414';
  return `
    <div class="card__build" aria-hidden="true">
      <div class="build__sign"><span><b>${t('work.soon')}</b><small>${t('work.building')}</small></span></div>
      <svg class="build__site" viewBox="24 0 576 256" preserveAspectRatio="xMidYMax meet">
        <!-- crane -->
        <g class="build__crane">
          <path d="M104 250 V44 M124 250 V44" stroke="${Y}" stroke-width="4"/>
          ${Array.from({ length: 10 }, (_, i) => `<path d="M104 ${250 - i * 20.6} L124 ${229.4 - i * 20.6}" stroke="${Y}" stroke-width="2"/>`).join('')}
          <path d="M40 44 H330 M40 30 H330 M114 8 V44" stroke="${Y}" stroke-width="4"/>
          ${Array.from({ length: 14 }, (_, i) => `<path d="M${40 + i * 20.7} 44 L${60.7 + i * 20.7} 30" stroke="${Y}" stroke-width="2"/>`).join('')}
          <path d="M114 8 L40 30 M114 8 L330 30" stroke="${Y}" stroke-width="1.5"/>
          <rect x="44" y="44" width="34" height="26" fill="#3a3a3a"/>
          <rect x="128" y="50" width="22" height="18" rx="2" fill="${Y}"/>
          <rect x="132" y="54" width="12" height="9" fill="${D}"/>
          <g class="build__trolley">
            <rect x="214" y="44" width="20" height="8" fill="${Y}"/>
            <g class="build__load">
              <path d="M224 52 V150" stroke="#cfcfca" stroke-width="1.5"/>
              <path d="M224 150 l-30 14 M224 150 l30 14" stroke="#cfcfca" stroke-width="1.5"/>
              <rect x="186" y="164" width="76" height="12" fill="#e2572b"/>
              <path d="M196 164 v12 M214 164 v12 M234 164 v12 M252 164 v12" stroke="${D}" stroke-width="1.5"/>
            </g>
          </g>
        </g>
        <!-- excavator -->
        <g class="build__digger">
          <g class="build__arm">
            <path d="M430 196 L372 128 L328 182" stroke="${Y}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M418 186 L380 150" stroke="#3a3a3a" stroke-width="4" stroke-linecap="round"/>
            <g class="build__bucket">
              <path d="M328 182 l-18 4 l2 24 l26 -2 z" fill="${Y}"/>
              <path d="M312 210 l-4 6 M320 210 l-3 6 M330 209 l-2 6" stroke="${Y}" stroke-width="3"/>
            </g>
          </g>
          <path d="M420 180 h52 l18 22 v26 h-70 z" fill="${Y}"/>
          <path d="M446 186 h22 l14 16 h-36 z" fill="${D}" opacity=".85"/>
          <rect x="488" y="196" width="26" height="32" rx="3" fill="#e0a812"/>
          <rect x="404" y="228" width="124" height="24" rx="12" fill="#2a2a2a"/>
          ${[418, 442, 466, 490, 514].map(x => `<circle cx="${x}" cy="240" r="7" fill="#555"/>`).join('')}
        </g>
        <!-- dirt pile + cones -->
        <path d="M250 252 q30 -34 64 -6 q16 -14 30 6 z" fill="#4a3a2a"/>
        <circle class="build__dirt" cx="316" cy="214" r="3" fill="#6b5640"/>
        <circle class="build__dirt build__dirt--2" cx="324" cy="212" r="2.5" fill="#6b5640"/>
        ${[548, 576].map(x => `<path d="M${x} 252 l10 -30 l10 30 z" fill="#ff6a1a"/><path d="M${x + 5} 237 h10" stroke="#fff" stroke-width="4"/>`).join('')}
        <path d="M0 252 H600" stroke="rgba(242,242,238,.4)" stroke-width="2"/>
      </svg>
      <div class="build__tape"></div>
    </div>`;
}

export function cardsHTML(lang, t) {
  const html = PROJECTS.map((p, i) => {
    const live = !!p.url;
    const tag = live ? 'a' : 'div';
    const attrs = live ? `href="${p.url}" target="_blank" rel="noopener" data-cursor="view"` : '';
    const cover = p.image
      ? `<img src="${p.image}" alt="${p.name} — ${p.domain}" loading="lazy" decoding="async">`
      : `${pattern(p.pattern)}${p.initials ? `<span class="card__initials">${p.initials}</span>` : ''}`;
    return `
      <article class="card" style="--ar:${p.ratio || 2.1};--i:${i}">
        <${tag} class="card__link" ${attrs}>
          <div class="card__media">
            <div class="card__browser"><i></i><i></i><i></i><span>${p.domain}</span></div>
            <div class="card__cover">${cover}</div>
            ${p.soon ? building(t) : ''}
            <div class="card__glow"></div>
            ${live ? `<span class="card__visit mono">${t(p.concept ? 'work.see' : 'work.visit')} ↗</span>` : ''}
          </div>
          <div class="card__meta">
            <span class="card__idx mono">${String(i + 1).padStart(2, '0')}<em>/${String(PROJECTS.length).padStart(2, '0')}</em></span>
            <h3 class="card__title">${p.name}</h3>
            <span class="card__go">${live ? '↗' : '·'}</span>
          </div>
          <p class="card__cat">${p.cat[lang]}</p>
          ${p.soon ? `<div class="card__info mono"><span class="card__soon">● ${t('work.soon')}</span></div>`
            : p.concept ? `<div class="card__info mono"><span class="card__badge card__badge--concept">${t('work.concept')}</span></div>`
            : live ? `<div class="card__info mono"><span class="card__badge card__badge--live"><i></i>${t('work.live')}</span></div>` : ''}
        </${tag}>
      </article>`;
  }).join('');

  const cta = `
    <article class="card card--cta" style="--ar:1.15;--i:${PROJECTS.length}">
      <a class="card__link" href="zapitvane.html">
        <div class="card__media">
          <div>
            <div class="card__cta-t">${t('work.cta')}</div>
            <span class="card__cta-a">→</span>
          </div>
        </div>
        <div class="card__meta">
          <h3 class="card__title">${t('nav.cta')}</h3>
          <span class="card__go">↗</span>
        </div>
      </a>
    </article>`;
  return html + cta;
}

export function pricingHTML(lang, t) {
  // "50–150" → two counters that run up when the card scrolls in
  const price = (v) => v.split('–').map((n) => `<span data-to="${n}">${n}</span>`).join('<span class="plan__dash" aria-label="–"></span>');
  return PRICING.map((p, i) => {
    const items = p.items[lang];
    return `
    <li class="plan${p.featured ? ' plan--featured' : ''}" data-plan>
      <span class="plan__glow" aria-hidden="true"></span>
      <div class="plan__top">
        <span class="plan__n mono">${pad2(i + 1)} / ${pad2(PRICING.length)}</span>
        ${p.featured ? `<span class="plan__tag mono">${t('price.pop')}</span>` : ''}
      </div>
      <h3 class="plan__name">${p.name[lang]}</h3>
      <p class="plan__for">${p.for[lang]}</p>
      <div class="plan__price">${p.price
        ? `<span class="plan__cur">€</span><span class="plan__amt">${price(p.price)}</span>`
        : `<span class="plan__ask">${t('price.ask')}</span>`}</div>
      <span class="plan__inc mono">${t(p.examples ? 'price.eg' : 'price.more')}</span>
      <ul class="plan__list">${items.map((x) => `<li>${x}</li>`).join('')}</ul>
      <a href="zapitvane.html${p.type ? '?type=' + p.type : ''}" class="btn ${p.featured ? 'btn--ink' : 'btn--ghost'} plan__cta">
        <span class="btn__txt">${t('price.cta')}</span><span class="btn__arrow" aria-hidden="true">↗</span>
      </a>
    </li>`;
  }).join('');
}

export function faqHTML(lang) {
  return FAQ.map((f, i) => `
    <div class="faq__item">
      <button type="button" class="faq__q" aria-expanded="false">
        <span class="mono faq__n">${pad2(i + 1)}</span>
        <span class="faq__qt">${f.q[lang]}</span>
        <span class="faq__icon" aria-hidden="true"></span>
      </button>
      <div class="faq__a"><p>${f.a[lang]}</p></div>
    </div>`).join('');
}
