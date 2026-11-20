import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'tests', 'shots');
fs.mkdirSync(shots, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

// Build banned client strings from fragments so this source stays clean (threat-row H1).
const BANNED = [['UK', 'AEA'].join(''), ['LIB', 'RTI'].join(''), ['T081', 'MN26'].join('')];

const NODE_LABELS = ['Hazard', 'Cause', 'Consequence', 'Control', 'Evidence', 'Residual risk'];

// Status/maturity/timeline claim phrases (AC18). "Coming next" only allowed as AI section label.
const MATURITY_PHRASES = [
  'beta',
  'coming q',
  'roadmap 20',
  'ga in',
  'certified',
  'mature',
  'production-ready',
];

const H1_EXACT = 'Every hazard. Every control. Every piece of evidence. One golden thread.';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

function underRoot(file) {
  const rel = path.relative(root, file);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function serve(opts = {}) {
  const denyFilm = !!opts.denyFilm;
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath;
      try {
        urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      } catch {
        res.writeHead(400);
        res.end('bad request');
        return;
      }
      let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
      if (denyFilm && (rel === 'film/out' || rel.startsWith('film/out/'))) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const file = path.resolve(root, rel);
      if (!underRoot(file)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}`, originHost: `127.0.0.1:${port}` });
    });
  });
}

function makeReporter() {
  const passed = new Set();
  const failedIds = new Set();
  const failures = []; // { ids: string[], msg: string }

  function pass(...ids) {
    for (const id of ids) {
      if (failedIds.has(id) || passed.has(id)) continue;
      passed.add(id);
      console.log(`PASS ${id}`);
    }
  }

  function fail(ids, msg) {
    const list = Array.isArray(ids) ? ids : [ids];
    failures.push({ ids: list, msg });
    for (const id of list) {
      failedIds.add(id);
      passed.delete(id);
      console.error(`FAIL ${id}: ${msg}`);
    }
  }

  function finish() {
    if (failures.length) {
      console.error('\nFailed checks:');
      for (const f of failures) {
        console.error(`  ${f.ids.join(', ')} — ${f.msg}`);
      }
      process.exit(1);
    }
    console.log(`\nok — ${passed.size} ids passed`);
  }

  return { pass, fail, finish, passed, failures };
}

async function collectSameOrigin(page, originHost) {
  const third = [];
  page.on('request', (req) => {
    let u;
    try {
      u = new URL(req.url());
    } catch {
      return;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.host !== originHost) third.push(req.url());
  });
  return third;
}

async function runPageChecks(page, base, originHost, vp, r, opts = {}) {
  const { pass, fail } = r;
  const third = await collectSameOrigin(page, originHost);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(base + '/', { waitUntil: 'networkidle' });

  // ac01 viewport / overflow (threat-row layout; D2/D7/D13/T6)
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  if (overflowX) {
    fail(
      ['ac01_viewport', 'ac01_viewport_d2', 'ac01_viewport_d7', 'ac01_viewport_d13', 'ac01_viewport_t6'],
      `${vp.name} horizontal overflow`
    );
  } else if (vp.name === 'desktop') {
    // Log once after both viewports would be better; log per-run is fine if we gate on last
    pass('ac01_viewport', 'ac01_viewport_d2', 'ac01_viewport_d7', 'ac01_viewport_d13', 'ac01_viewport_t6');
  }

  // ac02 console (threat-row H3)
  if (errors.length) {
    fail('ac02_console', `${vp.name} pageerror: ${errors.join('; ')}`);
  } else if (vp.name === 'desktop') {
    pass('ac02_console');
  }

  // ac10 third-party (threat-row H2 / D6)
  // External <a href> navigation is allowed; no external resource may be requested.
  if (third.length) {
    fail(
      ['ac10_third_party', 'ac10_third_party_d6'],
      `third-party requests: ${third.slice(0, 5).join(', ')}${third.length > 5 ? '…' : ''}`
    );
  } else if (vp.name === 'desktop') {
    pass('ac10_third_party', 'ac10_third_party_d6');
    pass('ac10_no_external_resource');
  }

  // Structure checks once (desktop pass is enough; still run on both so mobile can catch overflow)
  if (opts.structure) {
    const html = await page.content();
    const bodyText = await page.locator('body').innerText();
    const bodyLower = bodyText.toLowerCase();

    // ac03 ban (threat-row H1 / D3 / D16)
    const banHit = BANNED.find((b) => html.includes(b) || bodyText.includes(b));
    if (banHit) {
      fail(['ac03_ban', 'ac03_ban_d3', 'ac03_ban_d16'], `banned string present: ${banHit}`);
    } else {
      pass('ac03_ban', 'ac03_ban_d3', 'ac03_ban_d16');
    }

    // ac04 no contact (threat-row H5 / D1)
    const contactHeading = await page.locator('h1, h2, h3, h4, [role="heading"]').evaluateAll((els) =>
      els.some((el) => /^\s*contact\s*$/i.test(el.textContent || ''))
    );
    const contactLandmark = await page.locator('[aria-label="Contact"], [name="Contact"], #contact').count();
    const mailto = await page.locator('a[href^="mailto:"]').count();
    if (contactHeading || contactLandmark > 0 || mailto > 0) {
      fail(
        ['ac04_no_contact', 'ac04_no_contact_d1'],
        `contact surface present (heading=${contactHeading} landmark=${contactLandmark} mailto=${mailto})`
      );
    } else {
      pass('ac04_no_contact', 'ac04_no_contact_d1');
    }

    // ac05 illustrative (D11)
    const illus = await page.locator('text=Illustrative data').count();
    if (illus < 3) {
      fail(['ac05_illustrative', 'ac05_illustrative_d11'], `illustrative count ${illus}`);
    } else {
      pass('ac05_illustrative', 'ac05_illustrative_d11');
    }

    // ac08 lang
    const lang = await page.evaluate(() => document.documentElement.lang);
    if (!/^en(-GB)?$/i.test(lang)) {
      fail('ac08_lang', `lang ${lang}`);
    } else {
      pass('ac08_lang');
    }

    // ac09 skip
    const skip = page.locator('a.skip-link, a[href="#main"]').first();
    const skipHref = (await skip.count()) ? await skip.getAttribute('href') : null;
    const mainCount = await page.locator('#main').count();
    if (skipHref !== '#main' || mainCount !== 1) {
      fail('ac09_skip', `skip href=${skipHref} main=${mainCount}`);
    } else {
      // Activate skip path: focus skip and verify target exists
      await skip.focus();
      pass('ac09_skip');
    }

    // ac11 meta (D14)
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    const robots = ((await page.locator('meta[name="robots"]').getAttribute('content')) || '').toLowerCase();
    if (!desc || !desc.trim()) {
      fail(['ac11_meta', 'ac11_meta_d14'], 'missing meta description');
    } else if (/\bnoindex\b/.test(robots)) {
      fail(['ac11_meta', 'ac11_meta_d14'], `robots noindex: ${robots}`);
    } else {
      pass('ac11_meta', 'ac11_meta_d14');
    }

    // og:image must be absolute https pointing at on-disk assets/og.png (not a runtime request)
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    const ogOk =
      typeof ogImage === 'string' &&
      /^https:\/\/jgsystemsconsulting\.github\.io\/sentinel-log-site\/assets\/og\.png$/i.test(ogImage.trim()) &&
      fs.existsSync(path.join(root, 'assets', 'og.png'));
    if (!ogOk) {
      fail('ac11_og_image', `og:image not absolute https assets/og.png (got ${ogImage})`);
    } else {
      pass('ac11_og_image');
    }

    // Social meta completeness (A15)
    const ogW = await page.locator('meta[property="og:image:width"]').getAttribute('content');
    const ogH = await page.locator('meta[property="og:image:height"]').getAttribute('content');
    const ogAlt = await page.locator('meta[property="og:image:alt"]').getAttribute('content');
    const twImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    const twTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    const twDesc = await page.locator('meta[name="twitter:description"]').getAttribute('content');
    const twOk =
      ogW === '1200' &&
      ogH === '630' &&
      !!(ogAlt && ogAlt.trim()) &&
      typeof twImage === 'string' &&
      /^https:\/\/jgsystemsconsulting\.github\.io\/sentinel-log-site\/assets\/og\.png$/i.test(twImage.trim()) &&
      !!(twTitle && twTitle.trim()) &&
      !!(twDesc && twDesc.trim());
    if (!twOk) {
      fail(
        'ac11_og_image_dims',
        `social meta incomplete w=${ogW} h=${ogH} alt=${ogAlt} twImage=${twImage} twTitle=${!!twTitle} twDesc=${!!twDesc}`
      );
    } else {
      pass('ac11_og_image_dims');
    }

    // Hero audience line (A02)
    const audience = page.locator('.hero-audience');
    const audienceText = (await audience.count()) ? (await audience.innerText()).toLowerCase() : '';
    if (
      (await audience.count()) !== 1 ||
      !/fusion/.test(audienceText) ||
      !/nuclear/.test(audienceText) ||
      !/defence/.test(audienceText)
    ) {
      fail('ac_hero_audience', `hero audience missing domain fit: ${audienceText}`);
    } else {
      pass('ac_hero_audience');
    }

    // Fix-wave: claim honesty + a11y + 404 + srcset
    const rawHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    if (/\bfull audit\b/i.test(rawHtml) || /\bfull audit\b/i.test(bodyText)) {
      fail('ac_no_full_audit', 'full audit still present');
    } else {
      pass('ac_no_full_audit');
    }
    if (/\bBuilt to\b/.test(rawHtml) || /\bBuilt to\b/.test(bodyText)) {
      fail('ac_no_built_to', 'Built to still present');
    } else {
      pass('ac_no_built_to');
    }
    const honesty = page.locator('.hero-honesty');
    const honestyText = (await honesty.count()) ? (await honesty.innerText()).trim() : '';
    if (
      (await honesty.count()) !== 1 ||
      !/Under active development/i.test(honestyText) ||
      !/illustrative data/i.test(honestyText)
    ) {
      fail('ac_hero_honesty', `hero honesty missing: ${honestyText}`);
    } else {
      pass('ac_hero_honesty');
    }
    const heroName = await page.locator('#hero').evaluate((el) => {
      const labelled = el.getAttribute('aria-labelledby');
      if (labelled) {
        const t = document.getElementById(labelled);
        return (t && t.textContent) || '';
      }
      return el.getAttribute('aria-label') || '';
    });
    const closingName = await page.locator('section.closing').evaluate((el) => {
      const labelled = el.getAttribute('aria-labelledby');
      if (labelled) {
        const t = document.getElementById(labelled);
        return (t && t.textContent) || '';
      }
      return el.getAttribute('aria-label') || '';
    });
    if (!heroName.trim() || !closingName.trim() || heroName.trim() === closingName.trim()) {
      fail('ac_section_names', `hero="${heroName}" closing="${closingName}"`);
    } else {
      pass('ac_section_names');
    }
    const notFound = path.join(root, '404.html');
    if (!fs.existsSync(notFound)) {
      fail('ac_404_exists', '404.html missing');
    } else {
      const nf = fs.readFileSync(notFound, 'utf8');
      if (!/href="\/sentinel-log-site\/"/.test(nf)) {
        fail('ac_404_home', '404.html missing home link /sentinel-log-site/');
      } else {
        pass('ac_404_exists');
        pass('ac_404_home');
      }
    }
    const srcsetCount = await page.locator('img.screen-img[srcset]').count();
    if (srcsetCount < 8) {
      fail('ac_screen_srcset', `screen-img srcset count ${srcsetCount}`);
    } else {
      pass('ac_screen_srcset');
    }
    const designedAsvs = /Designed to OWASP ASVS Level 2 and WCAG 2\.2 AA, verified on each release/.test(
      bodyText
    );
    const designedAir = /Designed for offline, air-gapped installation/.test(bodyText);
    const designedSbom = /Releases are designed to ship with a CycloneDX SBOM/.test(bodyText);
    if (!designedAsvs || !designedAir || !designedSbom) {
      fail(
        'ac_claim_tense',
        `asvs=${designedAsvs} air=${designedAir} sbom=${designedSbom}`
      );
    } else {
      pass('ac_claim_tense');
    }

    // Primary CTA hierarchy (A01): See the product is primary amber; Video secondary
    const primaryCta = page.locator('.hero-cta .btn-primary');
    const secondaryCta = page.locator('.hero-cta .btn-secondary');
    const primaryLabel = ((await primaryCta.count()) ? await primaryCta.first().innerText() : '').trim();
    const secondaryLabel = ((await secondaryCta.count()) ? await secondaryCta.first().innerText() : '').trim();
    if (primaryLabel !== 'See the product' || secondaryLabel !== 'Video') {
      fail(
        'ac_cta_hierarchy',
        `CTA hierarchy primary="${primaryLabel}" secondary="${secondaryLabel}"`
      );
    } else {
      pass('ac_cta_hierarchy');
    }

    // Closing band CTAs (A13)
    const closingPrimary = page.locator('.closing-cta .btn-primary');
    const closingSecondary = page.locator('.closing-cta .btn-secondary');
    const cPrimary = ((await closingPrimary.count()) ? await closingPrimary.first().innerText() : '').trim();
    const cSecondary = ((await closingSecondary.count()) ? await closingSecondary.first().innerText() : '').trim();
    if (cPrimary !== 'See the product' || cSecondary !== 'Video') {
      fail('ac_closing_cta', `closing CTAs primary="${cPrimary}" secondary="${cSecondary}"`);
    } else {
      pass('ac_closing_cta');
    }

    // Mobile nav toggle contract (A06) — markup present; behaviour checked on mobile viewport pass
    const navToggle = page.locator('#nav-toggle');
    const navControls = (await navToggle.count()) ? await navToggle.getAttribute('aria-controls') : null;
    const navExpanded = (await navToggle.count()) ? await navToggle.getAttribute('aria-expanded') : null;
    if ((await navToggle.count()) !== 1 || navControls !== 'primary-nav' || navExpanded === null) {
      fail(
        'ac_mobile_nav_markup',
        `nav toggle markup controls=${navControls} expanded=${navExpanded}`
      );
    } else {
      pass('ac_mobile_nav_markup');
    }

    // Video preload none (A12)
    const preload = await page.locator('#hero-video').getAttribute('preload');
    if (preload !== 'none') {
      fail('ac_video_preload', `preload=${preload}`);
    } else {
      pass('ac_video_preload');
    }

    // ac12 footer (threat-row H4 / D15)
    const footer = page.locator('footer.site-footer, footer');
    const footerText = await footer.innerText();
    const hasDisclaimer =
      /decision-support/i.test(footerText) ||
      (/not a qualified safety-critical/i.test(footerText) && /decision-support|record-keeping/i.test(footerText));
    const hasCredit = /JG Systems Consulting/i.test(footerText);
    const footerCols = await footer.locator('.footer-grid > .footer-col').count();
    if (!hasDisclaimer || !hasCredit) {
      fail(
        ['ac12_footer', 'ac12_footer_d15'],
        `footer missing pieces (disclaimer=${hasDisclaimer} credit=${hasCredit})`
      );
    } else if (footerCols !== 3) {
      fail(['ac12_footer', 'ac12_footer_d15'], `footer columns expected 3, got ${footerCols}`);
    } else {
      pass('ac12_footer', 'ac12_footer_d15');
    }

    // ac_about_jg (D20) + company facts
    const about = page.locator('#about');
    if ((await about.count()) !== 1) {
      fail(['ac_about_jg', 'ac_about_jg_d20'], 'missing #about');
    } else {
      const aboutText = await about.innerText();
      const pageText = await page.locator('body').innerText();
      if (!/JG Systems Consulting Ltd/.test(aboutText)) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'About missing JG Systems Consulting Ltd');
      } else if (!/11910666/.test(pageText)) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'company number 11910666 missing');
      } else {
        // Personal-name pattern: First Last, excluding known company tokens
        const names = aboutText.match(/\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/g) || [];
        const personal = names.filter(
          (n) => !/^(Systems Consulting|Consulting Ltd|Sentinel Log|JG Systems)$/.test(n)
        );
        // "JG Systems" won't match two-capital words of that form well; also strip company phrase
        const cleaned = personal.filter((n) => !/Systems|Consulting|Sentinel|Hazard|Log|Model-Based/.test(n));
        // Drop multi-word standard/sector labels that look like names
        const stillPersonal = cleaned.filter(
          (n) => !/^(England|Wales|United|Kingdom|Model|Based|Engineering)$/.test(n.split(' ')[0]) &&
            !/England|Wales|United Kingdom|Model-Based/.test(n)
        );
        if (stillPersonal.length) {
          fail(['ac_about_jg', 'ac_about_jg_d20'], `personal-name pattern: ${stillPersonal.join(', ')}`);
        } else {
          const logo = about.locator('img[src]');
          const srcs = await logo.evaluateAll((els) => els.map((e) => e.getAttribute('src') || ''));
          if (!srcs.length || srcs.some((s) => !s.startsWith('assets/'))) {
            fail(['ac_about_jg', 'ac_about_jg_d20'], `logo path not under assets/: ${srcs.join(', ')}`);
          } else {
            pass('ac_about_jg', 'ac_about_jg_d20');
          }
        }
      }

      // Company website + LinkedIn (plain navigation anchors; rel=noopener; no mailto)
      const companyLinks = await page.locator('a[href]').evaluateAll((els) =>
        els.map((a) => ({
          href: a.getAttribute('href') || '',
          rel: a.getAttribute('rel') || '',
          target: a.getAttribute('target') || '',
        }))
      );
      const siteLink = companyLinks.find((a) =>
        /^https:\/\/(www\.)?jgsystemsconsulting\.com\/?$/i.test(a.href)
      );
      const liLink = companyLinks.find((a) =>
        /^https:\/\/(www\.)?linkedin\.com\/company\/jg-systems-consulting-ltd\/?$/i.test(a.href)
      );
      const mailtoLeft = companyLinks.some((a) => a.href.toLowerCase().startsWith('mailto:'));
      if (!siteLink) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'company website link missing');
      } else if (!/\bnoopener\b/i.test(siteLink.rel)) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'website link missing rel=noopener');
      } else if (!liLink) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'LinkedIn link missing');
      } else if (!/\bnoopener\b/i.test(liLink.rel)) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'LinkedIn link missing rel=noopener');
      } else if (mailtoLeft) {
        fail(['ac_about_jg', 'ac_about_jg_d20'], 'mailto link present');
      } else {
        pass('ac_company_links');
      }
    }

    // ac13 nodes (D12 / D17) — golden thread lives in How it works
    const howText = await page.locator('#how-it-works').innerText();
    const missingHow = NODE_LABELS.filter((w) => !howText.includes(w));
    const howCount = await page.locator('#how-it-works .gt-label').count();
    if (missingHow.length || howCount !== 6) {
      fail(
        ['ac13_nodes', 'ac13_nodes_d12', 'ac13_nodes_d17'],
        `nodes howMissing=${missingHow} howCount=${howCount}`
      );
    } else {
      pass('ac13_nodes', 'ac13_nodes_d12', 'ac13_nodes_d17');
    }

    // Product screens tour (Inside Sentinel Log)
    await checkProductTour(page, r);

    // ac14 faq details (D22)
    const detailsFaq = await page.locator('#faq details').count();
    if (detailsFaq < 1) {
      fail(['ac14_faq_details', 'ac14_faq_details_d22'], `faq details ${detailsFaq}`);
    } else {
      pass('ac14_faq_details', 'ac14_faq_details_d22');
    }

    // ac15 coming next
    const coming = page.locator('#coming-next');
    const comingText = (await coming.count()) ? await coming.innerText() : '';
    if (!/Coming next/i.test(comingText)) {
      fail('ac15_coming_next', 'missing Coming next label on AI section');
    } else {
      pass('ac15_coming_next');
    }

    // ac16 h1
    const h1 = (await page.locator('h1').first().textContent()).replace(/\s+/g, ' ').trim();
    if (h1 !== H1_EXACT) {
      fail('ac16_h1', `h1 mismatch: ${h1}`);
    } else {
      pass('ac16_h1');
    }

    // ac17 one player (threat-row H5)
    const videoCount = await page.locator('video').count();
    const filmSection = await page.locator('section#film, section[aria-label="Film"], h2:text-is("Film")').count();
    if (videoCount > 1 || filmSection > 0) {
      fail('ac17_one_player', `videos=${videoCount} filmSections=${filmSection}`);
    } else {
      pass('ac17_one_player');
    }

    // ac18 no maturity (threat-row H5 / D4 / D5 / D21)
    // Strip the allowed "Coming next" label from the AI section before scanning.
    const scanText = bodyLower.replace(/coming next/gi, '');
    const hit = MATURITY_PHRASES.find((p) => scanText.includes(p));
    if (hit) {
      fail(
        ['ac18_no_maturity', 'ac18_no_maturity_d4', 'ac18_no_maturity_d5', 'ac18_no_maturity_d21'],
        `maturity phrase: ${hit}`
      );
    } else {
      pass('ac18_no_maturity', 'ac18_no_maturity_d4', 'ac18_no_maturity_d5', 'ac18_no_maturity_d21');
    }

    // ac19 why nav (D18 / D19)
    const whyHref = await page.locator('nav a[href="#why-sentinel"]').count();
    const why = page.locator('#why-sentinel');
    const whyText = (await why.count()) ? await why.innerText() : '';
    const hasHigh = /high-hazard/i.test(whyText);
    const hasOpen = /open by design/i.test(whyText);
    if (whyHref < 1 || (await why.count()) !== 1 || !hasHigh || !hasOpen) {
      fail(
        ['ac19_why_nav', 'ac19_why_nav_d18', 'ac19_why_nav_d19'],
        `why nav/landmark (href=${whyHref} high=${hasHigh} open=${hasOpen})`
      );
    } else {
      pass('ac19_why_nav', 'ac19_why_nav_d18', 'ac19_why_nav_d19');
    }

    // ac20 transcript
    const heroDetails = page.locator('#hero details.transcript, .hero details.transcript, .hero-media details');
    const transcriptCount = await page.locator('details').evaluateAll((els) =>
      els.filter((el) => {
        const sum = el.querySelector('summary');
        return sum && /^\s*Transcript\s*$/i.test(sum.textContent || '');
      }).length
    );
    const afterFaq = await page.locator('#faq ~ * details summary').evaluateAll((els) =>
      els.some((el) => /^\s*Transcript\s*$/i.test(el.textContent || ''))
    );
    if (transcriptCount > 1 || afterFaq) {
      fail('ac20_transcript', `transcript count=${transcriptCount} afterFaq=${afterFaq}`);
    } else if (transcriptCount === 1) {
      const inHero = await heroDetails.count();
      if (inHero < 1) {
        fail('ac20_transcript', 'Transcript details not in hero');
      } else {
        pass('ac20_transcript');
      }
    } else {
      // Transcript optional; absence is ok
      pass('ac20_transcript');
    }

    // ac07 video if present (threat-row H4 / D9)
    if (videoCount >= 1) {
      const v = page.locator('video').first();
      const auto = await v.getAttribute('autoplay');
      const controls = await v.getAttribute('controls');
      const state = await v.evaluate((el) => ({
        paused: el.paused,
        muted: el.muted,
        volume: el.volume,
      }));
      const playingWithSound = !state.paused && !state.muted && state.volume > 0;
      if (auto !== null) {
        fail(['ac07_video', 'ac07_video_d9'], 'video autoplay attribute present');
      } else if (controls === null) {
        fail(['ac07_video', 'ac07_video_d9'], 'video missing controls');
      } else if (playingWithSound) {
        fail(['ac07_video', 'ac07_video_d9'], 'video playing with sound on load');
      } else {
        // Track src resolves 200 when film present
        const trackSrc = (await page.locator('video track').count())
          ? await page.locator('video track').first().getAttribute('src')
          : null;
        if (trackSrc) {
          const abs = trackSrc.startsWith('http') ? trackSrc : `${base}/${trackSrc.replace(/^\//, '')}`;
          const resp = await page.request.get(abs);
          if (resp.status() !== 200) {
            fail(['ac07_video', 'ac07_video_d9'], `track src ${trackSrc} status ${resp.status()}`);
          } else {
            pass('ac07_video', 'ac07_video_d9');
          }
        } else {
          // controls + no autoplay + not playing with sound is enough if no track
          pass('ac07_video', 'ac07_video_d9');
        }
      }
    } else {
      // Film absent on this pass — ac07 N/A but still log as pass when no video is acceptable
      // Spec: "if video present". Without video, criterion holds vacuously.
      pass('ac07_video', 'ac07_video_d9');
    }

    // harness stub load + d10 fonts/assets
    const fontOk = fs.existsSync(path.join(root, 'fonts', 'Inter.woff2'));
    const assetOk = fs.existsSync(path.join(root, 'assets', 'thread-mark.svg'));
    if (!fontOk || !assetOk) {
      fail(['harness_stub_load', 'harness_stub_load_d10'], `fonts=${fontOk} assets=${assetOk}`);
    } else {
      pass('harness_stub_load', 'harness_stub_load_d10');
    }
  }
}

async function runDenyFilm(browser, r) {
  const { pass, fail } = r;
  const denied = await serve({ denyFilm: true });
  try {
    const page = await browser.newPage({ viewport: VIEWPORTS[0] });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(denied.base + '/', { waitUntil: 'domcontentloaded' });

    // preload=none defers media; Video CTA plays and sources 404 under denyFilm (H3 / D8)
    const watch = page.locator('#watch-film');
    if (await watch.count()) {
      await watch.click({ force: true }).catch(() => {});
    } else {
      await page.evaluate(() => {
        const v = document.querySelector('#hero-video, video');
        if (!v) return;
        try {
          v.muted = false;
          const p = v.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch {
          /* ignore */
        }
      });
    }

    try {
      await page.locator('.film-fallback').waitFor({ state: 'attached', timeout: 10000 });
    } catch {
      /* checked below */
    }

    const fallback = await page.locator('.film-fallback').count();
    const hero = await page.locator('#hero, .hero').count();
    const product = await page.locator('#product').count();
    const footer = await page.locator('footer').count();

    if (errors.length) {
      fail(['ac06_no_film', 'ac06_no_film_d8'], `denyFilm pageerror: ${errors.join('; ')}`);
    } else if (fallback < 1) {
      fail(['ac06_no_film', 'ac06_no_film_d8'], 'denyFilm .film-fallback count is 0');
    } else if (hero < 1 || product < 1 || footer < 1) {
      fail(
        ['ac06_no_film', 'ac06_no_film_d8'],
        `denyFilm missing shell hero=${hero} product=${product} footer=${footer}`
      );
    } else {
      pass('ac06_no_film', 'ac06_no_film_d8');
    }

    await page.screenshot({ path: path.join(shots, 'mobile-no-film.png'), fullPage: false });
    await page.close();
  } finally {
    denied.server.close();
  }
}

async function checkProductTour(page, r) {
  const { pass, fail } = r;

  const tabs = page.locator('#product [role="tab"]');
  const tabCount = await tabs.count();
  if (tabCount !== 8) {
    fail('ac_product_tabs', `expected 8 tabs, got ${tabCount}`);
    return;
  }

  const tabMeta = await tabs.evaluateAll((els) =>
    els.map((el) => ({
      selected: el.getAttribute('aria-selected'),
      controls: el.getAttribute('aria-controls') || '',
      role: el.getAttribute('role'),
    }))
  );
  const badMeta = tabMeta.filter((t) => t.role !== 'tab' || !t.controls || !t.selected);
  const selectedCount = tabMeta.filter((t) => t.selected === 'true').length;
  if (badMeta.length || selectedCount !== 1) {
    fail('ac_product_tabs', `aria incomplete bad=${badMeta.length} selected=${selectedCount}`);
    return;
  }
  // Each aria-controls target exists as tabpanel
  for (const t of tabMeta) {
    const panel = page.locator(`#${t.controls}`);
    if ((await panel.count()) !== 1) {
      fail('ac_product_tabs', `missing panel for ${t.controls}`);
      return;
    }
    const role = await panel.getAttribute('role');
    if (role !== 'tabpanel') {
      fail('ac_product_tabs', `panel ${t.controls} role=${role}`);
      return;
    }
  }
  pass('ac_product_tabs');

  // Arrow-key switching
  const first = tabs.first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  const afterRight = await tabs.evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-selected') === 'true')
  );
  if (!afterRight[1]) {
    fail('ac_product_tabs_keys', `ArrowRight selected index=${afterRight.indexOf(true)}`);
    return;
  }
  await page.keyboard.press('Home');
  const afterHome = await tabs.evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-selected') === 'true')
  );
  if (!afterHome[0]) {
    fail('ac_product_tabs_keys', `Home selected index=${afterHome.indexOf(true)}`);
    return;
  }
  pass('ac_product_tabs_keys');

  // Each panel: primary img with non-empty alt + Illustrative data caption
  const panels = page.locator('#product [role="tabpanel"]');
  const panelCount = await panels.count();
  if (panelCount !== 8) {
    fail('ac_product_panel_img', `panel count ${panelCount}`);
    return;
  }
  for (let i = 0; i < panelCount; i += 1) {
    const panel = panels.nth(i);
    // Temporarily reveal for query (hidden panels still in DOM)
    const img = panel.locator('img.screen-img').first();
    if ((await img.count()) !== 1) {
      fail('ac_product_panel_img', `panel ${i} missing screen-img`);
      return;
    }
    const alt = ((await img.getAttribute('alt')) || '').trim();
    if (!alt) {
      fail('ac_product_panel_img', `panel ${i} empty alt`);
      return;
    }
    const capText = ((await panel.locator('.illus-caption').first().innerText()) || '').trim();
    if (capText !== 'Illustrative data') {
      fail('ac_product_panel_img', `panel ${i} caption=${capText}`);
      return;
    }
  }
  pass('ac_product_panel_img');

  // Lazy except first tab primary image
  const lazyInfo = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('#product [role="tabpanel"]')];
    return panels.map((p, i) => {
      const img = p.querySelector('img.screen-img');
      return {
        i,
        loading: img ? img.getAttribute('loading') : null,
        src: img ? img.getAttribute('src') || '' : '',
      };
    });
  });
  if (!lazyInfo.length || lazyInfo[0].loading === 'lazy') {
    fail('ac_product_img_lazy', `first loading=${lazyInfo[0] && lazyInfo[0].loading}`);
    return;
  }
  const nonFirst = lazyInfo.slice(1);
  if (nonFirst.some((x) => x.loading !== 'lazy')) {
    fail(
      'ac_product_img_lazy',
      `non-first not lazy: ${nonFirst.filter((x) => x.loading !== 'lazy').map((x) => x.i).join(',')}`
    );
    return;
  }
  pass('ac_product_img_lazy');

  // No image from outside the site (skip empty src on closed dialog placeholder)
  const external = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('#product img, #screen-dialog img')];
    return imgs
      .map((img) => img.getAttribute('src') || '')
      .filter((src) => {
        if (!src) return false;
        if (src.startsWith('assets/')) return false;
        if (src.startsWith('./assets/')) return false;
        if (src.startsWith('/assets/')) return false;
        return true;
      });
  });
  if (external.length) {
    fail('ac_product_img_local', `external/bad src: ${external.join(' | ')}`);
    return;
  }
  pass('ac_product_img_local');

  // Dialog open + Escape close + focus return
  const openBtn = page.locator('#product [data-screen-open]').first();
  await openBtn.focus();
  await openBtn.click();
  const dialog = page.locator('#screen-dialog');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    fail('ac_product_dialog', 'dialog not visible after click');
    return;
  }
  const dlgImg = page.locator('#screen-dialog-img');
  const dlgSrc = (await dlgImg.getAttribute('src')) || '';
  if (!dlgSrc || !dlgSrc.includes('assets/screens/')) {
    fail('ac_product_dialog', `dialog img src=${dlgSrc}`);
    return;
  }
  await page.keyboard.press('Escape');
  try {
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // closed attribute
  }
  const openAttr = await dialog.evaluate((el) => el.open);
  if (openAttr) {
    fail('ac_product_dialog', 'dialog still open after Escape');
    return;
  }
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? el.getAttribute('data-screen-open') !== null || el.classList.contains('screen-open') : false;
  });
  if (!focused) {
    const id = await page.evaluate(() =>
      document.activeElement ? document.activeElement.tagName + '.' + document.activeElement.className : 'none'
    );
    fail('ac_product_dialog', `focus not returned to opener (${id})`);
    return;
  }
  pass('ac_product_dialog');
}

async function runMobileNav(browser, base, r) {
  const { pass, fail } = r;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    const toggle = page.locator('#nav-toggle');
    await toggle.waitFor({ state: 'visible', timeout: 5000 });
    const before = await toggle.getAttribute('aria-expanded');
    if (before !== 'false') {
      fail('ac_mobile_nav_toggle', `initial aria-expanded=${before}`);
      return;
    }
    await toggle.click();
    const open = await toggle.getAttribute('aria-expanded');
    const navOpen = await page.locator('#primary-nav.is-open').count();
    if (open !== 'true' || navOpen < 1) {
      fail('ac_mobile_nav_toggle', `after open expanded=${open} navOpen=${navOpen}`);
      return;
    }
    await page.keyboard.press('Escape');
    const afterEsc = await toggle.getAttribute('aria-expanded');
    if (afterEsc !== 'false') {
      fail('ac_mobile_nav_toggle', `after Escape expanded=${afterEsc}`);
      return;
    }
    // Focus should return to toggle
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (focused !== 'nav-toggle') {
      fail('ac_mobile_nav_toggle', `focus after Escape id=${focused}`);
      return;
    }
    pass('ac_mobile_nav_toggle');
  } finally {
    await page.close();
  }
}

async function runGuideIndex(browser, base, originHost, r) {
  const { pass, fail } = r;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const third = await collectSameOrigin(page, originHost);
  try {
    const resp = await page.goto(base + '/guide/index.html', { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    if (status !== 200) {
      fail('ac_guide_index', `guide index status=${status}`);
      return;
    }
    const h1Count = await page.locator('h1').count();
    if (h1Count < 1) {
      fail('ac_guide_index', 'guide index missing h1');
      return;
    }
    if (third.length) {
      fail(
        'ac_guide_index',
        `third-party requests on guide index: ${third.slice(0, 5).join(', ')}${third.length > 5 ? '…' : ''}`
      );
      return;
    }
    pass('ac_guide_index');
  } finally {
    await page.close();
  }
}

async function main() {
  const r = makeReporter();
  const { server, base, originHost } = await serve();
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: vp });
      await runPageChecks(page, base, originHost, vp, r, { structure: vp.name === 'desktop' });
      await page.screenshot({
        path: path.join(shots, vp.name === 'mobile' ? 'mobile.png' : 'desktop.png'),
        fullPage: true,
      });
      // Keep legacy names too
      await page.screenshot({
        path: path.join(shots, `page-${vp.name}.png`),
        fullPage: true,
      });
      await page.close();
    }

    // If desktop structure didn't run somehow, ensure we still have structure
    // (already gated on desktop above)

    // Mobile overflow already checked; if mobile failed overflow, ac01 already failed.
    // If only mobile ran overflow and desktop passed, ac01 already passed on desktop.
    // Re-check: if mobile overflow failed we already failed; if desktop didn't overflow we passed.
    // Edge: mobile overflow, desktop ok → fail already recorded; pass() won't clear fail list.
    // But pass() on desktop still logs PASS after FAIL — reporter should not pass if already failed.
    // Fix: make pass() skip ids that are already in failures.

    await runDenyFilm(browser, r);
    await runMobileNav(browser, base, r);
    await runGuideIndex(browser, base, originHost, r);
  } finally {
    await browser.close();
    server.close();
  }
  r.finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
