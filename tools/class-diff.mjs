#!/usr/bin/env node
// Structural check for a rendered audit.
//
//   1. every class used in the report must have a rule in src/styles.css
//   2. the report must have exactly 10 pages, 6 findings and at most 4 images
//   3. optionally, compare the class set with a reference report
//
//   node tools/class-diff.mjs                                    # newest report
//   node tools/class-diff.mjs reports/<slug>/report.html
//   node tools/class-diff.mjs reports/<slug>/report.html path/to/earlier-report.html
//
// Exits non-zero on any unstyled class or a wrong page/finding count, so it can
// be wired into a release check.
import fs from "node:fs";
import path from "node:path";
import { ROOT, die } from "../src/util.mjs";

const argv = process.argv.slice(2).filter(a => !a.startsWith("--"));

/** Newest reports/<slug>/report.html on disk, so no run has to be hard-coded. */
function newestReport() {
  const dir = path.join(ROOT, "reports");
  if (!fs.existsSync(dir)) return null;
  const candidates = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(dir, d.name, "report.html"))
    .filter(f => fs.existsSync(f))
    .map(f => ({ f, t: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return candidates.length ? candidates[0].f : null;
}

const genFile = argv[0] ? path.resolve(ROOT, argv[0]) : newestReport();
const refFile = argv[1] ? path.resolve(ROOT, argv[1]) : null;

if (!genFile || !fs.existsSync(genFile)) {
  die("No rendered report found. Run an audit first, or pass one: node tools/class-diff.mjs reports/<slug>/report.html");
}

const css = fs.readFileSync(path.join(ROOT, "src", "styles.css"), "utf8");
const html = fs.readFileSync(genFile, "utf8");

function classesIn(source) {
  const out = new Map();
  for (const m of source.matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) out.set(c, (out.get(c) || 0) + 1);
  }
  return out;
}

const hasRule = name => new RegExp(`\\.${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(css);
const count = (re) => (html.match(re) || []).length;

const used = classesIn(html);
const unstyled = [...used.keys()].filter(c => !hasRule(c));
const pages = count(/<section class="page/g);
const findings = count(/<div class="find/g);
const images = count(/<img /g);
const footers = count(/<footer>/g);

console.log(`report        ${path.relative(ROOT, genFile).replace(/\\/g, "/")}`);
console.log(`class tokens  ${used.size}`);
console.log(`pages         ${pages}`);
console.log(`findings      ${findings}`);
console.log(`images        ${images}`);
console.log(`footers       ${footers}`);

if (refFile) {
  if (!fs.existsSync(refFile)) die(`No reference at ${refFile}`);
  const refUsed = classesIn(fs.readFileSync(refFile, "utf8"));
  const onlyRef = [...refUsed.keys()].filter(c => !used.has(c));
  const onlyGen = [...used.keys()].filter(c => !refUsed.has(c));
  console.log(`reference     ${path.relative(ROOT, refFile).replace(/\\/g, "/")} (${refUsed.size} classes)`);
  console.log(`only in ref   ${onlyRef.length ? onlyRef.join(", ") : "(none)"}`);
  console.log(`only in gen   ${onlyGen.length ? onlyGen.join(", ") : "(none)"}`);
}

const failures = [];
if (unstyled.length) failures.push(`classes with no CSS rule: ${unstyled.join(", ")}`);
if (pages !== 10) failures.push(`expected 10 pages, found ${pages}`);
if (findings !== 6) failures.push(`expected 6 findings, found ${findings}`);
if (images > 4) failures.push(`expected at most 4 images, found ${images}`);
if (footers !== 9) failures.push(`expected 9 footers (cover has none), found ${footers}`);

console.log("");
if (failures.length) {
  for (const f of failures) console.error(`FAIL  ${f}`);
  process.exit(1);
}
console.log("PASS  every class is styled and the page structure matches the contract.");
