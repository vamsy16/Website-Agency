// Config loading + validation. A bad config must fail before any network call.
import path from "node:path";
import fs from "node:fs";
import { ROOT, readJSON, slug } from "./util.mjs";

const CONFIG_DIR = path.join(ROOT, "config");

export function loadSettings() {
  const settings = readJSON(path.join(CONFIG_DIR, "settings.json"));
  const required = ["agency", "audit", "scoring", "thresholds", "outreach", "caps"];
  for (const key of required) {
    if (!settings[key]) throw new Error(`settings.json is missing "${key}"`);
  }
  const weights = settings.scoring.weights;
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.0001) throw new Error(`scoring.weights must sum to 1 (got ${sum})`);
  if (!Array.isArray(settings.outreach.cadenceDays) || settings.outreach.cadenceDays.length !== 3) {
    throw new Error("outreach.cadenceDays must be exactly three day-gaps for the three follow-ups");
  }
  return settings;
}

export function loadNiches() {
  const data = readJSON(path.join(CONFIG_DIR, "niches.json"));
  if (!data.niches || !Object.keys(data.niches).length) throw new Error("niches.json has no niches");
  return data.niches;
}

export function listStates() {
  const dir = path.join(CONFIG_DIR, "states");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, ""));
}

/** Accepts "gujarat", "Gujarat", "GUJARAT". */
export function loadState(name) {
  if (!name || name === true) throw new Error(`--state is required. Known states: ${listStates().join(", ") || "(none configured)"}`);
  const key = slug(name);
  const file = path.join(CONFIG_DIR, "states", `${key}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No state config for "${name}". Known states: ${listStates().join(", ") || "(none)"}. Add config/states/${key}.json first.`);
  }
  const state = readJSON(file);
  if (!state.cities?.length) throw new Error(`${file} must list at least one city`);
  return state;
}

export function nicheTags(niches) {
  const all = loadNiches();
  const out = [];
  for (const name of niches) {
    const key = slug(name).replace(/-/g, "_");
    const entry = all[key] || all[name];
    if (!entry) {
      throw new Error(`Unknown niche "${name}". Known: ${Object.keys(all).join(", ")}`);
    }
    for (const tag of entry.osmTags) {
      const [k, v] = tag.split("=");
      out.push({ key: k, value: v, niche: key });
    }
  }
  return out;
}
