#!/usr/bin/env node
// Copy every VERIFIED audit (reports/<slug>/verify.json -> ok: true) into the
// tracked deliverables/ folder, together with its email drafts, and rebuild
// deliverables/README.md with GitHub links.
//
//   node tools/publish-deliverables.mjs
//
// The owner chose to keep audits in GitHub (2026-11-15). A blocked or failed
// audit is never published: verify.json must say ok:true and the PDF must exist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { notAProspect } from "../src/prospect.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS = path.join(ROOT, "reports");
const OUTREACH = path.join(ROOT, "outreach");
const OUT = path.join(ROOT, "deliverables");
const REPO = process.env.GITHUB_REPOSITORY || "vamsy16/Website-Agency";
const BRANCH = process.env.DELIVERABLES_BRANCH || "arena/841dee38-website-agency";

const slugify = s => String(s || "unknown").toLowerCase().normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const readJSON = f => JSON.parse(fs.readFileSync(f, "utf8"));
const blob = rel => `https://github.com/${REPO}/blob/${BRANCH}/${rel.split(path.sep).map(encodeURIComponent).join("/")}`;

// The run screens every lead's email against the business's own website
// (src/prospect.mjs). Surface that result next to each audit.
const LEADS = (() => { try { return readJSON(path.join(ROOT, "data", "leads.json")).leads || []; } catch { return []; } })();
function autoEmailCheck(domain, email) {
  const lead = LEADS.find(l => l.domain === domain);
  if (!lead) return null;
  const sc = lead.screen?.ok ? lead.screen : lead.emailRecheck || lead.screen;
  if (!sc) return null;
  if (sc.ok && email && sc.email === String(email).toLowerCase()) return { status: "confirmed", note: `published on ${sc.foundOn}`, checkedAt: String(sc.checkedAt).slice(0, 10) };
  if (sc.ok) return { status: "mismatch", note: `the site publishes ${sc.email} (${sc.foundOn})`, checkedAt: String(sc.checkedAt).slice(0, 10) };
  return { status: "not confirmed", note: sc.reason, checkedAt: String(sc.checkedAt).slice(0, 10) };
}

// --index-only: rebuild deliverables/README.md without copying anything from
// reports/ (keeps hand-edited drafts in deliverables/*/emails intact).
const INDEX_ONLY = process.argv.includes("--index-only");

let published = 0;
if (!INDEX_ONLY && fs.existsSync(REPORTS)) {
  for (const slug of fs.readdirSync(REPORTS)) {
    const dir = path.join(REPORTS, slug);
    const vf = path.join(dir, "verify.json");
    const af = path.join(dir, "audit.json");
    if (!fs.existsSync(vf) || !fs.existsSync(af)) continue;
    const verify = readJSON(vf);
    if (verify.ok !== true || verify.fixture) continue;
    const pdf = fs.readdirSync(dir).find(f => f.endsWith(".pdf"));
    if (!pdf) continue;
    const audit = readJSON(af);
    const date = String(audit.date?.iso || (typeof audit.date === "string" ? audit.date : "") || verify.verifiedAt || "").slice(0, 10) || "undated";
    const dest = path.join(OUT, slugify(audit.business?.state), date, slug);
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(dir, pdf), path.join(dest, pdf));
    fs.copyFileSync(vf, path.join(dest, "verify.json"));
    const mail = path.join(OUTREACH, slug);
    if (fs.existsSync(mail)) {
      fs.mkdirSync(path.join(dest, "emails"), { recursive: true });
      for (const f of fs.readdirSync(mail)) fs.copyFileSync(path.join(mail, f), path.join(dest, "emails", f));
    }
    const card = {
      name: audit.business?.name, website: audit.business?.website, domain: audit.business?.domain,
      city: audit.business?.city, state: audit.business?.state, email: audit.business?.email || null,
      phone: audit.business?.phone || null, ref: audit.ref, date, overall: audit.scores?.overall,
      scores: audit.scores, pdf,
    };
    const prev = path.join(dest, "summary.json");
    const auto = autoEmailCheck(card.domain, card.email);
    if (auto) card.emailCheck = auto;
    else if (fs.existsSync(prev)) { const old = readJSON(prev); if (old.emailCheck) card.emailCheck = old.emailCheck; }
    fs.writeFileSync(prev, JSON.stringify(card, null, 2) + "\n");
    published++;
  }
}

// Rebuild the index from everything under deliverables/ (old runs included).
const rows = [];
const walk = d => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "summary.json") rows.push({ dir: path.dirname(p), ...readJSON(p) });
  }
};
walk(OUT);
rows.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (a.overall ?? 0) - (b.overall ?? 0));

function verdictFor(r) {
  const lead = LEADS.find(l => l.domain === r.domain);
  const np = lead ? notAProspect(lead) : null;
  if (np) return `❌ no — ${np.kind}: ${np.reason}`;
  const sc = lead?.emailRecheck || lead?.screen;
  if (sc && ["nonprofit", "foreign"].includes(sc.result)) return `❌ no — ${sc.reason}`;
  if (r.emailCheck?.status === "confirmed") return "✅ yes";
  return `❌ no — email ${r.emailCheck?.status || "not checked"}`;
}

let md = `# Verified audits\n\nOnly audits that passed every third-eye check (\`verify.json\` → \`ok: true\`) are\nlisted here. Email drafts are drafts — nothing is sent automatically.\n\n**Send?** is ✅ only when the business is a real prospect (not a chain, public body,\nnonprofit or IT firm) **and** its email is published on its own website.\n\n`;
md += `| Date | Business | Score | Email | Email check | Send? | Audit PDF | Drafts |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  const relDir = path.relative(ROOT, r.dir);
  const auto = autoEmailCheck(r.domain, r.email);
  if (auto) r.emailCheck = auto;
  const check = r.emailCheck ? `${r.emailCheck.status}: ${r.emailCheck.note}` : "not checked";
  md += `| ${r.date} | ${r.name}${r.city ? ` (${r.city})` : ""} | ${r.overall}/100 | ${r.email || "—"} | ${check} | ${verdictFor(r)} | [PDF](${blob(path.join(relDir, r.pdf))}) | ${fs.existsSync(path.join(r.dir, "emails")) ? `[emails](${blob(path.join(relDir, "emails")).replace("/blob/", "/tree/")})` : "not generated"} |\n`;
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "README.md"), md);
console.log(`published ${published} verified audit(s); index lists ${rows.length}`);
