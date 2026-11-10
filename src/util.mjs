// Small, dependency-free helpers. Everything here is deterministic.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Cannot read JSON at ${file}: ${err.message}`);
  }
}

export function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return file;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function exists(file) {
  return fs.existsSync(file);
}

/** "Example Dental Co ™" -> "example-dental-co" */
export function slug(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u2122\u00ae\u00a9]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * A filename that survives Windows, macOS, Linux, email clients and cloud
 * storage. Keeps letters from any script, digits, spaces, dots and hyphens;
 * everything else becomes a hyphen.
 */
export function safeFileName(input, fallback = "audit") {
  const cleaned = String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u2122\u00ae\u00a9]/g, "")
    .replace(/[^\p{L}\p{N}\s.-]+/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

/**
 * The delivered PDF's name. A client opens this file in an inbox, so it has to
 * say who it belongs to: their business name, or failing that their website.
 */
export function auditFileName(agencyName, business = {}) {
  const agency = safeFileName(agencyName, "Smart-Pursuit");
  const label = safeFileName(business.name, "") || safeFileName(business.domain, "Site");
  return `${agency}-Audit-${label}.pdf`;
}

/** Adds https:// if missing, strips trailing slash on origin, keeps the path. */
export function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("normalizeUrl: empty url");
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProto);
  u.hash = "";
  return u.toString();
}

export function domainOf(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Dedupe key: domain + phone digits. Domain is the primary identity of a website lead. */
export function leadKey(lead) {
  const d = domainOf(lead.website || "");
  const phone = String(lead.phone || "").replace(/\D/g, "").slice(-10);
  return d ? `d:${d}` : phone ? `p:${phone}` : `n:${slug(lead.name || "")}|${slug(lead.city || "")}`;
}

export function hash(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

export function addDays(date, days) {
  const d = new Date(date instanceof Date ? date.getTime() : Date.parse(date));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isoDate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** 2026-11-08 -> "8 November 2026" */
export function longDate(input) {
  const d = input instanceof Date ? input : new Date(`${isoDate(input)}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** 2026-11-08 -> "SP-AUD-2026-11-08-GDC" */
export function auditRef(prefix, date, name) {
  const initials = String(name)
    .replace(/[\u2122\u00ae]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join("")
    .slice(0, 3);
  return `${prefix}-${isoDate(date)}-${initials}`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function round(n, places = 0) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** 2660 -> "2,660" */
export function fmtInt(n) {
  return Number(n).toLocaleString("en-US");
}

/** 2400 -> "2.4 MB" (binary-ish, matches the reference report) */
export function fmtBytesKB(kb) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
}

export function fmtSec(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

/** 0.098 -> "0.098", 0 -> "0" */
export function fmtCls(n) {
  return Number(n) === 0 ? "0" : String(round(n, 3));
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function log(step, msg, extra) {
  const stamp = new Date().toISOString().slice(11, 19);
  const tail = extra === undefined ? "" : ` ${typeof extra === "string" ? extra : JSON.stringify(extra)}`;
  console.log(`[${stamp}] ${step.padEnd(10)} ${msg}${tail}`);
}

export function die(msg, code = 1) {
  console.error(`\n  FAILED: ${msg}\n`);
  process.exit(code);
}

/**
 * Interpolates {{ dotted.path }} tokens against a facts object.
 * Fails closed: an unknown token throws. This is the mechanism that stops a
 * number from being typed into prose without a measured source behind it.
 */
export function interpolate(text, facts, where) {
  if (typeof text !== "string") return text;
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const value = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), facts);
    if (value === undefined || value === null) {
      throw new Error(`Unresolved fact token {{${key}}}${where ? ` in ${where}` : ""}. Refusing to render a guessed value.`);
    }
    return String(value);
  });
}

/** Recursively interpolate every string in an object. */
export function interpolateDeep(value, facts, where) {
  if (typeof value === "string") return interpolate(value, facts, where);
  if (Array.isArray(value)) return value.map((v, i) => interpolateDeep(v, facts, `${where}[${i}]`));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolateDeep(v, facts, where ? `${where}.${k}` : k);
    return out;
  }
  return value;
}

/** Which Chrome binary does this machine have? */
export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("Chrome not found. Set CHROME_PATH to the Chrome/Chromium executable.");
}

export function argValue(argv, flag, fallback = undefined) {
  const i = argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
}

export function hasFlag(argv, flag) {
  return argv.includes(flag);
}

const ADTECH_LABELS = {
  adroll: "AdRoll",
  thetradedesk: "The Trade Desk",
  eyeota: "Eyeota",
  appnexus: "AppNexus",
  bidswitch: "Bidswitch",
  smartadserver: "Smart AdServer",
  pubmatic: "PubMatic",
  rubiconproject: "Rubicon Project",
  criteo: "Criteo",
  doubleclick: "DoubleClick",
};

/** "thetradedesk" -> "The Trade Desk"; unknown tokens get title-cased. */
export function adTechLabel(token) {
  const key = String(token).toLowerCase();
  return ADTECH_LABELS[key] || String(token).replace(/\b\w/g, c => c.toUpperCase());
}

export function parseList(value) {  if (!value || value === true) return [];
  return String(value)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}
