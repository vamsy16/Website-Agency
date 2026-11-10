// Duplicate protection for leads and audits.
// Two separate registries, both append-only, both keyed on the normalised domain.
//
//   data/leads.json   - every business ever sourced, whether or not it was audited
//   data/audits.json  - every audit ever produced, with a cooldown
//
// The audit step MUST call assertAuditable() before it touches the network.
import path from "node:path";
import { ROOT, readJSON, writeJSON, domainOf, leadKey, isoDate, hash, addDays } from "./util.mjs";

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
  const idx = db.audits.findIndex(a => a.ref === ref);
  if (idx === -1) db.audits.push(row);
  else db.audits[idx] = { ...db.audits[idx], ...row };
  saveAudits(db);
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
