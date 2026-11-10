// Sentinel Log 75s film — continuous motion, soft scene blends, no digital silence.
import * as E from './engine.js';
import { DUR, K, CAPTIONS } from './timeline.js';
import { endCard as drawEndCard, drawGoldenThread } from './frames.js';

E.setAccent('#F5A524');
export { DUR };

/** Real product UI PNGs + brand (loaded in main.js before READY). */
export const UI = { traceability: null, register: null, summary: null, logo: null };
export function setUI(imgs) {
  Object.assign(UI, imgs || {});
}

/**
 * Highlight rects in SOURCE IMAGE pixel space (measured on film/stills/ui/*.png).
 * Each: { x, y, w, h } with ~6 px padding already applied. Transformed every frame
 * with the same fit + push/drift as the screenshot so rings stay locked.
 */
const HL = {
  // Causes→Hazard→Consequences→Controls→Evidence node row (Relationships card)
  // measured on stills/ui/traceability.png
  traceability: [
    { x: 73, y: 427, w: 1473, h: 261 },
  ],
  // Residual-risk badge columns (two adjacent risk cols) + header through body
  // measured on stills/ui/register.png (sat peaks 1111–1237 and 1340–1463)
  register: [
    { x: 1105, y: 300, w: 370, h: 910 },
  ],
  // Top hazards by residual risk + Residual risk distribution card borders
  // measured on stills/ui/summary.png white-interior comps
  summary: [
    { x: 43, y: 519, w: 1268, h: 449 },
    { x: 1327, y: 519, w: 788, h: 350 },
  ],
};

let LINES = CAPTIONS.map((c) => ({ ...c, dur: 4 }));
export function setLines(lines, durMap) {
  LINES = lines.map((L) => {
    const base = CAPTIONS.find((c) => c.id === L.id) || { t0: 0, text: L.text };
    const d = durMap && durMap[L.id] != null ? +durMap[L.id] : 4;
    return { id: L.id, text: L.sub || L.text || base.text, t0: base.t0, dur: d };
  });
}

export function subs() {
  return LINES.map((L) => ({
    t0: L.t0,
    t1: L.t0 + Math.max(1.8, L.dur + 0.6),
    text: L.text,
  }));
}

export function buildEvents() {
  const ev = [];
  for (let i = 0; i < 72; i++) {
    const t = 0.15 + (i / 72) ** 0.55 * 2.6;
    ev.push({ t, type: 'spawn_file', pan: ((i * 37) % 200) / 100 - 1, i });
  }
  ev.push({ t: K.snap, type: 'snap' });
  for (let i = 0; i < 24; i++) ev.push({ t: K.snap + 0.05 + i * 0.04, type: 'land', pan: (i % 7) / 6 - 0.5, k: i, g: i % 3 });
  for (let i = 0; i < K.nodes.length; i++) ev.push({ t: K.nodes[i], type: 'node', i });
  ev.push({ t: K.register, type: 'expand' });
  ev.push({ t: K.plan, type: 'sweep' });
  ev.push({ t: K.truths, type: 'putaway' });
  ev.push({ t: K.endCard, type: 'end' });
  for (let t = K.endCard + 1; t < 74; t += 1.0) ev.push({ t, type: 'caret_tick' });
  return ev.sort((a, b) => a.t - b.t);
}

const FILES = [
  'hazards_v3.xlsx', 'risk_matrix_FINAL.xlsx', 'controls copy.docx',
  'evidence_pack.pdf', 'actions_tracker.csv', 'HAZ-014 notes.txt',
  'baseline_old.xlsx', 'meeting_notes.docx', 'export (1).csv',
  'tritium_draft.xlsx', 'quench_review.pdf', 'blanket_loss.xlsx',
];

function hash01(i, salt = 0) {
  return E.hash(i * 9973.17 + salt * 193.1 + 11.3);
}

function scatterItems(n = 72) {
  const items = [];
  const cols = 8, rows = 9;
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols) % rows;
    const jx = (hash01(i, 1) - 0.5) * 70;
    const jy = (hash01(i, 2) - 0.5) * 50;
    const x0 = 140 + col * ((1920 - 280) / (cols - 1));
    const y0 = 120 + row * ((900 - 160) / (rows - 1));
    items.push({
      i,
      kind: i % 5 === 0 ? 'pdf' : i % 3 === 0 ? 'doc' : 'xls',
      name: FILES[i % FILES.length],
      x: x0 + jx,
      y: y0 + jy,
      rot: (hash01(i, 3) - 0.5) * 22,
      bad: i % 3 === 0,
      tSpawn: 0.15 + (i / n) ** 0.55 * 2.6,
      phase: hash01(i, 4) * Math.PI * 2,
    });
  }
  return items;
}
const SCATTER = scatterItems();

function drawFileTile(g, it, a, scale = 1) {
  if (a <= 0) return;
  const w = 150 * scale, h = 96 * scale;
  g.save();
  g.globalAlpha *= a;
  g.translate(it.x, it.y);
  g.rotate((it.rot * Math.PI) / 180);
  E.panel(g, -w / 2, -h / 2, w, h, { r: 10, shadow: 0.6 });
  g.font = E.font(11, 600, 'mono');
  g.fillStyle = E.PAL.mute;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(it.kind.toUpperCase(), -w / 2 + 12, -h / 2 + 12);
  g.font = E.font(13, 500);
  g.fillStyle = E.PAL.text;
  g.fillText(it.name.slice(0, 16), -w / 2 + 12, -h / 2 + 36);
  if (it.bad) {
    g.fillStyle = E.PAL.red;
    g.beginPath();
    g.arc(w / 2 - 16, -h / 2 + 18, 7, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function captionAt(t) {
  let cur = null;
  for (const L of LINES) {
    const t1 = L.t0 + Math.max(1.8, L.dur + 0.6);
    if (t >= L.t0 && t < t1) cur = L;
  }
  return cur;
}

function toastAlpha(t, L) {
  if (!L) return 0;
  const u = t - L.t0;
  const t1 = L.t0 + Math.max(1.8, L.dur + 0.6);
  const fade = 0.16;
  if (u < fade) return E.ss(u / fade);
  if (t > t1 - fade) return E.ss((t1 - t) / fade);
  return 1;
}

function safeToast(g, text, a) {
  if (a <= 0.01) return;
  const maxW = 1680;
  let px = 36;
  g.save();
  g.font = E.font(px, 500);
  while (g.measureText(text).width > maxW - px * 2.6 && px > 22) {
    px -= 2;
    g.font = E.font(px, 500);
  }
  const tw = g.measureText(text).width;
  const h = px * 1.95;
  const padL = px * 1.35;
  const padR = px * 1.1;
  const w = Math.min(maxW, tw + padL + padR);
  const x = (1920 - w) / 2;
  const y = 1080 - 72 - h + (1 - E.eo(a)) * 12;
  g.globalAlpha = E.eo(a);
  g.shadowColor = 'rgba(0,0,0,.5)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 10;
  g.fillStyle = 'rgba(12,14,19,0.82)';
  E.rr(g, x, y, w, h, h / 2);
  g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,.09)';
  g.lineWidth = 1;
  E.rr(g, x + 0.5, y + 0.5, w - 1, h - 1, h / 2);
  g.stroke();
  const dotX = x + padL * 0.45;
  const dotY = y + h / 2;
  g.fillStyle = E.PAL.accent;
  g.shadowColor = E.rgba(E.PAL.accent, 0.8);
  g.shadowBlur = 10;
  g.beginPath();
  g.arc(dotX, dotY, Math.max(4, px * 0.14), 0, Math.PI * 2);
  g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = E.PAL.text;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = E.font(px, 500);
  g.fillText(text, x + padL, y + h / 2 + 1);
  g.restore();
}

/** Continuous ambient camera: slow drift + gentle push (1–3%). */
function withAmbient(g, t, draw, amp = 1) {
  const dx = Math.sin(t * 0.35) * 10 * amp + Math.sin(t * 0.11) * 4 * amp;
  const dy = Math.cos(t * 0.28) * 7 * amp + Math.cos(t * 0.09) * 3 * amp;
  const z = 1 + 0.012 * amp * Math.sin(t * 0.22) + 0.008 * amp * Math.sin(t * 0.07);
  g.save();
  g.translate(960 + dx, 540 + dy);
  g.scale(z, z);
  g.translate(-960, -540);
  draw();
  g.restore();
}

// ─── scenes ───
function sceneScatter(g, t) {
  E.bg(g, { lift: 0.45, cool: 0.3, dark: 0.08 });
  E.grid(g, { ox: 960 + Math.sin(t * 0.25) * 12, oy: 540 + Math.cos(t * 0.2) * 8, alpha: 0.7 });
  const dutch = t > 5.0 ? ((t - 5.0) / 2.0) * 0.025 : 0;
  g.save();
  g.translate(960, 540);
  g.rotate(dutch);
  g.translate(-960, -540);
  for (const it of SCATTER) {
    const u = t - it.tSpawn;
    if (u < 0) continue;
    const a = E.clamp(u / 0.25, 0, 1);
    const bounce = u < 0.22 ? E.back(u / 0.22) : 1;
    const yOff = u < 0.22 ? (1 - bounce) * 34 : 0;
    // continuous parallax drift after land
    const driftX = Math.sin(t * 0.9 + it.phase) * 5;
    const driftY = Math.cos(t * 0.7 + it.phase) * 4;
    const rotLive = it.rot + Math.sin(t * 0.6 + it.phase) * 1.5;
    drawFileTile(g, {
      ...it,
      x: it.x + driftX,
      y: it.y + yOff + driftY,
      rot: rotLive,
    }, a);
  }
  E.caret(g, 960 + Math.sin(t * 1.6) * 50, 540 + Math.cos(t * 1.3) * 35, 48, {
    on: (Math.floor(t * 2) % 2) ? 1 : 0.15,
  });
  g.restore();
  E.vignette(g, 0.55);
}

function sceneSnap(g, t) {
  E.bg(g, { lift: 0.5, cool: 0.35, dark: 0.05 });
  E.grid(g, { ox: 960 + Math.sin(t * 0.3) * 6, oy: 540, alpha: 0.85 });
  const p = E.clamp((t - K.snap) / 1.6, 0, 1);
  const ease = E.back(E.ss(p));
  const cols = 6, rows = 4;
  const slots = E.snapGrid(cols, rows, 140, 18, 960 - (cols * 158) / 2, 200);
  for (let i = 0; i < Math.min(SCATTER.length, slots.length); i++) {
    const it = SCATTER[i];
    const sl = slots[i];
    const pose = E.flyPose(
      { x: it.x, y: it.y, s: 1, rot: it.rot },
      { x: sl.x + Math.sin(t * 0.8 + i) * 2, y: sl.y + Math.cos(t * 0.7 + i) * 2, s: 0.92, rot: 0 },
      ease,
    );
    drawFileTile(g, { ...it, x: pose.x, y: pose.y, rot: pose.rot }, 0.3 + 0.7 * ease, pose.s);
  }
  if (p > 0.4) {
    const a = E.clamp((p - 0.4) / 0.6, 0, 1);
    const shimmer = (t * 180) % 1520;
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = E.rgba(E.PAL.accent, 0.9);
    g.lineWidth = 4;
    g.shadowColor = E.rgba(E.PAL.accent, 0.6);
    g.shadowBlur = 20;
    g.beginPath();
    g.moveTo(200, 540);
    g.lineTo(200 + 1520 * a, 540);
    g.stroke();
    // travelling shimmer bead
    g.fillStyle = '#FFF6D6';
    g.beginPath();
    g.arc(200 + shimmer * a, 540, 5, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  E.caret(g, 960 + Math.sin(t * 2) * 8, 540 + Math.cos(t * 1.5) * 6, 56, {
    on: (Math.floor(t * 3) % 2) ? 1 : 0.25,
  });
  E.vignette(g, 0.5);
}

function sceneHaz(g, t) {
  E.bg(g, { lift: 0.55, cool: 0.3, dark: 0.05 });
  E.grid(g, { ox: 960, oy: 540, alpha: 0.6 });
  const local = t - K.hazDive;
  const z = E.lerp(1.05, 1.55, E.ss(E.clamp(local / 2.8, 0, 1))) + 0.01 * Math.sin(t * 0.5);
  g.save();
  g.translate(960 + Math.sin(t * 0.4) * 6, 540 + Math.cos(t * 0.35) * 4);
  g.scale(z, z);
  g.translate(-960, -540);
  const w = 720, h = 280, x = 960 - w / 2, y = 540 - h / 2;
  E.panel(g, x, y, w, h, { r: 22 });
  g.fillStyle = E.PAL.accent;
  g.fillRect(x, y + 24, 5, h - 48);
  g.font = E.font(16, 600, 'mono');
  g.fillStyle = E.PAL.accent;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  if (g.letterSpacing !== undefined) g.letterSpacing = '3px';
  g.fillText('HAZARD', x + 36, y + 36);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  g.font = E.font(52, 600);
  g.fillStyle = E.PAL.text;
  g.fillText('HAZ-014', x + 36, y + 78);
  g.font = E.font(28, 500);
  g.fillStyle = E.PAL.dim;
  g.fillText('Tritium release', x + 36, y + 150);
  g.font = E.font(16, 500, 'mono');
  g.fillStyle = E.PAL.mute;
  g.fillText('Status  OPEN   ·   Matrix  4×4   ·   Baseline  B-12', x + 36, y + 210);
  E.caret(g, x + 36 + 220, y + 100, 44, {
    on: (Math.floor(t * 2) % 2) ? 1 : 0.15,
  });
  g.restore();
  E.vignette(g, 0.48);
}

/** Fit image into box preserving aspect; return {dx,dy,dw,dh, scale}. */
function fitContain(iw, ih, bw, bh) {
  const s = Math.min(bw / iw, bh / ih);
  const dw = iw * s, dh = ih * s;
  return { dx: (bw - dw) / 2, dy: (bh - dh) / 2, dw, dh, s };
}

/** Dark browser/device chrome around a content rect. Chip sits in chrome bar (never over UI). */
function deviceFrame(g, x, y, w, h, o = {}) {
  const bar = 36, r = 14;
  const { chip = false } = o;
  // outer shadow
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.55)';
  g.shadowBlur = 48;
  g.shadowOffsetY = 18;
  g.fillStyle = '#0E1524';
  E.rr(g, x - 10, y - bar - 10, w + 20, h + bar + 20, r + 4);
  g.fill();
  g.shadowColor = 'transparent';
  // chrome
  g.fillStyle = '#151C2C';
  E.rr(g, x - 2, y - bar, w + 4, h + bar + 2, r);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.10)';
  g.lineWidth = 1;
  E.rr(g, x - 1.5, y - bar + 0.5, w + 3, h + bar + 1, r);
  g.stroke();
  // traffic dots (non-OS-specific, monochrome)
  const dots = ['#5C6272', '#8A90A0', '#5C6272'];
  dots.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x + 18 + i * 16, y - bar / 2, 4, 0, Math.PI * 2);
    g.fill();
  });
  // URL pill (narrower when chip is present on the right)
  const pillW = chip ? w * 0.42 : w * 0.56;
  const pillX = x + (w - pillW) / 2 - (chip ? 70 : 0);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  E.rr(g, pillX, y - bar + 8, pillW, bar - 16, 8);
  g.fill();
  g.font = E.font(13, 500, 'mono');
  g.fillStyle = E.PAL.mute;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('sentinel-log  ·  local', pillX + pillW / 2, y - bar / 2);
  // Illustrative-data chip: chrome top-right, outside app content
  if (chip) {
    illustrativeChip(g, x + w - 178, y - bar + 5);
  }
  g.restore();
}

/** Amber highlight ring in screen-space (around content area). */
function amberRing(g, x, y, w, h, a = 1) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha *= a;
  g.strokeStyle = E.PAL.accent;
  g.lineWidth = 3;
  g.shadowColor = E.rgba(E.PAL.accent, 0.85);
  g.shadowBlur = 16;
  E.rr(g, x - 4, y - 4, w + 8, h + 8, 10);
  g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,240,190,0.55)';
  g.lineWidth = 1;
  E.rr(g, x - 1, y - 1, w + 2, h + 2, 8);
  g.stroke();
  g.restore();
}

/** Travelling amber underline across a horizontal band. */
function amberTravel(g, x, y, w, t, speed = 0.35) {
  const u = (t * speed) % 1;
  const len = w * 0.28;
  const x0 = x + u * (w + len) - len;
  g.save();
  g.strokeStyle = E.PAL.accent;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.shadowColor = E.rgba(E.PAL.accent, 0.9);
  g.shadowBlur = 12;
  g.beginPath();
  g.moveTo(Math.max(x, x0), y);
  g.lineTo(Math.min(x + w, x0 + len), y);
  g.stroke();
  g.restore();
}

const CAP_BAND = 140; // navy strip under UI so captions never cover app text

/** Cover-fit source crop into dest box (zoom into key region). */
function fitCoverCrop(iw, ih, crop, bw, bh) {
  const cx = crop.x, cy = crop.y, cw = crop.w, ch = crop.h;
  const s = Math.max(bw / cw, bh / ch);
  const dw = cw * s, dh = ch * s;
  const dx = (bw - dw) / 2, dy = (bh - dh) / 2;
  return { sx: cx, sy: cy, sw: cw, sh: ch, dx, dy, dw, dh, s, scale: s };
}

function illustrativeChip(g, x, y) {
  const label = 'Illustrative data';
  g.font = E.font(13, 600, 'mono');
  const tw = g.measureText(label).width;
  const padX = 12, padY = 8;
  const w = tw + padX * 2, h = 13 + padY * 2;
  g.fillStyle = 'rgba(11,18,32,0.82)';
  E.rr(g, x, y, w, h, 8);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 1;
  E.rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 8);
  g.stroke();
  g.fillStyle = E.PAL.mute;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  if (g.letterSpacing !== undefined) g.letterSpacing = '1px';
  g.fillText(label, x + padX, y + h / 2);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
}

/**
 * Real product UI plate: zoom into highlight crop so body text reads at 1080p,
 * navy caption band at bottom (~140 px), rings locked to crop, Illustrative chip.
 * crop: source-pixel region to cover-fit (usually the highlight expanded).
 */
function sceneUIScreen(g, t, t0, img, highlights, label, crop) {
  E.bg(g, { lift: 0.5, cool: 0.32, dark: 0.05 });
  E.grid(g, {
    ox: 960 + Math.sin(t * 0.22) * 10,
    oy: 540 + Math.cos(t * 0.18) * 6,
    alpha: 0.55,
  });

  g.font = E.font(14, 600, 'mono');
  g.fillStyle = E.PAL.mute;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  if (g.letterSpacing !== undefined) g.letterSpacing = '4px';
  g.fillText(label, 96, 40);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';

  const local = Math.max(0, t - t0);
  // framed → zoomed into key region (readable type)
  const zoom = 1 + 0.08 * E.ss(E.clamp(local / 5.5, 0, 1));
  const driftX = Math.sin(t * 0.4) * 6;
  const driftY = Math.cos(t * 0.33) * 4;

  // leave navy band under caption (~140 px) + top chrome room
  const CAP_BAND = 140;
  const boxW = 1760, boxH = 1080 - 100 - CAP_BAND;
  const boxX = (1920 - boxW) / 2;
  const boxY = 78;

  g.save();
  g.translate(960 + driftX, (boxY + boxH / 2) + driftY);
  g.scale(zoom, zoom);
  g.translate(-960, -(boxY + boxH / 2));

  deviceFrame(g, boxX, boxY, boxW, boxH, { chip: true });

  if (img && img.complete && img.naturalWidth) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // expand highlight into a readable crop (keep aspect of dest)
    const hs = highlights && highlights.length ? highlights : [{ x: 0, y: 0, w: iw, h: ih }];
    let minX = hs[0].x, minY = hs[0].y, maxX = hs[0].x + hs[0].w, maxY = hs[0].y + hs[0].h;
    for (const h of hs) {
      minX = Math.min(minX, h.x);
      minY = Math.min(minY, h.y);
      maxX = Math.max(maxX, h.x + h.w);
      maxY = Math.max(maxY, h.y + h.h);
    }
    // pad crop so UI chrome around the focus still reads
    const padX = Math.max(40, (maxX - minX) * 0.12);
    const padY = Math.max(40, (maxY - minY) * 0.18);
    let cx = Math.max(0, minX - padX);
    let cy = Math.max(0, minY - padY);
    let cw = Math.min(iw - cx, maxX - minX + padX * 2);
    let ch = Math.min(ih - cy, maxY - minY + padY * 2);
    if (crop) {
      cx = crop.x; cy = crop.y; cw = crop.w; ch = crop.h;
    }
    // match dest aspect so cover doesn't hide the ring
    const destA = (boxW - 8) / (boxH - 8);
    const cropA = cw / ch;
    if (cropA > destA) {
      // too wide — grow height
      const nh = cw / destA;
      const extra = nh - ch;
      cy = Math.max(0, cy - extra / 2);
      ch = Math.min(ih - cy, nh);
    } else {
      const nw = ch * destA;
      const extra = nw - cw;
      cx = Math.max(0, cx - extra / 2);
      cw = Math.min(iw - cx, nw);
    }

    const f = fitCoverCrop(iw, ih, { x: cx, y: cy, w: cw, h: ch }, boxW - 8, boxH - 8);
    const ix = boxX + 4 + f.dx;
    const iy = boxY + 4 + f.dy;

    g.fillStyle = '#F7F8FA';
    g.fillRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);
    g.save();
    g.beginPath();
    g.rect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);
    g.clip();
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, f.sx, f.sy, f.sw, f.sh, ix, iy, f.dw, f.dh);
    g.restore();

    // rings only (no travelling underline — those sat on title rows)
    const sx = f.dw / f.sw, sy = f.dh / f.sh;
    (highlights || []).forEach((h, i) => {
      const hx = ix + (h.x - f.sx) * sx;
      const hy = iy + (h.y - f.sy) * sy;
      const hw = h.w * sx;
      const hh = h.h * sy;
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + i);
      amberRing(g, hx, hy, hw, hh, 0.6 + 0.3 * pulse);
    });
  } else {
    g.fillStyle = E.PAL.surf2;
    g.fillRect(boxX, boxY, boxW, boxH);
  }

  g.restore();

  // solid navy caption band so toast never sits on UI text
  g.fillStyle = E.PAL.bg0;
  g.fillRect(0, 1080 - CAP_BAND, 1920, CAP_BAND);
  // soft fade into band
  const grd = g.createLinearGradient(0, 1080 - CAP_BAND - 36, 0, 1080 - CAP_BAND);
  grd.addColorStop(0, 'rgba(11,18,32,0)');
  grd.addColorStop(1, 'rgba(11,18,32,1)');
  g.fillStyle = grd;
  g.fillRect(0, 1080 - CAP_BAND - 36, 1920, 36);

  E.vignette(g, 0.45);
}

/** L04 node light times relative to K.vo.L04 (from words.json). */
const L04_NODE_AT = [
  0.0, // Hazard (setup)
  0.0, // Cause
  0.5, // Consequence
  1.6, // Control
  2.46, // Evidence
  3.38, // Residual risk
];

function sceneThread(g, t) {
  // Six-node metaphor for most of L04, then morph into real Traceability UI
  const uiStart = K.register - 2.6; // last ~2.6 s of thread window → product UI
  const fade = E.ss(E.clamp((t - uiStart) / 0.7, 0, 1));

  // node lights from VO
  const rel = t - K.vo.L04;
  let lit = 1;
  for (let i = 0; i < L04_NODE_AT.length; i++) {
    if (rel >= L04_NODE_AT[i] - 0.05) lit = i + 1;
  }
  const progress = E.clamp(lit / 6, 0.2, 1);

  if (fade < 0.999) {
    g.save();
    // slight ambient on metaphor plate
    withAmbient(g, t, () => {
      drawGoldenThread(g, {
        progress,
        litCount: lit,
        showChips: false,
        showCaption: false,
        t,
      });
    }, 0.6);
    g.restore();
  }

  if (fade > 0.01) {
    // draw UI into offscreen then composite
    const [c, cg] = E.buf('threadUI');
    sceneUIScreen(cg, t, uiStart, UI.traceability, HL.traceability, 'SENTINEL LOG  ·  TRACEABILITY');
    g.save();
    g.globalAlpha = fade;
    g.drawImage(c, 0, 0);
    g.restore();
  }
}

function sceneRegister(g, t) {
  sceneUIScreen(g, t, K.register, UI.register, HL.register, 'SENTINEL LOG  ·  REGISTER');
}

function scenePlan(g, t) {
  sceneUIScreen(g, t, K.plan, UI.summary, HL.summary, 'SENTINEL LOG  ·  PLAN ON A PAGE');
}

function sceneTruths(g, t) {
  E.bg(g, { lift: 0.45, cool: 0.28, dark: 0.08 });
  E.grid(g, { ox: 960 + Math.sin(t * 0.25) * 10, oy: 540, alpha: 0.45 });
  const badges = [
    'Apache-2.0',
    'Self-hosted',
    'On-prem',
    'Air-gapped',
    'Import Excel / CSV / JSON',
    'Export',
    'No lock-in',
  ];
  const p = E.ss(E.clamp((t - K.truths) / 2.0, 0, 1));
  badges.forEach((b, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 220 + col * 500 + Math.sin(t * 0.7 + i) * 3;
    const y = 260 + row * 160 + Math.cos(t * 0.6 + i) * 2;
    const a = E.clamp((p * badges.length - i) / 1.2, 0, 1);
    if (a <= 0) return;
    g.globalAlpha = a;
    E.panel(g, x, y, 440, 100, { r: 14 });
    g.font = E.font(24, 600);
    g.fillStyle = E.PAL.text;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(b, x + 220, y + 50);
    g.globalAlpha = 1;
  });
  // shimmering thread remnant
  const sh = (t * 220) % 1320;
  g.save();
  g.strokeStyle = E.rgba(E.PAL.accent, 0.9);
  g.lineWidth = 4;
  g.shadowColor = E.rgba(E.PAL.accent, 0.5);
  g.shadowBlur = 18;
  g.beginPath();
  g.moveTo(300, 820);
  g.lineTo(1620, 820);
  g.stroke();
  g.fillStyle = '#FFF6D6';
  g.beginPath();
  g.arc(300 + sh, 820, 5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  E.vignette(g, 0.52);
}

function sceneEnd(g, t) {
  drawEndCard(g, t, { logo: UI.logo, t0: K.endCard, byline: K.byline });
}

const SCENES = [
  { id: 'scatter', t0: 0, t1: K.snap, draw: sceneScatter },
  { id: 'snap', t0: K.snap, t1: K.hazDive, draw: sceneSnap },
  { id: 'haz', t0: K.hazDive, t1: K.thread, draw: sceneHaz },
  { id: 'thread', t0: K.thread, t1: K.register, draw: sceneThread },
  { id: 'register', t0: K.register, t1: K.plan, draw: sceneRegister },
  { id: 'plan', t0: K.plan, t1: K.truths, draw: scenePlan },
  { id: 'truths', t0: K.truths, t1: K.endCard, draw: sceneTruths },
  { id: 'end', t0: K.endCard, t1: DUR + 1, draw: sceneEnd },
];

function drawSceneInto(bufG, scene, t) {
  bufG.setTransform(1, 0, 0, 1, 0, 0);
  bufG.clearRect(0, 0, 1920, 1080);
  withAmbient(bufG, t, () => scene.draw(bufG, t), scene.id === 'end' ? 0.35 : 1);
}

export function renderFilm(g, t, o = {}) {
  const tt = E.clamp(t, 0, DUR);
  const XFADE = 0.5;

  // find active scene(s)
  let i = 0;
  for (; i < SCENES.length; i++) {
    if (tt < SCENES[i].t1) break;
  }
  i = Math.min(i, SCENES.length - 1);
  const cur = SCENES[i];
  const prev = i > 0 ? SCENES[i - 1] : null;

  const into = tt - cur.t0;
  const blending = prev && into < XFADE;

  if (blending) {
    const u = E.ss(into / XFADE);
    const [ca, cag] = E.buf('xfA');
    const [cb, cbg] = E.buf('xfB');
    drawSceneInto(cag, prev, Math.min(tt, prev.t1 - 0.001));
    drawSceneInto(cbg, cur, tt);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(ca, 0, 0);
    g.globalAlpha = u;
    g.drawImage(cb, 0, 0);
    g.globalAlpha = 1;
  } else {
    withAmbient(g, tt, () => cur.draw(g, tt), cur.id === 'end' ? 0.35 : 1);
  }

  if (!o.nosub) {
    // End card already carries L08 copy — no burned caption stack
    if (tt < K.endCard) {
      const L = captionAt(tt);
      const a = toastAlpha(tt, L);
      if (L && a > 0.01) safeToast(g, L.text, a);
    }
  }
}
