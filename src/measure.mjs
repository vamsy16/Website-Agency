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
import { ROOT, ensureDir, findChrome, isoDate, writeJSON, readJSON, round, log } from "./util.mjs";

const UA_MOBILE =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SHORTCODE_RE = /\[(contact-form-7|contact-form|gravityform|wpforms|ninja_form|formidable|caldera_form|et_pb_contact_form)[^\]]{0,160}\]/i;
const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "wa.me", "linktr.ee", "google.com", "business.site", "wixsite.com", "wordpress.com", "blogspot.com"];

async function loadPlaywright() {
  try {
    return await import("playwright-core");
  } catch {
    throw new Error('playwright-core is not installed. Run: npm install  (it is the only dependency)');
  }
}

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
function collectDom() {
  const de = document.documentElement;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
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

  // Smallest font actually rendered on body text.
  const textEls = q("p, li, span, div, a").filter(el => visible(el) && (el.innerText || "").trim().length > 25);
  let minFont = null;
  for (const el of textEls.slice(0, 800)) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(fs)) continue;
    if (minFont === null || fs < minFont) minFont = fs;
  }

  const h1s = q("h1").filter(visible).map(h => (h.innerText || "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const h2s = q("h2").filter(visible).map(h => (h.innerText || "").replace(/\s+/g, " ").trim()).filter(Boolean);

  // Where does the first real headline start?
  const headlineOffset = h1s.length ? Math.round(q("h1").filter(visible)[0].getBoundingClientRect().top + window.scrollY) : 0;
  // How many competing headline-sized blocks sit in the first screen?
  const firstScreenClaims = q("h1, h2, [class*=title], [class*=headline], [class*=hero]")
    .filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return false;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const t = (el.innerText || "").trim();
      return fs >= 24 && t.length > 8 && t.length < 160 && el.children.length < 4;
    })
    .map(el => (el.innerText || "").replace(/\s+/g, " ").trim());

  const imgs = q("img");
  const imgsNoAlt = imgs.filter(i => !i.getAttribute("alt") && visible(i));
  const brokenImgs = imgs.filter(i => i.complete && i.naturalWidth === 0);

  const anchors = q("a[href]");
  const telLinks = anchors.filter(a => (a.getAttribute("href") || "").startsWith("tel:"));
  const mailLinks = anchors.filter(a => (a.getAttribute("href") || "").startsWith("mailto:"));
  const whatsapp = q("a[href*='wa.me'], a[href*='whatsapp'], [class*=whatsapp], iframe[src*='whatsapp']");
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

  return {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    viewport: { width: vw, height: vh },
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    overflowX: Math.max(0, de.scrollWidth - de.clientWidth),
    pageHeightPx: de.scrollHeight,
    screens: round(de.scrollHeight / vh, 1),
    domNodes: document.querySelectorAll("*").length,
    words,
    textChars: text.length,
    sections: bigSections.length,
    h1Count: h1s.length,
    h1s: h1s.slice(0, 12),
    h2Count: h2s.length,
    h2s: h2s.slice(0, 12),
    headlineOffsetPx: headlineOffset,
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
    minFontPx: minFont === null ? null : round(minFont, 1),
    telLinks: telLinks.length,
    mailLinks: mailLinks.length,
    whatsapp: whatsapp.length,
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
  const { chromium } = await loadPlaywright();
  const chrome = findChrome();
  const slugName = opts.slug || "site";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rawDir = ensureDir(path.join(ROOT, "data", "raw", slugName));
  const shotDir = ensureDir(path.join(rawDir, `shots-${stamp}`));
  const base = new URL(website);

  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--hide-scrollbars"],
  });

  const result = {
    schemaVersion: "1.0",
    website,
    domain: base.hostname.replace(/^www\./, ""),
    measuredAt: new Date().toISOString(),
    measuredAtIst: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    tool: { name: "playwright-core + local Chrome", chrome, lighthosue: "see lighthouse blocks" },
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
          thirdParty: !res.url().startsWith(base.origin),
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
      const dom = await mobile.evaluate(collectDom);
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

      const cookies = await mobileCtx.cookies();
      const thirdPartyCookies = cookies.filter(c => {
        const d = c.domain.replace(/^\./, "");
        return !base.hostname.endsWith(d) && !d.endsWith(base.hostname);
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

      await shot("mobile-fold");
      await shot("mobile-full", { fullPage: true });
      await shot("screen-1");

      // Scroll-and-shoot at fixed phone-screen offsets: screen-1, screen-7, screen-14
      const pageHeight = dom.pageHeightPx;
      for (const n of [7, 14]) {
        const y = Math.min(pageHeight - settings.audit.viewport.height, (n - 1) * settings.audit.viewport.height);
        if (y <= 0) continue;
        await mobile.evaluate(yy => window.scrollTo(0, yy), y);
        await mobile.waitForTimeout(600);
        await shot(`screen-${n}`);
      }
      await mobile.evaluate(() => window.scrollTo(0, 0));

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
      const dom = await desk.evaluate(collectDom);
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
    result.lighthouse = runLighthousePair(website, rawDir, stamp);
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

/** Runs Lighthouse twice (mobile, desktop) through the local Chrome. */
export function runLighthousePair(website, rawDir, stamp) {
  const out = {};
  const chrome = findChrome();
  const runs = [
    { key: "mobile", extra: "", preset: "" },
    { key: "desktop", extra: "--preset=desktop", preset: "desktop" },
  ];
  for (const run of runs) {
    const file = path.join(rawDir, `lh-${run.key}-${stamp}.json`);
    const args = [
      "lighthouse@12",
      website,
      "--output=json",
      `--output-path=${file}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      `--chrome-flags=--headless=new --no-sandbox --disable-gpu --hide-scrollbars`,
      "--quiet",
    ];
    if (run.extra) args.push(run.extra);
    log("lighthouse", `running ${run.key}…`);
    const res = spawnSync("npx.cmd", ["--yes", ...args], {
      cwd: ROOT,
      shell: true,
      env: { ...process.env, CHROME_PATH: chrome },
      timeout: 8 * 60 * 1000,
      encoding: "utf8",
    });
    if (!fs.existsSync(file)) {
      out[run.key] = { error: (res.stderr || res.stdout || "lighthouse produced no file").slice(-600) };
      continue;
    }
    out[run.key] = normalizeLighthouse(readJSON(file), file);
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
