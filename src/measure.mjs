// Live measurement. Nothing in an audit may exist without passing through here.
//
// Produces a raw evidence file (data/raw/<domain>/<timestamp>.json) containing:
//   - the HTTP response for every URL touched
//   - the full request list with sizes, types and third-party origins
//   - DOM facts counted in a real browser at 390px and 1440px
//   - console errors
//   - Lighthouse JSON (mobile + desktop) and every metric the report quotes
//   - screenshots on disk, plus their pixel statistics
//
// The renderer and the third-eye verifier both refuse to run without this file.
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { ROOT, ensureDir, isoDate, writeJSON, readJSON, round, log, isOwnStorageHost } from "./util.mjs";
import { resolveBrowser, launchOptions, describeBrowser, systemBrowsers } from "./browser.mjs";

const UA_MOBILE =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SHORTCODE_RE = /\[(contact-form-7|contact-form|gravityform|wpforms|ninja_form|formidable|caldera_form|et_pb_contact_form)[^\]]{0,160}\]/i;
const SOCIAL_HOSTS = ["facebook.com", "fb.com", "fb.me", "instagram.com", "twitter.com", "x.com", "linkedin.com", "wa.me", "wa.link", "t.me", "linktr.ee", "youtube.com", "youtu.be", "google.com", "google.co.in", "business.site", "wixsite.com", "wordpress.com", "blogspot.com"];

/** Pixel statistics: catches blank, white or placeholder screenshots. */
async function imageStats(browser, file) {
  const b64 = fs.readFileSync(file).toString("base64");
  const page = await browser.newPage();
  try {
    return await page.evaluate(async data => {
      const img = new Image();
      img.src = "data:image/png;base64," + data;
      await img.decode();
      const W = 320;
      const H = Math.max(1, Math.round(img.height * (W / img.width)));
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      let n = 0, white = 0, sum = 0, sum2 = 0, colourful = 0;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        sum += l;
        sum2 += l * l;
        n++;
        if (l > 245) white++;
        if (Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) > 18) colourful++;
      }
      const mean = sum / n;
      return {
        width: img.width,
        height: img.height,
        mean: Math.round(mean),
        sd: Math.round(Math.sqrt(sum2 / n - mean * mean)),
        whitePct: Math.round((white / n) * 100),
        colourfulPct: Math.round((colourful / n) * 100),
      };
    }, b64);
  } finally {
    await page.close();
  }
}

/** Injected before any script runs, so long tasks are counted from t=0. */
const INIT_SCRIPT = () => {
  window.__longTasks = [];
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__longTasks.push({ start: e.startTime, dur: e.duration });
    }).observe({ type: "longtask", buffered: true });
  } catch {}
  window.__ttiHint = null;
};

/** Everything we can learn from the DOM at one viewport. */
/**
 * Contact links inside embedded frames. A site builder's custom-HTML block is
 * drawn in an <iframe>: a visitor sees and taps its links, but the page's own
 * document does not contain them. Dr K Hemanth Kumar's homepage shows five
 * call links, four of them in such a block, and was measured at one
 * (26 Nov review). Counts frames whose <iframe> is shown, at least 120 x 40 px
 * and not fixed to the screen (chat widgets are, and stay closed).
 */
async function frameRoutes(page) {
  const out = { frames: 0, tel: 0, mail: 0, whatsapp: 0 };
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try {
      const el = await f.frameElement();
      const box = await el.boundingBox();
      const shown = await el.evaluate(e => {
        const s = getComputedStyle(e);
        if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
        // Chat and consent widgets sit in fixed containers and stay closed.
        for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return false;
        return true;
      });
      if (!box || box.width < 120 || box.height < 40 || !shown) continue;
      const count = hrefs => ({
        tel: hrefs.filter(h => h.startsWith("tel:")).length,
        mail: hrefs.filter(h => h.startsWith("mailto:")).length,
        whatsapp: hrefs.filter(h => /wa\.me|whatsapp/.test(h)).length,
      });
      let r = null;
      try {
        // A frame without scripts may never answer; give it 3 s.
        const hrefs = await Promise.race([
          f.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => (a.getAttribute("href") || "").trim().toLowerCase())),
          new Promise((_, rej) => setTimeout(() => rej(new Error("frame timeout")), 3000)),
        ]);
        r = count(hrefs);
      } catch {
        // Fallback: read the frame's inline document from its srcdoc attribute.
        const srcdoc = await el.evaluate(e => e.getAttribute("srcdoc") || "");
        r = count([...srcdoc.matchAll(/href\s*=\s*["']\s*([^"']+)/gi)].map(x => x[1].trim().toLowerCase()));
      }
      if (r.tel || r.mail || r.whatsapp) out.frames++;
      out.tel += r.tel; out.mail += r.mail; out.whatsapp += r.whatsapp;
    } catch {}
  }
  return out;
}

// Buttons that open a pop-up instead of a page: Elementor pop-ups, Bootstrap
// modals, Popup Maker and data-attribute triggers.
const POPUP_TRIGGER = [
  'a[href*="elementor-action"][href*="popup"]',
  '[data-toggle="modal"]', '[data-bs-toggle="modal"]',
  '[class*="popmake-"]', '[data-popup-open]', '[data-micromodal-trigger]',
].join(", ");
const BOOKING_LABEL = "book|appoint|enquir|inquir|consult|contact|call ?back|request|register|schedule";

/**
 * Clicks the page's booking pop-up button, if it has one, and counts the form
 * fields a visitor then sees. Only a button whose label is about booking or
 * contact is clicked; a click that leaves the page counts nothing. A form
 * already in the markup, hidden inside a pop-up container, is reported too.
 */
async function openPopupForm(page) {
  const found = await page.evaluate(([sel, label]) => {
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0; };
    const fieldsOf = f => [...f.querySelectorAll("input, select, textarea")].filter(i => !["hidden", "submit", "button", "reset", "image"].includes((i.type || "").toLowerCase())).length;
    const box = '[data-elementor-type="popup"], .elementor-location-popup, .elementor-popup-modal, .modal, [role="dialog"], .pum, .pum-overlay';
    const textOf = el => (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 60);
    const triggers = [...document.querySelectorAll(sel)].filter(vis);
    const booking = triggers.filter(el => new RegExp(label, "i").test(textOf(el)));
    if (booking[0]) booking[0].setAttribute("data-sp-popup-trigger", "1");
    const hidden = [...document.querySelectorAll("form")].filter(f => !vis(f) && f.closest(box)).map(fieldsOf).filter(n => n > 0);
    return { triggers: triggers.length, bookingTriggers: booking.length, label: booking[0] ? textOf(booking[0]) : null, hiddenFields: hidden.length ? Math.max(...hidden) : 0, url: location.href.split("#")[0] };
  }, [POPUP_TRIGGER, BOOKING_LABEL]);
  const out = { triggers: found.triggers, bookingTriggers: found.bookingTriggers, label: found.label, hiddenFields: found.bookingTriggers ? found.hiddenFields : 0, opened: false, fields: 0 };
  if (!found.bookingTriggers) return out;
  const sel = "[data-sp-popup-trigger]";
  await page.click(sel, { timeout: 5000 }).catch(() => page.evaluate(s => document.querySelector(s)?.click(), sel));
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0; };
    const fieldsOf = f => [...f.querySelectorAll("input, select, textarea")].filter(i => !["hidden", "submit", "button", "reset", "image"].includes((i.type || "").toLowerCase())).length;
    const forms = [...document.querySelectorAll("form")].filter(vis).map(fieldsOf).filter(n => n > 0);
    return { forms: forms.length, fields: forms.length ? Math.max(...forms) : 0, url: location.href.split("#")[0] };
  }).catch(() => null);
  // A click that loaded another page says nothing about this one.
  if (!after || after.url !== found.url) return { ...out, leftPage: true };
  return { ...out, opened: after.forms > 0, fields: after.fields };
}

function collectDom(screen) {
  const de = document.documentElement;
  // The page's layout width, read from media queries: unlike innerWidth and
  // innerHeight it does not change when the browser zooms the view.
  const layoutWidth = (() => {
    if (!matchMedia("(min-width: 1px)").matches) return de.clientWidth || window.innerWidth;
    let lo = 1, hi = 8192;
    if (matchMedia(`(min-width: ${hi}px)`).matches) return hi;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (matchMedia(`(min-width: ${mid}px)`).matches) lo = mid; else hi = mid;
    }
    return lo;
  })();
  // One screen = the device's screen at the page's own layout scale: a page laid
  // out wider than the phone (no viewport tag: 980 px) is shown shrunk to fit,
  // so each screen holds proportionally more of it. innerHeight is not used:
  // when an element is wider than the screen and the viewport tag sets no
  // initial-scale, the browser zooms the view out to fit it and innerHeight
  // grows with the zoom. AA Hospitals measured innerHeight of about 3,300 px at
  // load and printed "about 3 phone screens" for a 9,944 px page, 11.8 screens
  // of 844 px (27 Nov review).
  const vw = screen?.width ? layoutWidth : window.innerWidth;
  const vh = screen?.height ? Math.round((screen.height * layoutWidth) / screen.width) : window.innerHeight;
  const q = (sel, root = document) => [...root.querySelectorAll(sel)];
  const visible = el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0;
  };

  const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)).length : 0;

  // Top-level "sections" = blocks that create the page's vertical rhythm.
  const sectionEls = q("body section, body > div > section, main > section, body article, body > div > div");
  const bigSections = sectionEls.filter(el => el.getBoundingClientRect().height >= 160);

  const tapTargets = q("a, button, input[type=submit], select, [role=button]").filter(visible);
  const smallTargets = tapTargets.filter(el => {
    const r = el.getBoundingClientRect();
    return r.height < 40 || r.width < 24;
  });

  // Smallest font actually rendered on body text. Only an element that holds
  // text itself counts: a wrapper whose own font-size is 0 (a common
  // inline-block spacing trick) or differs from its children renders no text at
  // that size. Counting wrappers printed "Smallest body text: 0 px" (23 Nov review).
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
  const textEls = q("p, li, span, div, a").filter(el => visible(el) && (el.innerText || "").trim().length > 25 && ownText(el));
  let minFont = null;
  for (const el of textEls.slice(0, 800)) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(fs) || fs <= 0) continue;
    if (minFont === null || fs < minFont) minFont = fs;
  }

  const h1s = q("h1").filter(visible).map(h => (h.innerText || "").replace(/\s+/g, " ").trim()).filter(Boolean);
  // H1s that exist in the markup but are not visible at this viewport (a
  // desktop-only block, an inactive slide, or content not yet revealed at
  // load). Counting only visible ones printed "0 H1 headings detected on the
  // homepage" for a page whose markup has one (26 Nov review).
  const h1Hidden = q("h1").filter(h => !visible(h) && (h.textContent || "").trim()).length;
  const h2s = q("h2").filter(visible).map(h => (h.innerText || "").replace(/\s+/g, " ").trim()).filter(Boolean);

  // Where does the first real headline start?
  const headlineOffset = h1s.length ? Math.round(q("h1").filter(visible)[0].getBoundingClientRect().top + window.scrollY) : 0;
  // Where the first visible H1's text sits across the page: the text itself,
  // not its full-width block, so the report's laptop crop can be placed over
  // the headline (26 Nov review: the left strip of a centred GoDaddy layout was
  // only the hero's blurred background fill).
  let headlineText = null;
  if (h1s.length) {
    try {
      const range = document.createRange();
      range.selectNodeContents(q("h1").filter(visible)[0]);
      const b = range.getBoundingClientRect();
      if (b.width > 0) headlineText = { left: Math.round(b.left + window.scrollX), width: Math.round(b.width), top: Math.round(b.top + window.scrollY) };
    } catch {}
  }
  // Stricter than visible(), for what a visitor sees in the first screen: also
  // rejects an element inside a transparent ancestor (an inactive fade slide)
  // or outside the viewport's width (an inactive sliding slide). Hidden slide
  // titles had been quoted as "headline blocks seen in the first screen"
  // (26 Nov review).
  const seen = el => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.right <= 0 || r.left >= vw) return false;
    if (typeof el.checkVisibility === "function" &&
        !el.checkVisibility({ checkOpacity: true, opacityProperty: true, checkVisibilityCSS: true, visibilityProperty: true })) return false;
    return true;
  };
  // How many competing headline-sized blocks sit in the first screen?
  const firstScreenClaims = q("h1, h2, [class*=title], [class*=headline], [class*=hero]")
    .filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return false;
      if (!seen(el)) return false;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const t = (el.innerText || "").trim();
      return fs >= 24 && t.length > 8 && t.length < 160 && el.children.length < 4;
    })
    .map(el => (el.innerText || "").replace(/\s+/g, " ").trim());

  const imgs = q("img");
  const imgsNoAlt = imgs.filter(i => !i.getAttribute("alt") && visible(i));
  const brokenImgs = imgs.filter(i => i.complete && i.naturalWidth === 0);

  const anchors = q("a[href]");
  const hrefOf = a => (a.getAttribute("href") || "").trim().toLowerCase();
  const telLinks = anchors.filter(a => hrefOf(a).startsWith("tel:"));
  const mailLinks = anchors.filter(a => hrefOf(a).startsWith("mailto:"));
  const whatsapp = q("a[href*='wa.me'], a[href*='whatsapp'], [class*=whatsapp], iframe[src*='whatsapp']");
  // Call and WhatsApp links that stay on screen (inside a fixed or sticky
  // element: a floating button or bar). The no-form fix told a site that
  // already had a sticky call bar to add one (26 Nov review).
  const onScreen = el => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === "fixed" || p === "sticky") return true;
    }
    return false;
  };
  const stickyTel = telLinks.filter(a => visible(a) && onScreen(a)).length;
  const stickyWhatsapp = q("a[href*='wa.me'], a[href*='whatsapp']").filter(a => visible(a) && onScreen(a)).length;
  const readMore = anchors.filter(a => /^read\s*more$/i.test((a.innerText || "").trim()));
  const deadLinks = anchors.filter(a => {
    const h = (a.getAttribute("href") || "").trim();
    return h === "#" || h === "" || h === "javascript:void(0)" || h === "javascript:;";
  });
  const forms = q("form").map(f => ({
    id: f.id || null,
    action: f.getAttribute("action") || null,
    method: (f.getAttribute("method") || "get").toLowerCase(),
    fields: q("input, select, textarea", f).filter(i => !["hidden", "submit", "button"].includes((i.type || "").toLowerCase())).length,
    visible: visible(f),
  }));
  const visibleForms = forms.filter(f => f.visible && f.fields > 0);

  const bodyText = document.body?.innerText || "";
  const shortcode = bodyText.match(/\[(?:contact-form-7|contact-form|gravityform|wpforms|ninja_form|formidable|caldera_form)[^\]]{0,160}\]/i);

  const canonical = document.querySelector("link[rel=canonical]")?.href || null;
  const robotsMeta = document.querySelector("meta[name=robots]")?.content || null;
  const ldJson = q("script[type='application/ld+json']").map(s => s.textContent).filter(Boolean);
  let schemaTypes = [];
  let schemaHasPhone = false;
  let schemaHasAddress = false;
  for (const block of ldJson) {
    try {
      const parsed = JSON.parse(block);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const n of nodes) {
        if (n["@type"]) schemaTypes.push(Array.isArray(n["@type"]) ? n["@type"].join(",") : n["@type"]);
        if (n.telephone) schemaHasPhone = true;
        if (n.address) schemaHasAddress = true;
        if (Array.isArray(n["@graph"])) {
          for (const g of n["@graph"]) {
            if (g["@type"]) schemaTypes.push(Array.isArray(g["@type"]) ? g["@type"].join(",") : g["@type"]);
            if (g.telephone) schemaHasPhone = true;
            if (g.address) schemaHasAddress = true;
          }
        }
      }
    } catch {
      /* malformed JSON-LD is itself a finding, not a crash */
    }
  }

  const navSticky = q("header, nav, [class*=sticky], [class*=fixed]").some(el => {
    if (!visible(el)) return false;
    const p = getComputedStyle(el).position;
    const r = el.getBoundingClientRect();
    return (p === "fixed" || p === "sticky") && r.height < vh * 0.5;
  });

  // What the browser reported, for the verifier: a view zoomed away from the
  // page's own scale at load means a visitor's first view differs from the
  // screenshots. The element reaching furthest past the layout width is what
  // makes the browser zoom out.
  let widest = null;
  if (Math.max(window.innerWidth, de.scrollWidth) > layoutWidth + 1 && document.body) {
    // An element's own box, or its content when that spills out unclipped
    // (a line of text that does not wrap). Ties go to the deepest element,
    // which is the one causing the overflow rather than a wrapper around it.
    let best = null;
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      let right = r.right;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible") right = Math.max(right, r.left + el.scrollWidth);
      right += window.scrollX;
      if (right > layoutWidth + 1 && (!best || right >= best.right)) best = { right, el };
    }
    if (best) {
      const e = best.el;
      const cls = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
      widest = { right: Math.round(best.right), element: `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${cls ? `.${cls}` : ""}`.slice(0, 100) };
    }
  }
  const browserViewport = {
    layoutWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scale: window.visualViewport ? Math.round(window.visualViewport.scale * 1000) / 1000 : null,
    clientWidth: de.clientWidth,
    scrollWidth: de.scrollWidth,
    metaViewport: (document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "").slice(0, 160) || null,
    widest,
  };

  return {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    viewport: { width: vw, height: vh },
    browserViewport,
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    overflowX: Math.max(0, de.scrollWidth - de.clientWidth),
    pageHeightPx: de.scrollHeight,
    screens: Math.round((de.scrollHeight / vh) * 10) / 10,
    // Unrounded, for the whole number printed in the report: rounding the
    // 1-decimal value again printed "about 8 phone screens" for 6,311 px over
    // 844 px, 7.48 screens (7.48 -> 7.5 -> 8; 28 Nov review). The screen here
    // is not rounded to whole pixels either (692.5 px at a 320 px layout).
    screensExact: Math.round((de.scrollHeight / (screen?.height && screen?.width ? (screen.height * layoutWidth) / screen.width : vh)) * 1000) / 1000,
    domNodes: document.querySelectorAll("*").length,
    words,
    textChars: text.length,
    sections: bigSections.length,
    h1Count: h1s.length,
    h1Hidden,
    h1s: h1s.slice(0, 12),
    h2Count: h2s.length,
    h2s: h2s.slice(0, 12),
    headlineOffsetPx: headlineOffset,
    headlineTextBox: headlineText,
    firstScreenClaims: [...new Set(firstScreenClaims)].slice(0, 8),
    images: imgs.length,
    imagesNoAlt: imgsNoAlt.length,
    imagesBroken: brokenImgs.length,
    tapTargets: tapTargets.length,
    smallTapTargets: smallTargets.length,
    smallTapTargetSamples: smallTargets.slice(0, 10).map(el => ({
      text: (el.innerText || el.tagName).replace(/\s+/g, " ").trim().slice(0, 30),
      height: Math.round(el.getBoundingClientRect().height),
    })),
    minFontPx: minFont === null ? null : Math.round(minFont * 10) / 10,
    telLinks: telLinks.length,
    mailLinks: mailLinks.length,
    whatsapp: whatsapp.length,
    stickyTel,
    stickyWhatsapp,
    readMoreLinks: readMore.length,
    deadLinks: deadLinks.length,
    forms,
    visibleForms: visibleForms.length,
    hasBookingForm: visibleForms.some(f => /book|appoint|reserv|schedule/i.test(`${f.id || ""} ${f.action || ""}`)) || visibleForms.length > 0,
    shortcodeLeak: shortcode ? shortcode[0] : null,
    canonical,
    robotsMeta,
    schemaTypes: [...new Set(schemaTypes)],
    schemaHasPhone,
    schemaHasAddress,
    stickyNav: navSticky,
    cookiesTotal: document.cookie ? document.cookie.split(";").filter(Boolean).length : 0,
    longTasks: (window.__longTasks || []).slice(0, 200),
  };
}

/**
 * @param {string} website
 * @param {object} opts
 * @param {string} opts.slug
 * @param {boolean} [opts.skipLighthouse]
 */
export async function measureSite(website, opts = {}) {
  const settings = readJSON(path.join(ROOT, "config", "settings.json"));
  const resolved = await resolveBrowser();
  const { chromium } = resolved;
  const chrome = resolved.executablePath;
  const slugName = opts.slug || "site";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rawDir = ensureDir(path.join(ROOT, "data", "raw", slugName));
  const shotDir = ensureDir(path.join(rawDir, `shots-${stamp}`));
  const base = new URL(website);
  // First party = the site's own host, with or without "www." and on either
  // scheme. A plain origin prefix test counted every request as third-party
  // when the site redirected www -> bare domain or https -> http, and the
  // report then listed the business's own domain as an external one.
  const siteHost = h => String(h || "").toLowerCase().replace(/^www\./, "");
  const ownHosts = new Set([siteHost(base.hostname)]);
  const isFirstParty = url => {
    try {
      const host = new URL(url).hostname;
      const h = siteHost(host);
      return [...ownHosts].some(o => h === o || h.endsWith(`.${o}`)) || isOwnStorageHost(host, base.hostname);
    } catch {
      return false;
    }
  };

  log("measure", `browser: ${describeBrowser(resolved)}`);
  const browser = await chromium.launch(launchOptions(resolved));

  const result = {
    schemaVersion: "1.0",
    website,
    domain: base.hostname.replace(/^www\./, ""),
    measuredAt: new Date().toISOString(),
    measuredAtIst: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    tool: { name: describeBrowser(resolved), chrome, lighthouse: "see lighthouse blocks" },
    mobile: null,
    desktop: null,
    http: {},
    lighthouse: {},
    screenshots: [],
    evidence: {},
  };

  try {
    // ---------- mobile pass ----------
    const mobileCtx = await browser.newContext({
      viewport: settings.audit.viewport,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: UA_MOBILE,
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });
    await mobileCtx.addInitScript(INIT_SCRIPT);
    const mobile = await mobileCtx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requests = [];
    const failed = [];
    mobile.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 400)); });
    mobile.on("pageerror", e => pageErrors.push(String(e.message).slice(0, 400)));
    mobile.on("requestfailed", r => failed.push({ url: r.url().slice(0, 300), reason: r.failure()?.errorText || "unknown" }));
    mobile.on("response", async res => {
      try {
        const req = res.request();
        const sizes = await res.request().sizes().catch(() => null);
        const headers = await res.allHeaders();
        requests.push({
          url: res.url().slice(0, 500),
          type: req.resourceType(),
          status: res.status(),
          bytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0,
          fromCache: !!(sizes && sizes.responseBodySize === 0),
          thirdParty: !isFirstParty(res.url()),
          contentType: headers["content-type"] || null,
        });
      } catch {}
    });

    const t0 = Date.now();
    let mainResponse = null;
    let navError = null;
    try {
      mainResponse = await mobile.goto(website, { waitUntil: "load", timeout: 90000 });
    } catch (err) {
      navError = err.message;
    }
    const loadMs = Date.now() - t0;
    await mobile.waitForTimeout(2500);

    if (navError) {
      result.mobile = { status: 0, navError, loadMs };
    } else {
      const dom = await mobile.evaluate(collectDom, settings.audit.viewport);
      const headers = await mainResponse.allHeaders();
      const resources = await mobile.evaluate(() => performance.getEntriesByType("resource").map(r => ({
        name: r.name.slice(0, 400),
        type: r.initiatorType,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        duration: Math.round(r.duration),
      })));
      const nav = await mobile.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0] || {};
        const paint = performance.getEntriesByName("first-contentful-paint")[0];
        return {
          ttfb: Math.round(n.responseStart || 0),
          domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0),
          load: Math.round(n.loadEventEnd || 0),
          fcp: paint ? Math.round(paint.startTime) : null,
          transferSize: n.transferSize || 0,
        };
      });

      // The page may have landed on a different host than the one requested
      // (www -> bare domain). That host is first party too.
      try { ownHosts.add(siteHost(new URL(mobile.url()).hostname)); } catch {}
      for (const r of requests) r.thirdParty = !isFirstParty(r.url);

      // A cookie is first party when its domain is one of the site's own hosts,
      // a subdomain of one, or the parent domain of one (dot-bounded matches).
      const cookies = await mobileCtx.cookies();
      const thirdPartyCookies = cookies.filter(c => {
        const d = siteHost(String(c.domain || "").replace(/^\./, ""));
        return ![...ownHosts].some(o => o === d || o.endsWith(`.${d}`) || d.endsWith(`.${o}`));
      });

      const totalBytes = requests.reduce((a, r) => a + (r.bytes || 0), 0);
      const byType = {};
      for (const r of requests) byType[r.type] = (byType[r.type] || 0) + 1;
      const thirdPartyDomains = [...new Set(requests.filter(r => r.thirdParty).map(r => {
        try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return null; }
      }).filter(Boolean))];
      const longTasks = dom.longTasks || [];
      const blockingMs = Math.round(longTasks.reduce((a, t) => a + Math.max(0, t.dur - 50), 0));

      result.mobile = {
        status: mainResponse.status(),
        finalUrl: mobile.url(),
        loadMs,
        headers: {
          server: headers["server"] || null,
          cacheControl: headers["cache-control"] || null,
          contentEncoding: headers["content-encoding"] || null,
          contentType: headers["content-type"] || null,
          hsts: headers["strict-transport-security"] || null,
          xPoweredBy: headers["x-powered-by"] || null,
        },
        nav,
        dom,
        requests: {
          total: requests.length,
          byType,
          totalBytes,
          thirdParty: requests.filter(r => r.thirdParty).length,
          thirdPartyDomains,
          failed,
        },
        cookies: { total: cookies.length, thirdParty: thirdPartyCookies.length },
        consoleErrors,
        pageErrors,
        blockingMs,
        longTaskCount: longTasks.length,
        resources,
      };

      result.evidence.shortcodeLeak = dom.shortcodeLeak;
      result.evidence.visibleForms = dom.visibleForms;
      result.evidence.h1s = dom.h1s;
      result.evidence.firstScreenClaims = dom.firstScreenClaims;

      // ---------- screenshots ----------
      const shot = async (name, options) => {
        const file = path.join(shotDir, `${name}.png`);
        await mobile.screenshot({ path: file, ...options });
        const stats = await imageStats(browser, file);
        result.screenshots.push({ name, file: path.relative(ROOT, file).replace(/\\/g, "/"), stats });
        return file;
      };

      // Finite animations (counters rolling, reveal effects) finish before a
      // screen is captured, up to 3 s. AA Hospitals' "screen 7" caught its
      // counters mid-roll, digits overlapping (27 Nov review). Infinite ones
      // (spinners, marquees) never finish and are not waited for.
      const settle = () => mobile.waitForFunction(() => document.getAnimations().every(a => {
        if (a.playState !== "running") return true;
        const end = a.effect?.getComputedTiming?.().endTime;
        return !Number.isFinite(end);
      }), null, { timeout: 3000, polling: 100 }).catch(() => {});

      await shot("mobile-fold");
      await shot("mobile-full", { fullPage: true });
      await settle();
      await shot("screen-1");

      // Scroll-and-shoot at fixed phone-screen offsets: screen-1, screen-7, screen-14
      // One screen = the phone screen at the page's layout scale (dom.viewport):
      // 693 px on a page laid out 320 px wide, not 844. Stepping 844 px put
      // Skinmed's "screen 7" 7.3 screens down (28 Nov review).
      const pageHeight = dom.pageHeightPx;
      const screenStep = Number(dom.viewport?.height) > 0 ? Number(dom.viewport.height) : settings.audit.viewport.height;
      for (const n of [7, 14]) {
        const y = Math.min(pageHeight - screenStep, (n - 1) * screenStep);
        if (y <= 0) continue;
        await mobile.evaluate(yy => window.scrollTo(0, yy), y);
        await mobile.waitForTimeout(600);
        await settle();
        await shot(`screen-${n}`);
      }
      await mobile.evaluate(() => window.scrollTo(0, 0));

      // Count contact routes, headings and text again after the full-page and
      // scrolled screenshots: content rendered on scroll (lazy sections,
      // reveal animations) is missing from the count taken at load. A page
      // measured at "1 click-to-call link on the whole page" showed a visitor
      // five (26 Nov review). Each count is the larger of the two passes, and
      // both passes are kept for the verifier.
      try {
        const after = await mobile.evaluate(collectDom, settings.audit.viewport);
        const pick = d => ({ telLinks: d.telLinks, whatsapp: d.whatsapp, visibleForms: d.visibleForms, h1Count: d.h1Count, h1Hidden: d.h1Hidden, h2Count: d.h2Count, words: d.words, browserViewport: d.browserViewport });
        dom.atLoad = pick(dom);
        dom.afterScroll = pick(after);
        for (const k of ["telLinks", "mailLinks", "whatsapp", "stickyTel", "stickyWhatsapp", "h2Count", "words"]) dom[k] = Math.max(dom[k] ?? 0, after[k] ?? 0);
        if ((after.visibleForms ?? 0) > (dom.visibleForms ?? 0)) Object.assign(dom, { visibleForms: after.visibleForms, forms: after.forms, hasBookingForm: after.hasBookingForm });
        if ((after.h1Count ?? 0) > (dom.h1Count ?? 0)) Object.assign(dom, { h1Count: after.h1Count, h1s: after.h1s, headlineOffsetPx: after.headlineOffsetPx });
        dom.h1Hidden = Math.min(dom.h1Hidden ?? 0, after.h1Hidden ?? 0);
        const fr = await frameRoutes(mobile);
        dom.inFrames = fr;
        dom.telLinks += fr.tel; dom.mailLinks = (dom.mailLinks ?? 0) + fr.mail; dom.whatsapp += fr.whatsapp;
        result.evidence.visibleForms = dom.visibleForms;
        result.evidence.h1s = dom.h1s;
      } catch {}

      // Section crops, largest first, max 8
      const sectionBoxes = await mobile.evaluate(() => {
        const els = [...document.querySelectorAll("body section, body > div > section, main > section, body article")];
        return els
          .map((el, i) => {
            const r = el.getBoundingClientRect();
            return { i, top: Math.round(r.top + window.scrollY), height: Math.round(r.height) };
          })
          .filter(b => b.height >= 220)
          .slice(0, 8);
      });
      for (const [idx, box] of sectionBoxes.entries()) {
        try {
          await shot(`sec${idx}`, {
            clip: { x: 0, y: box.top, width: settings.audit.viewport.width, height: Math.min(box.height, 900) },
          });
        } catch {}
      }

      // A booking form can open in a pop-up from a button on the page. Its
      // fields are hidden, or not loaded, until a visitor clicks, so the count
      // above reads zero: Vedanta Hospitals' three "Book Appointment" buttons
      // open an Elementor pop-up (28 Nov review). Done last, after every
      // screenshot, so the open pop-up appears in none of them.
      if (!dom.visibleForms) {
        try { dom.popupForm = await openPopupForm(mobile); }
        catch (err) { dom.popupForm = { error: String(err.message || err).split("\n")[0] }; }
      }
    }
    await mobileCtx.close();

    // ---------- desktop pass ----------
    const deskCtx = await browser.newContext({
      viewport: settings.audit.desktopViewport,
      deviceScaleFactor: 1,
      userAgent: UA_DESKTOP,
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });
    const desk = await deskCtx.newPage();
    const deskErrors = [];
    desk.on("pageerror", e => deskErrors.push(String(e.message).slice(0, 300)));
    let deskStatus = 0;
    try {
      const r = await desk.goto(website, { waitUntil: "load", timeout: 90000 });
      deskStatus = r.status();
      await desk.waitForTimeout(1500);
      // Let lazy images and late requests finish before the capture.
      await desk.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await desk.waitForFunction(() => [...document.images]
        .filter(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; })
        .every(i => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {});
      await desk.waitForTimeout(1000);
      const dom = await desk.evaluate(collectDom, settings.audit.desktopViewport);
      try {
        const fr = await frameRoutes(desk);
        dom.inFrames = fr;
        dom.telLinks += fr.tel; dom.mailLinks = (dom.mailLinks ?? 0) + fr.mail; dom.whatsapp += fr.whatsapp;
      } catch {}
      result.desktop = { status: deskStatus, dom, pageErrors: deskErrors };
      const file = path.join(shotDir, "desktop-fold.png");
      await desk.screenshot({ path: file });
      const stats = await imageStats(browser, file);
      result.screenshots.push({ name: "desktop-fold", file: path.relative(ROOT, file).replace(/\\/g, "/"), stats });
    } catch (err) {
      result.desktop = { status: deskStatus, navError: err.message, pageErrors: deskErrors };
    }
    await deskCtx.close();

    // ---------- HTTP checks on secondary pages ----------
    result.http = await checkHttp(website, settings);
  } finally {
    await browser.close();
  }

  // ---------- Lighthouse ----------
  if (!opts.skipLighthouse) {
    result.lighthouse = runLighthousePair(website, rawDir, stamp, chrome);
  }

  const outFile = path.join(rawDir, `${stamp}.json`);
  writeJSON(outFile, result);
  result.rawFile = path.relative(ROOT, outFile).replace(/\\/g, "/");
  return result;
}

/** Direct fetch checks. These back the "verifiable fact" claims in the report. */
export async function checkHttp(website, settings) {
  const u = new URL(website);
  const origin = u.origin;
  const paths = ["/contact/", "/contact", "/sitemap.xml", "/robots.txt", "/wp-json/"];
  const out = {};

  const fetchOne = async (url, { follow = true } = {}) => {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        redirect: follow ? "follow" : "manual",
        headers: { "user-agent": UA_MOBILE, accept: "*/*" },
        signal: AbortSignal.timeout(30000),
      });
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        url,
        status: res.status,
        finalUrl: res.url,
        contentType: res.headers.get("content-type"),
        bytes: buf.length,
        ms: Date.now() - started,
        bodyStart: buf.slice(0, 200000).toString("utf8"),
      };
    } catch (err) {
      return { url, status: 0, error: err.message, ms: Date.now() - started, bodyStart: "" };
    }
  };

  const home = await fetchOne(website);
  out.homepage = { ...home, bodyStart: undefined };

  for (const p of paths) {
    const r = await fetchOne(origin + p);
    const info = { ...r };
    if (p.startsWith("/contact")) {
      info.shortcode = (r.bodyStart.match(SHORTCODE_RE) || [])[0] || null;
      info.formCount = (r.bodyStart.match(/<form\b/gi) || []).length;
      info.titleMatch = (r.bodyStart.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || null;
    }
    if (p === "/sitemap.xml") {
      info.looksLikeSitemap = /<(urlset|sitemapindex)[\s>]/i.test(r.bodyStart);
    }
    if (p === "/robots.txt") {
      info.disallowAll = /^\s*user-agent:\s*\*/im.test(r.bodyStart) && /^\s*disallow:\s*\/\s*$/im.test(r.bodyStart);
      // A sitemap declared here may live somewhere other than /sitemap.xml;
      // without this, a 404 at /sitemap.xml would be reported as "no sitemap".
      info.sitemaps = r.status === 200 && !/<html[\s>]/i.test(r.bodyStart)
        ? [...r.bodyStart.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(x => x[1].slice(0, 300)).slice(0, 5)
        : [];
    }
    if (p === "/wp-json/") {
      info.isWordpressApi = /"namespaces"|"routes"|wp\/v2/i.test(r.bodyStart);
    }
    delete info.bodyStart;
    out[p] = info;
  }

  // WordPress detection from the homepage HTML.
  const html = home.bodyStart || "";
  out.meta = {
    generator: (html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i) || [])[1] || null,
    wordpress: /wp-content|wp-includes|wp-json/i.test(html),
    theme: (html.match(/wp-content\/themes\/([a-z0-9_-]+)/i) || [])[1] || null,
    plugins: [...new Set([...html.matchAll(/wp-content\/plugins\/([a-z0-9_-]+)/gi)].map(m => m[1]))].slice(0, 20),
    analytics: ["gtag(", "google-analytics.com", "googletagmanager.com", "ga("].some(s => html.includes(s)),
    adTech: ["adroll", "thetradedesk", "eyeota", "appnexus", "bidswitch", "smartadserver", "pubmatic", "rubiconproject", "criteo"].filter(s => html.toLowerCase().includes(s)),
    titleTag: (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || null,
    ogSiteName: (html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null,
    schema: /application\/ld\+json/i.test(html),
  };

  return out;
}

/**
 * Where Lighthouse lives, if it is installed.
 *
 * Lighthouse is a declared dependency rather than an `npx` download: an npx run
 * fetches the package on every audit (slow, and impossible on a machine with no
 * npm registry access), and Windows cannot spawn the `npx.cmd` shim from
 * `child_process` without a shell — which silently produced no report at all.
 */
function lighthouseCli() {
  const candidates = [
    path.join(ROOT, "node_modules", "lighthouse", "cli", "index.js"),
    path.join(ROOT, "node_modules", "lighthouse", "cli.js"),
  ];
  return candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

/** The config that raises the first-contentful-paint wait, if it shipped. */
function configPath(key) {
  const file = path.join(ROOT, "tools", "lighthouse", `${key}.json`);
  try { return fs.existsSync(file) ? file : null; } catch { return null; }
}

/**
 * Runs Lighthouse twice (mobile, desktop) through the resolved browser.
 *
 * The browser may be Playwright's downloaded Chromium rather than a system
 * Chrome, so Lighthouse is told where it is through CHROME_PATH.
 */
export function runLighthousePair(website, rawDir, stamp, chromePath = null) {
  const out = {};
  const chrome = chromePath || process.env.CHROME_PATH || systemBrowsers()[0] || null;
  const cli = lighthouseCli();
  if (!cli) {
    const error = "Lighthouse is not installed. Run `npm install` in the repository root.";
    return { mobile: { error }, desktop: { error } };
  }
  const runs = [
    { key: "mobile", extra: "", config: configPath("mobile") },
    { key: "desktop", extra: "", config: configPath("desktop") },
  ];
  for (const run of runs) {
    const file = path.join(rawDir, `lh-${run.key}-${stamp}.json`);
    const args = [
      cli,
      website,
      "--output=json",
      `--output-path=${file}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      `--chrome-flags=--headless=new --no-sandbox --disable-gpu --hide-scrollbars`,
      "--quiet",
    ];
    // Our config raises `maxWaitForFcp`, the timeout that produces NO_FCP. The
    // CLI exposes only `--max-wait-for-load`, and a headless run of a slow
    // shared-hosting site routinely needs longer than the 30 s default to paint
    // its first pixel. NO_FCP means the audit is unscoreable — a measurement
    // failure, not a finding — so the wait is raised rather than the check.
    if (run.config) args.push(`--config-path=${run.config}`);
    if (run.extra) args.push(run.extra);
    log("lighthouse", `running ${run.key}…`);
    const env = { ...process.env };
    if (chrome) env.CHROME_PATH = chrome;
    // The actual node binary, not a .cmd shim: portable and shell-free.
    const res = spawnSync(process.execPath, args, {
      cwd: ROOT,
      env,
      timeout: 12 * 60 * 1000,
      encoding: "utf8",
    });
    if (!fs.existsSync(file)) {
      out[run.key] = { error: (res.stderr || res.stdout || res.error?.message || "lighthouse produced no file").slice(-600) };
      continue;
    }
    const lhr = readJSON(file);
    if (lhr.runtimeError) {
      out[run.key] = { error: `${lhr.runtimeError.code}: ${lhr.runtimeError.message}`.slice(-600) };
      continue;
    }
    out[run.key] = normalizeLighthouse(lhr, file);
  }
  return out;
}

/** Turns a Lighthouse JSON blob into exactly the fields the report is allowed to quote. */
export function normalizeLighthouse(lhr, file) {
  const a = lhr.audits || {};
  const c = lhr.categories || {};
  const num = id => (a[id] && Number.isFinite(a[id].numericValue) ? a[id].numericValue : null);
  const score = id => (c[id] && Number.isFinite(c[id].score) ? Math.round(c[id].score * 100) : null);
  const details = id => (a[id] && a[id].details) || null;

  const unused = details("unused-javascript");
  const unusedJsKb = unused && unused.overallSavingsBytes ? Math.round(unused.overallSavingsBytes / 1024) : 0;

  const oversized = details("uses-responsive-images") || details("image-size-responsive");
  const oversizedImgsKb = oversized && oversized.overallSavingsBytes ? Math.round(oversized.overallSavingsBytes / 1024) : 0;
  const oversizedCount = oversized && oversized.items ? oversized.items.length : 0;

  const renderBlocking = details("render-blocking-resources");
  const renderBlockingMs = renderBlocking && Number.isFinite(renderBlocking.overallSavingsMs) ? Math.round(renderBlocking.overallSavingsMs) : 0;

  const mainThread = details("mainthread-work-breakdown");
  const mainThreadMs = mainThread && Number.isFinite(mainThread.overallSavingsMs) ? Math.round(mainThread.overallSavingsMs) : null;

  const networkItems = (details("network-requests") && details("network-requests").items) || [];
  const totalBytes = num("total-byte-weight");

  return {
    lighthouseVersion: lhr.lighthouseVersion,
    fetchTime: lhr.fetchTime,
    finalUrl: lhr.finalUrl,
    requestedUrl: lhr.requestedUrl,
    file: path.relative(ROOT, file).replace(/\\/g, "/"),
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    metrics: {
      lcpMs: num("largest-contentful-paint"),
      fcpMs: num("first-contentful-paint"),
      tbtMs: num("total-blocking-time"),
      cls: num("cumulative-layout-shift"),
      speedIndexMs: num("speed-index"),
      ttiMs: num("interactive"),
      ttfbMs: num("server-response-time"),
      totalBytesKb: totalBytes === null ? null : Math.round(totalBytes / 1024),
      requests: networkItems.length,
      domNodes: num("dom-size"),
      unusedJsKb,
      oversizedImgsKb,
      oversizedImgs: oversizedCount,
      renderBlockingMs,
      mainThreadMs,
    },
    failedAudits: Object.values(c)
      .flatMap(cat => (cat.auditRefs || []).map(r => r.id))
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .filter(id => a[id] && a[id].score !== null && a[id].score < 1 && !["informative", "notApplicable", "manual"].includes(a[id].scoreDisplayMode))
      .slice(0, 40),
  };
}

export { SHORTCODE_RE, SOCIAL_HOSTS };
