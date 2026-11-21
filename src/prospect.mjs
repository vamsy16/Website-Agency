// Who is worth auditing, and is the email address really theirs?
//
// Two gates, run after dedupe and before any audit:
//
//   notAProspect(lead)   - no network. Chains/franchise branches, government and
//                          education bodies, nonprofits/NGOs, and IT/web/marketing
//                          firms (they build websites themselves) are not clients.
//   screenSite(lead)     - one small fetch of the business's own homepage plus up
//                          to three contact/about pages. The email is accepted only
//                          if it is PUBLISHED on the business's own site. If the
//                          OpenStreetMap address is not there but the site publishes
//                          its own address, the site's address wins. If the site
//                          publishes none, the lead is skipped — never guessed.
//                          The same fetch catches dead sites, non-Indian companies
//                          and self-declared nonprofits before a 3-minute audit.
//
// Owner decision 2026-11-15: "only confirmed emails", "exclude chains, nonprofits,
// government and IT companies".
import { domainOf } from "./util.mjs";

const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36";

// ------------------------------------------------------------------ static gate

const NONPROFIT_CATEGORY = /^(office=(ngo|association|foundation|charity|religion|political_party)|healthcare=blood_bank|amenity=(social_facility|place_of_worship|community_centre)|club=)/i;
const NONPROFIT_NAME = /\b(society|samajam|samaj|samithi|samiti|sangham|foundation|ngo|red cross|charitable|charity|association|federation|welfare|blood bank|seva samithi)\b/i;

const PUBLIC_CATEGORY = /^(office=(government|administrative|diplomatic|educational_institution|university|research|forestry|water_utility|energy_supplier)|amenity=(school|college|university|kindergarten|library|police|fire_station|courthouse|townhall|post_office|public_building|prison|embassy|bank|atm))/i;
const PUBLIC_NAME = /\b(government|govt|municipal|corporation of|zilla|panchayat|collectorate|tirumala|ttd|apsrtc|innovation hub|university|college|aiims)\b/i;
const PUBLIC_DOMAIN = /(\.gov|\.nic|\.ac\.[a-z]{2}|\.edu|\.mil|\.res)(\.[a-z]{2,})?$|universit|college|(^|\.)tirumala\.org$/i;

const TECH_CATEGORY = /^(office=(it|advertising_agency|telecommunication|marketing)|craft=(computer|electronics_repair))/i;
const TECH_NAME = /\b(software|softwares|web ?(design|designers|development|developers|solutions|services)|websites?|digital marketing|seo|infotech|info tech|it (solutions|services|company)|technologies|technology|tech solutions|app (design|designers|development|developers)|media|advertising|advertisers)\b/i;

// National/international brands. A branch is run from head office.
const CHAIN_NAME = [
  "reliance", "smart point", "smart bazaar", "jiomart", "ramraj", "tata", "hdfc", "icici",
  "sbi", "axis bank", "kotak", "lic", "bajaj", "maruti", "hyundai", "honda", "toyota", "mahindra",
  "kia", "hero motocorp", "tvs", "royal enfield", "tumbledry", "preethi", "kfc", "dominos", "domino s",
  "pizza hut", "mcdonalds", "subway", "starbucks", "burger king", "dunkin", "baskin robbins",
  "haldirams", "barbeque nation", "cafe coffee day", "ccd", "spencers", "dmart", "d mart",
  "big bazaar", "more supermarket", "ratnadeep", "vijetha", "airtel", "jio", "vodafone", "bata",
  "nike", "adidas", "puma", "decathlon", "ikea", "pantaloons", "westside", "shoppers stop",
  "max fashion", "zudio", "tanishq", "titan", "malabar gold", "kalyan jewellers", "joyalukkas",
  "grt jewellers", "croma", "vijay sales", "bajaj electronics", "lenskart", "medplus",
  "apollo hospitals", "apollo pharmacy", "apollo clinic", "wellness forever", "oyo", "treebo", "fabhotel", "ginger hotel", "lemon tree", "marriott",
  "radisson", "novotel", "ibis", "taj hotel", "vivanta", "itc hotel", "hyatt", "dr lal pathlabs", "vijaya diagnostic",
  "thyrocare", "manipal", "care hospitals", "kims", "rainbow children", "yashoda", "aster dm", "aster ramesh",
  "chennai shopping mall", "south india shopping mall", "cmr", "r s brothers", "sangeetha mobiles",
  "lot mobiles", "big c", "happi mobiles", "bharat petroleum", "indian oil", "hp petrol",
  "fortune inn", "sarovar", "renault", "nissan", "life insurance corporation", "hyderabad house",
  "the chocolate room", "penna cement", "penna cements", "anoos", "anoo s", "naturals salon", "green trends",
  "lakme salon", "vlcc", "kaya clinic", "oliva", "enrich salon", "spencer's", "spencers", "spencer s",
];
// Names that are a chain only when they are the whole name ("More", not "More Than Coffee").
const CHAIN_EXACT = ["more", "trends", "max", "zudio", "lic"];
const CHAIN_DOMAIN = /(^|\.)(indianterrain\.com|rrdurbar\.com|ultratechcement\.com|subbayyagarihotel\.in|itchotels\.com|fortunehotels\.in|sarovarhotels\.com|tajhotels\.com|oyorooms\.com|renault\.co\.in|licindia\.in|moreretail\.in|hyderabadhouse\.com|thechocolateroomindia\.com|pennacement\.com|kia\.com|toyotabharat\.com|mahindra\.com|nissan\.in|skoda-auto\.co\.in|volkswagen\.co\.in|mgmotor\.co\.in|heromotocorp\.com|bajajauto\.com|tvsmotor\.com|royalenfield\.com|yamaha-motor-india\.com|airtel\.in|jio\.com|relianceretail\.com|ril\.com|jiomart\.com|tatamotors\.com|hdfclife\.com|hdfcbank\.com|ramrajcotton\.in|tumbledry\.in|preethi\.in|apollohospitals\.com|apollopharmacy\.in|medplusmart\.com|kfc\.co\.in|dominos\.co\.in|marutisuzuki\.com|hyundai\.com|hondacarindia\.com|tanishq\.co\.in|titan\.co\.in|lenskart\.com|decathlon\.in|ikea\.com|bata\.com|croma\.com|spencers\.in|anoos\.com)$/i;
// "branch.example.com", "stores.example.com": a store locator, not the business's own site.
const LOCATOR_SUBDOMAIN = /^(branch|branches|stores?|locations?|outlets?|dealers?|local|showrooms?)\./i;

function normName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function isChainName(name) {
  const n = normName(name);
  if (CHAIN_EXACT.includes(n)) return true;
  return !!n && CHAIN_NAME.some(b => n === b || n.startsWith(b + " ") || n.endsWith(" " + b) || n.includes(" " + b + " "));
}

/**
 * Returns null for a prospect, or { kind, reason } for a lead that is not one.
 * No network. Safe to run on every lead on every run.
 */
export function notAProspect(lead) {
  const cat = String(lead.category || "");
  const name = String(lead.name || "");
  const domain = domainOf(lead.website || "") || "";
  const host = (() => { try { return new URL(lead.website).hostname.replace(/^www\./, ""); } catch { return domain; } })();

  if (PUBLIC_CATEGORY.test(cat) || PUBLIC_NAME.test(name) || PUBLIC_DOMAIN.test(domain)) {
    return { kind: "public", reason: "government, education or public body" };
  }
  // Independent review: own site describes a virtual-assistant franchise network.
  if (domain === "antaryamindia.org") {
    return { kind: "tech", reason: "virtual-assistant service / franchise network, not a local website prospect" };
  }
  // A website that is a deep page on someone else's site (itchotels.com/in/en/fortune-inn-…)
  // means the business does not own a site — head office does.
  const depth = (() => { try { return new URL(lead.website).pathname.split("/").filter(Boolean).length; } catch { return 0; } })();
  if (CHAIN_DOMAIN.test(domain) || isChainName(name) || LOCATOR_SUBDOMAIN.test(host) || depth >= 2) {
    return { kind: "chain", reason: "national chain / branch — the website is run by head office" };
  }
  if (NONPROFIT_CATEGORY.test(cat) || NONPROFIT_NAME.test(name)) {
    return { kind: "nonprofit", reason: "nonprofit / NGO / society" };
  }
  if (TECH_CATEGORY.test(cat) || TECH_NAME.test(name)) {
    return { kind: "tech", reason: "IT, web or marketing company — builds websites itself" };
  }
  return null;
}

// ------------------------------------------------------------------ site screen

const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|rediffmail|rediff|outlook|hotmail|live|msn|icloud|me|aol|zoho|zohomail|proton|protonmail)\.[a-z.]+$/i;
const JUNK_EMAIL = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|@(example|domain|email|yourdomain|yoursite|sentry|wixpress|sentry-next)\.|^(you|your|name|user|username|email)@|@2x\./i;
const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

function decodeEntities(html) {
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&commat;/gi, "@")
    .replace(/&period;/gi, ".")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ");
}

/** Cloudflare "email protection" hides addresses as hex in data-cfemail / #hash. */
function cfDecode(hex) {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  } catch { return ""; }
}

export function extractEmails(html) {
  const found = new Set();
  const text = decodeEntities(String(html || ""));
  for (const m of text.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) found.add(cfDecode(m[1]));
  for (const m of text.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) found.add(cfDecode(m[1]));
  for (const m of text.matchAll(/mailto:([^"'?\s>]+)/gi)) {
    try { found.add(decodeURIComponent(m[1])); } catch { found.add(m[1]); }
  }
  for (const m of text.matchAll(EMAIL_RE)) found.add(m[0]);
  // "name [at] domain [dot] com" / "name(at)domain.com"
  const plain = text.replace(/<[^>]+>/g, " ");
  for (const m of plain.matchAll(/([a-z0-9._%+-]+)\s*[[(]\s*at\s*[\])]\s*([a-z0-9-]+(?:\s*(?:[[(]\s*dot\s*[\])]|\.)\s*[a-z0-9-]+)+)/gi)) {
    found.add(`${m[1]}@${m[2].replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".").replace(/\s+/g, "")}`);
  }
  return [...found]
    .map(e => e.trim().toLowerCase().replace(/^[.\-_]+|[.\-_]+$/g, ""))
    .filter(e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) && !JUNK_EMAIL.test(e));
}

function tokens(s) {
  return normName(s).split(" ").filter(t => t.length >= 4);
}

async function fetchPage(url, timeoutMs = 20000) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,*/*;q=0.8", "accept-language": "en-IN,en;q=0.9" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const type = res.headers.get("content-type") || "";
    const body = /html|text|xml/i.test(type) || !type ? (await res.text()).slice(0, 600000) : "";
    return { ok: res.ok, status: res.status, url: res.url || url, body };
  } catch (err) {
    return { ok: false, status: 0, url, body: "", error: String(err.cause?.code || err.message || err) };
  }
}

function contactLinks(html, baseUrl) {
  const out = [];
  let base;
  try { base = new URL(baseUrl); } catch { return out; }
  for (const m of String(html).matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const href = m[1];
    const label = m[2].replace(/<[^>]+>/g, " ");
    if (!/contact|reach|enquir|inquir|get-in-touch|about|connect|support/i.test(href + " " + label)) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      if (!/^https?:$/.test(u.protocol)) continue;
      u.hash = "";
      if (!out.includes(u.href)) out.push(u.href);
    } catch { /* ignore */ }
  }
  // Contact pages before about pages.
  return out.sort((a, b) => (/contact/i.test(b) ? 1 : 0) - (/contact/i.test(a) ? 1 : 0));
}

const FOREIGN_LANG = /^(de|fr|es|it|nl|pt|ru|ja|zh|ko|pl|sv|da|fi|nb|no|cs|tr|ar|he|hu|ro|el)\b/i;
const NONPROFIT_TEXT = /\b(non[- ]?profit|not[- ]for[- ]profit|registered (society|charity|charitable trust)|charitable (trust|society|organi[sz]ation)|donate now|make a donation|donations? (to us )?(are|is) (tax )?exempt|under section 80g|80g (certificate|exemption))\b/i;

/**
 * Fetches the business's own site and decides whether to audit it.
 * Returns { ok, result, email, emailSource, foundOn, osmEmail, siteEmails, reason, checkedAt }.
 *   result: "ok" | "no-email" | "unreachable" | "foreign" | "nonprofit"
 */
export async function screenSite(lead, { maxPages = 4, browser = true } = {}) {
  const first = await screenWith(lead, await fetchPages(lead, maxPages));
  // Plain fetch found nothing, or the site refused a non-browser (403/429/503):
  // the address may be rendered by JavaScript. Look again in a real browser.
  const retry = browser && (first.result === "no-email" || (first.result === "unreachable" && first.httpStatus > 0));
  if (!retry) return first;
  let rendered;
  try { rendered = await renderPages(lead, maxPages); } catch (err) { return { ...first, browserError: String(err.message || err).split("\n")[0] }; }
  if (!rendered.length) return first;
  const second = await screenWith(lead, rendered);
  return { ...second, rendered: true };
}

/** Plain HTTP: homepage plus up to three contact/about pages. */
async function fetchPages(lead, maxPages) {
  const home = await fetchPage(lead.website);
  if (!home.ok) return { home, pages: [] };
  const pages = [home];
  const links = contactLinks(home.body, home.url);
  const guesses = ["/contact", "/contact-us", "/contact.html", "/contactus"].map(p => { try { return new URL(p, home.url).href; } catch { return null; } }).filter(Boolean);
  const queue = [...links, ...guesses.filter(g => !links.some(l => l.replace(/\/$/, "") === g.replace(/\/$/, "")))];
  for (const url of queue) {
    if (pages.length >= maxPages) break;
    if (pages.some(p => p.url.replace(/\/$/, "") === url.replace(/\/$/, ""))) continue;
    const p = await fetchPage(url, 15000);
    if (p.ok && p.body) pages.push(p);
  }
  return { home, pages };
}

/** The same pages, rendered by Chromium (only used when plain fetch finds nothing). */
async function renderPages(lead, maxPages) {
  const { resolveBrowser, launchOptions } = await import("./browser.mjs");
  const resolved = await resolveBrowser({ install: false });
  const browser = await resolved.chromium.launch(launchOptions(resolved));
  const out = [];
  try {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 390, height: 844 }, locale: "en-IN" });
    const page = await ctx.newPage();
    const grab = async (url) => {
      try {
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2500);
        const html = await page.content();
        const text = await page.evaluate(() => document.body ? document.body.innerText : "");
        return { ok: !!res && res.status() < 400, status: res ? res.status() : 0, url: page.url(), body: `${html}\n${text}` };
      } catch (err) {
        return { ok: false, status: 0, url, body: "", error: String(err.message || err).split("\n")[0] };
      }
    };
    const home = await grab(lead.website);
    if (!home.ok) return out;
    out.push(home);
    for (const url of contactLinks(home.body, home.url)) {
      if (out.length >= maxPages) break;
      const p = await grab(url);
      if (p.ok) out.push(p);
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return out;
}

async function screenWith(lead, fetched) {
  const checkedAt = new Date().toISOString();
  const osmEmail = lead.email ? String(lead.email).trim().toLowerCase() : null;
  const base = { checkedAt, osmEmail, email: null, emailSource: null, foundOn: null, siteEmails: [] };
  const pages = Array.isArray(fetched) ? fetched : fetched.pages;
  const home = Array.isArray(fetched) ? fetched[0] : fetched.home;
  if (!pages.length) {
    return { ...base, ok: false, result: "unreachable", httpStatus: home?.status || 0, reason: home?.error ? `site unreachable (${home.error})` : `homepage returned HTTP ${home?.status}` };
  }

  // Which page published which address.
  const where = new Map();
  for (const p of pages) for (const e of extractEmails(p.body)) if (!where.has(e)) where.set(e, p.url);
  const siteEmails = [...where.keys()];
  base.siteEmails = siteEmails;

  const allText = pages.map(p => p.body).join("\n");
  const plain = decodeEntities(allText.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));

  // An Indian local business says so somewhere: the state, the city, India, +91,
  // its own phone number, or an Indian domain.
  const lang = (home.body.match(/<html[^>]*\blang\s*=\s*["']?([a-z-]+)/i) || [])[1] || "";
  const domain = domainOf(lead.website) || "";
  const phone10 = String(lead.phone || "").replace(/\D/g, "").slice(-10);
  const localSignals = [
    /\.in$/i.test(domain),
    /\bindia\b/i.test(plain),
    /\+\s?91|\b0091\b/.test(plain),
    lead.state && new RegExp(`\\b${String(lead.state).replace(/[^a-z ]/gi, "").replace(/\s+/g, "\\s*")}\\b`, "i").test(plain),
    lead.city && new RegExp(`\\b${String(lead.city).replace(/[^a-z ]/gi, "")}\\b`, "i").test(plain),
    phone10.length === 10 && plain.replace(/\D/g, "").includes(phone10),
  ].some(Boolean);
  // A JavaScript-only page has almost no text to judge, so only the lang attribute counts there.
  if (FOREIGN_LANG.test(lang) || (!localSignals && plain.replace(/\s+/g, " ").length > 1500)) {
    return { ...base, ok: false, result: "foreign", reason: FOREIGN_LANG.test(lang) ? `site is in a foreign language (lang="${lang}") — not a local business` : "site never mentions India, the state, the city or an Indian phone number — not a local business" };
  }
  if (NONPROFIT_TEXT.test(plain)) {
    const hit = plain.match(NONPROFIT_TEXT)[0];
    return { ...base, ok: false, result: "nonprofit", reason: `site describes itself as a nonprofit ("${hit}")` };
  }

  // 1. The OSM address is published on the site: confirmed.
  if (osmEmail && where.has(osmEmail)) {
    return { ...base, ok: true, result: "ok", email: osmEmail, emailSource: "openstreetmap, confirmed on site", foundOn: where.get(osmEmail) };
  }
  // 2. The site publishes its own address. Same domain as the website first; a
  //    free-mail address only if it is clearly the business's (name/domain match)
  //    or the only address on the site — a web designer's credit line is not.
  const domainRoot = domain.split(".")[0];
  const nameTokens = new Set([...tokens(lead.name), domainRoot].filter(t => t && t.length >= 4));
  const sameDomain = siteEmails.filter(e => domainOf("https://" + e.split("@")[1]) === domain);
  // The mailbox name itself carries the business or owner name (dr.ramya@… for
  // "Dr. Ramya Sadaram", redcrossegrc@yahoo.com for "Indian Red Cross"). Only the
  // part before @ counts, so a designer's hello@krishnadesigns.com never matches.
  const localMatches = e => [...nameTokens].some(t => e.split("@")[0].replace(/[^a-z0-9]/g, "").includes(t.replace(/[^a-z0-9]/g, "")));
  const freeMatching = [...siteEmails.filter(e => FREE_MAIL.test(e) && localMatches(e)), ...siteEmails.filter(e => !FREE_MAIL.test(e) && localMatches(e))];
  const onlyFree = siteEmails.length === 1 && FREE_MAIL.test(siteEmails[0]) ? siteEmails : [];
  const pick = sameDomain[0] || freeMatching[0] || onlyFree[0] || null;
  if (pick) {
    return { ...base, ok: true, result: "ok", email: pick, emailSource: osmEmail ? `own website (OpenStreetMap had ${osmEmail}, not on the site)` : "own website", foundOn: where.get(pick) };
  }
  return {
    ...base,
    ok: false,
    result: "no-email",
    reason: siteEmails.length
      ? `site shows only addresses that are not clearly the business's (${siteEmails.slice(0, 3).join(", ")})`
      : `no email published on the site${osmEmail ? ` (OpenStreetMap's ${osmEmail} is not on it)` : ""}`,
  };
}
