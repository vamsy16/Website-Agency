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
import { fetchLeads, OSM_ATTRIBUTION } from "./leads.mjs";
import { measureSite } from "./measure.mjs";
import { computeScores, buildFacts, deriveFindings, deriveAlsoItems } from "./findings.mjs";
import { renderReport } from "./render.mjs";
import { qaLayout, assertQa } from "./qa.mjs";
import { htmlToPdf } from "./pdf.mjs";
import { verifyAudit, selftestRubric } from "./verify.mjs";
import { writeSequence } from "./sequence.mjs";

const argv = process.argv.slice(2);
const command = argv[0];

function usage() {
  console.log(`
Smart Pursuit Agency OS

  node src/cli.mjs run      --state "Andhra Pradesh" [--niches dentist,clinic] [--max 5] [--dry-run] [--csv leads.csv]
  node src/cli.mjs leads    --state gujarat [--niches dentist,clinic] [--limit 25] [--csv leads.csv]
  node src/cli.mjs audit    --url https://example.com --name "Business Name" --city Ahmedabad [--force] [--live]
  node src/cli.mjs audit    --from-raw data/raw/<slug>.json [--fixture] [--force]
  node src/cli.mjs sequence --audit reports/<slug>/audit.json [--send-date 2026-11-10]
  node src/cli.mjs verify   --audit reports/<slug>/audit.json [--live] [--fixture]
  node src/cli.mjs status
  node src/cli.mjs selftest

  run is the daily driver: it fetches leads for a state, then audits only the ones
  that have not been audited before. Run it as often as you like; a second run on
  the same day finds nothing new to do.

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
  });
  console.log(`\n  ${result.state} · ${result.niches.join(", ")}`);
  console.log(`  added ${result.added} new lead(s), skipped ${result.skipped} (duplicates / no website)`);
  for (const note of result.notes) console.log(`    · ${note}`);
  if (result.leads.length) {
    console.log("\n  New leads:");
    for (const l of result.leads.slice(0, 25)) console.log(`    ${l.name} — ${l.domain}${l.city ? ` · ${l.city}` : ""}`);
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
  const cooldownDays = settings.audit.reauditCooldownDays;

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
    draftsWritten: 0,
  };

  console.log(`\n  ${state.state}  ·  ${chosenNiches.join(", ")}${state.configured ? "" : "  (no state config — searching by boundary name)"}`);
  if (dryRun) console.log("  dry run: nothing will be fetched or measured");

  if (fetchNew && !dryRun) {
    try {
      const found = await fetchLeads({ stateName: stateArg, niches, limit: leadsLimit, csv: csv === true ? null : csv });
      summary.fetched = { added: found.added, skipped: found.skipped, batchFile: found.batchFile };
      console.log(`  leads     ${found.added} new, ${found.skipped} skipped`);
      for (const note of found.notes) console.log(`    · ${note}`);
    } catch (err) {
      summary.fetched = { error: err.message };
      console.log(`  leads     FAILED — ${err.message}`);
      console.log("  continuing with the leads already on file");
    }
  }

  const pending = pendingLeads({
    state: state.state,
    niches: chosenNiches,
    limit: max,
    cooldownDays,
    maxAttempts,
  });
  summary.queue = pending.leads.map(l => ({ name: l.name, domain: l.domain, city: l.city }));
  summary.skippedByRegistry = pending.skipped;

  const s = pending.skipped;
  if (!pending.leads.length) {
    console.log("\n  Nothing to audit. Every lead in this state is already audited, blocked, or has failed too often.");
    console.log(`  skipped — audited ${s.audited}, cooldown ${s.blocked}, failed ${s.failedTooOften}, no website ${s.noWebsite}, other state ${s.wrongState}, other niche ${s.wrongNiche}`);
    const outFile = writeRunReport(state, summary);
    console.log(`  Run report: ${outFile}\n`);
    return;
  }

  console.log(`\n  queue     ${pending.leads.length} lead(s)`);
  for (const lead of pending.leads) console.log(`    · ${lead.name} — ${lead.domain}${lead.city ? ` · ${lead.city}` : ""}`);

  if (dryRun) {
    const outFile = writeRunReport(state, summary);
    console.log(`\n  dry run: nothing measured. Run report: ${outFile}\n`);
    return;
  }

  console.log("");
  for (let i = 0; i < pending.leads.length; i++) {
    const lead = pending.leads[i];
    const label = `[${i + 1}/${pending.leads.length}] ${String(lead.name).slice(0, 34).padEnd(34)}`;
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
        const schedule = writeSequence(result.audit, { sendDate: isoDate(new Date()) });
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
  console.log(`\n  Audited ${summary.audited.length} · skipped ${summary.skipped.length} · failed ${summary.failed.length} · drafts ${summary.draftsWritten}`);
  console.log(`  Run report: ${outFile}`);
  if (summary.audited.length) console.log("  Drafts are in outreach/<business>/. Nothing has been sent.");
  console.log("");
}

function writeRunReport(state, summary) {
  const file = path.join(ROOT, "data", `run-${slug(state.state)}-${isoDate(new Date())}.json`);
  writeJSON(file, summary);
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

// ------------------------------------------------------------------ sequence
async function cmdSequence() {
  const auditArg = argValue(argv, "--audit");
  if (!auditArg || auditArg === true) die("--audit reports/<slug>/audit.json is required");
  const auditPath = path.resolve(ROOT, String(auditArg));
  if (!fs.existsSync(auditPath)) die(`No audit at ${auditArg}`);
  const audit = readJSON(auditPath);
  const sendDate = argValue(argv, "--send-date", isoDate(new Date()));
  const schedule = writeSequence(audit, { sendDate: String(sendDate) });
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
  case "audit": await cmdAudit(); break;
  case "sequence": await cmdSequence(); break;
  case "verify": await cmdVerify(); break;
  case "status": cmdStatus(); break;
  case "selftest": cmdSelftest(); break;
  case undefined:
  case "--help":
  case "-h":
    usage();
    break;
  default:
    die(`Unknown command "${command}". Run without arguments for usage.`);
}
