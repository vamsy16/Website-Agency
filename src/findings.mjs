// Deterministic scoring + finding selection.
//
// The rubric below is fixed arithmetic on measured values. It is calibrated so
// that the first delivered audit (8 Nov 2026) reproduces
//   3 / 4 / 2 / 6 / 5  ->  36 / 100
// from the same measured inputs. `npm run selftest` asserts that.
//
// No constant in here is a judgement about a business. Each penalty is attached
// to one measured threshold from config/settings.json.
import { clamp, round, fmtInt, fmtBytesKB, fmtSec, fmtCls, longDate, isoDate, audienceOf, adTechLabel, stickyRoutes, telDiffers } from "./util.mjs";

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
  const robotsSitemaps = Array.isArray(raw.http?.["/robots.txt"]?.sitemaps) ? raw.http["/robots.txt"].sitemaps : [];

  const lcp = lhm.lcpMs;
  const tbt = lhm.tbtMs;
  const ttfb = lhm.ttfbMs;
  const bytes = lhm.totalBytesKb;
  const dateIso = raw.measuredAt ? isoDate(raw.measuredAt) : isoDate(new Date());

  const ratio = (value, target) => (Number.isFinite(value) && target ? (value / target).toFixed(1) : "—");
  // Page-4 timeline ticks: 0–20 s, or the slowest marker rounded up to a
  // multiple of 20 s, so no dot is drawn away from its measured time (a 37.4 s
  // LCP had been pinned at the 20 s end; 26 Nov review).
  const slowest = Math.max(0, ...[ttfb, lhm.fcpMs, lcp, lhm.ttiMs].filter(Number.isFinite));
  const spanS = slowest <= 20000 ? 20 : Math.ceil(slowest / 20000) * 20;

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
      category: business.category || "",
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
      // Lighthouse reports blocking time with decimals ("992.5 ms"). Whole
      // milliseconds, unless rounding would land on the 200 ms threshold and
      // hide which side of it the measurement fell.
      tbt: Number.isFinite(tbt) ? `${fmtInt(Math.round(tbt) === 200 && tbt !== 200 ? round(tbt, 1) : Math.round(tbt))} ms` : "—",
      tbtOver: ratio(tbt, 200),
      ttiMs: lhm.ttiMs ?? null,
      timelineTicksS: [0, spanS / 4, spanS / 2, (spanS * 3) / 4, spanS],
      tti: Number.isFinite(lhm.ttiMs) ? fmtSec(lhm.ttiMs) : "—",
      ttfbMs: ttfb ?? null,
      // Lighthouse reports server response with sub-millisecond decimals;
      // "1,023.428 ms" is false precision for a single lab run.
      ttfb: Number.isFinite(ttfb) ? `${fmtInt(Math.round(ttfb))} ms` : "—",
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
      // In the markup but not visible at 390 px; and the desktop pass's count.
      h1Hidden: m.h1Hidden ?? 0,
      h1CountDesktop: raw.desktop?.dom?.h1Count ?? null,
      h2Count: m.h2Count ?? 0,
      tapTargets: m.tapTargets ?? 0,
      smallTapTargets: m.smallTapTargets ?? 0,
      minFontPx: m.minFontPx ?? "—",
      headlineOffsetPx: m.headlineOffsetPx ?? 0,
      telLinks: m.telLinks ?? 0,
      // The desktop pass's count; printed beside the 390 px count when they differ.
      telLinksDesktop: raw.desktop?.dom?.telLinks ?? null,
      // Call / WhatsApp links inside a fixed or sticky element at 390 px.
      stickyTel: m.stickyTel ?? 0,
      stickyWhatsapp: m.stickyWhatsapp ?? 0,
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
      // Only a /contact/ probe that answered 200 with a page other than the
      // homepage counts as a reachable contact page (independent review, 23 Nov).
      contactReachable: contactPageReachable(contact, raw.http?.homepage || {}, meta),
      contactShortcode: contact.shortcode || m.shortcodeLeak || null,
      sitemapStatus: sitemap.status ?? 0,
      sitemapLooksValid: !!sitemap.looksLikeSitemap,
      ...(robotsSitemaps.length ? { robotsSitemaps } : {}),
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

/**
 * The /contact/ probe proves a contact page only when it answered 200 with a
 * page that is not the homepage. A redirect to "/" or a catch-all route that
 * serves the homepage again (same title, same size) is not a contact page, so
 * the report must not call it one.
 */
function contactPageReachable(contact = {}, home = {}, meta = {}) {
  if (contact.status !== 200) return false;
  const norm = u => {
    try {
      const x = new URL(u);
      return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}`.toLowerCase();
    } catch { return String(u || "").toLowerCase(); }
  };
  if (contact.finalUrl && home.finalUrl && norm(contact.finalUrl) === norm(home.finalUrl)) return false;
  const sameTitle = !!contact.titleMatch && !!meta.titleTag && String(contact.titleMatch).trim() === String(meta.titleTag).trim();
  const sameSize = Number.isFinite(contact.bytes) && Number.isFinite(home.bytes) && Math.abs(contact.bytes - home.bytes) <= Math.max(64, home.bytes * 0.01);
  return !(sameTitle && sameSize);
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
  const v = audienceOf({ ...facts.business, ...business });
  const candidates = [];

  if (m.visibleForms === 0 && h.contactShortcode) {
    candidates.push({
      severity: "Critical",
      tone: "crit",
      title: `Your Contact page shows code where the form should be`,
      measured: `The page at <b>${business.contactPage || business.domain + "/contact/"}</b> prints <span class="mono">${escapeText(h.contactShortcode)}</span> as visible text. The form itself never renders. The homepage also has <b>${m.visibleForms}</b> visible forms with fields.`,
      why: `This is the page every “Contact” link, Google Business Profile button and ad click lands on. A ${v.person} who has decided to ${v.act} sees a broken page at the exact moment they were ready to choose you.`,
      fix: v.health
        ? `Rebuild the form: name, phone, treatment, preferred branch, preferred date. Add a thank-you page so it can be tracked.`
        : `Rebuild the form: name, phone, what they need, best time to call. Add a thank-you page so it can be tracked.`,
      effort: "1 hour",
      evidence: ["http.contactShortcode", "metric.visibleForms"],
    });
  }

  if (m.visibleForms === 0) {
    candidates.push({
      severity: "Critical",
      tone: "crit",
      title: v.health ? `No appointment form fields were detected on the homepage` : `No enquiry form fields were detected on the homepage`,
      measured: `Zero form fields on the home page. The page has <b>${m.telLinks}</b> click-to-call link${m.telLinks === 1 ? "" : "s"}${telDiffers(m) ? ` at 390 px (${m.telLinksDesktop} on the desktop layout)` : ""} and <b>${m.whatsapp}</b> WhatsApp capture element${m.whatsapp === 1 ? "" : "s"}.`,
      why: v.health
        ? `A patient may prefer a written appointment request. Check whether a separate booking page or another suitable contact route already meets that need. No lost appointments were measured.`
        : `Visitors may prefer different contact routes. Check existing phone, WhatsApp and separate contact-page options before deciding whether a homepage form is useful. No lost enquiries were measured.`,
      fix: stickyRoutes(m)
        ? `${v.health ? "A booking" : "An enquiry"} block above the fold and a working form that emails the business, linked from the always-visible ${stickyRoutes(m)} the page already has.`
        : v.health
          ? `A booking block above the fold, a sticky “Call / Book” bar on mobile, and a working form that emails the business.`
          : `An enquiry block above the fold, a sticky “Call / WhatsApp” bar on mobile, and a working form that emails the business.`,
      effort: "half a day",
      evidence: ["metric.visibleForms", "metric.telLinks", "metric.whatsapp"],
    });
  }

  if ((m.perfMobile !== "—" && m.perfMobile < 50) || (m.lcpMs && m.lcpMs > 4000)) {
    candidates.push({
      severity: "High",
      tone: "med",
      title: `A ${m.perfMobile}/100 mobile score and ${/^(8|1[18](?![\d]))/.test(String(m.lcp)) ? "an" : "a"} ${m.lcp} LCP`,
      // Only costs that exist are listed: "render-blocking CSS/JS costing
      // 0 ms" was printed as evidence on a High finding (26 Nov review).
      measured: [
        `LCP <b>${m.lcp}</b>`, `TBT <b>${m.tbt}</b>`, `${m.requests} requests`, `<b>${m.bytes}</b>`,
        Number(m.unusedJsKb) > 0 ? `${fmtInt(m.unusedJsKb)} KiB unused JavaScript` : null,
        Number(m.oversizedImgsKb) > 0 ? `${fmtInt(m.oversizedImgsKb)} KiB of oversized images` : null,
        Number(m.renderBlockingMs) > 0 ? `render-blocking CSS/JS costing ${fmtInt(m.renderBlockingMs)} ms` : null,
      ].filter(Boolean).join(" · ") + ".",
      why: `Google’s thresholds are 2.5 s for LCP and 200 ms for TBT. ${speedGap(m)} Page experience is a documented ranking input.`,
      fix: speedFix(m, h),
      effort: "2–3 days, no redesign",
      evidence: ["metric.lcpMs", "metric.tbtMs", "metric.requests", "metric.bytesKb"],
    });
  }

  if (m.h1Count > 1) {
    candidates.push({
      severity: "High",
      tone: "med",
      title: `${m.h1Count} H1 headings competing for one page`,
      measured: `${Number(m.h1Hidden) > 0 ? `At 390 px the homepage shows <b>${m.h1Count} × H1</b> and ${m.h2Count} × H2; the markup holds ${m.h1Hidden} more H1${m.h1Hidden === 1 ? "" : "s"} that ${m.h1Hidden === 1 ? "was" : "were"} not visible when the page loaded.` : `The homepage carries <b>${m.h1Count} × H1</b> and ${m.h2Count} × H2.`}${(raw.mobile?.dom?.firstScreenClaims || []).length ? ` Headline blocks seen in the first screen: ${(raw.mobile?.dom?.firstScreenClaims || []).slice(0, 3).map(c => `“${c}”`).join(" · ")}.` : ""}`,
      why: `One page, one H1 — that is how a search engine reads the topic and how a person reads the offer. Several slogans mean the reader does the work of deciding what the business actually does, and the crawler gets no clear signal.`,
      fix: v.health
        ? `One H1 naming the service and the city, then H2s for treatments, locations and doctors.`
        : `One H1 naming what you offer and the city, then H2s for products or services, location and contact details.`,
      effort: "2 hours",
      evidence: ["metric.h1Count", "metric.h2Count"],
    });
  }

  if (m.sections > 8 || m.screens > 8) {
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: `${Math.round(m.screens)} screen heights of homepage content`,
      measured: `${fmtInt(m.pageHeightPx)} px tall at 390 px wide. ${m.sections ? `${m.sections} section${m.sections === 1 ? "" : "s"}, ` : ""}${m.images} image${m.images === 1 ? "" : "s"}, ${fmtInt(m.words)} words. These dimensions alone do not establish where contact details appear.`,
      why: `A long page can require more navigation. Review the captured screens to check whether key service and contact information is easy to find; no scrolling behaviour was measured.`,
      // The rubric's own threshold (6 screens), as in plan row 06. "Five
      // sections" was prescribed to a page measured at 3 sections (26 Nov).
      fix: `A homepage of 6 screens or fewer: offer, proof, services, location and hours, book. Move the rest to dedicated pages.`,
      effort: "included in a rebuild",
      evidence: ["metric.sections", "metric.screens", "metric.pageHeightPx"],
    });
  }

  if (m.thirdPartyCookies > 5 || m.consoleErrors > 0) {
    // Say only what was recorded. A console "error" can be a failed file
    // request rather than a script fault, the blocking figure is not
    // attributed to third parties, and a retargeting fix is offered only when
    // advertising code was actually seen.
    const errs = m.consoleErrors;
    const errWord = `error${errs === 1 ? "" : "s"}`;
    const cookies = m.thirdPartyCookies;
    const ads = adSignals(facts);
    const thirdParty = m.thirdPartyRequests > 0;
    const outside = (m.thirdPartyDomains || []).filter(d => !builderHost(d));
    const domainLabel = d => builderHost(d) ? `${d}, ${builderHost(d)}’s site-builder file server` : d;
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: !(cookies > 0) && errs > 0
        ? `The browser console shows ${errs} ${errWord} on load`
        : [cookies > 0 ? `${cookies} third-party cookie${cookies === 1 ? "" : "s"}` : null, errs > 0 ? `${errs} console ${errWord}` : null].filter(Boolean).join(" and ") + " on the homepage",
      measured: [
        thirdParty
          ? `${m.thirdPartyRequests} third-party request${m.thirdPartyRequests === 1 ? "" : "s"} from ${m.thirdPartyDomains.length} external domain${m.thirdPartyDomains.length === 1 ? "" : "s"}${m.thirdPartyDomains.length ? ` (${m.thirdPartyDomains.length > 6 ? "including " : ""}${m.thirdPartyDomains.slice(0, 6).map(domainLabel).join("; ")})` : ""}.`
          : `No third-party requests were recorded.`,
        cookies > 0 ? `<b>${cookies} third-party cookie${cookies === 1 ? "" : "s"}</b>.` : null,
        m.blockingMs >= 50 ? `Long tasks blocked the main thread for <b>${fmtInt(m.blockingMs)} ms</b> in the browser pass.` : null,
        errs > 0 ? `${errs} ${errWord} in the browser console on load.` : null,
      ].filter(Boolean).join(" "),
      why: [
        errs > 0 ? `Console errors can come from a failed file request or a script fault, and some stop a button, menu or form from working. Which controls, if any, are affected was not tested.` : null,
        cookies > 5
          ? `Ad and analytics pixels add weight to every visit${v.health ? ", and on a healthcare page they are a trust and data-protection question" : " and raise privacy questions for the visitor"}.`
          : thirdParty && outside.length
            ? (v.health ? `On a healthcare page, each request to an outside service (${outside.slice(0, 3).join(", ")}${outside.length > 3 ? " and others" : ""}) also shares visitor details, such as the IP address, with that company.` : `Each request to an outside service adds weight and shares visitor details with that company.`)
            : null,
      ].filter(Boolean).join(" "),
      fix: sentence([
        ads.length ? `review whether each advertising tag (${ads.join(", ")}) is still needed` : null,
        errs > 0 ? `find and fix the cause of each console error, then re-test the menu, buttons and form` : null,
        !ads.length && cookies > 5 ? `keep only the third-party scripts the site still uses` : null,
      ]),
      effort: "one afternoon",
      evidence: ["metric.thirdPartyCookies", "metric.consoleErrors", "metric.blockingMs"],
    });
  }

  // A sitemap declared in robots.txt may live elsewhere; then a 404 at
  // /sitemap.xml says nothing, and no finding is made.
  if (h.sitemapStatus && !h.sitemapLooksValid && !(h.robotsSitemaps || []).length) {
    const missing = h.sitemapStatus === 404 || h.sitemapStatus === 410;
    candidates.push({
      severity: "Medium",
      tone: "med",
      title: missing ? `No XML sitemap was found at /sitemap.xml` : `The sitemap returns a web page instead of a sitemap`,
      measured: missing
        ? `<span class="mono">/sitemap.xml</span> answered <b>${h.sitemapStatus}</b> (not found), and robots.txt declares no other sitemap.`
        : `<span class="mono">/sitemap.xml</span> answered <b>${h.sitemapStatus}</b> but the body is HTML, not a <span class="mono">&lt;urlset&gt;</span>. Search engines are being handed a page they cannot read.`,
      why: missing
        ? `Without a sitemap, search engines discover new ${v.health ? "treatment" : "product and service"} pages by crawling links alone.`
        : `A broken sitemap slows discovery of new ${v.health ? "treatment" : "product and service"} pages and makes indexing depend on crawling alone.`,
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
      // A smallest font of 0 px (or none measured) is not a reading anyone can
      // act on, so the sentence is left out rather than printed as "0 px".
      measured: `${m.smallTapTargets} of the ${m.tapTargets} interactive elements visible when the page loaded are under 40 px tall or 24 px wide.${Number(m.minFontPx) > 0 ? ` Smallest body text: <b>${m.minFontPx} px</b>.` : ""}`,
      why: `Small controls can be difficult to select on touchscreens. No visitor device mix, mis-taps or abandoned visits were measured.`,
      fix: `Minimum 44 px hit areas on every link and button${Number(m.minFontPx) > 0 && Number(m.minFontPx) < 16 ? ", 16 px body text" : ""}.`,
      effort: "2 hours",
      evidence: ["metric.smallTapTargets", ...(Number(m.minFontPx) > 0 ? ["metric.minFontPx"] : [])],
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

/**
 * The small "also on the list" items, each traceable to a measurement. An item
 * already printed as a finding on page 5 or 6 (same evidence) is not repeated.
 */
export function deriveAlsoItems(raw, facts, printed = []) {
  const m = facts.metric;
  const h = facts.http;
  const covered = new Set(printed.flatMap(f => f.evidence || []));
  const items = [];
  if (h.schemaTypes?.length && (!h.schemaHasPhone || !h.schemaHasAddress)) {
    const missing = [!h.schemaHasPhone ? "telephone" : null, !h.schemaHasAddress ? "address" : null].filter(Boolean).join(" and ");
    // "WebPage structured data is missing telephone and address" (26 Nov
    // review) asked a type that cannot hold those fields to hold them.
    const biz = h.schemaTypes.find(t => BUSINESS_SCHEMA.test(t));
    items.push(biz
      ? `<b>${escapeText(biz)}</b> structured data is missing ${missing}`
      : `Structured data (${h.schemaTypes.slice(0, 3).map(escapeText).join(", ")}) has no business entry with ${missing}`);
  }
  if (h.ogSiteName && facts.business.name && !h.ogSiteName.toLowerCase().includes(facts.business.name.toLowerCase().split(" ")[0])) {
    items.push(`<span class="mono">og:site_name</span> reads “${escapeText(h.ogSiteName)}”, not the business name`);
  }
  if (m.readMore > 2) items.push(`${m.readMore} links say only “Read More” — no keyword, no context`);
  if (m.deadLinks > 0) items.push(`${m.deadLinks} ${m.deadLinks === 1 ? "link points" : "links point"} to <span class="mono">#</span> or <span class="mono">javascript:void(0)</span>`);
  if (m.imagesNoAlt > 0) items.push(`${m.imagesNoAlt} image${m.imagesNoAlt === 1 ? " has" : "s have"} no alt text`);
  if (!covered.has("http.sitemapStatus") && h.sitemapStatus && !h.sitemapLooksValid && !(h.robotsSitemaps || []).length) {
    items.push(h.sitemapStatus === 404 || h.sitemapStatus === 410
      ? `No sitemap at <span class="mono">/sitemap.xml</span> (HTTP ${h.sitemapStatus})`
      : `<span class="mono">/sitemap.xml</span> returns a web page, not a sitemap`);
  }
  if (m.h2Count < 3) items.push(`${m.h2Count === 0 ? "No H2 headings" : `Only ${m.h2Count} H2 heading${m.h2Count === 1 ? "" : "s"}`} for ${fmtInt(m.words)} words of content`);
  if (!covered.has("metric.smallTapTargets") && m.smallTapTargets > 0) items.push(`${m.smallTapTargets} tap targets are under 40 px`);
  if (m.overflowX > 0) items.push(`The layout overflows the viewport by ${m.overflowX} px`);
  if (h.wordpress) items.push(`Built on WordPress${h.wpTheme ? ` (${escapeText(h.wpTheme)} theme)` : ""}${h.wpPlugins?.length ? ` with ${h.wpPlugins.length} plugin asset paths` : ""}`);
  return items.slice(0, 6);
}

/** schema.org types that can carry a business telephone and address. */
const BUSINESS_SCHEMA = /LocalBusiness|Organi[sz]ation|Corporation|Clinic|Dentist|Physician|Hospital|Medical|Pharmacy|Optician|Store|Restaurant|Hotel|Lodging|FoodEstablishment|ProfessionalService|HealthAndBeauty|Place/i;

function escapeText(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * The LCP/TBT gap, stated only where it exists: a metric inside Google's
 * threshold is never described as "over" it.
 */
export function speedGap(m) {
  const lcpOver = Number.isFinite(m.lcpMs) && m.lcpMs > 2500;
  const tbtOver = Number.isFinite(m.tbtMs) && m.tbtMs > 200;
  if (lcpOver && tbtOver) return `LCP is ${m.lcpOver}× its threshold and TBT ${m.tbtOver}× its threshold.`;
  if (lcpOver) return `LCP is ${m.lcpOver}× its threshold; TBT${Number.isFinite(m.tbtMs) ? ` (${m.tbt})` : ""} is within its threshold.`;
  if (tbtOver) return `TBT is ${m.tbtOver}× its threshold; LCP${Number.isFinite(m.lcpMs) ? ` (${m.lcp})` : ""} is within its threshold.`;
  return `Both are within their thresholds in this run.`;
}

/**
 * The speed fix, built only from the opportunities Lighthouse measured on this
 * page. A fast server is not told to add a CDN; a site with no plugins is not
 * told to remove them.
 */
export function speedFix(m, h = {}) {
  const parts = [];
  if (Number(m.ttfbMs) > 600) parts.push("server-side caching plus a CDN");
  if (Number(m.oversizedImgsKb) >= 100) parts.push("images re-encoded at the size they are displayed");
  if (Number(m.bytesKb) > 1600) parts.push(`the ${m.bytes} page weight cut, largest files first`); // page-07 target: under 1.6 MB
  // CSS is deferred only when render-blocking time was measured; with 0 ms
  // render-blocking the supported change is the unused JavaScript.
  if (Number(m.renderBlockingMs) >= 300) parts.push("non-critical CSS and scripts deferred");
  else if (Number(m.unusedJsKb) >= 100) parts.push(`the ${fmtInt(m.unusedJsKb)} KiB of unused JavaScript trimmed and the rest deferred`);
  // Blocking time over Google's 200 ms with neither of the above: the fix had
  // covered only images while the finding cited blocking time (26 Nov review).
  // Which scripts cause it is not measured, so they are traced first.
  else if (Number(m.tbtMs) > 200) parts.push(`the scripts behind the ${m.tbt || `${fmtInt(m.tbtMs)} ms`} of blocking time traced, then deferred or removed`);
  // Plugin asset paths are measured; whether any plugin is unused is not.
  if (h.wordpress && (h.wpPlugins || []).length) parts.push("plugins reviewed and any unused ones removed");
  if (!parts.length) return "Trace the element Lighthouse reports as the largest content and remove what delays it.";
  return sentence(parts);
}

/**
 * File servers of the site builder a page is built on. They are a different
 * domain, but the same company already serves the page, so a request to them
 * shares nothing with a new company (26 Nov review: GoDaddy's img1.wsimg.com
 * was described as "another company" on GoDaddy-built sites).
 */
const BUILDER_HOSTS = [
  [/(^|\.)wsimg\.com$/, "GoDaddy"],
  [/(^|\.)(wixstatic|parastorage)\.com$/, "Wix"],
  [/(^|\.)(squarespace|squarespace-cdn)\.com$/, "Squarespace"],
  [/(^|\.)(zyrosite|zyro)\.com$/, "Hostinger"],
  [/(^|\.)(editmysite|weebly)\.com$/, "Square Online"],
  [/(^|\.)(shopify|shopifycdn)\.com$/, "Shopify"],
];
export function builderHost(host) {
  for (const [re, name] of BUILDER_HOSTS) if (re.test(String(host || ""))) return name;
  return null;
}

/** Third-party hosts that serve advertising or retargeting code. */
const AD_HOSTS = [
  [/(^|\.)doubleclick\.net$/, "DoubleClick"],
  [/(^|\.)googleadservices\.com$/, "Google Ads"],
  [/(^|\.)googlesyndication\.com$/, "Google AdSense"],
  [/(^|\.)facebook\.net$/, "Meta Pixel"],
  [/(^|\.)adroll\.com$/, "AdRoll"],
  [/(^|\.)criteo\.(com|net)$/, "Criteo"],
  [/(^|\.)taboola\.com$/, "Taboola"],
  [/(^|\.)outbrain\.com$/, "Outbrain"],
  [/^bat\.bing\.com$/, "Microsoft Ads"],
  [/(^|\.)ads-twitter\.com$/, "X Ads"],
  [/(^|\.)ads\.linkedin\.com$/, "LinkedIn Ads"],
];

/** Advertising code actually observed: HTML markers plus third-party request hosts. */
export function adSignals(facts) {
  const labels = new Set((facts.http?.adTech || []).map(adTechLabel));
  for (const host of facts.metric?.thirdPartyDomains || []) {
    for (const [re, label] of AD_HOSTS) if (re.test(String(host).toLowerCase())) labels.add(label);
  }
  return [...labels];
}

/** ["fix a", "fix b"] -> "Fix a; fix b." */
function sentence(parts) {
  const list = parts.filter(Boolean);
  if (!list.length) return "";
  const text = list.join("; ");
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

/** Calibration guard: run against the reference measurement, must equal 3/4/2/6/5/36. */
export const REFERENCE_SCORES = { speed: 3, mobile: 4, conversion: 2, design: 6, seo: 5, overall: 36 };
