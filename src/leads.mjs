// Lead sourcing by state.
//
// Adapters, in order of preference:
//   1. OpenStreetMap Overpass  - free, no key, ODbL attribution required
//   2. Google Places           - only when GOOGLE_MAPS_API_KEY is set
//   3. CSV intake              - the operator's own list, optional
//
// Overpass is the default, and it is asked of several mirrors in turn: a single
// endpoint is a single point of failure, and public instances go down, rate
// limit, or are blocked from a given network. The state itself is resolved two
// ways: by administrative area name, and — when that returns nothing — by the
// bounding box from Nominatim. Either way the query is bounded to the state, so
// a run for "Andhra Pradesh" cannot return a Kerala business.
//
// Deliberately NOT included: scraping Google Maps results, Yelp, or directory
// sites whose terms forbid it. If a business has not published a website, it is
// kept as a lead with website: null and status: "no-website" rather than invented.
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJSON, writeJSON, ensureDir, domainOf, normalizeUrl, slug, log, parseList, isoDate } from "./util.mjs";
import { resolveState, nicheTags } from "./config.mjs";
import { checkLead, recordLead } from "./dedupe.mjs";
import { SOCIAL_HOSTS } from "./measure.mjs";

const UA = "smart-pursuit-agency-os/1.1 (lead sourcing; https://github.com/vamsy16/Website-Agency)";

// Only businesses that publish a website can be audited, so the website filter is
// applied inside the Overpass query. Without it the `out` cap is filled by the
// first N businesses in the area — usually ones with no site — and a state with
// 3,000 dentists looks empty.
const WEB_TAG = `[~"^(website|contact:website|url)$"~"."]`;

// Businesses that publish a website, by OSM tag group.
//
// `shop`, `office`, `craft` and `healthcare` are business namespaces, so the bare
// key is enough. `amenity`, `leisure` and `tourism` mix businesses with public
// infrastructure — a bank, a temple, a school, a bus stand — so only these values
// are searched. Everything found is still checked against NOT_A_PROSPECT below.
const BROAD_GROUPS = [
  { key: "shop" },
  { key: "office" },
  { key: "craft" },
  { key: "healthcare" },
  {
    key: "amenity",
    values: [
      "restaurant", "cafe", "fast_food", "bar", "pub", "nightclub", "dentist", "clinic",
      "doctors", "veterinary", "pharmacy", "hospital", "driving_school", "car_rental",
      "bicycle_rental", "cinema", "theatre", "spa", "dojo",
    ],
  },
  {
    key: "leisure",
    values: [
      "fitness_centre", "sports_centre", "bowling_alley", "amusement_arcade",
      "water_park", "golf_course", "dance", "horse_riding", "ice_rink",
    ],
  },
  {
    key: "tourism",
    values: ["hotel", "guest_house", "hostel", "motel", "apartment", "chalet", "resort"],
  },
];

// Values that pass the tag filter but are not a small business with a budget.
const NOT_A_PROSPECT = {
  office: new Set([
    "government", "administrative", "diplomatic", "educational_institution",
    "university", "research", "religion", "political_party", "forestry",
    "water_utility", "energy_supplier", "telecommunication",
  ]),
  amenity: new Set([
    "bank", "atm", "bureau_de_change", "place_of_worship", "school", "college",
    "university", "kindergarten", "library", "fuel", "police", "fire_station",
    "courthouse", "townhall", "post_office", "bus_station", "ferry_terminal",
    "parking", "toilets", "public_building", "prison", "embassy", "social_facility",
    "shelter", "grave_yard", "monastery", "community_centre", "marketplace",
  ]),
};

// Published on a government, academic or military domain: not a small-business site.
const PUBLIC_DOMAIN_RE = /(\.gov|\.nic|\.ac\.[a-z]{2}|\.edu|\.mil)(\.[a-z]{2,})?$/i;

// Pan-national brands. A branch is not a prospect: the site is run from head
// office. Matched on the normalised name, as a whole name or a name prefix, so
// "KFC Vijayawada" is caught but "Taj Mahal Restaurant" is not.
const CHAIN_BRANDS = [
  "kfc", "dominos", "domino s", "pizza hut", "mcdonalds", "subway", "starbucks",
  "burger king", "papa johns", "dunkin", "baskin robbins", "haldirams", "barbeque nation",
  "cafe coffee day", "ccd", "spencers", "dmart", "d mart", "big bazaar", "reliance fresh",
  "reliance digital", "more supermarket", "airtel", "jio", "vodafone", "bata", "nike",
  "adidas", "puma", "decathlon", "ikea", "pantaloons", "westside", "shoppers stop",
  "tanishq", "titan", "croma", "vijay sales", "lenskart", "medplus", "apollo pharmacy",
  "wellness forever", "oyo", "treebo", "fabhotel", "ginger hotel", "lemon tree",
  "marriott", "radisson", "novotel", "ibis",
];

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function isChain(name) {
  const n = normalizeName(name);
  if (!n) return false;
  return CHAIN_BRANDS.some(b => n === b || n.startsWith(b + " ") || n.endsWith(" " + b));
}

/** Title-cases an OSM value for use as a category label. */
function titleize(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b[a-z]/g, c => c.toUpperCase());
}

/** The business's own category, taken from whichever OSM group matched. */
function categoryOf(tags) {
  for (const key of ["amenity", "shop", "office", "craft", "healthcare", "leisure", "tourism"]) {
    const value = tags[key];
    if (!value) continue;
    return { category: `${key}=${value}`, nicheLabel: value === "yes" ? titleize(key) : titleize(value) };
  }
  return { category: null, nicheLabel: "" };
}

/**
 * Orders broad results: a published phone number means there is a human to call,
 * and these categories are the ones that buy websites.
 */
const GOOD_CATEGORIES = /dentist|dental|clinic|doctor|hospital|lawyer|attorney|estate agent|real estate|salon|beauty|spa|gym|fitness|restaurant|cafe|hotel|guest house|school of|driving school|veterinary|pharmacy|optician|jewel|boutique|travel agency|interior|architect|photograph/i;

function scoreLead(lead) {
  let score = 0;
  if (lead.phone) score += 4;
  if (lead.email) score += 2;
  if (lead.niche) score += 2;
  if (GOOD_CATEGORIES.test(String(lead.nicheLabel || ""))) score += 3;
  return score;
}

/**
 * Round-robins by category so a day's queue is not eight hospitals in a row.
 * Order within a category is preserved (that is the score order).
 */
function diversify(leads) {
  const buckets = new Map();
  for (const lead of leads) {
    const key = lead.nicheLabel || lead.category || "other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(lead);
  }
  const out = [];
  let added = true;
  while (added) {
    added = false;
    for (const bucket of buckets.values()) {
      if (bucket.length) { out.push(bucket.shift()); added = true; }
    }
  }
  return out;
}


/** Public Overpass mirrors, tried in order. OVERPASS_URL overrides the list. */
export function overpassEndpoints() {
  const fromEnv = String(process.env.OVERPASS_URL || "")
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set([
    ...fromEnv,
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
  ])];
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return url; }
}

/**
 * Builds one Overpass query bounded to the state, either by administrative area
 * name or by bounding box, and restricted to businesses that publish a website.
 */
function overpassQuery(state, tags, limit, bbox = null) {
  const head = bbox
    ? ""
    : `area["name"="${state.overpassArea || state.state}"]["admin_level"="${state.adminLevel || 4}"]->.searchArea;\n`;
  const scope = bbox ? bbox.join(",") : "area.searchArea";
  const clauses = tags
    .map(t => `  node(${scope})["${t.key}"="${t.value}"]${WEB_TAG};\n  way(${scope})["${t.key}"="${t.value}"]${WEB_TAG};`)
    .join("\n");
  return `[out:json][timeout:180];\n${head}(\n${clauses}\n);\nout center tags ${limit};`;
}

/** The same idea, but for every business group in BROAD_GROUPS. */
function overpassQueryBroad(state, limit, bbox = null) {
  const head = bbox
    ? ""
    : `area["name"="${state.overpassArea || state.state}"]["admin_level"="${state.adminLevel || 4}"]->.searchArea;\n`;
  const scope = bbox ? bbox.join(",") : "area.searchArea";
  const clauses = BROAD_GROUPS.flatMap(g => {
    const sel = g.values ? `["${g.key}"~"^(${g.values.join("|")})$"]` : `["${g.key}"]`;
    return [`  node(${scope})${sel}${WEB_TAG};`, `  way(${scope})${sel}${WEB_TAG};`];
  }).join("\n");
  return `[out:json][timeout:180];\n${head}(\n${clauses}\n);\nout center tags ${limit};`;
}

/**
 * Runs one Overpass query against the mirrors in order until one answers.
 * Returns { data, endpoint, attempts, errors }.
 */
export async function runOverpass(query, { timeoutMs = 90_000, endpoints = overpassEndpoints() } = {}) {
  const errors = [];
  let attempts = 0;
  for (const url of endpoints) {
    attempts++;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        errors.push(`${hostOf(url)} HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data.elements)) {
        errors.push(`${hostOf(url)} returned no elements array`);
        continue;
      }
      return { data, endpoint: url, attempts, errors };
    } catch (err) {
      errors.push(`${hostOf(url)} ${err.name === "TimeoutError" ? `timed out after ${timeoutMs / 1000}s` : err.message}`);
    }
  }
  throw new Error(`Overpass unreachable. Tried ${attempts} mirror(s): ${errors.slice(-6).join("; ")}`);
}

/** The state's bounding box, from Nominatim. Used when the area lookup is empty. */
export async function stateBbox(state, { timeoutMs = 30_000 } = {}) {
  const q = new URLSearchParams({
    q: [state.overpassArea || state.state, state.country].filter(Boolean).join(", "),
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !Array.isArray(row.boundingbox) || row.boundingbox.length !== 4) {
    throw new Error(`Nominatim could not find a boundary for "${state.state}, ${state.country}"`);
  }
  const [south, north, west, east] = row.boundingbox.map(Number);
  return { bbox: [south, west, north, east], displayName: row.display_name || null };
}

function normalizeWebsite(raw) {
  if (!raw) return null;
  const first = String(raw).split(";")[0].trim();
  if (!first) return null;
  if (/^https?:\/\//i.test(first)) return first;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(first)) return `https://${first}`;
  return null;
}

function fromOsmElement(el, state, nicheByTag) {
  const t = el.tags || {};
  const name = t.name || t["name:en"] || null;
  if (!name) return null;
  const website = normalizeWebsite(t.website || t["contact:website"] || t.url || t["brand:website"]);
  const city = t["addr:city"] || null;
  const phone = t.phone || t["contact:phone"] || t["contact:mobile"] || null;
  const email = t.email || t["contact:email"] || null;
  const tagKey = Object.keys(nicheByTag).find(k => t[k.split("=")[0]] === k.split("=")[1]);
  const socialOnly = website ? SOCIAL_HOSTS.some(h => domainOf(website).endsWith(h)) : false;
  const { category, nicheLabel } = categoryOf(t);
  return {
    name,
    website: socialOnly ? null : website,
    socialProfile: socialOnly ? website : null,
    phone,
    email,
    city,
    state: state.state,
    country: state.country,
    niche: tagKey ? nicheByTag[tagKey] : null,
    nicheLabel,
    category,
    address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null,
    source: "openstreetmap",
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    osmId: `${el.type}/${el.id}`,
  };
}

/** "Andhra Pradesh" / "AP" / "andhra pradesh" -> comparable. */
function sameState(a, b) {
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  const x = norm(a), y = norm(b);
  return !!x && (x === y || x.startsWith(y) || y.startsWith(x));
}

/** Google Places (New) text search. Requires GOOGLE_MAPS_API_KEY. */
async function fromGooglePlaces(state, niches, limit) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { leads: [], skipped: "GOOGLE_MAPS_API_KEY not set" };
  const out = [];
  for (const city of state.cities.slice(0, 6)) {
    for (const niche of niches) {
      const body = { textQuery: `${niche} in ${city}, ${state.state}, ${state.country}`, pageSize: 20 };
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.addressComponents",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) { log("leads", `places ${city}/${niche} -> HTTP ${res.status}`); continue; }
      const data = await res.json();
      for (const p of data.places || []) {
        const comps = p.addressComponents || [];
        const cityComp = comps.find(c => (c.types || []).includes("locality"));
        const stateComp = comps.find(c => (c.types || []).includes("administrative_area_level_1"));
        // Places sometimes answers with a neighbouring state's business. Drop it:
        // a run for one state must only return leads in that state.
        if (stateComp && state.state && !sameState(stateComp.longText || stateComp.shortText, state.state)) continue;
        out.push({
          name: p.displayName?.text || null,
          website: p.websiteUri || null,
          phone: p.nationalPhoneNumber || null,
          email: null,
          city: cityComp?.longText || city,
          state: state.state,
          country: state.country,
          niche,
          address: p.formattedAddress || null,
          source: "google_places",
          sourceUrl: null,
        });
      }
      if (out.length >= limit * 2) break;
    }
  }
  return { leads: out.filter(l => l.name) };
}

/** Minimal CSV reader: name,website,city,phone,email,niche */
export function readCsv(file, state) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const split = line => {
    const out = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === "," && !quoted) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const header = split(lines[0]).map(h => h.toLowerCase());
  const idx = name => header.indexOf(name);
  return lines.slice(1).map(line => {
    const c = split(line);
    const get = name => (idx(name) >= 0 ? c[idx(name)] || null : null);
    return {
      name: get("name") || get("business"),
      website: normalizeWebsite(get("website") || get("url")),
      phone: get("phone"),
      email: get("email"),
      city: get("city") || (state.cities || [])[0] || null,
      state: state.state,
      country: state.country,
      niche: get("niche"),
      address: get("address"),
      source: "csv",
      sourceUrl: file,
    };
  }).filter(l => l.name);
}

/**
 * Fetch candidates for a state and register the new ones.
 * Returns { added, skipped, candidates } so the caller can print an honest count.
 */
export async function fetchLeads({ stateName, niches, limit = 25, csv = null, useOverpass = true, usePlaces = true, country = null, broad = true }) {
  const state = resolveState(stateName, { country });
  const settings = readJSON(path.join(ROOT, "config", "settings.json"));
  const cap = Math.min(limit || settings.caps.maxLeadsPerRun, settings.caps.maxLeadsPerRun);
  const chosenNiches = niches?.length ? niches : state.defaultNiches;
  const tags = nicheTags(chosenNiches);
  const nicheByTag = Object.fromEntries(tags.map(t => [`${t.key}=${t.value}`, t.niche]));

  let candidates = [];
  const notes = [];
  if (!state.configured) {
    notes.push(`no config/states/${slug(state.state)}.json — searching by boundary name; add a config only if you need a curated city list`);
  }

  if (csv) {
    candidates = readCsv(csv, state);
    notes.push(`csv: ${candidates.length} rows from ${path.basename(csv)}`);
  } else {
    if (useOverpass) {
      log("leads", `openstreetmap: ${state.state}, ${tags.length} tag(s), cap ${cap}`);
      const collect = (elements) => elements
        .map(el => fromOsmElement(el, state, nicheByTag))
        .filter(Boolean)
        .filter(l => l.website);            // only auditable sites
      const errorsSeen = [];

      try {
        // When every requested niche tag is already inside BROAD_GROUPS, the
        // broad query returns it — one query instead of two. The niche pass is
        // still run for a `--no-broad` search, or for a niche whose OSM tag the
        // broad list does not cover.
        const covered = tags.every(t => BROAD_GROUPS.some(g => g.key === t.key && (!g.values || g.values.includes(t.value))));
        const runNichePass = !broad || !covered;

        if (runNichePass) {
          const area = await runOverpass(overpassQuery(state, tags, Math.max(cap, 10)));
          let elements = area.data.elements || [];
          let how = `area, ${hostOf(area.endpoint)}`;
          errorsSeen.push(...area.errors);

          // The state's bounding box, when the area-name lookup found nothing.
          // An area lookup can come back empty on a mirror that has not built
          // its area index, and not every state is an admin_level=4 area.
          if (!elements.length) {
            try {
              const box = await stateBbox(state);
              state.bbox = box.bbox;
              const boxed = await runOverpass(overpassQuery(state, tags, Math.max(cap, 10), box.bbox));
              elements = boxed.data.elements || [];
              how = `bounding box, ${hostOf(boxed.endpoint)}`;
              errorsSeen.push(...boxed.errors);
            } catch (err) {
              notes.push(`bounding-box fallback failed: ${err.message}`);
            }
          }

          const nicheHits = collect(elements);
          if (nicheHits.length) {
            candidates.push(...nicheHits);
            notes.push(`openstreetmap: ${nicheHits.length} ${chosenNiches.join("/")} business(es) with a website (${how})`);
          } else {
            notes.push(`openstreetmap: no ${chosenNiches.join("/")} business with a published website in ${state.state}`);
          }
        }

        // Any business in the state that publishes a website.
        //
        // OSM website coverage in India is around 1 in 100 businesses, so a
        // niche-only search usually yields one or two leads for a whole state.
        // The operator asked for "any lead in this state with a website", so the
        // search widens instead of returning an empty day.
        if (broad && candidates.length < cap) {
          const broadQ = (bbox) => overpassQueryBroad(state, Math.max(cap * 20, 400), bbox);
          let broadEls = [];
          let broadHow = null;
          try {
            const res = await runOverpass(broadQ(null));
            broadEls = res.data.elements || [];
            broadHow = `area, ${hostOf(res.endpoint)}`;
            errorsSeen.push(...res.errors);

            // Nothing from the area name: retry inside the state's bounding box.
            if (!broadEls.length) {
              try { state.bbox = state.bbox || (await stateBbox(state)).bbox; } catch { state.bbox = null; }
              if (state.bbox) {
                const boxed = await runOverpass(broadQ(state.bbox));
                broadEls = boxed.data.elements || [];
                broadHow = `bounding box, ${hostOf(boxed.endpoint)}`;
              }
            }
          } catch (err) {
            notes.push(`broad search failed: ${err.message}`);
          }

          if (broadEls.length) {
            const rejected = { unnamed: 0, notAProspect: 0, publicDomain: 0, chain: 0 };
            const usable = [];
            for (const el of broadEls) {
              const t = el.tags || {};
              if (!t.name) { rejected.unnamed++; continue; }
              const bad = Object.entries(NOT_A_PROSPECT).find(([k, set]) => t[k] && set.has(t[k]));
              if (bad) { rejected.notAProspect++; continue; }
              const site = t.website || t["contact:website"] || t.url;
              if (site && PUBLIC_DOMAIN_RE.test(domainOf(site))) { rejected.publicDomain++; continue; }
              if (isChain(t.name)) { rejected.chain++; continue; }
              usable.push(el);
            }
            const leads = collect(usable);
            // A business that publishes a phone number is easier to reach, and
            // the category is a proxy for "has a budget for a website".
            leads.sort((a, b) => scoreLead(b) - scoreLead(a));
            candidates.push(...diversify(leads));
            notes.push(
              `openstreetmap broad: ${leads.length} business(es) with a website (${broadHow})` +
              ` — filtered out ${rejected.notAProspect} public/non-business, ${rejected.chain} chain branch(es),` +
              ` ${rejected.publicDomain} government/education site(s), ${rejected.unnamed} unnamed`,
            );
          } else if (broadHow) {
            notes.push(`openstreetmap broad: no business with a published website in ${state.state} (${broadHow})`);
          }
        }

        if (errorsSeen.length) notes.push(`overpass mirrors skipped before success: ${errorsSeen.join("; ")}`);
      } catch (err) {
        notes.push(`openstreetmap failed: ${err.message}`);
        log("leads", `overpass failed: ${err.message}`);
      }
    }
    if (usePlaces) {
      if (!state.cities.length) {
        notes.push("google places skipped: needs a city list — add config/states/" + slug(state.state) + ".json, or set GOOGLE_MAPS_API_KEY and a state config");
      } else {
        const places = await fromGooglePlaces(state, chosenNiches, cap);
        if (places.leads?.length) {
          candidates.push(...places.leads);
          notes.push(`google places: ${places.leads.length} businesses`);
        } else if (places.skipped) {
          notes.push(places.skipped);
        }
      }
    }
  }

  // A lead needs a plain business website to be auditable.
  const normalised = candidates.map(c => ({
    ...c,
    website: c.website ? normalizeWebsite(c.website) : null,
  }));

  const added = [];
  const skipped = [];
  const seenThisRun = new Set();

  for (const lead of normalised) {
    if (!lead.website) {
      skipped.push({ name: lead.name, reason: lead.socialProfile ? "social profile only" : "no website published" });
      continue;
    }
    const key = domainOf(lead.website);
    if (!key) { skipped.push({ name: lead.name, reason: "unparseable website" }); continue; }
    if (seenThisRun.has(key)) { skipped.push({ name: lead.name, reason: "duplicate within this run" }); continue; }
    seenThisRun.add(key);

    const existing = checkLead(lead);
    if (existing.duplicate) {
      skipped.push({ name: lead.name, domain: key, reason: existing.reasons.join(", ") });
      continue;
    }
    const rec = recordLead(lead, { status: "new" });
    added.push(rec.lead);
    if (added.length >= cap) break;
  }

  const batch = {
    ranAt: new Date().toISOString(),
    state: state.state,
    niches: chosenNiches,
    broad: broad && !csv,
    cap,
    notes,
    added: added.length,
    skipped: skipped.length,
    addedDomains: added.map(l => l.domain),
    skippedDetail: skipped.slice(0, 200),
  };
  const outFile = path.join(ROOT, "data", `batch-${slug(state.state)}-${isoDate(new Date())}.json`);
  ensureDir(path.dirname(outFile));
  writeJSON(outFile, batch);

  log("leads", `added ${added.length}, skipped ${skipped.length} (batch: ${path.relative(ROOT, outFile)})`);
  return { ...batch, leads: added, batchFile: path.relative(ROOT, outFile) };
}

/** Attribution string required by ODbL when OSM data is used. */
export const OSM_ATTRIBUTION = "Lead data © OpenStreetMap contributors, available under the Open Database License (ODbL).";
