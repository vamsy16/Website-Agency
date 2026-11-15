#!/usr/bin/env node
// Renders the digital-marketing strategy plan: HTML -> A4 PDF.
//
// The plan is a fixed 16-page document with one editable block: the school. This
// tool fills that block from a small JSON file, inlines the frozen design system
// (fonts, styles.css) plus the plan-only components, measures every page in
// Chromium at A4, and refuses to hand back a PDF whose page count is wrong or
// whose content has spilled into the footer.
//
//   node tools/render-plan.mjs
//   node tools/render-plan.mjs --config plans/plan.config.json
//   node tools/render-plan.mjs --pages 16 --keep
//
// Output: reports/plans/<slug>/Smart-Pursuit-Digital-Strategy-<School>.pdf
//
// reports/ is gitignored, so a client's plan never ends up in the public export.
import fs from "node:fs";
import path from "node:path";
import { ROOT, ensureDir, safeFileName, interpolate, log, die, readJSON, writeJSON } from "../src/util.mjs";
import { resolveBrowser, launchOptions } from "../src/browser.mjs";
import { htmlToPdf } from "../src/pdf.mjs";

const argv = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};

const TEMPLATE = argValue("--template", path.join("plans", "_template", "plan.html"));
const CSS = path.join("plans", "_template", "plan.css");
const LOGO = path.join("assets", "smart-pursuit-logo.png");
const CONFIG = argValue("--config", path.join("plans", "plan.config.json"));
const EXPECT_PAGES = Number(argValue("--pages", 16));
const KEEP = argv.includes("--keep");
const TOLERANCE_MM = 1.0;

const REQUIRED = ["school", "city", "state", "board", "feeBand", "year", "preparedOn"];

// ------------------------------------------------------------------ config
const config = readJSON(path.join(ROOT, CONFIG), null);
if (!config) die(`No plan config at ${CONFIG}. Copy plans/plan.config.json and fill it in.`);

const missing = REQUIRED.filter(k => typeof config[k] !== "string" || !config[k].trim());
if (missing.length) die(`Plan config is missing: ${missing.join(", ")}`);

for (const key of REQUIRED) {
  if (/[<>]/.test(config[key])) {
    die(`Plan config "${key}" contains < or >. Use [square brackets] for a placeholder so the HTML cannot be broken by a value.`);
  }
}

const slug = config.slug || safeFileName(config.school, "school");
const placeholders = REQUIRED.filter(k => /[[\]]/.test(config[k]));
if (placeholders.length) {
  log("plan", `placeholder value(s) still in use: ${placeholders.join(", ")} -- the PDF is a draft, not a signed document`);
}

const facts = {
  SCHOOL: config.school,
  CITY: config.city,
  STATE: config.state,
  BOARD: config.board,
  FEE_BAND: config.feeBand,
  YEAR: config.year,
  PREPARED_ON: config.preparedOn,
};

// ------------------------------------------------------------------ build html
const templateFile = path.join(ROOT, TEMPLATE);
if (!fs.existsSync(templateFile)) die(`No plan template at ${TEMPLATE}.`);
const planCssFile = path.join(ROOT, CSS);
if (!fs.existsSync(planCssFile)) die(`No plan stylesheet at ${CSS}.`);

const fonts = fs.readFileSync(path.join(ROOT, "src", "fonts.css"), "utf8");
const base = fs.readFileSync(path.join(ROOT, "src", "styles.css"), "utf8");
const planCss = fs.readFileSync(planCssFile, "utf8");

// The logo is the agency's own mark, so it lives in this repo. It ships as a
// .b64 sidecar because the public export tracks text only, and a data: URI takes
// base64 text directly — no decode step, no binary dependency. If neither the
// PNG nor the sidecar is present the cover would carry a blank chip, so this is
// a hard failure rather than a quiet degrade.
const logoPng = path.join(ROOT, LOGO);
const logoSidecar = logoPng + ".b64";
let logo = "";
if (fs.existsSync(logoPng)) {
  logo = "data:image/png;base64," + fs.readFileSync(logoPng).toString("base64");
} else if (fs.existsSync(logoSidecar)) {
  logo = "data:image/png;base64," + fs.readFileSync(logoSidecar, "utf8").replace(/\s+/g, "");
}
if (!logo) die(`No logo at ${LOGO} or ${LOGO}.b64. Run: node tools/encode-b64.mjs ${LOGO}`);

let html = fs.readFileSync(templateFile, "utf8");
if (!html.includes("<!--FONTS-->") || !html.includes("<!--STYLES-->") || !html.includes("<!--PLAN-->")) {
  die("Plan template must contain the <!--FONTS-->, <!--STYLES--> and <!--PLAN--> markers.");
}

// Inline everything so the document is one self-contained file: it renders the
// same on any machine and can be emailed without broken assets.
html = html
  .replace("<!--FONTS-->", `<style>\n${fonts}\n</style>`)
  .replace("<!--STYLES-->", `<style>\n${base}\n</style>`)
  .replace("<!--PLAN-->", `<style>\n${planCss}\n</style>`)
  .replace(/\{\{LOGO\}\}/g, logo);

// Every remaining {{TOKEN}} must resolve. interpolate() throws on an unknown
// token rather than printing a blank, which is exactly what a client document
// needs.
html = (() => {
  try { return interpolate(html, facts, "plan template"); }
  catch (err) { die(err.message); }
})();
const leftover = html.match(/\{\{[^}]+\}\}/g);
if (leftover) die(`Unresolved tokens remain: ${leftover.join(", ")}`);

const outDir = path.join(ROOT, "reports", "plans", slug);
ensureDir(outDir);
const htmlFile = path.join(outDir, "plan.html");
fs.writeFileSync(htmlFile, html);
log("plan", `built ${path.relative(ROOT, htmlFile)} (${(html.length / 1024 / 1024).toFixed(2)} MB, fonts and styles inlined)`);

// ------------------------------------------------------------------ layout QA
const resolved = await resolveBrowser();
const browser = await resolved.chromium.launch(launchOptions(resolved, { args: ["--no-sandbox", "--font-render-hinting=none"] }));
const consoleErrors = [];
let layout;
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
  page.on("pageerror", e => consoleErrors.push("PAGEERROR " + String(e.message).slice(0, 300)));
  await page.goto("file:///" + htmlFile.replace(/\\/g, "/"), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  layout = await page.evaluate(() => {
    const pages = [...document.querySelectorAll(".page")];
    const rows = pages.map((p, i) => {
      const pr = p.getBoundingClientRect();
      const px2mm = 297 / pr.height;
      const body = p.querySelector(".body");
      const footer = p.querySelector("footer");
      let contentBottom = 0;
      let worst = null;
      for (const el of p.querySelectorAll(".body *")) {
        const r = el.getBoundingClientRect();
        if (r.height <= 0 || r.width <= 0) continue;
        const bottom = r.bottom - pr.top;
        if (bottom > contentBottom) {
          contentBottom = bottom;
          worst = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "");
        }
      }
      // The cover has no .body and no footer: it is measured against the
      // confidential line instead, or a full cover silently clips.
      const cover = p.classList.contains("cover");
      const conf = p.querySelector(".conf");
      const footBlock = p.querySelector(".footblock");
      const coverBottom = cover && footBlock ? (footBlock.getBoundingClientRect().bottom - pr.top) * px2mm : null;
      const confTop = cover && conf ? (conf.getBoundingClientRect().top - pr.top) * px2mm : null;
      // Horizontal containment: no text line or image may sit outside the
      // printed area. Layout wrappers (.pad, .body, grid tracks) legitimately
      // span the full sheet, so only elements that actually paint text or an
      // image are measured — that is what a reader sees cross the margin.
      let worstRight = 0;
      let widest = null;
      for (const el of p.querySelectorAll("*")) {
        if (el.closest(".glow") || el.classList.contains("glow") || el.classList.contains("rule")) continue;
        const paints = el.tagName === "IMG" || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!paints) continue;
        const r = el.getBoundingClientRect();
        if (r.height <= 0 || r.width <= 0) continue;
        const right = (r.right - pr.left) * px2mm;
        if (right > worstRight) { worstRight = right; widest = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""); }
      }
      const images = [...p.querySelectorAll("img")].map(img => ({ src: img.getAttribute("src"), ok: img.complete && img.naturalWidth > 0 }));
      return {
        page: i + 1,
        bodyOverflowMm: body ? +((body.scrollHeight - body.clientHeight) * px2mm).toFixed(1) : 0,
        contentMm: +(contentBottom * px2mm).toFixed(1),
        footerTopMm: footer ? +((footer.getBoundingClientRect().top - pr.top) * px2mm).toFixed(1) : null,
        coverBottomMm: coverBottom === null ? null : +coverBottom.toFixed(1),
        confTopMm: confTop === null ? null : +confTop.toFixed(1),
        rightMm: +worstRight.toFixed(1),
        widest,
        worst,
        brokenImages: images.filter(x => !x.ok).map(x => x.src),
      };
    });
    const fonts = [...document.fonts].map(f => ({ family: f.family.replace(/['"]/g, ""), status: f.status }));
    return {
      pageCount: pages.length,
      rows,
      fontsLoaded: ["Instrument Serif", "Inter"].map(name => ({ name, loaded: fonts.some(f => f.family === name && f.status === "loaded") })),
    };
  });
} finally {
  await browser.close();
}

const failures = [];
if (layout.pageCount !== EXPECT_PAGES) failures.push(`expected ${EXPECT_PAGES} page sections, found ${layout.pageCount}`);
for (const row of layout.rows) {
  if (row.bodyOverflowMm > TOLERANCE_MM) failures.push(`page ${row.page} content overflows its column by ${row.bodyOverflowMm} mm (worst: ${row.worst})`);
  if (row.footerTopMm !== null && row.contentMm > row.footerTopMm - 0.5) {
    failures.push(`page ${row.page} runs into the footer: content ends at ${row.contentMm} mm, footer starts at ${row.footerTopMm} mm`);
  }
  if (row.coverBottomMm !== null && row.confTopMm !== null && row.coverBottomMm > row.confTopMm - 1.5) {
    failures.push(`cover content ends at ${row.coverBottomMm} mm but the confidential line starts at ${row.confTopMm} mm`);
  }
  if (row.rightMm > 194.5) failures.push(`page ${row.page} has content past the right margin: ${row.rightMm} mm (${row.widest})`);
  if (row.brokenImages.length) failures.push(`page ${row.page} has ${row.brokenImages.length} broken image(s)`);
}
for (const f of layout.fontsLoaded) if (!f.loaded) failures.push(`font "${f.name}" did not load`);
if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.slice(0, 2).join(" | ")}`);

const worst = Math.max(...layout.rows.map(r => r.bodyOverflowMm));
if (failures.length) {
  log("qa", `FAILED -- ${failures.length} issue(s)`);
  for (const f of failures) console.error("  - " + f);
  console.error("\nPer-page fill (mm of the 297 mm sheet):");
  for (const r of layout.rows) console.error(`  p${String(r.page).padStart(2, "0")}  content ${String(r.contentMm).padStart(6)}  footer ${String(r.footerTopMm ?? "-").padStart(6)}  overflow ${r.bodyOverflowMm}`);
  process.exit(1);
}
log("qa", `clean -- ${layout.pageCount} pages, worst overflow ${worst} mm, nothing in the footer zone`);

// ------------------------------------------------------------------ pdf
const label = safeFileName(config.school.replace(/[[\]]/g, "").trim(), "school");
const pdfFile = path.join(outDir, `Smart-Pursuit-Digital-Strategy-${label}.pdf`);
const pdf = await htmlToPdf({ htmlFile, pdfFile, expectPages: EXPECT_PAGES });
if (!pdf.a4) die("PDF is not A4. Refusing to ship it.");

writeJSON(path.join(outDir, "plan-report.json"), {
  ok: true,
  slug,
  school: config.school,
  pdf: path.relative(ROOT, pdfFile),
  pages: pdf.pages,
  bytes: pdf.bytes,
  a4: pdf.a4,
  worstOverflowMm: worst,
  placeholders,
  pagesDetail: layout.rows,
  checkedAt: new Date().toISOString(),
});

if (!KEEP) fs.rmSync(htmlFile, { force: true });

console.log("");
console.log(`  Strategy plan -- ${config.school}`);
console.log(`  ${pdf.pages} A4 pages, ${(pdf.bytes / 1024 / 1024).toFixed(2)} MB, worst overflow ${worst} mm`);
console.log(`  PDF: ${path.relative(ROOT, pdfFile)}`);
if (placeholders.length) console.log(`  Draft: replace ${placeholders.join(", ")} in ${CONFIG}, then run this again.`);
console.log("");
