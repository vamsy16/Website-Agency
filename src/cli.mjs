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
  normalizeUrl, isoDate, longDate, auditRef, hash, log, die, fmtInt,
} from "./util.mjs";
import { loadSettings, loadState } from "./config.mjs";
import { checkAudit, recordAudit, statusSummary, loadAudits } from "./dedupe.mjs";
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

  node src/cli.mjs leads    --state gujarat [--niches dentist,clinic] [--limit 25] [--csv leads.csv]
  node src/cli.mjs audit    --url https://example.com --name "Business Name" --city Ahmedabad [--force] [--live]
  node src/cli.mjs audit    --from-raw data/raw/<slug>.json [--fixture] [--force]
  node src/cli.mjs sequence --audit reports/<slug>/audit.json [--send-date 2026-11-10]
  node src/cli.mjs verify   --audit reports/<slug>/audit.json [--live] [--fixture]
  node src/cli.mjs status
  node src/cli.mjs selftest

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

async function cmdAudit() {
  const settings = loadSettings();
  const fromRaw = argValue(argv, "--from-raw");
  const fixture = hasFlag(argv, "--fixture");
  if (fixture && (!fromRaw || fromRaw === true)) die("--fixture is only valid with --from-raw. A live audit must be fresh.");
  let raw;
  let business;

  if (fromRaw && fromRaw !== true) {
    const rawPath = path.resolve(ROOT, String(fromRaw));
    raw = readJSON(rawPath);
    if (!raw.business) die(`${fromRaw} has no "business" block. Add name, legalName, url, domain, city, state, contactPage.`);
    business = { ...raw.business };
    business.url = normalizeUrl(business.url);
    business.domain = business.domain || domainOf(business.url);
    business.ref = business.ref || auditRef(settings.agency.auditRefPrefix, raw.measuredAt || new Date(), business.name);
    log("audit", `using recorded measurement ${path.relative(ROOT, rawPath)}`);
  } else {
    const url = argValue(argv, "--url");
    const name = argValue(argv, "--name");
    if (!url || url === true) die("--url is required (or use --from-raw <file>)");
    if (!name || name === true) die("--name is required");
    const stateName = argValue(argv, "--state");
    const stateCfg = stateName ? loadState(stateName) : null;
    const city = argValue(argv, "--city", stateCfg?.cities?.[0] || null);
    const website = normalizeUrl(url);
    business = {
      name,
      legalName: argValue(argv, "--legal-name", name),
      url: website,
      domain: domainOf(website),
      city,
      state: stateCfg?.state || argValue(argv, "--state-name", null),
      niche: argValue(argv, "--niche", null),
      contactName: argValue(argv, "--contact", name),
      contactPage: argValue(argv, "--contact-page", website.replace(/\/$/, "") + "/contact/"),
    };
    business.ref = auditRef(settings.agency.auditRefPrefix, new Date(), name);
  }

  const businessSlug = slug(business.name);
  const reportDir = ensureDir(path.join(ROOT, "reports", businessSlug));
  const assetsDir = ensureDir(path.join(reportDir, "assets"));

  // ---- duplicate gate, BEFORE any network call ----
  const gate = checkAudit(business.url, { cooldownDays: settings.audit.reauditCooldownDays, force: hasFlag(argv, "--force") });
  if (gate.duplicate) {
    die(`Refusing to audit ${business.domain}: it is already on file.\n  - ${gate.reasons.join("\n  - ")}\n\n  Use --force only if you have a reason (e.g. a re-audit for before/after proof).\n  This is what stops a lead receiving the same audit twice.`);
  }
  if (gate.forced) log("audit", `duplicate overridden with --force: ${gate.reasons.join("; ")}`);

  // ---- measure ----
  if (!raw) {
    log("audit", `measuring ${business.url} (mobile + desktop + Lighthouse)`);
    raw = await measureSite(business.url, { slug: businessSlug, skipLighthouse: hasFlag(argv, "--skip-lighthouse") });
    if (raw.mobile?.status !== 200) die(`The site did not return HTTP 200 (got ${raw.mobile?.status || raw.mobile?.navError}). A dead site is not an audit.`);
  }
  raw.business = business;

  // ---- derive ----
  const scoring = computeScores(raw, settings);
  const facts = buildFacts(raw, scoring, business, settings);
  const findings = deriveFindings(raw, facts, business);
  const also = deriveAlsoItems(raw, facts);

  if (!findings.page1.length) die("No defensible findings were produced from the measurement. Refusing to render a report with nothing to say.");

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

  const pdfName = `${String(settings.agency.name).replace(/\s+/g, "-")}-Audit-${business.name.replace(/[™®]/g, "").trim().replace(/\s+/g, "-")}.pdf`;
  const pdfPath = path.join(reportDir, pdfName);
  const pdf = await htmlToPdf({ htmlFile: htmlPath, pdfFile: pdfPath, expectPages: 10 });
  audit.pdfPages = pdf.pages;
  audit.pdfBytes = pdf.bytes;
  audit.provenance.pdfFile = path.relative(ROOT, pdfPath).replace(/\\/g, "/");
  audit.provenance.htmlHash = hash(html);

  const auditPath = path.join(reportDir, "audit.json");
  writeJSON(auditPath, audit);

  // ---- third eye ----
  const verdict = await verifyAudit({ auditPath, live: hasFlag(argv, "--live"), fixture });
  if (!verdict.ok) {
    console.error(`\n  The third-eye check blocked this audit. Do not send it.`);
    for (const c of verdict.checks.filter(x => !x.ok)) console.error(`   - ${c.id}: ${c.detail}`);
    process.exit(2);
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

  console.log(`\n  Audit complete — ${business.name}`);
  console.log(`  Overall ${scoring.scores.overall}/100  ·  speed ${scoring.scores.speed} mobile ${scoring.scores.mobile} conversion ${scoring.scores.conversion} design ${scoring.scores.design} seo ${scoring.scores.seo}`);
  console.log(`  Findings: ${findings.all.map(f => `${f.id} ${f.severity}`).join(" · ")}`);
  console.log(`  PDF:    ${audit.provenance.pdfFile}  (${pdf.pages} pages, ${(pdf.bytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Audit:  ${path.relative(ROOT, auditPath).replace(/\\/g, "/")}`);
  console.log(`  Verify: ${verdict.checks.length} checks passed${verdict.warnings ? `, ${verdict.warnings} warning(s)` : ""}`);
  console.log(`\n  Next: node src/cli.mjs sequence --audit "${path.relative(ROOT, auditPath).replace(/\\/g, "/")}" --send-date ${isoDate(new Date())}\n`);
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
