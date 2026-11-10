// Single timeline source — VO gaps ~1.15 s; no digital silence; continuous motion.
export const DUR = 54.0; // native 54 s (was 75 trimmed)
export const BPM = 96;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const S16 = BEAT / 4;

// From actual Kokoro durs + 1.15 s gaps (L08 ends ~47.6; hold to 75)
export const K = {
  scatter0: 0.0,
  vo: {
    L01: 0.50,
    L02: 6.68,
    L03: 10.12,
    L04: 14.59,
    L05: 21.87,
    L06: 29.50,
    L07: 34.64,
    L08: 40.86,
  },
  snap: 6.28,
  hazDive: 9.62,
  thread: 13.79,
  register: 21.17,
  plan: 28.80,
  truths: 33.94,
  endCard: 40.26,
  byline: 48.0,
  end: 54.0,
  nodes: [15.2, 16.4, 17.6, 18.8, 20.0, 21.0],
};

export const MOTIF = [57, 60, 64, 67, 69, 64, 60, 57];

export function voiceScatter() {
  const out = [];
  for (let k = 0; ; k++) {
    const t = 0.8 + k * S16;
    if (t >= K.snap - 1e-6) break;
    out.push({ t, k, m: MOTIF[k % MOTIF.length], v: 0.22 + 0.08 * (k % 3 === 0) });
  }
  return out;
}

export function voiceClean() {
  const out = [];
  for (let k = 0; ; k++) {
    const t = K.snap + k * BEAT;
    if (t >= K.endCard - 1e-6) break;
    const v = t < 14 ? 0.28 : t < 22 ? 0.34 : t < 30 ? 0.26 : 0.22;
    out.push({ t, k, m: MOTIF[k % MOTIF.length], v });
  }
  for (let i = 0; i < K.nodes.length; i++) {
    out.push({ t: K.nodes[i], k: 900 + i, m: 69 + (i % 3) * 2, v: 0.42 });
  }
  for (let k = 0; k < 12; k++) {
    const t = K.endCard + 1 + k * BEAT;
    if (t >= 52) break;
    if (k % 2 === 0) out.push({ t, k: 1000 + k, m: 57, v: 0.16 });
  }
  out.push({ t: 51.0, k: 1100, m: 69, v: 0.18 });
  return out.sort((a, b) => a.t - b.t);
}

export const CAPTIONS = [
  { id: 'L01', t0: K.vo.L01, text: 'Hazard records live in spreadsheets, shared drives and email threads.' },
  { id: 'L02', t0: K.vo.L02, text: 'The golden thread is lost.' },
  { id: 'L03', t0: K.vo.L03, text: 'One system holds every hazard in place.' },
  { id: 'L04', t0: K.vo.L04, text: 'Cause. Consequence. Control. Evidence. Residual risk. Linked end to end.' },
  { id: 'L05', t0: K.vo.L05, text: 'A living register with an audit trail, baselines and configurable risk matrices.' },
  { id: 'L06', t0: K.vo.L06, text: 'Senior leaders see the whole programme on a single page.' },
  { id: 'L07', t0: K.vo.L07, text: 'Self-hosted. Open source. On-prem or air-gapped. No lock-in.' },
  { id: 'L08', t0: K.vo.L08, text: 'Sentinel Log. Every hazard. Every control. Every piece of evidence. One golden thread.' },
];
