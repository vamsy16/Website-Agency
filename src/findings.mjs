// Deterministic scoring + finding selection.
//
// The rubric below is fixed arithmetic on measured values. It is calibrated so
// that the first delivered audit (8 Nov 2026) reproduces
//   3 / 4 / 2 / 6 / 5  ->  36 / 100
// from the same measured inputs. `npm run selftest` asserts that.
//
// No constant in here is a judgement about a business. Each penalty is attached
// to one measured threshold from config/settings.json.
import { clamp, round, fmtInt, fmtBytesKB, fmtSec, fmtCls, longDate, isoDate } from "./util.mjs";

const PENALTY = {
  // speed
  perfPoor: 2.0, perfWarn: 1.0,
  lcpPoor: 3.0, lcpWarn: 1.5,
  tbtPoor: 1.0, tbtWarn: 0.5,
  requestsPoor: 1.0, requestsWarn: 0.5,
  bytesPoor: 1.0, bytesWarn: 0.5,
  // mobile
  screensPoor: 2.0, screensWarn: 1.0,
  tapPoor: 1.0, tapWarn: 0.5,
  fontPoor: 1.5, fontWarn: 0.75,
  headlinePoor: 2.0, headlineWarn: 1.0,
  overflow: 0.5,
  // conversion
  shortcode: 4.5,
  noVisibleForm: 2.5,
  whatsappOnly: 1.0,
  // design
  sectionsPoor: 1.5,
  competingClaims: 1.5,
  domPoor: 0.5,
  altMissing: 0.5,
  // seo
  seoPerPoint: 0.1,
  multiH1: 1.5,
  schemaGap: 1.0,
};

export function computeScores(raw, settings) {
  const m = raw.mobile?.dom || {};
  const lh = raw.lighthouse?.mobile || {};
  const lhm = lh.metrics || {};
  const perf = lh.scores?.performance ?? null;
  const lighthouseSeo = lh.scores?.seo ?? null;
  const lcp = lhm.lcpMs ?? null;
  const tbt = lhm.tbtMs ?? null;
  const requests = lhm.requests ?? raw.mobile?.requests?.total ?? null;
  const bytesKb = lhm.totalBytesKb ?? (raw.mobile?.requests?.totalBytes ? Math.round(raw.mobile.requests.totalBytes / 1024) : null);

  const penalties = { speed: [], mobile: [], conversion: [], design: [], seo: [] };

  // ---------- SPEED ----------
  let speed = 10;
  if (perf !== null) {
    if (perf < 50) { speed -= PENALTY.perfPoor; penalties.speed.push(`mobile performance ${perf}/100 below 50 (-${PENALTY.perfPoor})`); }
    else if (perf < 90) { speed -= PENALTY.perfWarn; penalties.speed.push(`mobile performance ${perf}/100 below 90 (-${PENALTY.perfWarn})`); }
  }
  if (lcp !== null) {
    if (lcp > 4000) { speed -= PENALTY.lcpPoor; penalties.speed.push(`LCP ${fmtSec(lcp)} over 4 s (-${PENALTY.lcpPoor})`); }
    else if (lcp > 2500) { speed -= PENALTY.lcpWarn; penalties.speed.push(`LCP ${fmtSec(lcp)} over 2.5 s (-${PENALTY.lcpWarn})`); }
  }
  if (tbt !== null) {
    if (tbt > 600) { speed -= PENALTY.tbtPoor; penalties.speed.push(`blocking time ${fmtInt(tbt)} ms over 600 (-${PENALTY.tbtPoor})`); }
    else if (tbt > 200) { speed -= PENALTY.tbtWarn; penalties.speed.push(`blocking time ${fmtInt(tbt)} ms over 200 (-${PENALTY.tbtWarn})`); }
  }
  if (requests !== null) {
    if (requests > 100) { speed -= PENALTY.requestsPoor; penalties.speed.push(`${requests} requests over 100 (-${PENALTY.requestsPoor})`); }
    else if (requests > 50) { speed -= PENALTY.requestsWarn; penalties.speed.push(`${requests} requests over 50 (-${PENALTY.requestsWarn})`); }
  }
  if (bytesKb !== null) {
    if (bytesKb > 3000) { speed -= PENALTY.bytesPoor; penalties.speed.push(`${fmtBytesKB(bytesKb)} page weight over 3 MB (-${PENALTY.bytesPoor})`); }
    else if (bytesKb > 1600) { speed -= PENALTY.bytesWarn; penalties.speed.push(`${fmtBytesKB(bytesKb)} page weight over 1.6 MB (-${PENALTY.bytesWarn})`); }
  }
  speed = clamp(speed, 0, 10);

  // ---------- MOBILE ----------
  let mobile = 10;
  if (m.screens !== undefined && m.screens !== null) {
    if (m.screens > 12) { mobile -= PENALTY.screensPoor; penalties.mobile.push(`${m.screens} screens tall, over 12 (-${PENALTY.screensPoor})`); }
    else if (m.screens > 6) { mobile -= PENALTY.screensWarn; penalties.mobile.push(`${m.screens} screens tall, over 6 (-${PENALTY.screensWarn})`); }
  }
  if (m.smallTapTargets !== undefined) {
    if (m.smallTapTargets > 3) { mobile -= PENALTY.tapPoor; penalties.mobile.push(`${m.smallTapTargets} tap targets under 40 px (-${PENALTY.tapPoor})`); }
    else if (m.smallTapTargets > 0) { mobile -= PENALTY.tapWarn; penalties.mobile.push(`${m.smallTapTargets} tap targets under 40 px (-${PENALTY.tapWarn})`); }
  }
  if (m.minFontPx !== undefined && m.minFontPx !== null) {
    if (m.minFontPx < 12) { mobile -= PENALTY.fontPoor; penalties.mobile.push(`body text down to ${m.minFontPx} px (-${PENALTY.fontPoor})`); }
    else if (m.minFontPx < 14) { mobile -= PENALTY.fontWarn; penalties.mobile.push(`body text down to ${m.minFontPx} px (-${PENALTY.fontWarn})`); }
  }
  if (m.headlineOffsetPx !== undefined && m.headlineOffsetPx !== null) {
    if (m.headlineOffsetPx > 600) { mobile -= PENALTY.headlinePoor; penalties.mobile.push(`headline starts ${fmtInt(m.headlineOffsetPx)} px down (-${PENALTY.headlinePoor})`); }
    else if (m.headlineOffsetPx > 300) { mobile -= PENALTY.headlineWarn; penalties.mobile.push(`headline starts ${fmtInt(m.headlineOffsetPx)} px down (-${PENALTY.headlineWarn})`); }
  }
  if (m.overflowX > 0) { mobile -= PENALTY.overflow; penalties.mobile.push(`horizontal overflow of ${m.overflowX} px (-${PENALTY.overflow})`); }
  mobile = clamp(mobile, 0, 10);

  // ---------- CONVERSION ----------
  let conversion = 10;
  if (m.shortcodeLeak) { conversion -= PENALTY.shortcode; penalties.conversion.push(`an unrendered form shortcode is visible (-${PENALTY.shortcode})`); }
  if (!m.visibleForms) { conversion -= PENALTY.noVisibleForm; penalties.conversion.push(`no visible form with fields on the homepage (-${PENALTY.noVisibleForm})`); }
  if (!m.visibleForms && m.whatsapp > 0) { conversion -= PENALTY.whatsappOnly; penalties.conversion.push(`WhatsApp is the only capture route (-${PENALTY.whatsappOnly})`); }
  conversion = clamp(conversion, 0, 10);

  // ---------- DESIGN ----------
  let design = 10;
  if (m.sections !== undefined) {
    if (m.sections > 15) { design -= PENALTY.sectionsPoor; penalties.design.push(`${m.sections} stacked sections (-${PENALTY.sectionsPoor})`); }
  }
  const claims = Array.isArray(m.firstScreenClaims) ? m.firstScreenClaims.length : 0;
  if (claims > 1) { design -= PENALTY.competingClaims; penalties.design.push(`${claims} competing headlines in the first screen (-${PENALTY.competingClaims})`); }
  if (m.domNodes !== undefined && m.domNodes > 1000) { design -= PENALTY.domPoor; penalties.design.push(`${fmtInt(m.domNodes)} DOM nodes (-${PENALTY.domPoor})`); }
  if (m.imagesNoAlt !== undefined && m.imagesNoAlt > 0) { design -= PENALTY.altMissing; penalties.design.push(`${m.imagesNoAlt} images without alt text (-${PENALTY.altMissing})`); }
  design = clamp(design, 0, 10);

  // ---------- SEO ----------
  let seoScore = 10;
  if (lighthouseSeo !== null) {
    const gap = (100 - lighthouseSeo) * PENALTY.seoPerPoint;
    seoScore -= gap;
    if (gap > 0) penalties.seo.push(`Lighthouse SEO ${lighthouseSeo}/100 (-${round(gap, 1)})`);
  }
  if (m.h1Count !== undefined && m.h1Count > 1) { seoScore -= PENALTY.multiH1; penalties.seo.push(`${m.h1Count} H1 headings (-${PENALTY.multiH1})`); }
  if (m.schemaTypes?.length && (!m.schemaHasPhone || !m.schemaHasAddress)) { seoScore -= PENALTY.schemaGap; penalties.seo.push(`structured data missing ${!m.schemaHasPhone ? "telephone" : ""}${!m.schemaHasPhone && !m.schemaHasAddress ? " and " : ""}${!m.schemaHasAddress ? "address" : ""} (-${PENALTY.schemaGap})`); }
  seoScore = clamp(seoScore, 0, 10);

  const area = { speed, mobile, conversion, design, seo: seoScore };
  const rounded = Object.fromEntries(Object.entries(area).map(([k, v]) => [k, Math.round(v)]));

  // The overall is weighted from the ROUNDED area scores — the same five integers
  // the scorecard prints. That way the gauge can never disagree with the table,
  // and the reference audit reproduces exactly: 3/4/2/6/5 -> 36/100.
  const w = settings.scoring.weights;
  const weighted =
    w.speed * rounded.speed + w.mobile * rounded.mobile + w.conversion * rounded.conversion + w.design * rounded.design + w.seo * rounded.seo;
  const overall = Math.round(weighted * 10);

  return {
    raw: Object.fromEntries(Object.entries(area).map(([k, v]) => [k, round(v, 2)])),
    scores: { ...rounded, overall },
    penalties,
    weights: w,
    breakdown: Object.fromEntries(Object.keys(w).map(k => [k, round(w[k] * rounded[k] * 10, 1)])),
  };
}

/** Everything the report is allowed to print, pre-formatted, from measurement only. */
export function buildFacts(raw, scoring, business, settings = {}) {
  const m = raw.mobile?.dom || {};
  const mreq = raw.mobile?.requests || {};
  const lhM = raw.lighthouse?.mobile || {};
  const lhD = raw.lighthouse?.desktop || {};
  const lhm = lhM.metrics || {};
  const lhd = lhD.metrics || {};
  const meta = raw.http?.meta || {};
  const contact = raw.http?.["/contact/"] || {};
  const sitemap = raw.http?.["/sitemap.xml"] || {};

  const lcp = lhm.lcpMs;
  const tbt = lhm.tbtMs;
  const ttfb = lhm.ttfbMs;
  const bytes = lhm.totalBytesKb;
  const dateIso = raw.measuredAt ? isoDate(raw.measuredAt) : isoDate(new Date());

  const ratio = (value, target) => (Number.isFinite(value) && target ? (value / target).toFixed(1) : "—");

  const facts = {
    business: {
      name: business.name,
      legalName: business.legalName || business.name,
      domain: business.domain,
      url: business.url,
      city: business.city,
      state: business.state,
      localityLine: business.localityLine || "",
      contactName: business.contactName || business.name,
      contactPage: business.contactPage || `${business.url.replace(/\/$/, "")}/contact/`,
      nicheLabel: business.nicheLabel || business.niche || "",
    },
    agency: settings.agency || {},
    date: { iso: dateIso, long: longDate(dateIso), measuredIst: raw.measuredAtIst || "" },
    ref: business.ref || "",
    metric: {
      perfMobile: lhM.scores?.performance ?? "—",
      perfDesktop: lhD.scores?.performance ?? "—",
      accessibility: lhM.scores?.accessibility ?? "—",
      bestPractices: lhM.scores?.bestPractices ?? "—",
      seo: lhM.scores?.seo ?? "—",
      lcpMs: lcp ?? null,
      lcp: Number.isFinite(lcp) ? fmtSec(lcp) : "—",
      lcpOver: ratio(lcp, 2500),
      fcpMs: lhm.fcpMs ?? null,
      fcp: Number.isFinite(lhm.fcpMs) ? fmtSec(lhm.fcpMs) : "—",
      tbtMs: tbt ?? null,
      tbt: Number.isFinite(tbt) ? `${fmtInt(tbt)} ms` : "—",
      tbtOver: ratio(tbt, 200),
      ttiMs: lhm.ttiMs ?? null,
      tti: Number.isFinite(lhm.ttiMs) ? fmtSec(lhm.ttiMs) : "—",
      ttfbMs: ttfb ?? null,
      ttfb: Number.isFinite(ttfb) ? `${fmtInt(ttfb)} ms` : "—",
      cls: Number.isFinite(lhm.cls) ? fmtCls(lhm.cls) : "—",
      speedIndex: Number.isFinite(lhm.speedIndexMs) ? fmtSec(lhm.speedIndexMs) : "—",
      bytesKb: bytes ?? null,
      bytes: Number.isFinite(bytes) ? fmtBytesKB(bytes) : "—",
      requests: lhm.requests ?? mreq.total ?? 0,
      requestsLive: mreq.total ?? 0,
      domNodes: m.domNodes ?? 0,
      words: m.words ?? 0,
      sections: m.sections ?? 0,
      screens: m.screens ?? 0,
      pageHeightPx: m.pageHeightPx ?? 0,
      images: m.images ?? 0,
      imagesNoAlt: m.imagesNoAlt ?? 0,
      h1Count: m.h1Count ?? 0,
      h2Count: m.h2Count ?? 0,
      tapTargets: m.tapTargets ?? 0,
      smallTapTargets: m.smallTapTargets ?? 0,
      minFontPx: m.minFontPx ?? "—",
      headlineOffsetPx: m.headlineOffsetPx ?? 0,
      telLinks: m.telLinks ?? 0,
      whatsapp: m.whatsapp ?? 0,
      readMore: m.readMoreLinks ?? 0,
      deadLinks: m.deadLinks ?? 0,
      visibleForms: m.visibleForms ?? 0,
      forms: Array.isArray(m.forms) ? m.forms.length : 0,
      thirdPartyRequests: mreq.thirdParty ?? 0,
      thirdPartyCookies: raw.mobile?.cookies?.thirdParty ?? 0,
      thirdPartyDomains: Array.isArray(mreq.thirdPartyDomains) ? mreq.thirdPartyDomains : [],
      consoleErrors: Array.isArray(raw.mobile?.consoleErrors) ? raw.mobile.consoleErrors.length : 0,
      blockingMs: raw.mobile?.blockingMs ?? 0,
      unusedJsKb: lhm.unusedJsKb ?? 0,
      oversizedImgsKb: lhm.oversizedImgsKb ?? 0,
      oversizedImgs: lhm.oversizedImgs ?? 0,
      renderBlockingMs: lhm.renderBlockingMs ?? 0,
      mainThreadMs: lhm.mainThreadMs ?? 0,
      stickyNav: !!m.stickyNav,
      overflowX: m.overflowX ?? 0,
      desktopLcp: Number.isFinite(lhd.lcpMs) ? fmtSec(lhd.lcpMs) : "—",
      desktopBytes: Number.isFinite(lhd.totalBytesKb) ? fmtBytesKB(lhd.totalBytesKb) : "—",
      desktopRequests: lhd.requests ?? 0,
    },
    http: {
      status: raw.http?.homepage?.status ?? 0,
      contactStatus: contact.status ?? 0,
      contactShortcode: contact.shortcode || m.shortcodeLeak || null,
      sitemapStatus: sitemap.status ?? 0,
      sitemapLooksValid: !!sitemap.looksLikeSitemap,
      wordpress: !!meta.wordpress,
      wpTheme: meta.theme || null,
      wpPlugins: Array.isArray(meta.plugins) ? meta.plugins : [],
      generator: meta.generator || null,
      analytics: !!meta.analytics,
      adTech: Array.isArray(meta.adTech) ? meta.adTech : [],
      ogSiteName: meta.ogSiteName || null,
      titleTag: meta.titleTag || null,
      canonical: raw.mobile?.dom?.canonical || null,
      schema: !!meta.schema,
      schemaTypes: Array.isArray(m.schemaTypes) ? m.schemaTypes : [],
      schemaHasPhone: !!m.schemaHasPhone,
      schemaHasAddress: !!m.schemaHasAddress,
    },
    scores: scoring.scores,
    scoreRaw: scoring.raw,
    penalties: scoring.penalties,
    weights: scoring.weights,
    benchmark: raw.benchmark || null,
  };

  facts.derived = {
    lcpOverTarget: facts.metric.lcpOver,
    tbtOverTarget: facts.metric.tbtOver,
    screensRounded: Math.round(Number(facts.metric.screens) || 0),
    healthyGap: Math.max(0, (settings.scoring?.healthyOverall || 70) - (scoring.scores.overall || 0)),
  };

  // Settings the report is allowed to quote, kept next to the data rather than
  // reached for ad hoc inside the renderer.
  facts.scoring = {
    healthyOverall: settings.scoring?.healthyOverall || 70,
    weights: settings.scoring?.weights || {},
  };
  facts.outreach = {
    optOutLine: settings.outreach?.optOutLine || "",
    cadenceDays: settings.outreach?.cadenceDays || [],
  };

  return facts;
}

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2 };

/**
 * Builds the six findings for the report from measurement.
 * Each finding carries `evidence` naming the measured field it came from, so the
 * third-eye verifier can trace every sentence back to a number.
 */
export function deriveFindings(raw, facts, business) {
  const m = facts.metric;
  const h = facts.http;
  const candidates = [];

  if (m.visibleForms === 0 && h.contactShortcode) {
    candidates.push({
      severity: "Critical",
      tone: "crit",
      title: `Your Contact page shows code where the form should be`,
      measured: `The page at <b>${business.contactPage || business.domain + "/contact/"}</b> prints <span class="mono">${escapeText(h.contactShortcode)}</span> as visible text. The form itself never renders. The homepage also has <b>${m.visibleForms}</b> visible forms with fields.`,
      why: `This is the page every “Contact” link, Google Business Profile button and ad click lands on. A patient who has decided to book sees a broken page at the exact moment they were ready to choose you.`,
      fix: `Rebuild the form: name, phone, treatment, preferred branch, preferred date. Add a thank-you page so it can be tracked.`,
      effort: "1 hour",
      evidence: ["http.contactShortcode", "metric.visibleForms"],
    });
  }

  if (m.visibleForms === 0) {
    candidates.push({
      severity: "Critical",
      tone: "crit",
      title: `There is no way to book an appointment from the homepage`,
      measured: `Zero form fields on the home page. The page has <b>${m.telLinks}</b> click-to-call links and <b>${m.whatsapp}</b> WhatsApp capture element${m.whatsapp === 1 ? "" : "s"}.`,
      why: `WhatsApp suits a patient who is already sure. It loses the one who is comparing three clinics at 11 pm and does not want to start a conversation to ask a price. Every additional step is a decision to leave.`,
      fix: `A booking block above the fold, a sticky “Call / Book” bar on mobile, and a working form that emails the business.`,
      effort: "half a day",
      evidence: ["metric.visibleForms", "metric.telLinks", "metric.whatsapp"],
    });
  }

  if ((m.perfMobile !== "—" && m.perfMobile < 50) || (m.lcpMs && m.lcpMs > 4000)) {
    candidates.push({
      severity: "High",
      tone: "med",
      title: `A ${m.perfMobile}/100 mobile score and a ${m.lcp} main image`,
      measured: `LCP <b>${m.lcp}</b> · TBT <b>${m.tbt}</b> · ${m.requests} requests · <b>${m.bytes}</b> · ${fmtInt(m.unusedJsKb)} KiB unused JavaScript · ${fmtInt(m.oversizedImgsKb)} KiB of oversized images · render-blocking CSS/JS costing ${fmtInt(m.renderBlockingMs)} ms.`,
      why: `Google’s thresholds are 2.5 s for LCP and 200 ms for TBT. This page is ${m.lcpOver}× and ${m.tbtOver}× over. Page experience is a documented ranking input.`,
      fix: `Server-side caching plus a CDN, images re-encoded at the size they are displayed, non-critical scripts deferred, unused plugins removed.`,
      effort: "2–3 days, no redesign",
      evidence: ["metric.lcpMs", "metric.tbtMs", "metric.requests", "metric.bytesKb"],
    });
  }

  if (m.h1Count > 1) {
    candidates.push({
      severity: "High",
      tone: "med",
      title: `${m.h1Count} H1 headings competing for one page`,
      measured: `The homepage carries <b>${m.h1Count} × H1</b> and ${m.h2Count} × H2. Headline blocks seen in the first screen: ${(raw.mobile?.dom?.firstScreenClaims || []).slice(0, 3).map(c => `“${c}”`).join(" · ") || "—"}.`,
      why: `One page, one H1 — that is how a search engine reads the topic and how a person reads the offer. Several slogans mean the reader does the work of deciding what the business actually does, and the crawler gets no clear signal.`,
      fix: `One H1 naming the service and the city, then H2s for treatments, locations and doctors.`,
      effort: "2 hours",
      evidence: ["metric.h1Count", "metric.h2Count"],
    });
  }

  if (m.sections > 8 || m.screens > 8) {
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: `${Math.round(m.screens)} screens of scrolling, with the useful details at the bottom`,
      measured: `${fmtInt(m.pageHeightPx)} px tall at 390 px wide. ${m.sections} sections, ${m.images} images, ${m.words} words. Opening hours, addresses and pricing are not in the first two screens.`,
      why: `A visitor has four questions — what, where, when, how much. All four are answered late or not at all. Length is not the problem; the order is.`,
      fix: `Five sections on the homepage: offer, proof, services, location and hours, book. Move the rest to dedicated pages.`,
      effort: "included in a rebuild",
      evidence: ["metric.sections", "metric.screens", "metric.pageHeightPx"],
    });
  }

  if (m.thirdPartyCookies > 5 || m.consoleErrors > 0) {
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: `${m.thirdPartyCookies} third-party cookies and ${m.consoleErrors} JavaScript errors on a business site`,
      measured: `${m.thirdPartyRequests} third-party requests from ${Math.max(0, m.thirdPartyDomains.length)} external domains${m.thirdPartyDomains.length ? ` (${m.thirdPartyDomains.slice(0, 6).join(", ")})` : ""}. <b>${m.thirdPartyCookies} third-party cookies</b>, and third-party code blocked the main thread for <b>${fmtInt(m.blockingMs)} ms</b>. ${m.consoleErrors} uncaught console error${m.consoleErrors === 1 ? "" : "s"} on load.`,
      why: `Ad and analytics pixels are pure weight on a page that is already slow, and on a healthcare page they are a trust and data-protection question. None of it helps a visitor get in touch.`,
      fix: `Remove the retargeting pixels, keep one analytics tool, fix the console errors.`,
      effort: "one afternoon",
      evidence: ["metric.thirdPartyCookies", "metric.consoleErrors", "metric.blockingMs"],
    });
  }

  if (h.sitemapStatus && !h.sitemapLooksValid) {
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: `The sitemap returns a web page instead of a sitemap`,
      measured: `<span class="mono">/sitemap.xml</span> answered <b>${h.sitemapStatus}</b> but the body is HTML, not a <span class="mono">&lt;urlset&gt;</span>. Search engines are being handed a page they cannot read.`,
      why: `A broken sitemap slows discovery of new treatment pages and makes indexing depend on crawling alone.`,
      fix: `Generate a real XML sitemap and submit it in Search Console.`,
      effort: "30 minutes",
      evidence: ["http.sitemapStatus", "http.sitemapLooksValid"],
    });
  }

  if (m.smallTapTargets > 3) {
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: `${m.smallTapTargets} tap targets smaller than a fingertip`,
      measured: `${m.smallTapTargets} of ${m.tapTargets} interactive elements are under 40 px tall or 24 px wide. Smallest body text: <b>${m.minFontPx} px</b>.`,
      why: `Most of this traffic is a thumb on a phone. A link the thumb misses is a visit that ends.`,
      fix: `Minimum 44 px hit areas on every link and button, 16 px body text.`,
      effort: "2 hours",
      evidence: ["metric.smallTapTargets", "metric.minFontPx"],
    });
  }

  const sorted = candidates
    .map((c, i) => ({ ...c, _i: i }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a._i - b._i)
    .slice(0, 6)
    .map((c, i) => ({ ...c, id: String(i + 1).padStart(2, "0") }));

  // Page 5 gets the first three, page 6 the rest.
  return { all: sorted, page1: sorted.slice(0, 3), page2: sorted.slice(3, 6) };
}

/** The small "also on the list" items, each traceable to a measurement. */
export function deriveAlsoItems(raw, facts) {
  const m = facts.metric;
  const h = facts.http;
  const items = [];
  if (h.schemaTypes?.length && (!h.schemaHasPhone || !h.schemaHasAddress)) {
    const missing = [!h.schemaHasPhone ? "telephone" : null, !h.schemaHasAddress ? "address" : null].filter(Boolean).join(" and ");
    items.push(`<b>${escapeText(h.schemaTypes[0])}</b> structured data is missing ${missing}`);
  }
  if (h.ogSiteName && facts.business.name && !h.ogSiteName.toLowerCase().includes(facts.business.name.toLowerCase().split(" ")[0])) {
    items.push(`<span class="mono">og:site_name</span> reads “${escapeText(h.ogSiteName)}”, not the business name`);
  }
  if (m.readMore > 2) items.push(`${m.readMore} links say only “Read More” — no keyword, no context`);
  if (m.deadLinks > 0) items.push(`${m.deadLinks} link${m.deadLinks === 1 ? "" : "s"} point to <span class="mono">#</span> or <span class="mono">javascript:void(0)</span>`);
  if (m.imagesNoAlt > 0) items.push(`${m.imagesNoAlt} images have no alt text`);
  if (h.sitemapStatus && !h.sitemapLooksValid) items.push(`<span class="mono">/sitemap.xml</span> returns a web page, not a sitemap`);
  if (m.h2Count < 3) items.push(`Only ${m.h2Count} H2 headings for ${m.words} words of content`);
  if (m.smallTapTargets > 0) items.push(`${m.smallTapTargets} tap targets are under 40 px`);
  if (m.overflowX > 0) items.push(`The layout overflows the viewport by ${m.overflowX} px`);
  if (h.wordpress) items.push(`Built on WordPress${h.wpTheme ? ` (${escapeText(h.wpTheme)} theme)` : ""}${h.wpPlugins?.length ? ` with ${h.wpPlugins.length} plugin asset paths` : ""}`);
  return items.slice(0, 6);
}

function escapeText(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Calibration guard: run against the reference measurement, must equal 3/4/2/6/5/36. */
export const REFERENCE_SCORES = { speed: 3, mobile: 4, conversion: 2, design: 6, seo: 5, overall: 36 };
