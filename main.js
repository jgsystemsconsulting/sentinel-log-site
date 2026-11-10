/* Sentinel Log — progressive enhancements */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function playFilm(video) {
  if (!video) return;
  video.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  try {
    video.focus({ preventScroll: true });
  } catch {
    /* focus optional */
  }
  video.muted = false; // user gesture: play with voiceover
  const tryPlay = () => {
    const play = video.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  };
  if (video.readyState >= 2) {
    tryPlay();
  } else {
    video.addEventListener('canplay', tryPlay, { once: true });
    window.setTimeout(tryPlay, 500);
  }
}

function setupFilm() {
  const video = document.querySelector('#hero-video, .hero video, video');
  if (!video) return;

  video.removeAttribute('autoplay');
  video.muted = true;
  if (!video.getAttribute('preload')) video.setAttribute('preload', 'none');

  let done = false;
  let sourceFails = 0;

  const fail = () => {
    if (done) return;
    done = true;
    const slot = video.closest('.film-slot') || video.parentElement;
    if (!slot || slot.querySelector('.film-fallback')) return;
    video.remove();
    const card = document.createElement('div');
    card.className = 'film-fallback';
    card.setAttribute('role', 'img');
    card.setAttribute('aria-label', 'Film coming soon');
    card.innerHTML =
      '<img class="fallback-mark" src="assets/thread-mark.svg" alt="">' +
      '<p class="fallback-word">Sentinel Log</p>' +
      '<p class="fallback-note">Film coming soon</p>';
    slot.appendChild(card);
  };

  const wireSourceErrors = () => {
    const sources = [...video.querySelectorAll('source')];
    sources.forEach((s) => {
      s.addEventListener('error', () => {
        sourceFails += 1;
        if (sourceFails >= sources.length) fail();
      });
    });
  };
  wireSourceErrors();
  video.addEventListener('error', fail);

  const bindWatch = (el) => {
    if (!el) return;
    el.addEventListener('click', (e) => {
      const stillThere = document.getElementById('hero-video') || document.querySelector('.hero video');
      if (stillThere) {
        e.preventDefault();
        playFilm(stillThere);
      }
    });
  };
  bindWatch(document.getElementById('watch-film'));
  bindWatch(document.getElementById('watch-film-closing'));
}

function setupThread() {
  const section = document.getElementById('how-it-works');
  if (!section) return;

  const thread = section.querySelector('.golden-thread');
  const nodes = [...section.querySelectorAll('.gt-node')];
  if (!thread || nodes.length === 0) return;

  const lightAll = () => {
    thread.classList.add('is-drawn');
    nodes.forEach((n) => n.classList.add('is-lit'));
  };

  if (prefersReducedMotion()) {
    lightAll();
    return;
  }

  let started = false;

  const run = () => {
    if (started) return;
    started = true;
    thread.classList.add('is-drawn');
    const stepMs = 120;
    nodes.forEach((node, i) => {
      window.setTimeout(() => {
        node.classList.add('is-lit');
      }, 80 + i * stepMs);
    });
  };

  if (!('IntersectionObserver' in window)) {
    lightAll();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          run();
          io.disconnect();
          break;
        }
      }
    },
    { threshold: [0.2, 0.35] }
  );

  io.observe(section);
}

function setupMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');
  const header = document.querySelector('.site-header');
  if (!toggle || !nav) return;

  const mq = window.matchMedia('(max-width: 767px)');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (header) header.classList.toggle('nav-open', open);
    nav.classList.toggle('is-open', open);
  };

  const syncMode = () => {
    if (mq.matches) {
      toggle.hidden = false;
      setOpen(false);
    } else {
      toggle.hidden = true;
      setOpen(false);
      nav.classList.remove('is-open');
      if (header) header.classList.remove('nav-open');
    }
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!open);
  });

  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      if (mq.matches) setOpen(false);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', syncMode);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(syncMode);
  }
  syncMode();
}

function screenPair(fullSrc) {
  if (!fullSrc) return { full: '', src1080: '', srcset: '' };
  const full = fullSrc;
  const src1080 = full.replace(/\.webp$/i, '-1080.webp');
  return {
    full,
    src1080,
    srcset: src1080 + ' 1080w, ' + full + ' 2160w',
  };
}

function setupProductTour() {
  const root = document.querySelector('[data-product-tour]');
  if (!root) return;

  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[data-tab-panel]')];
  if (!tabs.length || !panels.length) return;

  const scroller = root.querySelector('[data-tablist-scroller]');
  const wrap = root.querySelector('[data-tablist-wrap]');
  const prevBtn = wrap ? wrap.querySelector('.tab-scroll-prev') : null;
  const nextBtn = wrap ? wrap.querySelector('.tab-scroll-next') : null;
  const hint = wrap ? wrap.querySelector('[data-tab-hint]') : null;

  const syncTabScroll = () => {
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const overflow = max > 4;
    const atStart = scroller.scrollLeft <= 4;
    const atEnd = scroller.scrollLeft >= max - 4;
    scroller.classList.toggle('is-at-start', atStart || !overflow);
    scroller.classList.toggle('is-at-end', atEnd || !overflow);
    if (prevBtn) prevBtn.hidden = !overflow || atStart;
    if (nextBtn) nextBtn.hidden = !overflow || atEnd;
    if (hint) {
      const touch =
        window.matchMedia('(hover: none), (pointer: coarse)').matches ||
        window.matchMedia('(max-width: 767px)').matches;
      hint.hidden = !(overflow && touch);
    }
  };

  const selectTab = (tab, { focus = false } = {}) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      const on = p.id === tab.getAttribute('aria-controls');
      if (on) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
    if (typeof tab.scrollIntoView === 'function') {
      tab.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    }
    syncTabScroll();
    if (focus) tab.focus();
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab, { focus: true }));
    tab.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(tab);
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      selectTab(tabs[next], { focus: true });
    });
  });

  if (scroller) {
    scroller.addEventListener('scroll', syncTabScroll, { passive: true });
    window.addEventListener('resize', syncTabScroll);
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        scroller.scrollBy({ left: -Math.max(160, scroller.clientWidth * 0.6), behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        scroller.scrollBy({ left: Math.max(160, scroller.clientWidth * 0.6), behavior: 'smooth' });
      });
    }
    syncTabScroll();
  }

  const sizes = '(min-width: 960px) min(58vw, 720px), 92vw';

  // Secondary screen switchers
  root.querySelectorAll('[data-screen-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('[data-tab-panel]');
      if (!panel) return;
      const img = panel.querySelector('.screen-img');
      const openBtn = panel.querySelector('[data-screen-open]');
      if (!img) return;
      const full = btn.getAttribute('data-src') || '';
      const alt = btn.getAttribute('data-alt') || '';
      const w = btn.getAttribute('data-w');
      const h = btn.getAttribute('data-h');
      const pair = screenPair(full);
      img.src = pair.src1080 || full;
      if (pair.srcset) {
        img.setAttribute('srcset', pair.srcset);
        img.setAttribute('sizes', sizes);
      }
      img.alt = alt;
      img.setAttribute('data-full-src', pair.full || full);
      img.setAttribute('data-full-alt', alt);
      if (w) img.width = Number(w);
      if (h) img.height = Number(h);
      if (openBtn) {
        const name = (btn.textContent || 'screen').replace(/\s+/g, ' ').trim();
        openBtn.setAttribute('aria-label', 'Enlarge ' + name + ' screen');
      }
      panel.querySelectorAll('[data-screen-switch]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  // Lightbox dialog (always 2160 full asset)
  const dialog = document.getElementById('screen-dialog');
  const dialogImg = document.getElementById('screen-dialog-img');
  if (dialog && dialogImg && typeof dialog.showModal === 'function') {
    let lastFocus = null;
    root.querySelectorAll('[data-screen-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const img = btn.querySelector('.screen-img') || root.querySelector('.screen-img');
        const src = (img && (img.getAttribute('data-full-src') || img.getAttribute('src'))) || '';
        const alt = (img && (img.getAttribute('data-full-alt') || img.getAttribute('alt'))) || '';
        if (!src) return;
        lastFocus = btn;
        dialogImg.src = src;
        dialogImg.alt = alt;
        dialog.showModal();
        const closeBtn = dialog.querySelector('.screen-dialog-close');
        if (closeBtn) closeBtn.focus();
      });
    });
    dialog.addEventListener('close', () => {
      dialogImg.src = 'assets/thread-mark.svg';
      dialogImg.alt = '';
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
      lastFocus = null;
    });
  }
}

function init() {
  document.documentElement.classList.add('js-ready');
  setupFilm();
  setupThread();
  setupMobileNav();
  setupProductTour();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
