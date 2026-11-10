// Lead sourcing by state.
//
// Adapters, in order of preference:
//   1. OpenStreetMap Overpass  - free, no key, ODbL attribution required
//   2. Google Places           - only when GOOGLE_MAPS_API_KEY is set
//   3. CSV intake              - the operator's own list
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

const OVERPASS = "https://overpass-api.de/api/interpreter";

/** Builds one Overpass query for a state + a set of OSM tags. */
function overpassQuery(state, tags, limit) {
  const areaFilter = `area["name"="${state.overpassArea || state.state}"]["admin_level"="${state.adminLevel || 4}"]->.searchArea;`;
  const clauses = tags
    .map(t => `  node(area.searchArea)["${t.key}"="${t.value}"];\n  way(area.searchArea)["${t.key}"="${t.value}"];`)
    .join("\n");
  return `[out:json][timeout:180];
${areaFilter}
(
${clauses}
);
out center tags ${limit * 6};`;
}

async function runOverpass(query) {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "smart-pursuit-agency-os/1.0 (lead sourcing; contact via config)" },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(200000),
  });
  if (!res.ok) throw new Error(`Overpass returned HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
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
  const website = normalizeWebsite(t.website || t["contact:website"] || t.url);
  const city = t["addr:city"] || null;
  const phone = t.phone || t["contact:phone"] || null;
  const email = t.email || t["contact:email"] || null;
  const tagKey = Object.keys(nicheByTag).find(k => t[k.split("=")[0]] === k.split("=")[1]);
  const socialOnly = website ? SOCIAL_HOSTS.some(h => domainOf(website).endsWith(h)) : false;
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
    address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null,
    source: "openstreetmap",
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    osmId: `${el.type}/${el.id}`,
  };
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
        const cityComp = (p.addressComponents || []).find(c => (c.types || []).includes("locality"));
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
export async function fetchLeads({ stateName, niches, limit = 25, csv = null, useOverpass = true, usePlaces = true, country = null }) {
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
      try {
        const query = overpassQuery(state, tags, cap);
        log("leads", `overpass: ${state.state}, ${tags.length} tags, cap ${cap}`);
        const data = await runOverpass(query);
        const osm = (data.elements || []).map(el => fromOsmElement(el, state, nicheByTag)).filter(Boolean);
        candidates.push(...osm);
        notes.push(`openstreetmap: ${osm.length} businesses`);
      } catch (err) {
        notes.push(`openstreetmap failed: ${err.message}`);
        log("leads", `overpass failed: ${err.message}`);
      }
    }
    if (usePlaces) {
      if (!state.cities.length) {
        notes.push("google places skipped: needs a city list — add config/states/" + slug(state.state) + ".json or pass --csv");
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
