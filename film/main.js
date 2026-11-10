import { renderFilm, setLines, setUI, subs, buildEvents, DUR } from './film.js';
import * as frames from './frames.js';

const cv = document.getElementById('c');
const g = cv.getContext('2d');

await Promise.all(
  [300, 400, 500, 600, 700].flatMap((w) => [
    `${w} 40px Inter`,
    `${w} 40px InterTight`,
    `${w} 40px JBMono`,
  ]).map((f) => document.fonts.load(f)),
);

const get = async (u, d) => {
  try {
    const r = await fetch(u);
    return r.ok ? await r.json() : d;
  } catch {
    return d;
  }
};

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('img ' + src));
    im.src = src;
  });
}

const lines = await get('lines.json', []);
setLines(lines, await get('voices/dur.json', null));

const [traceability, register, summary, logo] = await Promise.all([
  loadImg('stills/ui/traceability.png'),
  loadImg('stills/ui/register.png'),
  loadImg('stills/ui/summary.png'),
  loadImg('stills/brand/logo-ink-light.png'),
]);
setUI({ traceability, register, summary, logo });

window.DUR = DUR;
window.EV = buildEvents();
window.SUBS = subs();

const Q = new URLSearchParams(location.search);
const scene = Q.get('scene');
window.render = scene
  ? (t) => {
      const fn = frames[scene];
      if (!fn) throw new Error('unknown scene ' + scene);
      fn(g, t);
    }
  : (t) => renderFilm(g, t, { nosub: Q.has('nosub') });
window.READY = true;
