/* =========================================================
   Hero visual — "exploded website", in plain CSS 3D.
   Four glass layers: DATABASE → BACKEND → FRONTEND → INTERFACE,
   data packets travelling up between them.
   No WebGL: the layers are SVG/HTML, the browser's compositor
   turns them, and everything sleeps once the hero is off screen.
   Every layer is drawn on a 1024 × 640 grid and scaled to fit.
   ========================================================= */

const ACCENT = '#ccff00';
const LW = 1024, LH = 640;

/* ---------------- tiny syntax highlighter ---------------- */
const KW = /^(public|private|async|await|var|return|new|const|let|function|class|using|if|else|from|import|export|default|of|for|this|null|true|false|SELECT|FROM|WHERE|ORDER|BY|TOP|DESC)$/;
const TOKEN = /(\/\/.*$)|("[^"]*"|`[^`]*`|'[^']*')|([A-Za-z_][\w]*)|(\d+)|(\s+)|([^\sA-Za-z_\d"'`]+)/g;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function highlight(line) {
  let out = '', m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    const [txt, com, str, word, num, ws] = m;
    let c = '#8b8b86';
    if (com) c = '#5f5f5b';
    else if (str) c = '#f2f2ee';
    else if (word) c = KW.test(word) ? ACCENT : /^[A-Z]/.test(word) ? '#e4e4de' : '#b4b4ae';
    else if (num) c = ACCENT;
    out += ws ? txt : `<span style="color:${c}">${esc(txt)}</span>`;
  }
  return out;
}

const CODE_BACK = [
  '[HttpGet("{id}")]',
  'public async Task<IActionResult> Get(int id)',
  '{',
  '    var listing = await _db.QuerySingleAsync<Listing>(',
  '        "SELECT * FROM Listings WHERE Id = @id",',
  '        new { id });',
  '',
  '    if (listing is null) return NotFound();',
  '',
  '    // cached, logged, shipped',
  '    return Ok(listing);',
  '}',
];
const CODE_FRONT = [
  "import { Card } from './components';",
  '',
  'export async function Listing({ id }) {',
  '  const res = await fetch(`/api/listings/${id}`);',
  '  const data = await res.json();',
  '',
  '  return (',
  '    <Card title={data.title}',
  '          price={data.price}',
  '          photos={data.photos} />',
  '  );',
  '}',
];

/* ---------------- layer markup ---------------- */
const head = (num, title, meta) => `
  <div class="sl__head"><b>${num}</b><span>${title}</span><i>${meta}</i></div>`;

function dbLayer() {
  const tables = [
    { x: 40, name: 'Listings', rows: ['Id INT PK', 'Title NVARCHAR', 'Price DECIMAL', 'UserId INT FK', 'CreatedAt DATETIME'] },
    { x: 384, name: 'Users', rows: ['Id INT PK', 'Email NVARCHAR', 'Name NVARCHAR', 'Role TINYINT'] },
    { x: 728, name: 'Photos', rows: ['Id INT PK', 'ListingId INT FK', 'Url NVARCHAR', 'SortOrder INT'] },
  ];
  const y0 = 100, TW = 256, RH = 36;
  let svg = '';
  tables.forEach((tb) => {
    const h = 48 + tb.rows.length * RH;
    svg += `<rect x="${tb.x}" y="${y0}" width="${TW}" height="${h}" rx="10" fill="none" stroke="rgba(242,242,238,.35)" stroke-width="2"/>`;
    svg += `<path d="M${tb.x} ${y0 + 48} V${y0 + 10} a10 10 0 0 1 10 -10 H${tb.x + TW - 10} a10 10 0 0 1 10 10 V${y0 + 48} Z" fill="rgba(242,242,238,.07)"/>`;
    svg += `<text x="${tb.x + 18}" y="${y0 + 32}" class="t-name">${tb.name}</text>`;
    tb.rows.forEach((r, i) => {
      const [col, ...type] = r.split(' ');
      const y = y0 + 48 + i * RH + RH / 2 + 6;
      const tp = type.join(' ');
      svg += `<text x="${tb.x + 18}" y="${y}" class="t-col">${col}</text>`;
      svg += `<text x="${tb.x + TW - 16}" y="${y}" text-anchor="end" class="t-type${tp.includes('K') ? ' is-k' : ''}">${tp}</text>`;
    });
  });
  // relations
  svg += `<path d="M${40 + TW} ${y0 + 48 + 3 * RH + RH / 2} H340 V${y0 + 48 + RH / 2} H384 M856 ${y0 + 48 + 4 * RH} V420 H20 V${y0 + 48 + RH / 2} H40"
           fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-dasharray="10 14"/>`;
  // query bar
  svg += `<rect x="40" y="470" width="${LW - 80}" height="64" rx="10" fill="none" stroke="rgba(242,242,238,.2)" stroke-width="2"/>`;
  return `${head('01', 'DATABASE', 'SQL SERVER')}
    <svg class="sl__svg" viewBox="0 0 ${LW} ${LH}">${svg}</svg>
    <div class="sl-db__q"><span>${highlight('SELECT TOP 20 * FROM Listings ORDER BY CreatedAt DESC')}</span><b>✓ 12 ms</b></div>
    <div class="sl-db__meta">20 rows · indexed · MERGE migrations</div>`;
}

function codeLayer(lines, num, title, meta) {
  const rows = lines.map((l, i) =>
    `<div class="ln" style="--n:${l.length}"><span class="ln__no">${i + 1}</span><span class="ln__t">${highlight(l) || ' '}</span></div>`).join('');
  return `${head(num, title, meta)}
    <div class="sl-code">${rows}</div>
    <div class="sl__status"><span class="sl__build">● build passed</span><span>Ln ${lines.length}, Col 48 · UTF-8</span></div>`;
}

function uiLayer() {
  let stripes = '';
  for (let k = -276; k < 420; k += 22) stripes += `M${560 + k} 442 L${560 + k + 276} 166 `;
  let cards = '';
  [0, 1, 2].forEach((i) => {
    const cx = 44 + i * 318, cy = 476;
    cards += `<rect x="${cx}" y="${cy}" width="292" height="118" rx="12" fill="none" stroke="rgba(242,242,238,.22)" stroke-width="2"/>
      <rect x="${cx + 20}" y="${cy + 24}" width="140" height="12" rx="6" fill="rgba(242,242,238,.3)"/>
      <rect x="${cx + 20}" y="${cy + 50}" width="220" height="10" rx="5" fill="rgba(242,242,238,.14)"/>
      <rect x="${cx + 20}" y="${cy + 70}" width="180" height="10" rx="5" fill="rgba(242,242,238,.14)"/>
      <circle cx="${cx + 262}" cy="${cy + 30}" r="8" fill="${i === 1 ? ACCENT : 'rgba(242,242,238,.4)'}"/>`;
  });
  const svg = `
    <text x="44" y="122" class="t-logo">NK</text>
    ${[0, 1, 2, 3].map((i) => `<rect x="${440 + i * 96}" y="106" width="70" height="10" rx="5" fill="rgba(242,242,238,.3)"/>`).join('')}
    <rect x="${LW - 164}" y="92" width="120" height="40" rx="20" fill="${ACCENT}"/>
    <text x="44" y="232" class="t-hero"><tspan class="l-bg">ТВОЯТ</tspan><tspan class="l-en">YOUR</tspan></text>
    <text x="44" y="298" class="t-hero"><tspan class="l-bg">САЙТ.</tspan><tspan class="l-en">WEBSITE.</tspan></text>
    <rect x="44" y="316" width="330" height="12" rx="6" fill="rgba(242,242,238,.25)"/>
    <rect x="44" y="340" width="250" height="12" rx="6" fill="rgba(242,242,238,.25)"/>
    <defs>
      <linearGradient id="sl-img" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".22"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient>
      <clipPath id="sl-imgclip"><rect x="560" y="166" width="420" height="276" rx="14"/></clipPath>
    </defs>
    <g clip-path="url(#sl-imgclip)"><rect x="560" y="166" width="420" height="276" fill="url(#sl-img)"/><path d="${stripes}" stroke="rgba(242,242,238,.12)" stroke-width="1"/></g>
    <rect x="560" y="166" width="420" height="276" rx="14" fill="none" stroke="rgba(242,242,238,.3)" stroke-width="2"/>
    ${cards}`;
  return `${head('04', 'INTERFACE', 'YOUR-SITE.COM')}
    <svg class="sl__svg" viewBox="0 0 ${LW} ${LH}">${svg}</svg>
    <span class="sl-ui__btn">GET STARTED ↗</span>
    <span class="sl-ui__ring"></span>
    <svg class="sl-ui__cursor" viewBox="-2 -2 31 45"><path d="M0 0 L0 34 L9 26 L16 41 L22 38 L15 23 L27 23 Z" fill="#f2f2ee" stroke="#0a0a0a" stroke-width="2"/></svg>`;
}

/* ======================================================== */
export function createStack(host, opts = {}) {
  const lite = !!opts.lite, reduce = !!opts.reduce;
  const phone = () => window.innerWidth <= 900;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const layers = [
    dbLayer(),
    codeLayer(CODE_BACK, '02', 'BACKEND', 'ASP.NET CORE · C#'),
    codeLayer(CODE_FRONT, '03', 'FRONTEND', 'JAVASCRIPT'),
    uiLayer(),
  ];
  // connector posts: the four corners, plus three inner ones on bigger screens
  const posts = [[0, 0], [1, 0], [1, 1], [0, 1], [0.24, 0.38, 'x'], [0.68, 0.71, 'x'], [0.82, 0.24, 'x']];

  const el = document.createElement('div');
  el.className = 'stack';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="stack__rig">
      ${layers.map((html, i) => `
        <div class="sl sl--${i}" style="--i:${i}"><div class="sl__b"><div class="sl__in"><div class="sl__c">${html}</div></div></div></div>`).join('')}
      ${posts.map(([x, y, extra], i) => `
        <div class="post${extra ? ' post--x' : ''}" style="--x:${x};--y:${y}"><i style="--d:${(2.4 + (i % 3) * 0.9).toFixed(1)}s;--o:${(-i * 0.73).toFixed(2)}s"></i></div>`).join('')}
    </div>`;
  host.insertBefore(el, opts.before || null);
  const rig = el.querySelector('.stack__rig');

  // floating code glyphs, only in the hero and only where there is power to spare
  if (!lite && !reduce) {
    const G = ['{', '}', '<', '>', '/', ';', '=', '(', ')', '[', ']', '0', '1', '#', '$', '*'];
    const field = document.createElement('div');
    field.className = 'stack-glyphs';
    field.setAttribute('aria-hidden', 'true');
    let s = '';
    for (let i = 0; i < 22; i++) {
      const r = Math.random();
      s += `<span class="${r > 0.86 ? 'is-acc' : ''}" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--s:${(0.75 + r * 0.9).toFixed(2)};--d:${(16 + Math.random() * 18).toFixed(1)}s;--o:${(-Math.random() * 30).toFixed(1)}s;--a:${(0.1 + r * 0.22).toFixed(2)}">${G[(Math.random() * G.length) | 0]}</span>`;
    }
    field.innerHTML = s;
    host.prepend(field);
  }

  /* ---------- size: fit the box it sits in ---------- */
  function fit() {
    const r = el.getBoundingClientRect();
    const w = phone()
      ? Math.min(r.width * 0.6, r.height * 0.74, 340)
      : Math.min(r.width * 0.7, r.height * 0.64, 620);
    el.style.setProperty('--sw', `${Math.max(160, w).toFixed(1)}px`);
    el.style.setProperty('--k', (Math.max(160, w) / LW).toFixed(4));
  }
  fit();
  // width only — the phone toolbars changing the height must not rescale the visual
  let fitW = window.innerWidth, fitL = fitW > window.innerHeight;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  window.addEventListener('resize', () => {
    const l = window.innerWidth > window.innerHeight;
    if (l === fitL && (coarse || Math.abs(window.innerWidth - fitW) < 60)) return;
    fitL = l; fitW = window.innerWidth; fit();
  });

  /* ---------- typing: the two code layers write themselves (desktop only) ---------- */
  const typers = phone() || lite || reduce ? [] : [1, 2].map((n, j) => {
    const L = el.querySelector(`.sl--${n}`);
    const lines = [...L.querySelectorAll('.ln')].map((ln) => ({ ln, n: +ln.style.getPropertyValue('--n') }));
    const total = lines.reduce((a, l) => a + l.n + 1, 0);
    return { lines, total, build: L.querySelector('.sl__build'), t: j * 3.7, shown: -1 };
  });
  if (typers.length) el.classList.add('is-typing');
  const SPEED = 46; // chars per second
  function type(dt) {
    typers.forEach((T) => {
      T.t = (T.t + dt) % (T.total / SPEED + 2.6);
      const shown = Math.min(T.total, Math.floor(T.t * SPEED));
      if (shown === T.shown) return;
      T.shown = shown;
      let left = shown;
      T.lines.forEach(({ ln, n }) => {
        const c = Math.max(0, Math.min(n, left));
        ln.style.setProperty('--c', c);
        ln.classList.toggle('is-cur', left >= 0 && left <= n && shown < T.total);
        left -= n + 1;
      });
      const done = shown >= T.total;
      T.build.textContent = done ? '● build passed' : '○ compiling…';
      T.build.classList.toggle('is-off', !done);
    });
  }

  /* ---------- sleep while the hero is off screen ---------- */
  let visible = true, timer = 0, last = 0;
  const run = () => {
    const on = visible && !document.hidden;
    el.classList.toggle('is-paused', !on);
    if (on && typers.length && !timer) {
      last = performance.now();
      timer = setInterval(() => { const now = performance.now(); type((now - last) / 1000); last = now; }, 50);
    } else if (!on && timer) { clearInterval(timer); timer = 0; }
  };
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; run(); }).observe(host);
  document.addEventListener('visibilitychange', run);

  /* ---------- the stack leans after the mouse (desktop) ---------- */
  if (fine && !lite && !reduce) {
    let raf = 0, mx = 0, my = 0;
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      if (raf || !visible) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        rig.style.setProperty('--mx', mx.toFixed(3));
        rig.style.setProperty('--my', my.toFixed(3));
      });
    }, { passive: true });
  }

  return {
    el,
    reveal() { el.classList.add('is-in'); run(); },
  };
}
