#!/usr/bin/env node
// Smart Pursuit Agency OS - command line entry point.
//
//   leads     source businesses for a state (dedupe enforced at intake)
//   audit     measure one site, render the 10-page audit, QA it, PDF it, verify it
//   sequence  build the 1 + 3 email drafts from a finished audit
//   verify    re-run the third-eye gate on an existing audit
//   status    what is in the registries
//   selftest  prove the scoring rubric still reproduces the reference audit
import path from "node:path";
import fs from "node:fs";
import {
  ROOT, argValue, hasFlag, parseList, readJSON, writeJSON, ensureDir, slug, domainOf,
  normalizeUrl, isoDate, auditRef, auditFileName, hash, log, die, fmtInt,
} from "./util.mjs";
import { loadSettings, resolveState } from "./config.mjs";
import { checkAudit, recordAudit, statusSummary, pendingLeads, updateLead } from "./dedupe.mjs";
import { fetchLeads, OSM_ATTRIBUTION, overpassEndpoints, stateBbox } from "./leads.mjs";
import { resolveBrowser, describeBrowser, BrowserError } from "./browser.mjs";
import { measureSite } from "./measure.mjs";
import { computeScores, buildFacts, deriveFindings, deriveAlsoItems } from "./findings.mjs";
import { renderReport } from "./render.mjs";
import { qaLayout, assertQa } from "./qa.mjs";
import { htmlToPdf } from "./pdf.mjs";
import { verifyAudit, selftestRubric } from "./verify.mjs";
import { writeSequence } from "./sequence.mjs";
import { screenSite, notAProspect } from "./prospect.mjs";

const argv = process.argv.slice(2);
const command = argv[0];

function usage() {
  console.log(`
Smart Pursuit Agency OS

  node src/cli.mjs run      --state "Andhra Pradesh" [--niches dentist,clinic] [--max 5] [--target 5] [--allow-no-email] [--no-site-screen] [--no-prospect-filter] [--dry-run] [--csv leads.csv]
  node src/cli.mjs leads    --state gujarat [--niches dentist,clinic] [--limit 25] [--csv leads.csv]
  node src/cli.mjs audit    --url https://example.com --name "Business Name" --city Ahmedabad [--force] [--live]
  node src/cli.mjs audit    --from-raw data/raw/<slug>.json [--fixture] [--force]
  node src/cli.mjs screen   --domain a.com,b.in | --audited   (is the email on the business's own site?)
  node src/cli.mjs reaudit  --domain a.com --reason "report wording fix"
  node src/cli.mjs sequence --audit reports/<slug>/audit.json [--send-date 2026-11-10]
  node src/cli.mjs verify   --audit reports/<slug>/audit.json [--live] [--fixture]
  node src/cli.mjs status
  node src/cli.mjs doctor   [--state "Andhra Pradesh"] [--json] [--no-install]
  node src/cli.mjs selftest

  run is the daily driver: it fetches leads for a state, then audits only the ones
  that have not been audited before. Run it as often as you like; a second run on
  the same day finds nothing new to do.

  doctor answers "can this machine run a run?" — it finds or installs a browser,
  probes every Overpass mirror and checks the state boundary. Run it first on a
  fresh machine; it never asks you for a list of businesses.

Nothing in this tool sends email. The audit command never builds a demo website.
`);
}

// ------------------------------------------------------------------ leads
async function cmdLeads() {
  const state = argValue(argv, "--state");
  if (!state) die("--state is required, e.g. --state gujarat");
  const niches = parseList(argValue(argv, "--niches"));
  const limit = Number(argValue(argv, "--limit", 25));
  const csv = argValue(argv, "--csv", null);
  const result = await fetchLeads({
    stateName: state,
    niches,
    limit,
    csv: csv === true ? null : csv,
    useOverpass: !hasFlag(argv, "--no-overpass"),
    usePlaces: !hasFlag(argv, "--no-places"),
    broad: !hasFlag(argv, "--no-broad"),
  });
  console.log(`\n  ${result.state} · ${result.broad ? "any business with a website" : result.niches.join(", ")}`);
  console.log(`  added ${result.added} new lead(s), skipped ${result.skipped} (duplicates / no website)`);
  for (const note of result.notes) console.log(`    · ${note}`);
  if (result.leads.length) {
    console.log("\n  New leads:");
    for (const l of result.leads.slice(0, 25)) {
      const label = l.nicheLabel ? ` · ${l.nicheLabel}` : "";
      console.log(`    ${l.name} — ${l.domain}${l.city ? ` · ${l.city}` : ""}${label}`);
    }
  }
  if (result.notes.some(n => n.startsWith("openstreetmap"))) console.log(`\n  ${OSM_ATTRIBUTION}`);
  console.log(`\n  Batch written to ${result.batchFile}\n`);
}

// ------------------------------------------------------------------ audit
/**
 * Produces the screenshot list the report embeds AND copies every source image
 * into reports/<slug>/assets/ so the report is self-contained.
 *
 * Each entry may carry `sourceFile` (path relative to the OS root) or `file`
 * (the name inside the assets folder). Live runs fall back to the screenshots
 * captured by measure.mjs.
 */
function buildScreens(raw, assetsDir, auditInputs) {
  const list = [];
  if (Array.isArray(auditInputs.screens) && auditInputs.screens.length) {
    for (const s of auditInputs.screens) {
      list.push({ ...s, sourceFile: s.sourceFile || s.file });
    }
  } else {
    const byName = Object.fromEntries((raw.screenshots || []).map(s => [s.name, s]));
    const first = byName["screen-1"] || byName["mobile-fold"];
    if (first) {
      list.push({
        name: "screen-1",
        sourceFile: first.file,
        label: "Screen 1",
        caption: `The first thing a visitor sees at 390 px. The first H1 begins ${fmtInt(raw.mobile?.dom?.headlineOffsetPx || 0)} px down.`,
      });
    }
    const mid = byName["screen-7"] || byName["sec2"] || byName["mobile-full"];
    if (mid) {
      list.push({
        name: mid.name,
        sourceFile: mid.file,
        label: mid.name === "screen-7" ? "Screen 7" : "Further down",
        caption: `Still scrolling. ${raw.mobile?.dom?.sections || 0} sections in total; the address, hours and a way to book sit below this point.`,
      });
    }
    const desk = byName["desktop-fold"];
    if (desk) list.push({ name: "desktop-fold", sourceFile: desk.file, label: "The same site on a laptop" });
  }

  const screens = [];
  for (const s of list) {
    const source = path.isAbsolute(s.sourceFile) ? s.sourceFile : path.join(ROOT, s.sourceFile);
    if (!fs.existsSync(source)) {
      die(`Screenshot for "${s.name}" not found at ${s.sourceFile}. A report cannot quote an image that is not on disk.`);
    }
    const name = path.basename(source);
    fs.copyFileSync(source, path.join(assetsDir, name));
    screens.push({ name: s.name, file: name, src: `assets/${name}`, label: s.label, caption: s.caption });
  }
  return screens;
}

/** Copies a demo screenshot (if configured) into the report assets folder. */
function buildDemo(auditInputs, assetsDir) {
  const demo = auditInputs.demo;
  if (!demo || (!demo.imageSource && !demo.image)) return null;
  if (!demo.imageSource) return demo;
  const source = path.isAbsolute(demo.imageSource) ? demo.imageSource : path.join(ROOT, demo.imageSource);
  if (!fs.existsSync(source)) {
    die(`Demo screenshot not found at ${demo.imageSource}. Remove the demo block or add the file.`);
  }
  const name = path.basename(source);
  fs.copyFileSync(source, path.join(assetsDir, name));
  return { ...demo, image: `assets/${name}` };
}

/** A blocked or failed audit, as an exception, so a batch run can keep going. */
class AuditError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = "AuditError";
    this.kind = kind;
    Object.assign(this, extra);
  }
}

/** Turns a lead row from data/leads.json into the business block an audit needs. */
function leadToBusiness(lead, settings) {
  const website = normalizeUrl(lead.website);
  const domain = lead.domain || domainOf(website);
  return {
    name: lead.name,
    legalName: lead.legalName || lead.name,
    url: website,
    domain,
    city: lead.city || null,
    state: lead.state || null,
    niche: lead.niche || null,
    nicheLabel: lead.nicheLabel || null,
    category: lead.category || null,
    contactName: lead.contactName || lead.name,
    contactPage: lead.contactPage || website.replace(/\/$/, "") + "/contact/",
    phone: lead.phone || null,
    email: lead.email || null,
    ref: auditRef(settings.agency.auditRefPrefix, new Date(), lead.name),
  };
}

/**
 * One audit, end to end: gate, measure, score, render, QA, PDF, third eye,
 * register. Throws AuditError instead of exiting, so `run` can process a queue
 * without the first blocked lead killing the batch.
 *
 * kinds:  duplicate  the registry says no (already audited, or do-not-audit)
 *         dead-site  the site did not return 200
 *         failed     measurement, render, QA, PDF or a third-eye blocker
 */
async function runAudit({
  settings,
  business = null,
  fromRaw = null,
  fixture = false,
  force = false,
  live = false,
  skipLighthouse = false,
  announce = true,
} = {}) {
  let raw = null;

  if (fromRaw && fromRaw !== true) {
    const rawPath = path.resolve(ROOT, String(fromRaw));
    raw = readJSON(rawPath);
    if (!raw.business) throw new AuditError("failed", `${fromRaw} has no "business" block. Add name, legalName, url, domain, city, state, contactPage.`);
    business = { ...raw.business };
    business.url = normalizeUrl(business.url);
    business.domain = business.domain || domainOf(business.url);
    business.ref = business.ref || auditRef(settings.agency.auditRefPrefix, raw.measuredAt || new Date(), business.name);
    log("audit", `using recorded measurement ${path.relative(ROOT, rawPath)}`);
  } else {
    if (!business) throw new AuditError("failed", "runAudit needs a business block, or --from-raw <file>");
    business.url = normalizeUrl(business.url);
    business.domain = business.domain || domainOf(business.url);
    business.ref = business.ref || auditRef(settings.agency.auditRefPrefix, new Date(), business.name);
  }

  const businessSlug = slug(business.name) || slug(business.domain) || "audit";
  const reportDir = ensureDir(path.join(ROOT, "reports", businessSlug));
  const assetsDir = ensureDir(path.join(reportDir, "assets"));

  // ---- duplicate gate, BEFORE any network call ----
  const gate = checkAudit(business.url, { cooldownDays: settings.audit.reauditCooldownDays, force });
  if (gate.duplicate) {
    throw new AuditError("duplicate", `Refusing to audit ${business.domain}: it is already on file.\n  - ${gate.reasons.join("\n  - ")}\n\n  Use --force only if you have a reason (e.g. a re-audit for before/after proof).\n  This is what stops a lead receiving the same audit twice.`, { gate });
  }
  if (gate.forced) log("audit", `duplicate overridden with --force: ${gate.reasons.join("; ")}`);

  // ---- measure ----
  if (!raw) {
    log("audit", `measuring ${business.url} (mobile + desktop + Lighthouse)`);
    try {
      raw = await measureSite(business.url, { slug: businessSlug, skipLighthouse });
    } catch (err) {
      if (err instanceof BrowserError) {
        throw new AuditError("no-browser", `No browser available to measure ${business.domain}: ${err.message}\n  ${(err.fix || []).join("\n  ")}`);
      }
      throw new AuditError("failed", `Measurement failed: ${err.message}`);
    }
    if (raw.mobile?.status !== 200) {
      throw new AuditError("dead-site", `The site did not return HTTP 200 (got ${raw.mobile?.status || raw.mobile?.navError}). A dead site is not an audit.`);
    }
  }
  raw.business = business;

  // ---- derive ----
  const scoring = computeScores(raw, settings);
  const facts = buildFacts(raw, scoring, business, settings);
  const findings = deriveFindings(raw, facts, business);
  const also = deriveAlsoItems(raw, facts);

  if (!findings.page1.length) throw new AuditError("failed", "No defensible findings were produced from the measurement. Refusing to render a report with nothing to say.");

  const auditInputs = fromRaw ? raw : {};
  const screens = buildScreens(raw, assetsDir, auditInputs);
  const demo = buildDemo(auditInputs, assetsDir);

  const audit = {
    schemaVersion: "1.0",
    ref: business.ref,
    business,
    date: facts.date,
    scores: scoring.scores,
    scoreRaw: scoring.raw,
    scoreBreakdown: scoring.breakdown,
    penalties: scoring.penalties,
    facts,
    findings,
    also,
    screens,
    benchmark: auditInputs.benchmark || null,
    plan: auditInputs.plan || null,
    phases: auditInputs.phases || null,
    cover: auditInputs.cover || null,
    summary: auditInputs.summary || null,
    headings: auditInputs.headings || null,
    demo,
    subjectNoun: auditInputs.subjectNoun || "customers",
    lighthouseVersion: raw.lighthouse?.mobile?.lighthouseVersion || null,
    provenance: {
      rawFile: raw.rawFile || (fromRaw ? path.relative(ROOT, path.resolve(ROOT, String(fromRaw))).replace(/\\/g, "/") : null),
      measuredAt: raw.measuredAt,
      measuredAtIst: raw.measuredAtIst,
      tool: raw.tool,
    },
  };

  // ---- render + qa + pdf ----
  log("render", `10-page report (${scoring.scores.overall}/100, ${findings.all.length} findings)`);
  const html = renderReport(audit);
  const htmlPath = path.join(reportDir, "report.html");
  fs.writeFileSync(htmlPath, html);
  audit.provenance.reportFile = path.relative(ROOT, htmlPath).replace(/\\/g, "/");

  const qa = await qaLayout({ htmlFile: htmlPath, expectPages: 10 });
  writeJSON(path.join(reportDir, "qa.json"), qa);
  assertQa(qa);

  const pdfName = auditFileName(settings.agency.name, business);
  const pdfPath = path.join(reportDir, pdfName);
  const pdf = await htmlToPdf({ htmlFile: htmlPath, pdfFile: pdfPath, expectPages: 10 });
  audit.pdfPages = pdf.pages;
  audit.pdfBytes = pdf.bytes;
  audit.provenance.pdfFile = path.relative(ROOT, pdfPath).replace(/\\/g, "/");
  audit.provenance.htmlHash = hash(html);

  const auditPath = path.join(reportDir, "audit.json");
  writeJSON(auditPath, audit);

  // ---- third eye ----
  const verdict = await verifyAudit({ auditPath, live, fixture });
  if (!verdict.ok) {
    const blockers = verdict.checks.filter(c => !c.ok);
    for (const c of blockers) console.error(`   - ${c.id}: ${c.detail}`);
    throw new AuditError(
      "failed",
      `The third-eye check blocked this audit: ${blockers.map(c => c.id).join(", ")}. Do not send it.`,
      { verdict },
    );
  }

  recordAudit({
    website: business.url,
    name: business.name,
    ref: business.ref,
    pdfPath: audit.provenance.pdfFile,
    auditPath: path.relative(ROOT, auditPath).replace(/\\/g, "/"),
    reportPath: audit.provenance.reportFile,
    scores: scoring.scores,
    pdfPages: pdf.pages,
    pdfBytes: pdf.bytes,
    mode: fromRaw ? "from-raw" : "live",
  });

  if (announce) {
    console.log(`\n  Audit complete — ${business.name}`);
    console.log(`  Overall ${scoring.scores.overall}/100  ·  speed ${scoring.scores.speed} mobile ${scoring.scores.mobile} conversion ${scoring.scores.conversion} design ${scoring.scores.design} seo ${scoring.scores.seo}`);
    console.log(`  Findings: ${findings.all.map(f => `${f.id} ${f.severity}`).join(" · ")}`);
    console.log(`  PDF:    ${audit.provenance.pdfFile}  (${pdf.pages} pages, ${(pdf.bytes / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  Audit:  ${path.relative(ROOT, auditPath).replace(/\\/g, "/")}`);
    console.log(`  Verify: ${verdict.checks.length} checks passed${verdict.warnings ? `, ${verdict.warnings} warning(s)` : ""}`);
    console.log(`\n  Next: node src/cli.mjs sequence --audit "${path.relative(ROOT, auditPath).replace(/\\/g, "/")}" --send-date ${isoDate(new Date())}\n`);
  }

  return {
    audit,
    auditPath,
    pdfFile: audit.provenance.pdfFile,
    verdict,
    scores: scoring.scores,
    findings: findings.all,
    business,
  };
}

async function cmdAudit() {
  const settings = loadSettings();
  const fromRaw = argValue(argv, "--from-raw");
  const fixture = hasFlag(argv, "--fixture");
  if (fixture && (!fromRaw || fromRaw === true)) die("--fixture is only valid with --from-raw. A live audit must be fresh.");

  let business = null;
  if (!fromRaw || fromRaw === true) {
    const url = argValue(argv, "--url");
    const name = argValue(argv, "--name");
    if (!url || url === true) die("--url is required (or use --from-raw <file>)");
    if (!name || name === true) die("--name is required");
    const stateName = argValue(argv, "--state");
    const stateCfg = stateName && stateName !== true ? resolveState(stateName) : null;
    const website = normalizeUrl(url);
    business = {
      name,
      legalName: argValue(argv, "--legal-name", name),
      url: website,
      domain: domainOf(website),
      city: argValue(argv, "--city", stateCfg?.cities?.[0] || null),
      state: stateCfg?.state || argValue(argv, "--state-name", null),
      niche: argValue(argv, "--niche", null),
      contactName: argValue(argv, "--contact", name),
      contactPage: argValue(argv, "--contact-page", website.replace(/\/$/, "") + "/contact/"),
    };
  }

  try {
    await runAudit({
      settings,
      business,
      fromRaw,
      fixture,
      force: hasFlag(argv, "--force"),
      live: hasFlag(argv, "--live"),
      skipLighthouse: hasFlag(argv, "--skip-lighthouse"),
    });
  } catch (err) {
    if (!(err instanceof AuditError)) throw err;
    die(err.message);
  }
}

// ------------------------------------------------------------------ doctor
/** Probes one Overpass mirror with a cheap, valid query. */
async function probeOverpass(url, timeoutMs = 25_000) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "smart-pursuit-agency-os/1.1" },
      body: "data=" + encodeURIComponent("[out:json][timeout:15];node(1);out;"),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - started;
    if (!res.ok) return { url, ok: false, detail: `HTTP ${res.status}`, ms };
    const data = await res.json();
    const ok = Array.isArray(data.elements);
    return { url, ok, detail: ok ? "answered" : "answered without an elements array", ms };
  } catch (err) {
    const ms = Date.now() - started;
    return { url, ok: false, detail: err.name === "TimeoutError" ? `timed out after ${timeoutMs / 1000}s` : err.message, ms };
  }
}

/**
 * "Can this machine run a run?" — answers it, and fixes what it may fix.
 *
 *   node src/cli.mjs doctor
 *   node src/cli.mjs doctor --state "Andhra Pradesh"
 *   node src/cli.mjs doctor --json
 *
 * It never asks the operator for a list of businesses. If every lead source is
 * unreachable it says so, with the mirrors it tried, because the next run would
 * hit the same wall.
 */
async function cmdDoctor() {
  const asJson = hasFlag(argv, "--json");
  const stateArg = argValue(argv, "--state");
  const checks = [];
  const fixes = [];
  const add = (id, ok, detail, fix = null) => {
    checks.push({ id, ok, detail });
    if (ok === false && fix) fixes.push(fix);
    return ok;
  };

  // ---- node ----
  const major = Number(process.versions.node.split(".")[0]);
  add("node", major >= 20, `node ${process.versions.node} (needs 20+)`, "install Node 20 or newer");

  // ---- playwright package ----
  let pkg = null;
  for (const name of ["playwright", "playwright-core"]) {
    try { await import(name); pkg = name; break; } catch {}
  }
  add("playwright", !!pkg, pkg ? `"${pkg}" is installed` : "neither playwright nor playwright-core is installed", "npm install");

  // ---- browser ----
  let browser = null;
  let browserError = null;
  if (pkg) {
    try {
      browser = await resolveBrowser({ install: !hasFlag(argv, "--no-install") });
      add("browser", true, describeBrowser(browser));
    } catch (err) {
      browserError = err;
      add("browser", false, err.message, (err.fix || []).join(" | "));
    }
  } else {
    add("browser", false, "skipped: no playwright package", "npm install");
  }

  // ---- lead sources ----
  const endpoints = overpassEndpoints();
  const probes = await Promise.all(endpoints.map(url => probeOverpass(url)));
  const working = probes.filter(p => p.ok);
  add("overpass", working.length > 0,
    working.length ? `${working[0].url.replace(/\/api\/interpreter$/, "")} answered (${working.length}/${probes.length} mirrors up)`
      : `all ${probes.length} mirrors failed`,
    "set OVERPASS_URL to a reachable mirror, or supply leads another way");
  for (const p of probes) checks.push({ id: "overpass.mirror", ok: p.ok, detail: `${p.url.replace(/\/api\/interpreter$/, "")} — ${p.detail} (${p.ms} ms)` });

  let nominatim = { ok: false, detail: "not tried" };
  try {
    const res = await fetch("https://nominatim.openstreetmap.org/search?q=Andhra%20Pradesh%2C%20India&format=jsonv2&limit=1", {
      headers: { "user-agent": "smart-pursuit-agency-os/1.1" },
      signal: AbortSignal.timeout(20_000),
    });
    nominatim = { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (err) {
    nominatim = { ok: false, detail: err.name === "TimeoutError" ? "timeout" : err.message };
  }
  add("nominatim", nominatim.ok, `boundary lookup: ${nominatim.detail}`, "not fatal: only used when an area-name lookup returns nothing");

  // ---- state ----
  if (stateArg && stateArg !== true) {
    try {
      const state = resolveState(stateArg);
      let box = null;
      try { box = await stateBbox(state); } catch (err) { box = { error: err.message }; }
      add("state", !!box && !box.error,
        box && !box.error
          ? `${state.state} resolves to a bounding box (${box.displayName || "named"})`
          : `${state.state}: ${box.error}`,
        "check the spelling, or add config/states/<state>.json with a city list");
    } catch (err) {
      add("state", false, err.message, 'check the state name, e.g. --state "Andhra Pradesh"');
    }
  }

  const ready = checks.every(c => c.ok || c.id === "nominatim" || c.id === "overpass.mirror");

  if (asJson) {
    console.log(JSON.stringify({ ok: ready, checks, fixes, browser: browser ? describeBrowser(browser) : null }, null, 2));
    process.exitCode = ready ? 0 : 1;
    return;
  }

  console.log("\n  Agency OS — environment check\n");
  for (const c of checks) {
    const mark = c.ok === true ? "ok  " : c.ok === false ? "FAIL" : "skip";
    console.log(`  ${mark}  ${String(c.id).padEnd(16)} ${c.detail}`);
  }

  if (ready) {
    console.log(`\n  Ready. Nothing here invents a measurement; the next command does the real work.\n`);
    console.log(`  next: npm.cmd run run -- --state "${stateArg && stateArg !== true ? stateArg : "Andhra Pradesh"}" --dry-run`);
    console.log(`  then: npm.cmd run run -- --state "${stateArg && stateArg !== true ? stateArg : "Andhra Pradesh"}"\n`);
  } else {
    console.log("\n  Not ready. Fix these, then run this command again:\n");
    for (const f of fixes) console.log(`    · ${f}`);
    console.log("");
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------ run (daily)
/**
 * The daily driver: one command, one state, no duplicate audits.
 *
 *   1. pull new leads for the state (unless --no-leads)
 *   2. ask the registry which leads are still un-audited
 *   3. audit each one, write its 1 + 3 drafts, mark the lead
 *   4. write data/run-<state>-<date>.json
 *
 * Running it twice in a day audits nothing the second time. Step 2 reads
 * data/leads.json and data/audits.json, so there is no separate "already ran
 * today" flag to get out of sync, and no way for the queue to repeat a lead.
 */
async function cmdRun() {
  const settings = loadSettings();
  const stateArg = argValue(argv, "--state");
  if (!stateArg || stateArg === true) die('--state is required, e.g. --state "Andhra Pradesh"');

  const state = resolveState(stateArg);
  const niches = parseList(argValue(argv, "--niches"));
  const chosenNiches = niches.length ? niches : state.defaultNiches;
  const dryRun = hasFlag(argv, "--dry-run");
  const fetchNew = !hasFlag(argv, "--no-leads");
  const doSequence = !hasFlag(argv, "--no-sequence");
  const csv = argValue(argv, "--csv", null);
  const runCfg = settings.run || {};
  const max = Number(argValue(argv, "--max", runCfg.auditsPerRun ?? 5));
  const leadsLimit = Number(argValue(argv, "--leads-limit", runCfg.leadsPerRun ?? 25));
  const maxAttempts = Number(runCfg.maxAuditAttempts ?? 3);
  // Only businesses with a published email are audited unless --allow-no-email.
  const requireEmail = hasFlag(argv, "--allow-no-email") ? false : (hasFlag(argv, "--require-email") || runCfg.requireEmail === true);
  // --target N: stop once N audits have passed verification (--max caps attempts).
  const targetArg = argValue(argv, "--target", null);
  const target = targetArg && targetArg !== true ? Number(targetArg) : null;
  const cooldownDays = settings.audit.reauditCooldownDays;
  // Owner rule (2026-11-15): an email counts only if it is published on the
  // business's own website, and chains / government / nonprofits / IT firms are
  // not prospects. Screening is one small fetch per lead and does not count as
  // an audit attempt; --max caps audits, run.maxScreens caps screens.
  const siteScreen = requireEmail && !hasFlag(argv, "--no-site-screen") && runCfg.siteScreen !== false;
  const filterProspects = !hasFlag(argv, "--no-prospect-filter") && runCfg.filterProspects !== false;
  const maxScreens = Number(runCfg.maxScreens ?? 60);
  const screenRecheckDays = Number(runCfg.screenRecheckDays ?? 30);

  const summary = {
    ranAt: new Date().toISOString(),
    state: state.state,
    stateConfigured: state.configured,
    niches: chosenNiches,
    dryRun,
    fetched: null,
    queue: [],
    skippedByRegistry: null,
    audited: [],
    skipped: [],
    failed: [],
    screenedOut: [],
    notProspects: [],
    draftsWritten: 0,
  };

  const broad = !hasFlag(argv, "--no-broad");
  const feed = broad ? `any business with a website${niches.length ? ` (preferring ${chosenNiches.join(", ")})` : ""}` : chosenNiches.join(", ");
  console.log(`\n  ${state.state}  ·  ${feed}${state.configured ? "" : "  (no state config — searching by boundary name)"}`);
  if (dryRun) console.log("  dry run: nothing will be fetched or measured");

  // A run cannot measure without a browser, and a fresh sandbox rarely has one.
  // Resolve it (installing Playwright's Chromium if needed) before doing any
  // network work, so the operator gets one clear message instead of ten failures.
  if (dryRun) {
    try {
      const r = await resolveBrowser({ install: false });
      console.log(`  browser   ${describeBrowser(r)}`);
    } catch {
      console.log("  browser   none found (dry run — nothing is measured)");
    }
  } else {
    try {
      const r = await resolveBrowser();
      console.log(`  browser   ${describeBrowser(r)}`);
    } catch (err) {
      die(`No browser available, so nothing can be measured.\n\n  ${err.message}\n\n  Fix:\n    ${(err.fix || []).join("\n    ")}\n\n  Then: node src/cli.mjs doctor`);
    }
  }

  if (fetchNew && !dryRun) {
    try {
      const found = await fetchLeads({ stateName: stateArg, niches, limit: leadsLimit, csv: csv === true ? null : csv, broad });
      summary.fetched = { added: found.added, skipped: found.skipped, batchFile: found.batchFile };
      console.log(`  leads     ${found.added} new, ${found.skipped} skipped`);
      for (const note of found.notes) console.log(`    · ${note}`);
      if (found.added === 0) {
        console.log("    hint: no new businesses from this pass. `npm run doctor` shows which sources answered;");
        console.log("          a bigger --leads-limit widens the search, and a new state or month brings new businesses.");
      }
    } catch (err) {
      summary.fetched = { error: err.message };
      console.log(`  leads     FAILED — ${err.message}`);
      console.log("  continuing with the leads already on file");
      console.log("  if this keeps happening: npm run doctor");
    }
  }

  const pending = pendingLeads({
    state: state.state,
    // Only narrow by niche when the operator asked for specific ones. A broad
    // lead has no niche, and filtering on the default list would silently drop it.
    niches,
    limit: siteScreen ? maxScreens : max,
    cooldownDays,
    maxAttempts,
    requireEmail,
    siteScreen,
    screenRecheckDays,
    filterProspects,
  });
  summary.queue = pending.leads.map(l => ({ name: l.name, domain: l.domain, city: l.city }));
  summary.skippedByRegistry = pending.skipped;
  summary.notProspects = pending.notProspects || [];
  if (summary.notProspects.length) {
    console.log(`\n  not prospects (${summary.notProspects.length}) — skipped without any network call:`);
    for (const n of summary.notProspects) console.log(`    · ${n.name} — ${n.domain} · ${n.kind}: ${n.reason}`);
  }

  const s = pending.skipped;
  if (!pending.leads.length) {
    console.log("\n  Nothing to audit. Every lead in this state is already audited, blocked, or has failed too often.");
    console.log(`  skipped — audited ${s.audited}, cooldown ${s.blocked}, failed ${s.failedTooOften}, no website ${s.noWebsite}, no email ${s.noEmail}, not a prospect ${s.notProspect}, screened out recently ${s.screenedOut}, other state ${s.wrongState}, other niche ${s.wrongNiche}`);
    const outFile = writeRunReport(state, summary);
    console.log(`  Run report: ${outFile}\n`);
    return;
  }

  console.log(`\n  queue     ${pending.leads.length} lead(s)${requireEmail ? (siteScreen ? " — email must be published on the business's own site" : " — published email only") : ""}${target ? `, stop after ${target} verified` : ""}, at most ${max} audit attempt(s)`);
  for (const lead of pending.leads) console.log(`    · ${lead.name} — ${lead.domain}${lead.city ? ` · ${lead.city}` : ""}${lead.email ? ` · ${lead.email}` : ""}`);

  if (dryRun) {
    const outFile = writeRunReport(state, summary);
    console.log(`\n  dry run: nothing measured. Run report: ${outFile}\n`);
    return;
  }

  console.log("");
  let attempts = 0;
  for (let i = 0; i < pending.leads.length; i++) {
    if (target && summary.audited.length >= target) {
      console.log(`  target reached: ${summary.audited.length} verified audit(s) — stopping`);
      break;
    }
    if (attempts >= max) {
      console.log(`  audit attempts used up (${attempts}/${max}) — stopping`);
      break;
    }
    const lead = pending.leads[i];
    const label = `[${i + 1}/${pending.leads.length}] ${String(lead.name).slice(0, 34).padEnd(34)}`;

    if (siteScreen) {
      const sc = await screenSite(lead);
      updateLead(lead.domain, { screen: sc });
      if (!sc.ok) {
        summary.screenedOut.push({ name: lead.name, domain: lead.domain, result: sc.result, reason: sc.reason, osmEmail: sc.osmEmail, siteEmails: sc.siteEmails });
        console.log(`  ${label} screened out (${sc.result}) — ${sc.reason}`);
        continue;
      }
      if (sc.email !== (lead.email || "").toLowerCase()) {
        console.log(`  ${label} email from the site: ${sc.email} (OpenStreetMap had ${lead.email || "none"})`);
      }
      // Same mailbox as a business already audited (a second domain or branch of
      // the same owner) is a duplicate lead, even when the domain differs.
      const { loadLeads } = await import("./dedupe.mjs");
      const twin = loadLeads().leads.find(l => l.domain !== lead.domain && l.status === "audited" && String(l.email || "").toLowerCase() === sc.email);
      if (twin) {
        updateLead(lead.domain, { status: "duplicate", lastError: `same email as ${twin.name} (${twin.domain})` });
        summary.skipped.push({ name: lead.name, domain: lead.domain, kind: "duplicate", reason: `same email as ${twin.name}` });
        console.log(`  ${label} skipped — duplicate: ${sc.email} already belongs to ${twin.name} (${twin.domain})`);
        continue;
      }
      lead.email = sc.email;
      updateLead(lead.domain, { email: sc.email, osmEmail: sc.osmEmail, emailSource: sc.emailSource, emailFoundOn: sc.foundOn });
      console.log(`  ${label} email confirmed: ${sc.email} on ${sc.foundOn}`);
    }

    attempts++;
    try {
      const result = await runAudit({
        settings,
        business: leadToBusiness(lead, settings),
        skipLighthouse: hasFlag(argv, "--skip-lighthouse"),
        announce: false,
      });
      updateLead(lead.domain, {
        status: "audited",
        lastAuditedAt: result.audit.date,
        lastAuditRef: result.audit.ref,
        lastAuditPdf: result.pdfFile,
        auditAttempts: (lead.auditAttempts || 0) + 1,
        lastError: null,
      });
      let drafts = 0;
      if (doSequence) {
        const schedule = writeSequence(result.audit, { sendDate: isoDate(new Date()), to: siteScreen ? lead.email : null });
        drafts = schedule.emails.length;
        summary.draftsWritten += drafts;
      }
      summary.audited.push({
        name: lead.name,
        domain: lead.domain,
        ref: result.audit.ref,
        overall: result.scores.overall,
        pdf: result.pdfFile,
        drafts,
      });
      console.log(`  ${label} ${String(result.scores.overall).padStart(3)}/100  ${drafts ? `${drafts} drafts` : "no drafts"}`);
    } catch (err) {
      const firstLine = String(err.message).split("\n")[0];
      const kind = err instanceof AuditError ? err.kind : "error";
      if (kind === "duplicate") {
        const blocked = err.gate?.existing?.status === "blocked";
        updateLead(lead.domain, { status: blocked ? "blocked" : "audited", lastError: firstLine });
        summary.skipped.push({ name: lead.name, domain: lead.domain, kind: "duplicate", reason: firstLine });
        console.log(`  ${label} skipped — already on file`);
      } else {
        updateLead(lead.domain, {
          status: "audit-failed",
          auditAttempts: (lead.auditAttempts || 0) + 1,
          lastError: firstLine,
        });
        summary.failed.push({ name: lead.name, domain: lead.domain, kind, reason: firstLine });
        console.log(`  ${label} FAILED (${kind}) — ${firstLine}`);
      }
    }
  }

  const outFile = writeRunReport(state, summary);
  console.log(`\n  Audited ${summary.audited.length} · screened out ${summary.screenedOut.length} · not prospects ${summary.notProspects.length} · skipped ${summary.skipped.length} · failed ${summary.failed.length} · drafts ${summary.draftsWritten}`);
  console.log(`  Run report: ${outFile}`);
  if (summary.audited.length) console.log("  Drafts are in outreach/<business>/. Nothing has been sent.");
  console.log("");
}

function writeRunReport(state, summary) {
  const file = path.join(ROOT, "data", `run-${slug(state.state)}-${isoDate(new Date())}.json`);
  writeJSON(file, summary);
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

// ------------------------------------------------------------------ screen
/**
 * Re-checks leads' emails against their own websites without auditing.
 *   screen --domain a.com,b.in     specific leads
 *   screen --audited               every audited lead (used before a run)
 * Writes lead.screen in data/leads.json. Never changes an audited lead's email.
 */
async function cmdScreen() {
  const { loadLeads } = await import("./dedupe.mjs");
  const domains = parseList(argValue(argv, "--domain"));
  const leads = loadLeads().leads.filter(l => l.website && (domains.length ? domains.includes(l.domain) : hasFlag(argv, "--audited") && l.status === "audited"));
  if (!leads.length) die("No matching leads. Use --domain a.com,b.in or --audited.");
  for (const lead of leads) {
    const np = notAProspect(lead);
    const sc = await screenSite(lead);
    updateLead(lead.domain, { emailRecheck: { ...sc, notAProspect: np } });
    const verdict = sc.ok && sc.email === (lead.email || "").toLowerCase() ? "CONFIRMED" : sc.ok ? `SITE SHOWS ${sc.email}` : `NOT CONFIRMED (${sc.result})`;
    console.log(`  ${String(lead.name).slice(0, 40).padEnd(40)} ${String(lead.email || "—").padEnd(36)} ${verdict}${np ? ` · not a prospect: ${np.kind}` : ""}${sc.ok ? ` · ${sc.foundOn}` : ` · ${sc.reason}`}`);
  }
}

// ------------------------------------------------------------------ reaudit
/**
 * Re-measures and re-renders an audit that was already delivered, e.g. after a
 * wording fix in the report. This is the only place a cooldown is overridden,
 * and a re-audit never counts toward a run's target.
 *   reaudit --domain khushishoppingmall.in --reason "report wording fix"
 */
async function cmdReaudit() {
  const settings = loadSettings();
  const { loadLeads } = await import("./dedupe.mjs");
  const domains = parseList(argValue(argv, "--domain"));
  const reason = argValue(argv, "--reason");
  if (!domains.length) die("--domain is required");
  if (!reason || reason === true) die('--reason is required, e.g. --reason "report wording fix"');
  for (const domain of domains) {
    const lead = loadLeads().leads.find(l => l.domain === domain);
    if (!lead) { console.log(`  ${domain}: not in data/leads.json — skipped`); continue; }
    const np = notAProspect(lead);
    if (np) { console.log(`  ${domain}: not a prospect (${np.reason}) — skipped`); continue; }
    const sc = await screenSite(lead);
    updateLead(domain, { screen: sc });
    if (!sc.ok) { console.log(`  ${domain}: screened out (${sc.result}) — ${sc.reason}`); continue; }
    lead.email = sc.email;
    updateLead(domain, { email: sc.email, osmEmail: sc.osmEmail, emailSource: sc.emailSource, emailFoundOn: sc.foundOn });
    log("reaudit", `${domain}: ${reason} (email ${sc.email} confirmed on ${sc.foundOn})`);
    try {
      const result = await runAudit({ settings, business: leadToBusiness(lead, settings), force: true, announce: false });
      updateLead(domain, { status: "audited", lastAuditedAt: result.audit.date, lastAuditRef: result.audit.ref, lastAuditPdf: result.pdfFile, reauditReason: reason, lastError: null });
      const schedule = writeSequence(result.audit, { sendDate: isoDate(new Date()), to: sc.email });
      console.log(`  ${domain}: re-audited ${result.scores.overall}/100 · ${schedule.emails.length} drafts`);
    } catch (err) {
      console.log(`  ${domain}: re-audit FAILED — ${String(err.message).split("\n")[0]}`);
    }
  }
}

// ------------------------------------------------------------------ sequence
async function cmdSequence() {
  const auditArg = argValue(argv, "--audit");
  if (!auditArg || auditArg === true) die("--audit reports/<slug>/audit.json is required");
  const auditPath = path.resolve(ROOT, String(auditArg));
  if (!fs.existsSync(auditPath)) die(`No audit at ${auditArg}`);
  const audit = readJSON(auditPath);
  const sendDate = argValue(argv, "--send-date", isoDate(new Date()));
  const to = argValue(argv, "--to", null);
  const schedule = writeSequence(audit, { sendDate: String(sendDate), to: to && to !== true ? String(to) : null });
  console.log(`\n  ${schedule.emails.length} drafts · ${schedule.business}`);
  for (const mail of schedule.emails) {
    console.log(`   ${mail.step}. ${mail.scheduledForLong.padEnd(20)} ${mail.subject}`);
  }
  console.log(`\n  Drafts are in outreach/${slug(schedule.business)}/. Nothing has been sent.\n`);
}

// ------------------------------------------------------------------ verify
async function cmdVerify() {
  const auditArg = argValue(argv, "--audit");
  if (!auditArg || auditArg === true) die("--audit reports/<slug>/audit.json is required");
  const auditPath = path.resolve(ROOT, String(auditArg));
  const result = await verifyAudit({ auditPath, live: hasFlag(argv, "--live"), fixture: hasFlag(argv, "--fixture") });
  for (const c of result.checks) console.log(`  ${c.ok ? "PASS" : c.severity === "warning" ? "WARN" : "FAIL"}  ${c.id.padEnd(24)} ${c.detail}`);
  console.log("");
  if (!result.ok) process.exit(2);
}

// ------------------------------------------------------------------ status
function cmdStatus() {
  const s = statusSummary();
  console.log(`\n  Leads:  ${s.leads}${s.leadsByStatus && Object.keys(s.leadsByStatus).length ? " (" + Object.entries(s.leadsByStatus).map(([k, v]) => `${k} ${v}`).join(", ") + ")" : ""}`);
  console.log(`  Audits: ${s.audits}`);
  if (s.recentAudits.length) {
    console.log("\n  Most recent audits:");
    for (const a of s.recentAudits) console.log(`    ${a.at.slice(0, 10)}  ${a.domain.padEnd(32)} ${a.ref}  ${a.pdfPages} pp`);
  }
  if (hasFlag(argv, "--json")) console.log("\n" + JSON.stringify(s, null, 2));
  console.log("");
}

// ------------------------------------------------------------------ selftest
function cmdSelftest() {
  const rubric = selftestRubric();
  console.log(`\n  Score rubric calibration: ${rubric.ok ? "PASS" : "FAIL"}`);
  console.log(`  expected ${JSON.stringify(rubric.expected)}`);
  console.log(`  computed ${JSON.stringify(rubric.got)}`);
  if (!rubric.ok) process.exit(1);
  console.log("\n  Reference audit reproduces exactly. 3 / 4 / 2 / 6 / 5 -> 36.\n");
}

// ------------------------------------------------------------------ main
switch (command) {
  case "run":
  case "daily": await cmdRun(); break;
  case "leads": await cmdLeads(); break;
  case "screen": await cmdScreen(); break;
  case "reaudit": await cmdReaudit(); break;
  case "audit": await cmdAudit(); break;
  case "sequence": await cmdSequence(); break;
  case "verify": await cmdVerify(); break;
  case "status": cmdStatus(); break;
  case "doctor": await cmdDoctor(); break;
  case "selftest": cmdSelftest(); break;
  case undefined:
  case "--help":
  case "-h":
    usage();
    break;
  default:
    die(`Unknown command "${command}". Run without arguments for usage.`);
}
