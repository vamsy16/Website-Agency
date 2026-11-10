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
import { ROOT, readJSON, writeJSON, ensureDir, slug, addDays, isoDate, longDate, log, interpolate, adTechLabel } from "./util.mjs";

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

  const short = (f) => {
    const why = String(f.why || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const firstSentence = why.split(/(?<=\.)\s/)[0] || why;
    const title = String(f.title || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return `${title}. ${firstSentence}`.replace(/\s+/g, " ").trim();
  };

  const moneyLine = facts.http.adTech?.length
    ? `Your pages load ${facts.http.adTech.slice(0, 3).map(adTechLabel).join(", ")} — you are buying attention. Every click that lands on the contact page and finds a broken form instead of a form cannot convert. That is the leak.`
    : `The page reaches a visitor in ${m.lcp} on a phone. By then a good share of them have gone. The fix is not a redesign — it is delivery.`;

  const outcomeLine = `Your mobile performance score is ${m.perfMobile}/100. The eight items on page 8 of the audit are the route to 90+, in the order that pays back fastest, and none of them require a new design.`;

  const mailFacts = {
    business: { name: facts.business.name, domain: facts.business.domain, city: facts.business.city },
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
    const text = `<!-- DRAFT — not sent. Sent by the operator only. -->\n\n**To:** (operator fills in the published business address)\n**Subject:** ${email.subject}\n**Send:** ${email.scheduledForLong}\n**Attachments:** ${email.attachments.length ? email.attachments.join(", ") : "none"}\n\n---\n\n${email.body}\n`;
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
    status: "draft",
    neverSendAutomatically: true,
    note: "Dates shift if the operator sends email 1 on a different day — recompute with `sequence --send-date YYYY-MM-DD`.",
    emails: built.emails.map(({ body, ...rest }) => rest),
  };
  writeJSON(path.join(dir, "sequence.json"), schedule);
  log("sequence", `${built.emails.length} drafts in outreach/${slug(audit.business.name)}/ (${built.emails.map(e => e.scheduledFor).join(", ")})`);
  return schedule;
}
