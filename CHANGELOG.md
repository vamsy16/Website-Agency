# Changelog

All notable changes to the Agency OS. Newest first. One line per change; say why
if the reason is not obvious.

## 1.4.0 — 15 November 2026

**Confirmed emails only, real prospects only, honest wording.**

- `src/prospect.mjs` — `screenSite(lead)`: before an audit, fetch the business's
  own homepage and up to three contact/about pages. The email counts only if it
  is published there (mailto, plain text, `[at]`/`[dot]`, Cloudflare-protected).
  If OpenStreetMap's address is not on the site but the site publishes its own,
  the site's address is used and the OSM one kept as `osmEmail`. No published
  address → the lead is skipped (`screenedOut`), never guessed. The same fetch
  skips dead sites, non-Indian companies and self-declared nonprofits before a
  3-minute audit. Screens do not count as audit attempts; `run.maxScreens` caps
  them and a screened-out lead is retried after `run.screenRecheckDays`.
- `notAProspect(lead)` (no network): national chains and store-locator pages,
  government/education bodies, nonprofits/NGOs/societies, and IT/web/marketing
  firms are skipped and listed in the run log. Owner decision after Reliance,
  RISE (an Austrian IT firm), Red Cross, Swecha and a golf club were audited.
- Email 1 no longer claims "the enquiry form on your site is broken" for every
  site. Subjects are "<name> — what I found testing <domain>", using a short
  name so long company names no longer fail review (RISE). Email 2's money line
  is built only from what was measured. Drafts now carry the confirmed `To:`.
- Report wording: "patient", "book an appointment" and "booking path" only for
  healthcare businesses (`audienceOf`); others read "customer" / "enquiry".
  The summary verdict names only problems the site has — it no longer says
  "a broken form" when no broken form was found. Rubric unchanged (selftest 36).
- `screen --domain|--audited` re-checks emails without auditing;
  `reaudit --domain … --reason …` re-measures a delivered audit after a wording
  fix (the one place the cooldown is overridden; never counts toward a target).
  `run-request.json` accepts `reaudit` and `reauditReason`.
- When a plain fetch finds no address (JavaScript-rendered page) or the site
  refuses a non-browser (HTTP 403), the screen looks again in Chromium.
- A "website" that is a deep page on another company's site
  (`itchotels.com/in/en/fortune-inn-…`) marks a chain branch. Hotel Sree Kanya
  (ITC Fortune) slipped through the first 1.4.0 run because of this.
- `publish-deliverables --index-only`; the index has a **Send?** column.

## 1.3.0 — 15 November 2026

**Email-only audits, GitHub runner, verified deliverables.**

- Owner rule: only audit a business with a published email. `run.requireEmail`
  in `config/settings.json` (default `true`); `pendingLeads({ requireEmail })`
  skips leads without a valid published address and reports them as `no email`.
  `--allow-no-email` overrides for one run. Addresses are never guessed.
- `run --target N` stops once N audits pass verification; `--max` still caps
  attempts. Fresh leads are queued before retries of failed ones.
- `.github/workflows/agency-run.yml`: pushing `run-request.json` runs the daily
  driver on a GitHub runner (the Arena sandbox cannot reach OSM or prospect
  sites). Verified audits are published to `deliverables/` by
  `tools/publish-deliverables.mjs`; everything else returns encrypted.

## 1.2.0 — 14 November 2026

**Runs in a bare sandbox.** A fresh machine with no Chrome and a network that
blocks a public Overpass mirror used to stop the tool dead. Both are fixed.

- `src/browser.mjs` — one resolver, four layers: `CHROME_PATH` (or
  `CHROMIUM_PATH` / `EDGE_PATH`), Playwright's downloaded Chromium, a system
  Chrome/Edge/Brave/Chromium on Windows, macOS or Linux, then an automatic
  `playwright install chromium`. Only if all four fail does it throw, and the
  error lists the commands that fix it. `measure`, `pdf`, `qa` and
  `tools/image-stats.mjs` all go through it.
- `package.json` now depends on `playwright`, not `playwright-core`. The full
  package downloads Chromium during `npm install`; `playwright-core` never did,
  which is why a clean install had no browser.
- `npm run doctor [--state X]` — resolves the browser, probes every Overpass
  mirror, checks Nominatim and the state boundary, prints `ok`/`FAIL` per line
  and the fixes for anything that failed. `--json` for machines,
  `--no-install` to never download.
- `run` resolves the browser before any network work and stops with the fix list
  if none is available, instead of failing once per lead.
- Overpass failover: `overpassEndpoints()` tries five public mirrors in order and
  `runOverpass()` returns which one answered. `OVERPASS_URL` overrides the list.
  On the machine this was written on, four of five mirrors time out — the run
  still finds leads.
- `stateBbox()` via Nominatim. If the administrative-area lookup returns nothing,
  the same query is re-run inside the state's bounding box. Still local: a run
  for Andhra Pradesh cannot return a Kerala business.
- Lighthouse ships as a declared dependency and is spawned through the running
  Node binary, so an audit never depends on `npx` fetching a package mid-run.
  `tools/lighthouse/{mobile,desktop}.json` raise `maxWaitForFcp` to 120 s, which
  stops the NO_FCP abort on slow shared-hosting sites, and a Lighthouse runtime
  error is recorded as `{error}` instead of scoring silently.

**Leads that can actually be audited.**

- The website filter moved inside the Overpass query. Without it the `out` cap
  filled with businesses that have no site, so a state with 3,581 dentists
  reported "0 added".
- Broad sourcing, on by default: any business in the state that publishes a
  website — shops, offices, trades, healthcare, restaurants and cafes, hotels,
  gyms, salons, clinics. Banks, ATMs, temples, schools, government offices, chain
  branches and `gov/nic/ac/edu` domains are filtered out. `--no-broad` keeps the
  old niche-only search. One state now yields 248 auditable businesses where it
  previously yielded none.
- `scoreLead()` ranks by contactability and by categories that buy websites;
  `diversify()` round-robins by category so a day's queue is not eight hospitals.
- `nicheLabel` and `category` are recorded per lead and carried into the audit.
- `pendingLeads()` treats a lead with no niche as unknown, not wrong. A CSV or
  broad lead is no longer silently dropped by the niche filter.
- Social profiles (`fb.com`, `t.me`, `youtube.com`, …) are recognised as
  non-websites in the same list the measurement uses.

**Tests.** `selftest` 3/4/2/6/5 → 36; reference audit 36/100, 6 findings, 10
pages, 0 mm overflow, 23 verify checks; `class-diff` PASS; daily-run integration
10/10; `doctor` green on a machine where 4 of 5 Overpass mirrors are unreachable.

## Unreleased

- Added `docs/ARENA-LEADS-TO-GMAIL.md`: a reusable state/count invocation for deduplicated lead sourcing, verified audit PDFs and deduplicated Gmail drafts with planned follow-up dates. Drafts only; no sending or scheduled-send integration.

## 1.1.0 — 10 November 2026

**The daily run**

- `run` (alias `daily`) — one command for one state: fetch leads, audit only the
  businesses that have never been audited, write their 1 + 3 drafts, and write
  `data/run-<state>-<date>.json`. `--dry-run` prints the queue and measures
  nothing.
- `pendingLeads()` in `dedupe.mjs` computes the queue from `data/leads.json` and
  `data/audits.json`, so a second run on the same day finds nothing to do. No
  "last run" flag exists to drift out of sync.
- `updateLead()` records `audited` / `audit-failed` / `blocked` per lead, with
  `auditAttempts` and `lastError`. A failed measurement is not written to
  `data/audits.json`, so a site that is down does not consume its cooldown.
- `run.maxAuditAttempts` (default 3) stops a permanently broken site from being
  retried forever.

**State names**

- `resolveState()` — any state name works, with or without a config file.
  Overpass finds the boundary by name; `config/states/<state>.json` only adds a
  curated city list (needed by Google Places) and default niches.
  `settings.defaults` supplies the country and fallback niches.

**Filenames and identity**

- The audit PDF is named after the business —
  `Smart-Pursuit-Audit-<Business-Name>.pdf` — falling back to the domain when a
  business has no usable name (`auditFileName()` / `safeFileName()` in
  `util.mjs`). Report directories fall back to the domain slug the same way.
- `runAudit()` replaces the body of `cmdAudit()`. It throws `AuditError`
  (`duplicate` / `dead-site` / `failed`) instead of exiting, so a batch can keep
  going after one bad lead. `cmdAudit` is now a thin wrapper.
- Agency contact details restored in `config/settings.json`: these appear on the
  cover, page 10 and in every draft signature.
- `agency.basedIn` is now `Vizianagaram`. It is printed on the navy block of page
  10 next to the phone and email, so regenerating the reference audit prints the
  new city. The delivered reference PDF keeps the city it was sent with; page
  count, overflow, findings and scores are unchanged.

**Checks**

- `selftest` unchanged: `3 / 4 / 2 / 6 / 5 → 36`.
- Reference audit still reproduces: 36/100, six findings, 10 pages, 0 mm
  overflow, 23 verify checks, 0 warnings.
- Daily-run behaviour tested end to end against a temporary CSV batch: duplicate
  domains collapse, an unreachable site becomes `audit-failed` (not `audited`),
  no audit row is written, audited leads are not re-queued, and a lead that has
  used its attempts is left alone.
