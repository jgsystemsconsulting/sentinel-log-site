// Style frames / scenes for Sentinel Log (dark-keynote engine).
import * as E from './engine.js';

E.setAccent('#F5A524');

/** Six-node golden thread: Hazard → Cause → Consequence → Control → Evidence → Residual risk */
export const THREAD_NODES = [
  { id: 'HAZ', title: 'Hazard', sub: 'HAZ-014 · Tritium release' },
  { id: 'CAU', title: 'Cause', sub: 'Containment breach path' },
  { id: 'CON', title: 'Consequence', sub: 'Worker dose, site boundary release' },
  { id: 'CTL', title: 'Control', sub: 'Interlock + purge train' },
  { id: 'EVI', title: 'Evidence', sub: 'Test pack · baseline B-12' },
  { id: 'RES', title: 'Residual risk', sub: 'ALARP · matrix 4×4' },
];

/** Layout: equal spacing; thread runs along card BOTTOM edge so titles stay legible. */
export function threadLayout(n = THREAD_NODES.length) {
  const margin = 56;
  const gapMin = 14;
  const cardW = Math.floor((1920 - margin * 2 - gapMin * (n - 1)) / n);
  const cardH = 132;
  const y = 400;
  const total = n * cardW + (n - 1) * gapMin;
  const x0 = (1920 - total) / 2;
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(x0 + i * (cardW + gapMin));
  // path along bottom rail of cards (below id/title/sub text)
  const cy = y + cardH - 16;
  const pts = xs.map((x) => [x + cardW / 2, cy]);
  return { xs, y, cardW, cardH, pts, cy, x0 };
}

function densify(pts, seg = 28) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (let k = 0; k <= seg; k++) {
      const p = k / seg;
      // slight horizontal arc only (y stays on baseline) so path never breaks between nodes
      dense.push([a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]);
    }
  }
  return dense;
}

function nodeCard(g, x, y, w, h, n, lit) {
  E.panel(g, x, y, w, h, { r: 14 });
  if (lit > 0.05) {
    g.fillStyle = E.rgba(E.PAL.accent, 0.18 + 0.55 * lit);
    g.fillRect(x, y + 8, 3, h - 28); // stop above bottom rail / thread
    E.glow(g, x + w * 0.5, y + h * 0.4, 70, E.PAL.accent, 0.10 * lit);
  }
  g.font = E.font(11, 600, 'mono');
  g.fillStyle = lit > 0.35 ? E.PAL.accent : E.PAL.mute;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  if (g.letterSpacing !== undefined) g.letterSpacing = '2px';
  g.fillText(n.id, x + 14, y + 12);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';

  g.font = E.font(20, 600);
  g.fillStyle = E.PAL.text;
  g.fillText(n.title, x + 14, y + 34);

  g.font = E.font(13, 500);
  g.fillStyle = E.PAL.dim;
  // wrap long sub; keep above bottom rail (thread at h-16)
  const maxW = w - 28;
  const words = n.sub.split(' ');
  let line = '', ly = y + 64;
  const maxLy = y + h - 36;
  for (const w0 of words) {
    const t = line ? line + ' ' + w0 : w0;
    if (g.measureText(t).width > maxW && line) {
      if (ly <= maxLy) g.fillText(line, x + 14, ly);
      line = w0;
      ly += 15;
    } else line = t;
  }
  if (line && ly <= maxLy) g.fillText(line, x + 14, ly);
}

/** Bright continuous golden thread under cards; dots ON the line. */
export function drawGoldenThread(g, o = {}) {
  const {
    progress = 1, // 0..1 how far the thread has drawn
    litCount = THREAD_NODES.length,
    showChips = true,
    showCaption = true,
    t = 1,
  } = o;

  E.bg(g, { lift: 0.55, cool: 0.35, dark: 0.05 });
  E.grid(g, { ox: 960, oy: 540, alpha: 0.9 });

  const L = threadLayout();
  // header aligned to cards' left edge — no caret
  g.font = E.font(14, 600, 'mono');
  g.fillStyle = E.PAL.mute;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  if (g.letterSpacing !== undefined) g.letterSpacing = '4px';
  g.fillText('SENTINEL LOG  ·  GOLDEN THREAD', L.x0, 88);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';

  const dense = densify(L.pts, 32);
  const nDraw = Math.max(2, Math.floor(dense.length * E.clamp(progress, 0, 1)));
  const drawn = dense.slice(0, nDraw);

  // cards first; thread along bottom rail over cards (below text)
  for (let i = 0; i < THREAD_NODES.length; i++) {
    const lit = i < litCount ? 1 : 0.15;
    nodeCard(g, L.xs[i], L.y, L.cardW, L.cardH, THREAD_NODES[i], lit);
  }

  if (drawn.length >= 2) {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = E.rgba(E.PAL.accent, 0.4);
    g.lineWidth = 14;
    g.shadowColor = E.rgba(E.PAL.accent, 0.65);
    g.shadowBlur = 28;
    g.beginPath();
    g.moveTo(drawn[0][0], drawn[0][1]);
    for (let i = 1; i < drawn.length; i++) g.lineTo(drawn[i][0], drawn[i][1]);
    g.stroke();
    g.shadowBlur = 12;
    g.strokeStyle = E.rgba(E.PAL.accent, 1);
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(drawn[0][0], drawn[0][1]);
    for (let i = 1; i < drawn.length; i++) g.lineTo(drawn[i][0], drawn[i][1]);
    g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,240,190,1)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(drawn[0][0], drawn[0][1]);
    for (let i = 1; i < drawn.length; i++) g.lineTo(drawn[i][0], drawn[i][1]);
    g.stroke();
    // travelling shimmer bead along thread
    const bi = Math.floor(((t * 0.35) % 1) * (drawn.length - 1));
    const [bx, by] = drawn[Math.max(0, Math.min(drawn.length - 1, bi))];
    g.fillStyle = '#FFF6D6';
    g.shadowColor = E.rgba(E.PAL.accent, 0.9);
    g.shadowBlur = 14;
    g.beginPath();
    g.arc(bx, by, 4.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // dots ON bottom-rail thread
  for (let i = 0; i < THREAD_NODES.length; i++) {
    const [cx, cy] = L.pts[i];
    if (i < litCount && progress > i / (THREAD_NODES.length - 1) - 0.02) {
      g.beginPath();
      g.arc(cx, cy, 7, 0, Math.PI * 2);
      g.fillStyle = E.PAL.accent;
      g.shadowColor = E.rgba(E.PAL.accent, 0.95);
      g.shadowBlur = 16;
      g.fill();
      g.shadowBlur = 0;
      g.beginPath();
      g.arc(cx, cy, 3, 0, Math.PI * 2);
      g.fillStyle = '#FFF6D6';
      g.fill();
    }
  }

  if (showChips) {
    const chips = [
      ['HAZ-021', 'Liquid lithium fire'],
      ['HAZ-033', 'Breeder blanket coolant loss'],
      ['HAZ-041', 'Magnet quench'],
    ];
    let cx0 = L.x0;
    const chipY = L.y + L.cardH + 36;
    for (const [id, lab] of chips) {
      g.font = E.font(13, 600, 'mono');
      const idW = g.measureText(id).width;
      g.font = E.font(14, 500);
      const labW = g.measureText(lab).width;
      const tw = 28 + idW + 12 + labW;
      E.panel(g, cx0, chipY, tw, 40, { r: 10 });
      g.font = E.font(13, 600, 'mono');
      g.fillStyle = E.PAL.accent;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(id, cx0 + 14, chipY + 20);
      g.font = E.font(14, 500);
      g.fillStyle = E.PAL.dim;
      g.fillText(lab, cx0 + 14 + idW + 12, chipY + 20);
      cx0 += tw + 20;
    }
  }

  // no stray caret on this scene

  if (showCaption) {
    // smaller px so long line stays on screen
    E.toast(g, 'Cause · Consequence · Control · Evidence · Residual risk. Linked end to end.', 0.95, { px: 28 });
  }

  E.vignette(g, 0.5);
}

export function goldenThread(g, t) {
  drawGoldenThread(g, { progress: 1, litCount: 6, t, showCaption: true, showChips: true });
}

export function endCard(g, t, o = {}) {
  const { logo = null, t0 = 40.26, byline = 48.0 } = o;
  E.bg(g, { lift: 0.4, cool: 0.25, dark: 0.1 });
  E.grid(g, { ox: 960, oy: 540, alpha: 0.5 });
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = E.font(96, 600);
  g.fillStyle = E.PAL.text;
  if (g.letterSpacing !== undefined) g.letterSpacing = '-2px';
  g.fillText('Sentinel Log', 960, 360);
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  const w = g.measureText('Sentinel Log').width;
  E.caret(g, 960 + w / 2 + 28, 312, 88, {});
  g.font = E.font(28, 500);
  g.fillStyle = E.PAL.dim;
  g.fillText('Every hazard. Every control. Every piece of evidence.', 960, 430);
  g.font = E.font(32, 600);
  g.fillStyle = E.PAL.accent;
  g.fillText('One golden thread.', 960, 485);

  // Company block fades in at by-line beat (secondary)
  const brandA = E.ss(E.clamp((t - byline) / 0.8, 0, 1));
  if (brandA > 0.01) {
    g.save();
    g.globalAlpha *= brandA;
    const logoH = 84;
    const logoW = logo && logo.naturalWidth
      ? (logo.naturalWidth / logo.naturalHeight) * logoH
      : logoH;
    const gap = 18;
    g.font = E.font(22, 600);
    const name = 'JG Systems Consulting Ltd';
    const nameW = g.measureText(name).width;
    const blockW = logoW + gap + nameW;
    const bx = 960 - blockW / 2;
    const by = 560;

    if (logo && logo.complete && logo.naturalWidth) {
      g.drawImage(logo, bx, by - logoH * 0.7, logoW, logoH);
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = E.font(22, 600);
    g.fillStyle = E.PAL.text;
    g.fillText(name, bx + logoW + gap, by);
    g.font = E.font(16, 500, 'mono');
    g.fillStyle = E.PAL.mute;
    if (g.letterSpacing !== undefined) g.letterSpacing = '1px';
    g.fillText('jgsystemsconsulting.com', bx + logoW + gap, by + 28);
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    g.restore();
  }

  E.vignette(g, 0.55);
}
