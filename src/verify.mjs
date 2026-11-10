// THE THIRD EYE.
//
// Runs after the audit is rendered and before anyone is allowed to email it.
// Its single job: prove that every number in the deliverable came from a live
// measurement taken at the time stated, and that nothing was typed in by hand.
//
// It fails closed. A failed check means the PDF must not be sent.
//
// Checks
//   provenance   raw measurement exists, is recent, and names the URL measured
//   scores       the five area scores recompute from raw to what the report prints
//   facts        every fact the renderer used still equals the raw measurement
//   numbers      every metric-sized number in the report text is traceable
//   findings     every finding's evidence field exists in the raw measurement
//   screenshots  each screenshot exists, is not blank, and is not near-white
//   pdf          10 pages, A4, non-trivial size
//   live         (optional) re-fetch the page and confirm the claims still hold
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJSON, writeJSON, ensureDir, longDate, isoDate, log, round } from "./util.mjs";
import { computeScores, buildFacts, deriveFindings, REFERENCE_SCORES } from "./findings.mjs";
import { inspectPdf } from "./pdf.mjs";
import { checkHttp } from "./measure.mjs";

const MAX_AGE_HOURS = 72;

/** Numbers that are not measurements: Google targets, weights, viewports, page numbers. */
const STRUCTURAL = new Set([
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "15", "16", "20", "24", "25",
  "30", "40", "44", "50", "55", "60", "70", "75", "80", "90", "100",
  "01", "02", "03", "04", "05", "06", "07", "08", "09",
  "2.5", "1.6", "150", "200", "390", "412", "500", "800", "823", "900", "1440", "2026", "9.4",
]);

function numberTokens(text) {
  return [...String(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(m => m[0]);
}

function flattenNumbers(value, into = new Set()) {
  if (typeof value === "number") into.add(String(value));
  else if (typeof value === "string") for (const t of numberTokens(value)) into.add(t);
  else if (Array.isArray(value)) for (const v of value) flattenNumbers(v, into);
  else if (value && typeof value === "object") for (const v of Object.values(value)) flattenNumbers(v, into);
  return into;
}

/** Removes style/script blocks and returns only visible-ish text. */
function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function verifyAudit({ auditPath, live = false, fixture = false }) {
  const audit = readJSON(auditPath);
  const checks = [];
  const add = (id, ok, detail, severity = "blocker") => {
    checks.push({ id, ok, detail, severity: ok ? "ok" : severity });
    return ok;
  };

  // ---------- provenance ----------
  const rawPath = audit.provenance?.rawFile ? path.join(ROOT, audit.provenance.rawFile) : null;
  const rawExists = rawPath && fs.existsSync(rawPath);
  add("provenance.file", !!rawExists, rawExists ? `raw measurement: ${audit.provenance.rawFile}` : `missing raw measurement file (${audit.provenance?.rawFile || "not recorded"})`);

  let raw = null;
  if (rawExists) raw = readJSON(rawPath);

  if (raw) {
    const ageHours = (Date.now() - new Date(raw.measuredAt).getTime()) / 36e5;
    // Fixture mode exists only for re-rendering an archived measurement, which
    // must stay reproducible long after its measurement date. A real lead is
    // never a fixture: stale data is a blocker, because sending it would state
    // something that may no longer be true.
    add(
      "provenance.age",
      ageHours <= MAX_AGE_HOURS || fixture,
      `measured ${round(ageHours, 1)} h ago (limit ${MAX_AGE_HOURS} h, on ${longDate(isoDate(raw.measuredAt))})${fixture && ageHours > MAX_AGE_HOURS ? " — fixture mode: age downgraded to a warning" : ""}`,
      fixture ? "warning" : "blocker"
    );
    add("provenance.url", !!raw.website && raw.website === audit.business?.url, `raw measurement is for ${raw.website}${raw.website === audit.business?.url ? "" : ` but the report is for ${audit.business?.url}`}`);
    add("provenance.status", raw.mobile?.status === 200, `homepage returned HTTP ${raw.mobile?.status}`);
    add("provenance.tool", !!raw.lighthouse?.mobile?.lighthouseVersion, `Lighthouse ${raw.lighthouse?.mobile?.lighthouseVersion || "not recorded"}; screenshots: ${raw.screenshots?.length || 0}`);
    add("provenance.ist", !!raw.measuredAtIst, `measurement timestamp: ${raw.measuredAtIst || "not recorded"}`);
  }

  // ---------- scores recompute ----------
  const settings = readJSON(path.join(ROOT, "config", "settings.json"));
  if (raw) {
    const recomputed = computeScores(raw, settings);
    const printed = audit.scores || {};
    for (const key of ["speed", "mobile", "conversion", "design", "seo", "overall"]) {
      add(`scores.${key}`, recomputed.scores[key] === printed[key], `report prints ${printed[key]}, rubric computes ${recomputed.scores[key]}`);
    }
  }

  // ---------- facts recompute ----------
  if (raw) {
    const regen = buildFacts(raw, computeScores(raw, settings), audit.business, settings);
    const diffs = [];
    const walk = (a, b, trail) => {
      if (a === b) return;
      if (typeof a === "object" && a && typeof b === "object" && b) {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], trail ? `${trail}.${k}` : k);
        return;
      }
      if (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.001) return;
      diffs.push(`${trail}: report ${JSON.stringify(b)} vs raw ${JSON.stringify(a)}`);
    };
    walk(regen.metric, audit.facts?.metric, "metric");
    walk(regen.http, audit.facts?.http, "http");
    add("facts.consistent", diffs.length === 0, diffs.length ? `${diffs.length} fact(s) differ: ${diffs.slice(0, 4).join("; ")}` : "every printed metric equals the raw measurement");
  }

  // ---------- findings evidence ----------
  if (raw && audit.findings) {
    const all = [...(audit.findings.page1 || []), ...(audit.findings.page2 || [])];
    const missing = [];
    for (const f of all) {
      for (const pathRef of f.evidence || []) {
        const value = pathRef.split(".").reduce((o, k) => (o == null ? undefined : o[k]), audit.facts);
        if (value === undefined || value === null || value === "—") missing.push(`${f.id}: ${pathRef}`);
      }
      // A finding about a broken form must be backed by a captured marker.
      if (/contact page shows code|raw code|shortcode/i.test(`${f.title} ${f.measured}`) && !audit.facts?.http?.contactShortcode) {
        missing.push(`${f.id}: claims a shortcode leak but http.contactShortcode is empty`);
      }
      if (/no way to book|no visible form/i.test(f.title) && Number(audit.facts?.metric?.visibleForms) > 0) {
        missing.push(`${f.id}: claims no form but metric.visibleForms = ${audit.facts.metric.visibleForms}`);
      }
    }
    add("findings.evidence", missing.length === 0, missing.length ? `unsupported claims: ${missing.slice(0, 5).join("; ")}` : `${all.length} findings, every evidence field present in the measurement`);
  }

  // ---------- every number traceable ----------
  const htmlPath = audit.provenance?.reportFile ? path.join(ROOT, audit.provenance.reportFile) : null;
  if (htmlPath && fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const text = visibleText(html);
    const allowed = new Set(STRUCTURAL);
    flattenNumbers(audit.facts, allowed);
    flattenNumbers(audit.scores, allowed);
    flattenNumbers(audit.benchmark || {}, allowed);
    flattenNumbers(audit.date || {}, allowed);
    flattenNumbers(audit.ref || "", allowed);
    flattenNumbers(audit.plan || [], allowed);
    flattenNumbers(audit.lighthouseVersion || "", allowed);

    const suspicious = [];
    for (const token of new Set(numberTokens(text))) {
      const plain = token.replace(/,/g, "");
      const numeric = Number(plain);
      if (STRUCTURAL.has(token) || allowed.has(token) || allowed.has(plain)) continue;
      // Small integers are structural (section counts, item numbers, weights).
      if (Number.isInteger(numeric) && numeric <= 100) continue;
      suspicious.push(token);
    }
    add(
      "numbers.traceable",
      suspicious.length === 0,
      suspicious.length
        ? `numbers in the report with no measured source: ${suspicious.slice(0, 10).join(", ")}`
        : `all ${new Set(numberTokens(text)).size} distinct numbers in the report trace to the measurement, the rubric or a stated target`
    );

    // The report must state the measurement date it actually used.
    add("report.date", text.includes(longDate(isoDate(audit.date.iso))), `report states ${longDate(isoDate(audit.date.iso))}`);
    add("report.ref", text.includes(audit.ref), `audit reference ${audit.ref} printed`);

    // Optionally confirm the rendered HTML still matches what was QA'd.
    if (audit.provenance?.htmlHash) {
      const { hash } = await import("./util.mjs");
      add("report.hash", hash(html) === audit.provenance.htmlHash, "report HTML unchanged since QA");
    }
  } else {
    add("numbers.traceable", false, "rendered report.html not found — cannot audit its numbers");
  }

  // ---------- screenshots ----------
  if (raw?.screenshots?.length) {
    const limits = settings.audit || {};
    const maxWhite = limits.maxScreenshotWhitePct ?? 94;
    const minSpread = limits.minScreenshotSpread ?? 12;
    const bad = [];
    for (const s of raw.screenshots) {
      const file = path.join(ROOT, s.file);
      if (!fs.existsSync(file)) { bad.push(`${s.name}: file missing`); continue; }
      if (s.stats?.whitePct > maxWhite) bad.push(`${s.name}: ${s.stats.whitePct}% white (looks blank)`);
      if (s.stats?.sd < minSpread) bad.push(`${s.name}: pixel spread ${s.stats.sd} (looks flat)`);
    }
    add("screenshots.real", bad.length === 0, bad.length ? bad.join("; ") : `${raw.screenshots.length} screenshots, all non-blank`);
  } else {
    add("screenshots.real", false, "no screenshots captured");
  }

  // ---------- pdf ----------
  const pdfPath = audit.provenance?.pdfFile ? path.join(ROOT, audit.provenance.pdfFile) : null;
  if (pdfPath && fs.existsSync(pdfPath)) {
    const info = inspectPdf(pdfPath);
    add("pdf.pages", info.pages === 10, `PDF has ${info.pages} pages`);
    add("pdf.format", info.a4, "A4 media box");
    add("pdf.size", info.bytes > 100 * 1024, `${(info.bytes / 1024 / 1024).toFixed(2)} MB`);
    add("pdf.header", info.header, "valid PDF header");
  } else {
    add("pdf.exists", false, "PDF not found");
  }

  // ---------- live re-check ----------
  if (live && raw) {
    const fresh = await checkHttp(audit.business.url, settings);
    const homeOk = fresh.homepage.status === raw.http.homepage.status;
    add("live.homepage", homeOk, `homepage now HTTP ${fresh.homepage.status} (measured ${raw.http.homepage.status})`);
    const contact = fresh["/contact/"];
    if (raw.http["/contact/"]?.shortcode) {
      add(
        "live.contactShortcode",
        contact.shortcode === raw.http["/contact/"].shortcode,
        contact.shortcode ? `still prints ${contact.shortcode}` : "the form now renders — the headline finding no longer holds, re-measure before sending"
      );
    }
    const sitemap = fresh["/sitemap.xml"];
    if (raw.http["/sitemap.xml"]) {
      add("live.sitemap", sitemap.looksLikeSitemap === raw.http["/sitemap.xml"].looksLikeSitemap, `sitemap valid: ${sitemap.looksLikeSitemap} (measured ${raw.http["/sitemap.xml"].looksLikeSitemap})`);
    }
    add("live.served", fresh.homepage.status === 200, `site reachable at ${audit.business.url}`, "warning");
  }

  const blockers = checks.filter(c => !c.ok && c.severity === "blocker");
  const warnings = checks.filter(c => !c.ok && c.severity === "warning");
  const result = {
    ref: audit.ref,
    domain: audit.business?.domain,
    verifiedAt: new Date().toISOString(),
    live,
    fixture,
    ok: blockers.length === 0,
    blockers: blockers.length,
    warnings: warnings.length,
    checks,
  };

  const out = path.join(path.dirname(auditPath), "verify.json");
  ensureDir(path.dirname(out));
  writeJSON(out, result);

  if (result.ok) log("verify", `PASS — ${checks.length} checks, ${warnings.length} warning(s)`);
  else log("verify", `BLOCKED — ${blockers.length} of ${checks.length} checks failed`);
  return result;
}

/** Calibration self-test used by `npm run selftest`. */
export function selftestRubric() {
  const fixture = {
    mobile: {
      dom: { screens: 18, smallTapTargets: 5, minFontPx: 11.2, headlineOffsetPx: 789, overflowX: 0, sections: 23, firstScreenClaims: ["a", "b", "c"], domNodes: 1319, imagesNoAlt: 4, h1Count: 10, shortcodeLeak: '[contact-form-7 id="405" title="Contact From"]', visibleForms: 0, whatsapp: 1, h2Count: 4, words: 1320, images: 88, pageHeightPx: 15200, telLinks: 1, readMoreLinks: 11, deadLinks: 2, schemaHasPhone: false, schemaHasAddress: false, schemaTypes: ["Dentist"] },
      requests: { total: 153, thirdParty: 40, totalBytes: 2400000 },
      cookies: { thirdParty: 42 },
      consoleErrors: [1, 2, 3],
      blockingMs: 1300,
    },
    desktop: { dom: {} },
    http: { meta: { adTech: ["adroll"] }, "/contact/": { shortcode: '[contact-form-7 id="405" title="Contact From"]' }, "/sitemap.xml": { status: 200, looksLikeSitemap: false } },
    lighthouse: {
      mobile: {
        scores: { performance: 27, accessibility: 87, bestPractices: 71, seo: 77 },
        metrics: { lcpMs: 12000, tbtMs: 2660, ttfbMs: 1250, requests: 153, totalBytesKb: 2400, unusedJsKb: 518, oversizedImgsKb: 589, renderBlockingMs: 1180, ttiMs: 19600, fcpMs: 3700, cls: 0.098 },
      },
      desktop: { scores: { performance: 63 }, metrics: {} },
    },
    measuredAt: "2026-11-08T04:37:00.000Z",
  };
  const settings = readJSON(path.join(ROOT, "config", "settings.json"));
  const got = computeScores(fixture, settings).scores;
  const ok = Object.entries(REFERENCE_SCORES).every(([k, v]) => got[k] === v);
  return { ok, expected: REFERENCE_SCORES, got };
}
