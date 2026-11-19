/* Vice Cover Studio — vanilla JS + Canvas 2D.
 * Draws a GTA-style multi-panel poster: photo panels, a Vice City sunset
 * sky with sun + skyline, bold condensed title lettering, a colour grade,
 * and a small handwritten sticky note for the judge. No libraries, no fonts
 * shipped (system sans-serif only), no network requests. */
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('poster');
const ctx = canvas.getContext('2d');

/* ---------- state ---------- */
const state = {
  layout: 'trio',
  grade: 'sunset',
  size: '1080x1080',
  title: 'SUNSET HEIST',
  tagline: 'VICE CITY \u2022 EST. 2026',
  photos: [null, null, null],          // HTMLImageElement per panel slot
  adjust: [                            // per-panel framing: zoom + pan (-1..1)
    { z: 1, x: 0, y: 0 },
    { z: 1, x: 0, y: 0 },
    { z: 1, x: 0, y: 0 },
  ],
  active: 0,
};

const GRADES = {
  sunset:   { sky: ['#2b1055', '#ff5e8a', '#ff9a5a', '#ffd319'], sun: '#fff3b0', tint: 'rgba(255,94,138,0.20)',  bar: '#ff2e88' },
  neon:     { sky: ['#0d0221', '#5b2ee5', '#ff2ea6', '#00e5ff'], sun: '#7df9ff', tint: 'rgba(255,46,166,0.22)', bar: '#00e5ff' },
  vicepink: { sky: ['#3d0c4f', '#b967ff', '#ff7ac0', '#ffd6ec'], sun: '#ffffff', tint: 'rgba(255,122,192,0.20)', bar: '#ff7ac0' },
  golden:   { sky: ['#3a1c00', '#c96f2e', '#ffb347', '#ffe9a8'], sun: '#fff8d6', tint: 'rgba(255,179,71,0.20)',  bar: '#ff7b39' },
};

/* Panel rectangles as fractions of the poster (x, y, w, h, tilt degrees).
 * The title band occupies the bottom ~22% of the poster. */
function panelRects(layout, W, H) {
  const top = 0.035 * H, ph = 0.70 * H;
  if (layout === 'duo') {
    return [
      { x: 0.03 * W, y: top, w: 0.455 * W, h: ph, tilt: -0.6 },
      { x: 0.515 * W, y: top, w: 0.455 * W, h: ph, tilt: 0.6 },
    ];
  }
  if (layout === 'full') {
    return [{ x: 0.03 * W, y: top, w: 0.94 * W, h: ph, tilt: 0 }];
  }
  return [ // trio
    { x: 0.03 * W, y: top, w: 0.575 * W, h: ph, tilt: -0.5 },
    { x: 0.635 * W, y: top, w: 0.335 * W, h: ph * 0.485, tilt: 1.2 },
    { x: 0.635 * W, y: top + ph * 0.515, w: 0.335 * W, h: ph * 0.485, tilt: -1.0 },
  ];
}

/* ---------- drawing helpers ---------- */
function drawSky(W, H) {
  const g = GRADES[state.grade];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  g.sky.forEach((c, i) => grad.addColorStop(i / (g.sky.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Sun, low on the horizon behind the panels.
  const sx = W * 0.72, sy = H * 0.42, sr = Math.min(W, H) * 0.16;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 1.8);
  glow.addColorStop(0, g.sun);
  glow.addColorStop(0.4, g.sun + '55');
  glow.addColorStop(1, g.sun + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, sr * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  // Skyline silhouette along the bottom of the panel area.
  ctx.fillStyle = 'rgba(20,4,40,0.85)';
  const base = H * 0.775;
  let x = 0;
  let seed = 7;
  while (x < W) {
    seed = (seed * 16807) % 2147483647;
    const bw = W * (0.04 + (seed % 80) / 1000);
    const bh = H * (0.02 + (seed % 70) / 1000);
    ctx.fillRect(x, base - bh, bw, bh + H * 0.02);
    x += bw + W * 0.008;
  }
}

function drawPhotoInto(img, rect, slot) {
  const adj = state.adjust[slot];
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * adj.z;
  const dw = iw * scale, dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + adj.x * rect.w * 0.22;
  const dy = rect.y + (rect.h - dh) / 2 + adj.y * rect.h * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  // Colour grade: a soft tint washed over the photo.
  ctx.fillStyle = GRADES[state.grade].tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawEmptyPanel(rect, slot) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#3a2060');
  g.addColorStop(1, '#12082a');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 ${Math.round(rect.w * 0.07)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2 - rect.h * 0.04);
  ctx.font = `${Math.round(rect.w * 0.045)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('panel ' + 'ABC'[slot], rect.x + rect.w / 2, rect.y + rect.h / 2 + rect.h * 0.06);
  ctx.restore();
}

function drawPanels(W, H) {
  const rects = panelRects(state.layout, W, H);
  const border = Math.max(4, Math.round(W * 0.006));
  rects.forEach((r, i) => {
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate((r.tilt * Math.PI) / 180);
    ctx.translate(-r.w / 2, -r.h / 2);
    // White poster border, then the photo inside it.
    ctx.fillStyle = '#fdfdf8';
    ctx.fillRect(-border, -border, r.w + border * 2, r.h + border * 2);
    const inner = { x: 0, y: 0, w: r.w, h: r.h };
    if (state.photos[i]) drawPhotoInto(state.photos[i], inner, i);
    else drawEmptyPanel(inner, i);
    ctx.restore();
  });
}

function drawTitle(W, H) {
  const g = GRADES[state.grade];
  const bandY = H * 0.775;
  // Hot-pink bar above the title, like a poster masthead rule.
  ctx.fillStyle = g.bar;
  ctx.fillRect(W * 0.03, bandY, W * 0.94, Math.max(4, H * 0.006));
  const size = Math.round(W * 0.115);
  ctx.save();
  ctx.translate(W * 0.03, bandY + H * 0.028);
  ctx.transform(1, 0, -0.14, 1, 0, 0); // slight lean, condensed-poster feel
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0d0221';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(state.title.toUpperCase(), 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.title.toUpperCase(), 0, 0);
  ctx.restore();
  // Tagline, letterspaced, under the title.
  ctx.font = `700 ${Math.round(W * 0.028)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const tag = state.tagline.toUpperCase().split('').join('\u2009');
  ctx.fillText(tag, W * 0.032, bandY + H * 0.028 + size * 1.02);
  drawStickyNote(W, H);
}

function drawStickyNote(W, H) {
  const nw = W * 0.28, nh = H * 0.115;
  const nx = W * 0.68, ny = H * 0.615;
  ctx.save();
  ctx.translate(nx + nw / 2, ny + nh / 2);
  ctx.rotate((-2.5 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = W * 0.012;
  ctx.shadowOffsetY = H * 0.005;
  ctx.fillStyle = '#ffe873';
  ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#2b2b6e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = nh / 4.6;
  ctx.font = `italic ${Math.round(lh * 0.95)}px "Comic Sans MS", "Segoe Print", cursive`;
  const lines = [
    'dear judge \u2014',
    'every other entry brought you a poster.',
    'this one lets YOU make the poster.',
    'love, vice city \u2661',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, -nh / 2 + lh * (i + 0.7));
  });
  ctx.restore();
}

function drawPoster() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  drawSky(W, H);
  drawPanels(W, H);
  drawTitle(W, H);
}

/* ---------- loading photos ---------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

async function loadSample(name) {
  try {
    const img = await loadImage('samples/' + name + '.jpg');
    for (let i = 0; i < 3; i++) state.photos[i] = img;
    drawPoster();
    setStatus('Sample "' + name + '" loaded in all panels.');
  } catch (err) {
    setStatus('Sample failed to load.');
  }
}

function setStatus(msg) {
  const el = $('status');
  if (el) el.textContent = msg;
}

/* ---------- export ---------- */
async function exportPNG() {
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawOntoImpl(off, off.getContext('2d'));
  const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vice-cover-' + state.size + '.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus('Exported ' + w + ' \u00d7 ' + h + ' PNG. Share it!');
}

/* Parameterised poster renderer: same picture as drawPoster, onto any ctx. */
function drawOntoImpl(target, c) {
  const W = target.width, H = target.height;
  const g = GRADES[state.grade];
  c.clearRect(0, 0, W, H);
  const grad = c.createLinearGradient(0, 0, 0, H);
  g.sky.forEach((col, i) => grad.addColorStop(i / (g.sky.length - 1), col));
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  const sx = W * 0.72, sy = H * 0.42, sr = Math.min(W, H) * 0.16;
  const glow = c.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 1.8);
  glow.addColorStop(0, g.sun);
  glow.addColorStop(0.4, g.sun + '55');
  glow.addColorStop(1, g.sun + '00');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(sx, sy, sr * 1.8, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = g.sun;
  c.beginPath();
  c.arc(sx, sy, sr, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(20,4,40,0.85)';
  const base = H * 0.775;
  let x = 0, seed = 7;
  while (x < W) {
    seed = (seed * 16807) % 2147483647;
    const bw = W * (0.04 + (seed % 80) / 1000);
    const bh = H * (0.02 + (seed % 70) / 1000);
    c.fillRect(x, base - bh, bw, bh + H * 0.02);
    x += bw + W * 0.008;
  }
  const rects = panelRects(state.layout, W, H);
  const border = Math.max(4, Math.round(W * 0.006));
  rects.forEach((r, i) => {
    c.save();
    c.translate(r.x + r.w / 2, r.y + r.h / 2);
    c.rotate((r.tilt * Math.PI) / 180);
    c.translate(-r.w / 2, -r.h / 2);
    c.fillStyle = '#fdfdf8';
    c.fillRect(-border, -border, r.w + border * 2, r.h + border * 2);
    c.beginPath();
    c.rect(0, 0, r.w, r.h);
    c.clip();
    const img = state.photos[i];
    if (img) {
      const adj = state.adjust[i];
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.max(r.w / iw, r.h / ih) * adj.z;
      const dw = iw * scale, dh = ih * scale;
      c.drawImage(img, (r.w - dw) / 2 + adj.x * r.w * 0.22, (r.h - dh) / 2 + adj.y * r.h * 0.22, dw, dh);
      c.fillStyle = g.tint;
      c.fillRect(0, 0, r.w, r.h);
    } else {
      const gg = c.createLinearGradient(0, 0, r.w, r.h);
      gg.addColorStop(0, '#3a2060');
      gg.addColorStop(1, '#12082a');
      c.fillStyle = gg;
      c.fillRect(0, 0, r.w, r.h);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.font = `700 ${Math.round(r.w * 0.07)}px Arial, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', r.w / 2, r.h / 2 - r.h * 0.04);
      c.font = `${Math.round(r.w * 0.045)}px Arial, sans-serif`;
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillText('panel ' + 'ABC'[i], r.w / 2, r.h / 2 + r.h * 0.06);
    }
    c.restore();
  });
  const bandY = H * 0.775;
  c.fillStyle = g.bar;
  c.fillRect(W * 0.03, bandY, W * 0.94, Math.max(4, H * 0.006));
  const size = Math.round(W * 0.115);
  c.save();
  c.translate(W * 0.03, bandY + H * 0.028);
  c.transform(1, 0, -0.14, 1, 0, 0);
  c.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.lineJoin = 'round';
  c.strokeStyle = '#0d0221';
  c.lineWidth = size * 0.16;
  c.strokeText(state.title.toUpperCase(), 0, 0);
  c.fillStyle = '#ffffff';
  c.fillText(state.title.toUpperCase(), 0, 0);
  c.restore();
  c.font = `700 ${Math.round(W * 0.028)}px Arial, sans-serif`;
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillText(state.tagline.toUpperCase().split('').join('\u2009'), W * 0.032, bandY + H * 0.028 + size * 1.02);
  const nw = W * 0.28, nh = H * 0.115;
  c.save();
  c.translate(W * 0.68 + nw / 2, H * 0.615 + nh / 2);
  c.rotate((-2.5 * Math.PI) / 180);
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = W * 0.012;
  c.shadowOffsetY = H * 0.005;
  c.fillStyle = '#ffe873';
  c.fillRect(-nw / 2, -nh / 2, nw, nh);
  c.shadowColor = 'transparent';
  c.fillStyle = '#2b2b6e';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const lh = nh / 4.6;
  c.font = `italic ${Math.round(lh * 0.95)}px "Comic Sans MS", "Segoe Print", cursive`;
  ['dear judge \u2014', 'every other entry brought you a poster.', 'this one lets YOU make the poster.', 'love, vice city \u2661']
    .forEach((line, i) => c.fillText(line, 0, -nh / 2 + lh * (i + 0.7)));
  c.restore();
}

/* ---------- controls ---------- */
function bindSeg(id, key, onPick) {
  const seg = $(id);
  if (!seg) return;
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    onPick(btn.dataset[key]);
  });
}

bindSeg('layoutSeg', 'layout', (v) => { state.layout = v; drawPoster(); });
bindSeg('gradeSeg', 'grade', (v) => { state.grade = v; drawPoster(); });
bindSeg('panelSeg', 'panel', (v) => {
  state.active = Number(v);
  syncSliders();
});

function syncSliders() {
  const adj = state.adjust[state.active];
  $('zoom').value = Math.round(adj.z * 100);
  $('zoomVal').textContent = adj.z.toFixed(2) + '\u00d7';
  $('panx').value = Math.round(adj.x * 100);
  $('pany').value = Math.round(adj.y * 100);
}

$('zoom').addEventListener('input', (e) => {
  state.adjust[state.active].z = Number(e.target.value) / 100;
  $('zoomVal').textContent = state.adjust[state.active].z.toFixed(2) + '\u00d7';
  drawPoster();
});
$('panx').addEventListener('input', (e) => {
  state.adjust[state.active].x = Number(e.target.value) / 100;
  drawPoster();
});
$('pany').addEventListener('input', (e) => {
  state.adjust[state.active].y = Number(e.target.value) / 100;
  drawPoster();
});

$('title').addEventListener('input', (e) => { state.title = e.target.value || 'UNTITLED'; drawPoster(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; drawPoster(); });
$('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  const [w, h] = state.size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  drawPoster();
});
$('export').addEventListener('click', exportPNG);
$('samplePier').addEventListener('click', () => loadSample('pier'));
$('sampleBlvd').addEventListener('click', () => loadSample('boulevard'));

[0, 1, 2].forEach((i) => {
  $('up' + i).addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      state.photos[i] = await loadImage(url);
      state.active = i;
      document.querySelectorAll('#panelSeg button').forEach((b) => b.classList.toggle('on', Number(b.dataset.panel) === i));
      syncSliders();
      drawPoster();
      setStatus('Photo loaded into panel ' + 'ABC'[i] + '.');
    } catch (err) {
      setStatus('That file could not be read as an image.');
    }
  });
});

/* Drag on the poster to reposition the photo under the pointer. */
let drag = null;
function posterPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = posterPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
      state.active = i;
      document.querySelectorAll('#panelSeg button').forEach((b) => b.classList.toggle('on', Number(b.dataset.panel) === i));
      syncSliders();
      drag = { slot: i, px: p.x, py: p.y, ax: state.adjust[i].x, ay: state.adjust[i].y, w: r.w, h: r.h };
      canvas.setPointerCapture(e.pointerId);
      break;
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = posterPoint(e);
  const adj = state.adjust[drag.slot];
  adj.x = Math.max(-1, Math.min(1, drag.ax + ((p.x - drag.px) / drag.w) * 2.2));
  adj.y = Math.max(-1, Math.min(1, drag.ay + ((p.y - drag.py) / drag.h) * 2.2));
  syncSliders();
  drawPoster();
});
canvas.addEventListener('pointerup', () => { drag = null; });

/* ---------- ?shot= mode (for screenshots) ----------
 * ?shot=cover  — full-bleed poster at ?size= (default 1080x1080)
 * ?shot=editor — the editor UI with ?photo= loaded
 * Common params: photo=pier|boulevard, caption=, layout=, grade=, size=.
 * Sets window.__shotReady when the poster is fully drawn. */
async function boot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  const photo = q.get('photo');
  const caption = q.get('caption');
  const layout = q.get('layout');
  const grade = q.get('grade');
  const size = q.get('size');
  if (caption) {
    state.title = caption;
    const t = $('title');
    if (t) t.value = caption;
  }
  if (layout && ['trio', 'duo', 'full'].includes(layout)) {
    state.layout = layout;
    document.querySelectorAll('#layoutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.layout === layout));
  }
  if (grade && GRADES[grade]) {
    state.grade = grade;
    document.querySelectorAll('#gradeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.grade === grade));
  }
  if (size && /^\d+x\d+$/.test(size)) {
    state.size = size;
    const [w, h] = size.split('x').map(Number);
    canvas.width = w;
    canvas.height = h;
    const s = $('size');
    if (s) s.value = ['1080x1080', '1080x1350', '1920x1080'].includes(size) ? size : s.value;
  }
  if (photo) {
    try {
      const img = await loadImage('samples/' + photo + '.jpg');
      for (let i = 0; i < 3; i++) state.photos[i] = img;
    } catch (err) { /* poster still draws with empty panels */ }
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  drawPoster();
  window.__shotReady = true;
}

drawPoster();
boot();
