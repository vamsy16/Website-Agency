// Builds the 1 + 3 email sequence as DRAFTS.
//
//   email 1  at sendDate              - audit PDF attached
//   email 2  sendDate + 3 days        - the money argument
//   email 3  sendDate + 6 days        - what a fixed version looks like
//   email 4  sendDate + 9 days        - final, closes the loop
//
// Dates are computed from the day the operator actually sends email 1, not from
// the day the audit was generated. Nothing here sends anything: the output is
// Markdown plus a schedule.json with status "draft".
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJSON, writeJSON, ensureDir, slug, addDays, isoDate, longDate, log, interpolate, adTechLabel, audienceOf } from "./util.mjs";

const TEMPLATE_DIR = path.join(ROOT, "templates", "emails");

export function loadTemplates() {
  const files = fs.readdirSync(TEMPLATE_DIR).filter(f => /^\d+.*\.md$/.test(f)).sort();
  return files.map(file => {
    const raw = fs.readFileSync(path.join(TEMPLATE_DIR, file), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) throw new Error(`${file} is missing frontmatter (--- ... ---)`);
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
      if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
    }
    return { file, meta, body: m[2].trim() };
  });
}

const BANNED = [
  /guarantee/i, /risk[- ]free/i, /act now/i, /limited time/i, /100% (success|results)/i,
  /make you (rich|money fast)/i, /no risk/i, /instantly/i, /revolutionary/i, /world[- ]class/i,
  /best in the world/i, /exclusive offer/i,
];

function countWords(text) {
  return text.split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)).length;
}

/** First name only, and only if it was published. Never guessed. */
function firstName(contactName, businessName) {
  if (!contactName) return "there";
  const cleaned = String(contactName)
    .replace(/\b(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\b/gi, "")
    .replace(/&.*$/, "")
    .replace(/[™®]/g, "")
    .trim();
  // A company name is not a person's name. "Hi Global" is worse than "Hi there".
  const business = String(businessName || "").replace(/[™®]/g, "").trim().toLowerCase();
  const looksLikeCompany = /\b(clinic|dental|hospital|centre|center|care|group|associates|partners|llp|ltd|limited|pvt|inc|studio|salon|spa|agency|company|co)\b/i.test(cleaned);
  if (business && (cleaned.toLowerCase() === business || business.includes(cleaned.toLowerCase()))) return "there";
  const first = cleaned.split(/[\s,]+/)[0];
  if (!first || !/^[A-Za-z][A-Za-z'-]{1,20}$/.test(first)) return "there";
  // Multi-word names that are clearly organisations are not greetings.
  if (cleaned.split(/[\s,]+/).filter(Boolean).length > 2 && looksLikeCompany) return "there";
  if (looksLikeCompany && cleaned.split(/[\s,]+/).filter(Boolean).length > 1) return "there";
  return first;
}

/** "Research Industrial Systems Engineering (RISE) India Ventures Pvt Ltd." -> a subject-sized name. */
export function shortName(name) {
  let n = String(name || "").replace(/[™®]/g, "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+-\s+.*$/, "")
    .replace(/\b(pvt\.?|private)\s*(ltd\.?|limited)\.?$/i, "").replace(/\b(ltd\.?|limited|llp)$/i, "").replace(/\s+/g, " ").trim().replace(/[.,]$/, "");
  // "SREE BHALAJI INDUSTRIES" -> "Sree Bhalaji Industries"; vowel-less acronyms (PVR, KGH) stay.
  if (/[A-Z]{3}/.test(n) && n === n.toUpperCase()) n = n.replace(/[A-Z][A-Z'’]*/g, w => /[AEIOUY]/.test(w) ? w[0] + w.slice(1).toLowerCase() : w);
  if (n.length > 40) n = n.slice(0, 40).replace(/\s+\S*$/, "");
  // Never end a name on a connecting word ("Lakshmi Fertility Research and").
  n = n.replace(/(\s+(and|of|the|for|&|in|at|by|-))+$/i, "").trim();
  return n || String(name || "").slice(0, 40);
}

export function buildSequence(audit, { sendDate = isoDate(new Date()), cadenceDays, settings } = {}) {
  if (!audit?.facts) throw new Error("buildSequence: audit.facts is required");
  const cfg = settings || readJSON(path.join(ROOT, "config", "settings.json"));
  const cadence = cadenceDays || cfg.outreach.cadenceDays;
  if (!Array.isArray(cadence) || cadence.length !== 3) throw new Error("cadenceDays must contain exactly three gaps");
  // Email 1 attaches the finished audit. If the PDF path is missing the draft
  // would point at a file that does not exist, so refuse to build it.
  const pdfPath = audit.provenance?.pdfFile;
  if (!pdfPath) throw new Error("buildSequence: audit.provenance.pdfFile is required — email 1 attaches the finished PDF");

  const facts = audit.facts;
  const finding1 = audit.findings.page1[0] || {};
  const finding2 = audit.findings.page1[1] || {};
  const m = facts.metric;

  const v = audienceOf({ ...facts.business, ...(audit.business || {}) });
  const short = (f) => {
    const plainTitle = String(f.title || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    // Out of the report's context, the first "why" sentence of the form finding
    // reads as a fragment. Say the consequence instead.
    if (/no way to book|no enquiry form/i.test(plainTitle)) {
      return `${plainTitle}. Check whether another contact route already meets your visitors’ needs.`;
    }
    const why = String(f.why || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const firstSentence = why.split(/(?<=\.)\s/)[0] || why;
    const title = String(f.title || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return `${title}. ${firstSentence}`.replace(/\s+/g, " ").trim();
  };

  // Every sentence here must be true for THIS site: built only from what was measured.
  const lcpSlow = Number.isFinite(m.lcpMs) && m.lcpMs > 4000;
  const moneyLine = `The audit describes observations from one test run. Their effect on enquiries or revenue has not been measured.`;
  const outcomeLine = `The report includes the measured results and suggested next steps. Targets are reference points; effort estimates require developer confirmation.`;

  const mailFacts = {
    business: {
      name: facts.business.name,
      shortName: shortName(facts.business.name),
      domain: facts.business.domain,
      // Subjects stay under the length limit even with a long domain.
      siteLabel: shortName(facts.business.name).length + String(facts.business.domain).length <= 55 ? facts.business.domain : "your website",
      city: facts.business.city,
    },
    contactFirstName: firstName(audit.business?.contactName || facts.business.contactName, facts.business.name),
    agency: {
      signatureName: cfg.outreach.signatureName,
      phone: cfg.agency.phone,
      email: cfg.agency.email || cfg.outreach.replyTo,
      name: cfg.agency.name,
      basedIn: cfg.agency.basedIn,
    },
    audit: { dateLong: facts.date.long, ref: facts.ref, pdfPages: audit.pdfPages || 10 },
    pdfPages: audit.pdfPages || 10,
    finding: {
      1: { short: short(finding1), effort: finding1.effort || "about an hour" },
      2: { short: short(finding2) },
    },
    moneyLine,
    outcomeLine,
    optOut: cfg.outreach.optOutLine,
  };

  const templates = loadTemplates();
  if (templates.length !== 4) throw new Error(`expected 4 email templates (first + 3 follow-ups), found ${templates.length}`);

  const offsetFor = i => (i === 0 ? 0 : cadence.slice(0, i).reduce((a, b) => a + b, 0));
  const emails = [];
  const problems = [];

  templates.forEach((tpl, i) => {
    const body = interpolate(tpl.body, mailFacts, tpl.file);
    const subject = interpolate(tpl.meta.subject || "", mailFacts, `${tpl.file} subject`);
    const words = countWords(body);
    const target = Number(tpl.meta.wordTarget || 120);

    if (!body.includes(cfg.outreach.optOutLine)) problems.push(`${tpl.file}: missing the opt-out line`);
    if (words > target + 50) problems.push(`${tpl.file}: ${words} words, target ${target}`);
    for (const re of BANNED) if (re.test(body) || re.test(subject)) problems.push(`${tpl.file}: banned phrase ${re}`);
    if (subject.length > 90) problems.push(`${tpl.file}: subject is ${subject.length} characters`);
    if (/<<|>>|\{\{/.test(body)) problems.push(`${tpl.file}: unresolved placeholder`);

    const date = addDays(sendDate, offsetFor(i));
    emails.push({
      step: i + 1,
      id: tpl.meta.id,
      purpose: tpl.meta.purpose,
      attachments: tpl.meta.attachments === "audit-pdf" ? [pdfPath] : [],
      subject,
      body,
      words,
      scheduledFor: isoDate(date),
      scheduledForLong: longDate(date),
      status: "draft",
      approvedBy: null,
      sentAt: null,
    });
  });

  // The last mail must be a closure, not another pitch.
  const last = emails[emails.length - 1];
  if (!/last note|closing the loop|no reply needed/i.test(last.body)) {
    problems.push(`${last.id}: the final mail must read as a close, not another pitch`);
  }

  return { emails, problems, cadence, sendDate: isoDate(sendDate), facts: mailFacts };
}

export function writeSequence(audit, opts = {}) {
  const built = buildSequence(audit, opts);
  if (built.problems.length) {
    throw new Error(`Email drafts failed review:\n  - ${built.problems.join("\n  - ")}`);
  }
  const dir = ensureDir(path.join(ROOT, "outreach", slug(audit.business.name)));
  for (const email of built.emails) {
    const file = path.join(dir, `email-${email.step}-${email.id}.md`);
    const to = opts.to ? String(opts.to) : "(operator fills in the published business address)";
    const text = `<!-- DRAFT — not sent. Sent by the operator only. -->\n\n**To:** ${to}\n**Subject:** ${email.subject}\n**Send:** ${email.scheduledForLong}\n**Attachments:** ${email.attachments.length ? email.attachments.join(", ") : "none"}\n\n---\n\n${email.body}\n`;
    fs.writeFileSync(file, text);
    email.file = path.relative(ROOT, file).replace(/\\/g, "/");
  }
  const schedule = {
    business: audit.business.name,
    domain: audit.business.domain,
    ref: audit.ref,
    createdAt: new Date().toISOString(),
    sendDate: built.sendDate,
    cadenceDays: built.cadence,
    to: opts.to || null,
    status: "draft",
    neverSendAutomatically: true,
    note: "Dates shift if the operator sends email 1 on a different day — recompute with `sequence --send-date YYYY-MM-DD`.",
    emails: built.emails.map(({ body, ...rest }) => rest),
  };
  writeJSON(path.join(dir, "sequence.json"), schedule);
  log("sequence", `${built.emails.length} drafts in outreach/${slug(audit.business.name)}/ (${built.emails.map(e => e.scheduledFor).join(", ")})`);
  return schedule;
}
