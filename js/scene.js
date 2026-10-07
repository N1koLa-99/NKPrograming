/* =========================================================
   3D scene — "exploded website".
   Four glass layers: DATABASE → BACKEND → FRONTEND → INTERFACE,
   data packets travelling up between them, a field of code
   glyphs floating around. The page drives it via setTarget().
   ========================================================= */
import * as THREE from 'three';

const ACCENT = '#ccff00';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const DISPLAY = '"Martian Mono", monospace';

/* ---------------- tiny syntax highlighter ---------------- */
const KW = /^(public|private|async|await|var|return|new|const|let|function|class|using|if|else|from|import|export|default|of|for|this|null|true|false|select|from|where|order|by|top|desc|SELECT|FROM|WHERE|ORDER|BY|TOP|DESC)$/;
const TOKEN = /(\/\/.*$)|("[^"]*"|`[^`]*`|'[^']*')|([A-Za-z_][\w]*)|(\d+)|(\s+)|([^\sA-Za-z_\d"'`]+)/g;
function tokenize(line) {
  const out = [];
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    const [txt, com, str, word, num, ws] = m;
    let c = '#8b8b86';
    if (com) c = '#5f5f5b';
    else if (str) c = '#f2f2ee';
    else if (word) c = KW.test(word) ? ACCENT : /^[A-Z]/.test(word) ? '#e4e4de' : '#b4b4ae';
    else if (num) c = ACCENT;
    else if (ws) c = null;
    out.push([txt, c]);
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

/* ---------------- canvas helpers ---------------- */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// the panel chrome (background, dotted grid, header) never changes — it is drawn once
// into an offscreen canvas and then just copied, instead of ~550 fillRects per redraw
const chrome = new Map();
function frame(ctx, W, H, num, title, meta) {
  let c = chrome.get(title);
  if (!c) {
    c = document.createElement('canvas');
    c.width = W; c.height = H;
    drawChrome(c.getContext('2d'), W, H, num, title, meta);
    chrome.set(title, c);
  }
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(c, 0, 0, W, H);
  ctx.textBaseline = 'middle';
}
function drawChrome(ctx, W, H, num, title, meta) {
  ctx.fillStyle = 'rgba(12,12,12,0.78)';
  rr(ctx, 0, 0, W, H, 18);
  ctx.fill();
  // dotted grid
  ctx.fillStyle = 'rgba(242,242,238,0.06)';
  for (let y = 90; y < H; y += 32) for (let x = 24; x < W; x += 32) ctx.fillRect(x, y, 2, 2);
  // header
  ctx.font = `500 22px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ACCENT;
  ctx.fillText(num, 28, 40);
  ctx.fillStyle = '#f2f2ee';
  ctx.fillText(title, 78, 40);
  ctx.fillStyle = '#6b6b67';
  ctx.textAlign = 'right';
  ctx.fillText(meta, W - 28, 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(242,242,238,0.12)';
  ctx.fillRect(0, 70, W, 2);
}

function drawDatabase(ctx, W, H, t) {
  frame(ctx, W, H, '01', 'DATABASE', 'SQL SERVER');
  const tables = [
    { x: 40, y: 100, name: 'Listings', rows: ['Id INT PK', 'Title NVARCHAR', 'Price DECIMAL', 'UserId INT FK', 'CreatedAt DATETIME'] },
    { x: 384, y: 100, name: 'Users', rows: ['Id INT PK', 'Email NVARCHAR', 'Name NVARCHAR', 'Role TINYINT'] },
    { x: 728, y: 100, name: 'Photos', rows: ['Id INT PK', 'ListingId INT FK', 'Url NVARCHAR', 'SortOrder INT'] },
  ];
  const TW = 256, RH = 36;
  tables.forEach((tb) => {
    const h = 48 + tb.rows.length * RH;
    ctx.strokeStyle = 'rgba(242,242,238,0.35)';
    ctx.lineWidth = 2;
    rr(ctx, tb.x, tb.y, TW, h, 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(242,242,238,0.07)';
    rr(ctx, tb.x, tb.y, TW, 48, 10);
    ctx.fill();
    ctx.font = `600 22px ${MONO}`;
    ctx.fillStyle = '#f2f2ee';
    ctx.fillText(tb.name, tb.x + 18, tb.y + 25);
    tb.rows.forEach((r, i) => {
      const [col, ...type] = r.split(' ');
      const y = tb.y + 48 + i * RH + RH / 2;
      ctx.font = `400 18px ${MONO}`;
      ctx.fillStyle = '#c9c9c3';
      ctx.fillText(col, tb.x + 18, y);
      ctx.fillStyle = type.join(' ').includes('K') ? ACCENT : '#6b6b67';
      ctx.textAlign = 'right';
      ctx.fillText(type.join(' '), tb.x + TW - 16, y);
      ctx.textAlign = 'left';
    });
  });
  // relations
  const flow = (t * 60) % 24;
  ctx.setLineDash([10, 14]);
  ctx.lineDashOffset = -flow;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); // Listings.UserId -> Users.Id
  ctx.moveTo(40 + TW, 100 + 48 + 3 * RH + RH / 2);
  ctx.lineTo(340, 100 + 48 + 3 * RH + RH / 2);
  ctx.lineTo(340, 100 + 48 + RH / 2);
  ctx.lineTo(384, 100 + 48 + RH / 2);
  ctx.stroke();
  ctx.beginPath(); // Photos.ListingId -> Listings.Id
  ctx.moveTo(728 + 128, 100 + 48 + 4 * RH);
  ctx.lineTo(728 + 128, 420);
  ctx.lineTo(20, 420);
  ctx.lineTo(20, 100 + 48 + RH / 2);
  ctx.lineTo(40, 100 + 48 + RH / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // query bar
  const qy = 470;
  ctx.strokeStyle = 'rgba(242,242,238,0.2)';
  ctx.lineWidth = 2;
  rr(ctx, 40, qy, W - 80, 64, 10);
  ctx.stroke();
  ctx.font = `400 19px ${MONO}`;
  const q = tokenize('SELECT TOP 20 * FROM Listings ORDER BY CreatedAt DESC');
  let x = 64;
  q.forEach(([txt, c]) => { if (c) { ctx.fillStyle = c; ctx.fillText(txt, x, qy + 33); } x += ctx.measureText(txt).width; });
  ctx.fillStyle = ACCENT;
  ctx.textAlign = 'right';
  ctx.fillText('✓ 12 ms', W - 64, qy + 33);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b6b67';
  ctx.font = `400 17px ${MONO}`;
  ctx.fillText('20 rows · indexed · MERGE migrations', 40, qy + 110);
}

function drawCode(ctx, W, H, t, lines, num, title, meta, state) {
  frame(ctx, W, H, num, title, meta);
  const total = lines.reduce((a, l) => a + l.length + 1, 0);
  // typing loop: type → hold → restart
  const speed = 46; // chars per second
  const cycle = total / speed + 2.6;
  const local = (t + state.offset) % cycle;
  const shown = Math.min(total, Math.floor(local * speed));
  ctx.font = `400 21px ${MONO}`;
  const LH = 38, X0 = 78, Y0 = 108;
  let left = shown, caret = null;
  lines.forEach((line, i) => {
    const y = Y0 + i * LH;
    ctx.fillStyle = '#3d3d3a';
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), 50, y);
    ctx.textAlign = 'left';
    if (left <= 0) return;
    const vis = line.slice(0, Math.max(0, left));
    let x = X0;
    tokenize(vis).forEach(([txt, c]) => {
      if (c) { ctx.fillStyle = c; ctx.fillText(txt, x, y); }
      x += ctx.measureText(txt).width;
    });
    if (left <= line.length) caret = { x, y };
    left -= line.length + 1;
  });
  if (!caret && shown >= total) {
    const last = lines.length - 1;
    caret = { x: X0 + ctx.measureText(lines[last]).width, y: Y0 + last * LH };
  }
  if (caret && Math.floor(t * 2.2) % 2 === 0) {
    ctx.fillStyle = ACCENT;
    ctx.fillRect(caret.x + 3, caret.y - 13, 12, 26);
  }
  // status bar
  ctx.fillStyle = 'rgba(242,242,238,0.12)';
  ctx.fillRect(0, H - 52, W, 2);
  ctx.font = `400 17px ${MONO}`;
  ctx.fillStyle = shown >= total ? ACCENT : '#6b6b67';
  ctx.fillText(shown >= total ? '● build passed' : '○ compiling…', 28, H - 25);
  ctx.fillStyle = '#6b6b67';
  ctx.textAlign = 'right';
  ctx.fillText(`Ln ${lines.length}, Col ${Math.min(shown, 48)} · UTF-8`, W - 28, H - 25);
  ctx.textAlign = 'left';
}

function drawUI(ctx, W, H, t) {
  frame(ctx, W, H, '04', 'INTERFACE', 'YOUR-SITE.COM');
  const s = 'rgba(242,242,238,';
  // nav
  ctx.fillStyle = '#f2f2ee';
  ctx.font = `800 26px ${DISPLAY}`;
  ctx.fillText('NK', 44, 112);
  ctx.fillStyle = s + '0.3)';
  [0, 1, 2, 3].forEach((i) => rr(ctx, 440 + i * 96, 106, 70, 10, 5) || ctx.fill());
  ctx.fillStyle = ACCENT;
  rr(ctx, W - 164, 92, 120, 40, 20);
  ctx.fill();
  // hero
  ctx.fillStyle = '#f2f2ee';
  ctx.font = `800 58px ${DISPLAY}`;
  const bg = document.documentElement.lang === 'bg';
  ctx.fillText(bg ? 'ТВОЯТ' : 'YOUR', 44, 210);
  ctx.fillText(bg ? 'САЙТ.' : 'WEBSITE.', 44, 276);
  ctx.fillStyle = s + '0.25)';
  rr(ctx, 44, 316, 330, 12, 6); ctx.fill();
  rr(ctx, 44, 340, 250, 12, 6); ctx.fill();
  // button with click pulse
  const cyc = t % 4;
  const press = cyc > 2.35 && cyc < 2.6;
  const bx = 44, by = 382, bw = 210, bh = 58;
  ctx.fillStyle = press ? '#f2f2ee' : ACCENT;
  rr(ctx, bx, by, bw, bh, 29);
  ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.font = `500 19px ${MONO}`;
  ctx.fillText('GET STARTED ↗', bx + 26, by + 30);
  if (cyc > 2.35 && cyc < 3.3) {
    const k = (cyc - 2.35) / 0.95;
    ctx.strokeStyle = `rgba(204,255,0,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx + 150, by + 34, 10 + k * 70, 0, Math.PI * 2);
    ctx.stroke();
  }
  // image block
  const ix = 560, iy = 166, iw = 420, ih = 276;
  ctx.strokeStyle = s + '0.3)';
  ctx.lineWidth = 2;
  rr(ctx, ix, iy, iw, ih, 14);
  ctx.stroke();
  ctx.save();
  rr(ctx, ix, iy, iw, ih, 14);
  ctx.clip();
  const g = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
  g.addColorStop(0, 'rgba(204,255,0,0.22)');
  g.addColorStop(1, 'rgba(204,255,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.strokeStyle = s + '0.12)';
  for (let k = -ih; k < iw; k += 22) {
    ctx.beginPath(); ctx.moveTo(ix + k, iy + ih); ctx.lineTo(ix + k + ih, iy); ctx.stroke();
  }
  ctx.restore();
  // cards
  [0, 1, 2].forEach((i) => {
    const cx = 44 + i * 318, cy = 476;
    ctx.strokeStyle = s + '0.22)';
    rr(ctx, cx, cy, 292, 118, 12);
    ctx.stroke();
    ctx.fillStyle = s + '0.3)';
    rr(ctx, cx + 20, cy + 24, 140, 12, 6); ctx.fill();
    ctx.fillStyle = s + '0.14)';
    rr(ctx, cx + 20, cy + 50, 220, 10, 5); ctx.fill();
    rr(ctx, cx + 20, cy + 70, 180, 10, 5); ctx.fill();
    ctx.fillStyle = i === 1 ? ACCENT : s + '0.4)';
    ctx.beginPath(); ctx.arc(cx + 262, cy + 30, 8, 0, Math.PI * 2); ctx.fill();
  });
  // cursor path: wander → button → click → wander
  const ease = (x) => x * x * (3 - 2 * x);
  const P = [[860, 560], [700, 250], [194, 414], [194, 414], [520, 540]];
  const seg = [0, 1.1, 2.3, 3.0, 4];
  let k = 0;
  while (k < seg.length - 2 && cyc > seg[k + 1]) k++;
  const f = ease(Math.min(1, (cyc - seg[k]) / (seg[k + 1] - seg[k])));
  const mx = P[k][0] + (P[k + 1][0] - P[k][0]) * f;
  const my = P[k][1] + (P[k + 1][1] - P[k][1]) * f;
  const sc = press ? 0.85 : 1;
  ctx.save();
  ctx.translate(mx, my);
  ctx.scale(sc, sc);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 41); ctx.lineTo(22, 38); ctx.lineTo(15, 23); ctx.lineTo(27, 23);
  ctx.closePath();
  ctx.fillStyle = '#f2f2ee';
  ctx.fill();
  ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ---------------- glyph atlas for the particle field ---------------- */
const GLYPHS = ['{', '}', '<', '>', '/', ';', '=', '(', ')', '[', ']', '0', '1', '#', '$', '*'];
function glyphAtlas() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `500 88px ${MONO}`;
  GLYPHS.forEach((ch, i) => g.fillText(ch, (i % 4) * 128 + 64, Math.floor(i / 4) * 128 + 68));
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  return tex;
}

/* ======================================================== */
export function createScene(canvas, opts = {}) {
  const lite = !!opts.lite;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, powerPreference: 'high-performance',
      // MSAA only where it is needed (1x screens) — on hi-dpi it just burns fill rate
      antialias: !lite && window.devicePixelRatio < 1.5,
      // no software rendering: without a real GPU the page is better off without the scene
      failIfMajorPerformanceCaveat: true,
    });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  const isMobile = lite || window.matchMedia('(max-width: 900px)').matches;
  // quality tiers: the scene steps down by itself when the machine can't hold the frame rate
  const maxPx = Math.min(window.devicePixelRatio, lite ? 1 : isMobile ? 1.5 : 1.75);
  const TIERS = [...new Set([maxPx, Math.min(maxPx, 1.25), Math.min(maxPx, 1), 0.75])];
  let tier = 0;
  renderer.setPixelRatio(TIERS[0]);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 9;

  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  scene.add(root);

  /* ---------- layers ---------- */
  const PW = 3.4, PH = 2.125; // 1.6 aspect
  const TW = isMobile ? 768 : 1024, TH = TW * 0.625;
  const drawers = [
    (ctx, t) => drawDatabase(ctx, 1024, 640, t),
    (ctx, t, st) => drawCode(ctx, 1024, 640, t, CODE_BACK, '02', 'BACKEND', 'ASP.NET CORE · C#', st),
    (ctx, t, st) => drawCode(ctx, 1024, 640, t, CODE_FRONT, '03', 'FRONTEND', 'JAVASCRIPT', st),
    (ctx, t) => drawUI(ctx, 1024, 640, t),
  ];
  const layers = drawers.map((draw, i) => {
    const c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    const ctx = c.getContext('2d');
    ctx.scale(TW / 1024, TH / 640);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    // phones: no mipmaps — every canvas upload would rebuild the whole chain, and the stack is drawn near 1:1 anyway
    if (isMobile) { tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; }
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = i;
    const edgeMat = new THREE.LineBasicMaterial({ color: i === 3 ? 0xccff00 : 0xf2f2ee, transparent: true, opacity: i === 3 ? 0.9 : 0.35 });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(PW, PH)), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.renderOrder = i;
    const g = new THREE.Group();
    g.add(mesh, edge);
    // phones: a dark sheet under the top layer, so the UI reads cleanly instead of three layers showing through it
    let under = null;
    if (isMobile && i === 3) {
      under = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ color: 0x0c0c0c, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      under.rotation.x = -Math.PI / 2;
      under.position.y = -0.004;
      under.renderOrder = 2.5;
      g.add(under);
    }
    tilt.add(g);
    const st = { offset: i * 3.7 };
    return { g, ctx, tex, mat, edgeMat, draw, st, under };
  });

  /* ---------- connectors + packets ---------- */
  const anchors = [
    [-PW / 2, -PH / 2], [PW / 2, -PH / 2], [PW / 2, PH / 2], [-PW / 2, PH / 2],
    ...(isMobile ? [] : [[-0.9, 0.25], [0.6, -0.45], [1.1, 0.5]]), // phones keep just the four corner posts
  ];
  const conPos = new Float32Array(anchors.length * 6);
  const conGeo = new THREE.BufferGeometry();
  conGeo.setAttribute('position', new THREE.BufferAttribute(conPos, 3));
  const conMat = new THREE.LineBasicMaterial({ color: 0xf2f2ee, transparent: true, opacity: 0.16 });
  const connectors = new THREE.LineSegments(conGeo, conMat);
  tilt.add(connectors);

  const PK = isMobile ? 8 : 18;
  const pkPos = new Float32Array(PK * 3);
  const pkData = Array.from({ length: PK }, (_, i) => ({ a: i % anchors.length, p: Math.random(), v: 0.18 + Math.random() * 0.22 }));
  const pkGeo = new THREE.BufferGeometry();
  pkGeo.setAttribute('position', new THREE.BufferAttribute(pkPos, 3));
  const pkMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPx: { value: renderer.getPixelRatio() }, uOpacity: { value: 1 } },
    vertexShader: `uniform float uPx; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_PointSize = 26. * uPx * (6. / -mv.z); }`,
    fragmentShader: `uniform float uOpacity; void main(){ float d = length(gl_PointCoord - .5); float core = smoothstep(.12,.0,d); float glow = smoothstep(.5,.0,d)*.45; gl_FragColor = vec4(vec3(.8,1.,0.)*(core+glow), (core+glow)*uOpacity); }`,
  });
  const packets = new THREE.Points(pkGeo, pkMat);
  packets.renderOrder = 10;
  tilt.add(packets);

  /* ---------- floating code glyphs ---------- */
  const GN = isMobile ? 120 : 620;
  const gPos = new Float32Array(GN * 3), gSeed = new Float32Array(GN), gGlyph = new Float32Array(GN);
  for (let i = 0; i < GN; i++) {
    gPos[i * 3] = (Math.random() - 0.5) * 22;
    gPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    gPos[i * 3 + 2] = -Math.random() * 10 + 1.5;
    gSeed[i] = Math.random();
    gGlyph[i] = Math.floor(Math.random() * GLYPHS.length);
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
  gGeo.setAttribute('aSeed', new THREE.BufferAttribute(gSeed, 1));
  gGeo.setAttribute('aGlyph', new THREE.BufferAttribute(gGlyph, 1));
  const gMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAtlas: { value: glyphAtlas() }, uPx: { value: renderer.getPixelRatio() }, uOpacity: { value: 1 }, uMouse: { value: new THREE.Vector2() } },
    vertexShader: `
      attribute float aSeed; attribute float aGlyph;
      uniform float uTime; uniform float uPx; uniform vec2 uMouse;
      varying float vA; varying float vG; varying float vAcc;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (.08 + aSeed * .18) + 7., 14.) - 7.;
        p.xy += uMouse * (.2 + (p.z + 8.5) * .06);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (14. + aSeed * 18.) * uPx * (7. / -mv.z);
        float flick = step(.985, fract(sin(floor(uTime * 3. + aSeed * 50.) * 91.7) * 437.5));
        vA = (.10 + .22 * aSeed) + flick * .5;
        vAcc = step(.9, aSeed);
        vG = mod(aGlyph + floor(uTime * .5 + aSeed * 30.) * step(.7, aSeed), 16.);
      }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform float uOpacity;
      varying float vA; varying float vG; varying float vAcc;
      void main(){
        vec2 cell = vec2(mod(vG, 4.), floor(vG / 4.));
        vec2 uv = (cell + gl_PointCoord) / 4.;
        float a = texture2D(uAtlas, uv).a;
        if (a < .02) discard;
        vec3 c = mix(vec3(.95), vec3(.8, 1., 0.), vAcc);
        gl_FragColor = vec4(c, a * vA * uOpacity);
      }`,
  });
  const glyphs = new THREE.Points(gGeo, gMat);
  scene.add(glyphs);

  /* ---------- state ---------- */
  const state = { x: 0, y: 0, scale: 1, opacity: 1, spread: 0.8, energy: 0, reveal: 0 };
  const target = { x: 0, y: 0, scale: 1, opacity: 1, spread: 0.8, rot: 0 };
  let rot = 0;
  const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }, { passive: true });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function setTier(n) {
    tier = n;
    renderer.setPixelRatio(TIERS[tier]);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    pkMat.uniforms.uPx.value = gMat.uniforms.uPx.value = TIERS[tier];
  }

  // low = weak machine (picked up front, or the frame rate dropped): 30 fps, only the top
  // layer keeps animating (and less often), a sparser glyph field, no mipmap rebuilds
  let low = false;
  function setLow() {
    if (low) return;
    low = true;
    gGeo.setDrawRange(0, Math.min(GN, 140));
    pkGeo.setDrawRange(0, Math.min(PK, 8));
    layers.forEach((L) => { L.tex.generateMipmaps = false; L.tex.minFilter = THREE.LinearFilter; L.tex.needsUpdate = true; });
  }
  if (lite) setLow();

  const clock = new THREE.Clock();
  // started = the loader is gone; paused = the canvas is fully covered by an opaque section
  let started = false, paused = false, raf = 0;
  let slowN = 0, slowSum = 0, slowRuns = 0, skip = 45, lastNow = 0, frame = 0;
  let dead = false, onScreen = true;
  const active = () => started && !paused && !dead && !document.hidden;
  const wake = () => {
    if (raf || !active()) return;
    clock.getDelta();
    slowN = 0; slowSum = 0; lastNow = 0; skip = Math.max(skip, 10);
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', wake);

  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  let texTick = 0, texIdx = 0, lastSY = 0;
  const DIM = [0.4, 0.5, 0.65, 1];

  function tick(now) {
    raf = 0;
    if (!active()) return;
    raf = requestAnimationFrame(tick);

    // adaptive quality: average over ~1 s, step down a tier if we are under ~45 fps;
    // if even the lowest tier crawls, the scene switches itself off.
    // (measured on every rAF, also the ones skipped by the 30 fps cap — so it reads the real headroom)
    const fdt = lastNow ? (now - lastNow) / 1000 : 0;
    lastNow = now;
    if (skip > 0) skip--;
    else if (fdt > 0 && fdt < 0.25) {
      slowSum += fdt; slowN++;
      if (slowN >= 60) {
        const avg = slowSum / slowN;
        slowN = 0; slowSum = 0;
        if (avg > 1 / 45) {
          if (tier < TIERS.length - 1) {
            setTier(tier + 1); skip = 30;
            setLow();
            if (opts.onLow) opts.onLow();
          } else if (avg > 1 / 28 && ++slowRuns >= 2) {
            dead = true;
            cancelAnimationFrame(raf); raf = 0;
            if (opts.onDead) opts.onDead();
            return;
          }
        } else slowRuns = 0;
      }
    }

    // weak machines run at half rate; once the stack has scrolled away only the slow
    // glyph field is left behind the page — a third of the rate is plenty there
    frame++;
    if (!onScreen ? frame % 3 : low && frame & 1) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const k = 1 - Math.pow(0.03, dt);
    state.x += (target.x - state.x) * k;
    state.y += (target.y - state.y) * k;
    state.scale += (target.scale - state.scale) * k;
    state.opacity += (target.opacity - state.opacity) * k;
    state.spread += (target.spread - state.spread) * k;
    rot += (target.rot - rot) * k;
    state.energy *= Math.pow(0.15, dt);
    mouseS.lerp(mouse, 1 - Math.pow(0.04, dt));

    // placement
    // pinned to the hero: moves up with the page instead of following the scroll
    const sy = (window.scrollY / window.innerHeight) * 2;
    onScreen = sy < 2.6;
    tilt.visible = onScreen;
    root.position.set(state.x * halfH * camera.aspect, (state.y + sy) * halfH, 0);
    root.scale.setScalar(Math.max(0.0001, state.scale));
    tilt.rotation.set(
      0.62 - mouseS.y * 0.14 + Math.sin(t * 0.35) * 0.02,
      -0.62 + rot + mouseS.x * 0.3 + Math.sin(t * 0.22) * 0.06,
      0.0
    );

    // layers: reveal flies them in one by one, spread breathes with scroll energy
    const spread = state.spread + state.energy * 0.22;
    layers.forEach((L, i) => {
      const r = easeOut(clamp01(state.reveal * 1.7 - i * 0.22));
      const y = (i - 1.5) * spread + Math.sin(t * 0.8 + i * 0.9) * 0.03;
      L.g.position.set(0, y - (1 - r) * 2.5, 0);
      L.g.rotation.y = (1 - r) * 0.9;
      const dim = isMobile ? DIM[i] : 1; // phones: the lower layers step back, the UI on top leads
      L.mat.opacity = r * state.opacity * dim;
      if (L.under) L.under.material.opacity = 0.9 * r * state.opacity;
      L.edgeMat.opacity = (i === 3 ? 0.9 : 0.35) * r * state.opacity * dim;
    });

    // canvas textures: one layer per step, round-robin (each upload regenerates mipmaps,
    // so four of them in one frame is the most expensive thing in the scene);
    // skipped while the stack is too faint to read
    // never while the page is scrolling: a canvas redraw + upload in a scroll frame is what makes it stutter
    texTick += dt;
    const scrolling = Math.abs(window.scrollY - lastSY) > 1;
    lastSY = window.scrollY;
    const texRate = low ? 1 / 12 : isMobile || tier > 1 ? 1 / 24 : 1 / 48;
    if (!scrolling && texTick > texRate && onScreen && state.opacity * state.reveal > 0.22) {
      texTick = 0;
      // phones + weak machines animate only the top layer (the rest stay as last drawn)
      const L = layers[isMobile || low ? 3 : texIdx];
      texIdx = (texIdx + 1) % layers.length;
      L.draw(L.ctx, t, L.st);
      L.tex.needsUpdate = true;
    }

    // connectors
    const yb = -1.5 * spread, yt = 1.5 * spread;
    for (let i = 0; i < anchors.length; i++) {
      conPos[i * 6 + 1] = yb;
      conPos[i * 6 + 4] = yt;
    }
    conGeo.attributes.position.needsUpdate = true;
    conMat.opacity = 0.16 * state.opacity * clamp01(state.reveal * 1.5 - 0.5);

    // packets travel DB → UI
    const sp = 1 + state.energy * 3;
    pkData.forEach((d, i) => {
      d.p += d.v * dt * sp;
      if (d.p > 1) { d.p = 0; d.a = (Math.random() * anchors.length) | 0; }
      const [ax, az] = anchors[d.a];
      pkPos[i * 3] = ax;
      pkPos[i * 3 + 1] = yb + (yt - yb) * d.p;
      pkPos[i * 3 + 2] = az;
    });
    pkGeo.attributes.position.needsUpdate = true;
    pkMat.uniforms.uOpacity.value = state.opacity * clamp01(state.reveal * 1.5 - 0.6);

    gMat.uniforms.uTime.value = t;
    gMat.uniforms.uMouse.value.copy(mouseS);
    gMat.uniforms.uOpacity.value = clamp01(state.reveal * 4) * (0.5 + 0.5 * clamp01(state.reveal));

    renderer.render(scene, camera);
  }

  // make sure canvas text uses the real fonts once they arrive
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    gMat.uniforms.uAtlas.value = glyphAtlas();
    chrome.clear();
    layers.forEach((L) => { L.draw(L.ctx, clock.elapsedTime, L.st); L.tex.needsUpdate = true; });
  });

  // x/z of the connectors never change
  anchors.forEach(([ax, az], i) => { conPos.set([ax, 0, az, ax, 0, az], i * 6); });
  // warm up behind the loader (textures, shaders) — the render loop itself waits for start()
  layers.forEach((L) => { L.draw(L.ctx, 0, L.st); L.tex.needsUpdate = true; });
  renderer.compile(scene, camera);

  return {
    state,
    start() { started = true; wake(); },
    setPaused(v) { paused = v; wake(); },
    setTarget(tg) { Object.assign(target, tg); },
    kick(v) { state.energy = Math.min(1.2, Math.max(state.energy, v)); },
  };
}
