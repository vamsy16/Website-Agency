// Duplicate protection for leads and audits.
// Two separate registries, both append-only, both keyed on the normalised domain.
//
//   data/leads.json   - every business ever sourced, whether or not it was audited
//   data/audits.json  - every audit ever produced, with a cooldown
//
// The audit step MUST call assertAuditable() before it touches the network.
import path from "node:path";
import { ROOT, readJSON, writeJSON, domainOf, leadKey, isoDate, hash, addDays } from "./util.mjs";
import { notAProspect } from "./prospect.mjs";

const DATA = path.join(ROOT, "data");
const LEADS = path.join(DATA, "leads.json");
const AUDITS = path.join(DATA, "audits.json");

const emptyLeads = () => ({ version: 1, updatedAt: null, leads: [] });
const emptyAudits = () => ({ version: 1, updatedAt: null, audits: [] });

export function loadLeads() {
  const db = readJSON(LEADS, emptyLeads());
  if (!Array.isArray(db.leads)) db.leads = [];
  return db;
}

export function loadAudits() {
  const db = readJSON(AUDITS, emptyAudits());
  if (!Array.isArray(db.audits)) db.audits = [];
  return db;
}

function saveLeads(db) {
  db.updatedAt = new Date().toISOString();
  writeJSON(LEADS, db);
}

function saveAudits(db) {
  db.updatedAt = new Date().toISOString();
  writeJSON(AUDITS, db);
}

/**
 * Returns { duplicate: boolean, reasons: string[], existing?: lead }.
 * A lead is a duplicate if the domain matches, or the same name+city matches,
 * or the same phone matches.
 */
export function checkLead(lead, db = loadLeads()) {
  const key = leadKey(lead);
  const domain = domainOf(lead.website || "");
  const phone = String(lead.phone || "").replace(/\D/g, "").slice(-10);
  const nameCity = `${String(lead.name || "").toLowerCase().trim()}|${String(lead.city || "").toLowerCase().trim()}`;
  const reasons = [];
  let existing = null;

  for (const row of db.leads) {
    const rowDomain = domainOf(row.website || "");
    const rowPhone = String(row.phone || "").replace(/\D/g, "").slice(-10);
    const rowNameCity = `${String(row.name || "").toLowerCase().trim()}|${String(row.city || "").toLowerCase().trim()}`;

    if (domain && rowDomain && domain === rowDomain) {
      reasons.push(`same domain (${domain})`);
      existing = existing || row;
    }
    if (phone && rowPhone && phone === rowPhone) {
      reasons.push(`same phone (…${phone.slice(-4)})`);
      existing = existing || row;
    }
    if (nameCity !== "|" && nameCity === rowNameCity) {
      reasons.push(`same name + city (${nameCity.replace("|", ", ")})`);
      existing = existing || row;
    }
  }

  return { duplicate: reasons.length > 0, reasons: [...new Set(reasons)], key, existing };
}

/**
 * Registers a lead. Idempotent: re-adding an existing lead only merges fields,
 * it never creates a second row.
 */
export function recordLead(lead, meta = {}) {
  const db = loadLeads();
  const check = checkLead(lead, db);
  const domain = domainOf(lead.website || "");
  const now = new Date().toISOString();

  if (check.duplicate && check.existing) {
    const row = check.existing;
    for (const [k, v] of Object.entries(lead)) {
      if (v !== undefined && v !== null && v !== "" && (row[k] === undefined || row[k] === null || row[k] === "")) row[k] = v;
    }
    row.lastSeenAt = now;
    row.timesSeen = (row.timesSeen || 1) + 1;
    saveLeads(db);
    return { created: false, duplicate: true, reasons: check.reasons, lead: row };
  }

  const row = {
    id: `${domain || "lead"}`.replace(/[^a-z0-9.-]/g, "-"),
    key: check.key,
    name: lead.name,
    website: lead.website,
    domain,
    phone: lead.phone || null,
    email: lead.email || null,
    city: lead.city || null,
    state: lead.state || null,
    country: lead.country || null,
    niche: lead.niche || null,
    nicheLabel: lead.nicheLabel || null,
    category: lead.category || null,
    address: lead.address || null,
    source: lead.source || "manual",
    sourceUrl: lead.sourceUrl || null,
    status: meta.status || "new",
    firstSeenAt: now,
    lastSeenAt: now,
    timesSeen: 1,
  };
  db.leads.push(row);
  saveLeads(db);
  return { created: true, duplicate: false, reasons: [], lead: row };
}

/**
 * The gate the audit pipeline calls first.
 * Blocks when: this domain already has an audit inside the cooldown window,
 * or the domain is explicitly marked do-not-contact.
 */
export function checkAudit(website, { cooldownDays = 60, force = false } = {}) {
  const domain = domainOf(website);
  const db = loadAudits();
  const reasons = [];
  let existing = null;

  for (const row of db.audits) {
    if (row.domain !== domain) continue;
    existing = row;
    if (row.status === "blocked") {
      reasons.push(`domain is marked do-not-audit (${row.blockedReason || "no reason recorded"})`);
      break;
    }
    const last = new Date(row.generatedAt);
    const reopen = addDays(last, cooldownDays);
    if (new Date() < reopen) {
      reasons.push(`already audited on ${isoDate(last)} — cooldown runs to ${isoDate(reopen)} (${cooldownDays} days)`);
    }
  }

  return {
    duplicate: reasons.length > 0 && !force,
    reasons: force && reasons.length ? reasons.map(r => r + " [overridden with --force]") : reasons,
    domain,
    existing,
    forced: !!(force && reasons.length),
  };
}

/**
 * A reference no other business holds. Two businesses with the same initials
 * audited on the same day got the same ref ("Vedanta Hospitals" and "Varma
 * Hospitals", SP-AUD-2026-11-28-VH, 28 Nov): the later one now gets a digit,
 * "SP-AUD-2026-11-28-VH2". A business keeps its own ref when it is re-audited.
 */
export function uniqueAuditRef(ref, website) {
  const db = loadAudits();
  const domain = domainOf(website);
  const takenByOther = r => db.audits.some(a => a.ref === r && a.domain !== domain);
  if (!takenByOther(ref)) return ref;
  const own = db.audits.find(a => a.domain === domain && String(a.ref || "").startsWith(ref) && /^\d$/.test(String(a.ref).slice(ref.length)));
  if (own) return own.ref;
  for (let n = 2; n <= 9; n++) if (!takenByOther(`${ref}${n}`)) return `${ref}${n}`;
  throw new Error(`no free audit reference for ${domain}: ${ref} and ${ref}2–${ref}9 belong to other businesses`);
}

export function recordAudit({ website, name, ref, pdfPath, auditPath, reportPath, scores, pdfPages, pdfBytes, mode = "live" }) {
  const db = loadAudits();
  const domain = domainOf(website);
  const now = new Date().toISOString();
  const row = {
    domain,
    name,
    ref,
    generatedAt: now,
    status: "complete",
    mode,
    scores,
    pdfPages,
    pdfBytes,
    files: { pdf: pdfPath, audit: auditPath, html: reportPath },
    fingerprint: hash({ domain, ref, scores }),
  };
  // Same ref, or the same domain audited on the same date: a same-day re-audit
  // replaces its row even when the ref's letters changed (1.4.3 corrected
  // "VF&" to "VFI" and left a second Vignata row; 26 Nov review). An audit on
  // a later date still gets its own row.
  // A row is only ever replaced by an audit of the same domain: Varma
  // Hospitals' SP-AUD-2026-11-28-VH replaced Vedanta Hospitals' row of the
  // same ref and the same day, and the registry lost an approved audit (28 Nov
  // evening review). runAudit makes refs unique (uniqueAuditRef); this guard
  // stops a clash from ever overwriting another business again.
  const dateOf = r => (String(r || "").match(/\d{4}-\d{2}-\d{2}/) || [])[0] || null;
  const clash = db.audits.find(a => a.ref === ref && a.domain !== domain);
  if (clash) throw new Error(`audit reference ${ref} already belongs to ${clash.domain}; not overwriting its row with ${domain}`);
  let idx = db.audits.findIndex(a => a.ref === ref && a.domain === domain);
  if (idx === -1 && dateOf(ref)) idx = db.audits.findIndex(a => a.domain === domain && dateOf(a.ref) === dateOf(ref));
  if (idx === -1) db.audits.push(row);
  else db.audits[idx] = { ...db.audits[idx], ...row };
  saveAudits(db);
  return row;
}

/**
 * The daily queue.
 *
 * A lead is auditable today only if it has a website, has not already been
 * audited inside the cooldown, is not blocked, and has not failed too many times.
 * This is the function that makes a daily run idempotent: running it twice on the
 * same day returns nothing the second time, without needing any external state.
 */
export function pendingLeads({ state = null, niches = [], limit = 5, cooldownDays = 60, maxAttempts = 3, requireEmail = false, siteScreen = false, screenRecheckDays = 30, filterProspects = false } = {}) {
  const leads = loadLeads().leads;
  const stateKey = state ? String(state).toLowerCase().trim() : null;
  const nicheKeys = niches.map(n => String(n).toLowerCase().trim()).filter(Boolean);
  const out = [];
  const skipped = { audited: 0, blocked: 0, failedTooOften: 0, noWebsite: 0, noEmail: 0, wrongState: 0, wrongNiche: 0, notProspect: 0, screenedOut: 0 };
  const notProspects = [];
  const eligible = [];
  const now = Date.now();

  for (const lead of leads) {
    if (!lead.website) { skipped.noWebsite++; continue; }
    // Owner rule (2026-11-15): only audit a business we can actually email.
    // The address must be published - never guessed. With siteScreen on, a lead
    // without an OSM email stays in the queue because the run checks the
    // business's own website for a published address before auditing it.
    if (requireEmail && !siteScreen && !hasPublishedEmail(lead)) { skipped.noEmail++; continue; }
    // Owner rule (2026-11-15): chains, government/education, nonprofits and
    // IT/web/marketing firms are not clients. No network involved.
    if (filterProspects && ["new", "audit-failed"].includes(lead.status || "new")) {
      const np = notAProspect(lead);
      if (np) { skipped.notProspect++; notProspects.push({ name: lead.name, domain: lead.domain, ...np }); continue; }
    }
    // Screened out recently (no published email, dead site, foreign, nonprofit):
    // try again only after screenRecheckDays.
    if (siteScreen && lead.screen && lead.screen.result !== "ok" && lead.screen.checkedAt &&
        now - new Date(lead.screen.checkedAt).getTime() < screenRecheckDays * 86400000) { skipped.screenedOut++; continue; }
    if (stateKey && String(lead.state || "").toLowerCase().trim() !== stateKey) { skipped.wrongState++; continue; }
    // A lead with no niche was found by the broad search (or came from a CSV).
    // Unknown is not the same as wrong, so it is kept.
    if (nicheKeys.length && lead.niche && !nicheKeys.includes(String(lead.niche).toLowerCase().trim())) { skipped.wrongNiche++; continue; }
    if (!["new", "audit-failed"].includes(lead.status || "new")) { skipped.audited++; continue; }
    if ((lead.auditAttempts || 0) >= maxAttempts) { skipped.failedTooOften++; continue; }
    const gate = checkAudit(lead.website, { cooldownDays });
    if (gate.duplicate) { skipped.blocked++; continue; }
    eligible.push(lead);
  }

  // Fresh leads before retries: a site that already failed once is the least
  // likely to pass, so it should not take a slot from one never tried.
  // A lead whose email was already published somewhere is likelier to pass the
  // site screen, so it goes first within the same attempt count.
  eligible.sort((a, b) => (a.auditAttempts || 0) - (b.auditAttempts || 0) || (hasPublishedEmail(b) ? 1 : 0) - (hasPublishedEmail(a) ? 1 : 0));
  out.push(...eligible.slice(0, limit));
  return { leads: out, skipped, notProspects };
}

/** A lead counts as emailable only with a syntactically valid, published address. */
export function hasPublishedEmail(lead) {
  return /^[^\s@<>(),;:]+@[^\s@<>(),;:]+\.[a-z]{2,}$/i.test(String(lead?.email || "").trim());
}

/** Patches one lead row in place. Rows are never deleted. */
export function updateLead(domainOrKey, patch) {
  const db = loadLeads();
  const row = db.leads.find(l => l.domain === domainOrKey || l.key === domainOrKey || l.id === domainOrKey);
  if (!row) return null;
  Object.assign(row, patch, { updatedAt: new Date().toISOString() });
  saveLeads(db);
  return row;
}

export function statusSummary() {
  const leads = loadLeads();
  const audits = loadAudits();
  const byStatus = {};
  for (const l of leads.leads) byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  return {
    leads: leads.leads.length,
    leadsByStatus: byStatus,
    audits: audits.audits.length,
    lastLeadAt: leads.updatedAt,
    lastAuditAt: audits.updatedAt,
    recentAudits: audits.audits.slice(-10).map(a => ({ domain: a.domain, ref: a.ref, at: a.generatedAt, pdfPages: a.pdfPages })),
  };
}
