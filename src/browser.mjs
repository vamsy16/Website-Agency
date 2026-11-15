// Which browser does the measuring?
//
// A fresh sandbox usually has none, so the answer is tried in four layers:
//
//   1. CHROME_PATH / CHROMIUM_PATH / EDGE_PATH, when the operator set one
//   2. the Chromium Playwright downloaded at install time
//   3. a system install: Chrome, Edge, Brave or Chromium, on Windows/macOS/Linux
//   4. an on-demand `playwright install chromium`, run once, automatically
//
// Only if all four fail does this throw — and the error carries the exact
// commands that fix it. Nothing here fakes a measurement: an audit still needs
// a real browser running a real page.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, log } from "./util.mjs";

const WIN = process.platform === "win32";
const MAC = process.platform === "darwin";

export class BrowserError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = "BrowserError";
    this.kind = "no-browser";
    Object.assign(this, detail);
  }
}

const EXE_NAMES = new Set([
  "chrome", "chrome.exe", "chromium", "chromium.exe", "Chromium",
  "headless_shell", "headless_shell.exe", "msedge", "msedge.exe",
  "brave", "brave.exe", "brave-browser",
]);

function findExecutable(dir, depth = 3) {
  if (depth < 0) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) if (e.isFile() && EXE_NAMES.has(e.name)) return path.join(dir, e.name);
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const hit = findExecutable(path.join(dir, e.name), depth - 1);
    if (hit) return hit;
  }
  return null;
}

/** Every browser this machine might already have. */
export function systemBrowsers() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    process.env.EDGE_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    `${process.env.LOCALAPPDATA || ""}/Microsoft/Edge/Application/msedge.exe`,
    "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
    `${process.env.LOCALAPPDATA || ""}/BraveSoftware/Brave-Browser/Application/brave.exe`,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/usr/bin/brave-browser",
    "/usr/local/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ].filter(Boolean);
  return candidates.filter(p => {
    try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; }
  });
}

/** Where Playwright keeps downloaded browsers, in this environment. */
function browserCacheRoots() {
  const inRepo = ["playwright", "playwright-core"].map(p => path.join(ROOT, "node_modules", p, ".local-browsers"));
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    ...(process.env.PLAYWRIGHT_BROWSERS_PATH === "0" ? inRepo : []),
    ...inRepo,
    WIN ? path.join(process.env.LOCALAPPDATA || "", "ms-playwright") : null,
    MAC ? path.join(os.homedir(), "Library", "Caches", "ms-playwright") : null,
    path.join(os.homedir(), ".cache", "ms-playwright"),
  ].filter(Boolean);
  return [...new Set(roots)].filter(r => { try { return fs.existsSync(r); } catch { return false; } });
}

/** A Chromium that Playwright itself downloaded, if one is on disk. */
export function playwrightBrowsers() {
  const found = [];
  for (const root of browserCacheRoots()) {
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory() || !/^chromium/i.test(e.name)) continue;
      const exe = findExecutable(path.join(root, e.name));
      if (exe) found.push(exe);
    }
  }
  return found;
}

/** Playwright (the full package) and its bundled-browser path, if usable. */
function bundledFromPlaywright(chromium) {
  try {
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return playwrightBrowsers()[0] || null;
}

/** Loads `playwright` when present, and falls back to `playwright-core`. */
export async function loadPlaywright() {
  for (const name of ["playwright", "playwright-core"]) {
    try {
      return { mod: await import(name), name };
    } catch {}
  }
  throw new BrowserError(
    "Neither \"playwright\" nor \"playwright-core\" is installed.",
    { fix: "npm install" },
  );
}

let cache = null;

/**
 * Resolves a usable browser once per process.
 * @returns {Promise<{chromium: object, executablePath: string|null, source: string, package: string}>}
 */
export async function resolveBrowser({ install = true, refresh = false } = {}) {
  if (cache && !refresh) return cache;
  const { mod, name } = await loadPlaywright();
  const chromium = mod.chromium;

  const explicit = [process.env.CHROME_PATH, process.env.CHROMIUM_PATH, process.env.EDGE_PATH]
    .filter(Boolean).find(p => { try { return fs.existsSync(p); } catch { return false; } });
  if (explicit) {
    cache = { chromium, executablePath: explicit, source: "CHROME_PATH", package: name };
    return cache;
  }

  const bundled = bundledFromPlaywright(chromium);
  if (bundled) {
    cache = { chromium, executablePath: bundled, source: "playwright browser", package: name };
    return cache;
  }

  const system = systemBrowsers()[0];
  if (system) {
    cache = { chromium, executablePath: system, source: `system browser (${path.basename(system)})`, package: name };
    return cache;
  }

  if (install && installChromium()) {
    const after = bundledFromPlaywright(chromium) || playwrightBrowsers()[0];
    if (after) {
      cache = { chromium, executablePath: after, source: "playwright browser (just installed)", package: name };
      return cache;
    }
  }

  throw new BrowserError("No Chromium-family browser found, and the automatic install did not work.", {
    fix: [
      "npm install",
      "npx playwright install chromium",
      "or set CHROME_PATH to a Chrome, Edge, Brave or Chromium executable",
      "Debian/Ubuntu: sudo apt-get install -y chromium",
      "Alpine:        apk add chromium",
      "then check again: npm run doctor",
    ],
  });
}

/** Runs `playwright install chromium` once. Returns true when a browser appeared. */
export function installChromium() {
  if (process.env.SKIP_BROWSER_INSTALL === "1") {
    log("browser", "SKIP_BROWSER_INSTALL=1 — not downloading a browser");
    return false;
  }
  const cli = [path.join(ROOT, "node_modules", "playwright", "cli.js"), path.join(ROOT, "node_modules", "playwright-core", "cli.js")]
    .find(p => fs.existsSync(p));
  const plans = [];
  if (cli) plans.push({ cmd: process.execPath, args: [cli, "install", "chromium"], shell: false });
  plans.push({ cmd: WIN ? "npx.cmd" : "npx", args: ["--yes", "playwright@1", "install", "chromium"], shell: WIN });

  for (const plan of plans) {
    log("browser", `downloading Chromium: ${plan.cmd} ${plan.args.join(" ")}`);
    const res = spawnSync(plan.cmd, plan.args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: plan.shell,
      timeout: 20 * 60 * 1000,
      env: { ...process.env },
    });
    if (res.status === 0) {
      const hit = playwrightBrowsers()[0];
      if (hit) {
        log("browser", `installed ${hit}`);
        return true;
      }
    }
    log("browser", `that attempt failed (exit ${res.status ?? res.signal ?? "?"})`);
  }
  return false;
}

/** Launch options that work with a bundled browser and with a system one. */
export function launchOptions(resolved, extra = {}) {
  const opts = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none", "--hide-scrollbars"],
    ...extra,
  };
  if (resolved?.executablePath) opts.executablePath = resolved.executablePath;
  return opts;
}

/** A one-line description for the run log and the raw evidence file. */
export function describeBrowser(resolved) {
  if (!resolved) return "none";
  return `${resolved.package} + ${resolved.source}: ${resolved.executablePath || "(playwright default)"}`;
}
