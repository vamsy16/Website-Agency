# Changelog

All notable changes to the Agency OS. Newest first. One line per change; say why
if the reason is not obvious.

## 1.3.0 — 15 November 2026

**A strategy plan, not just an audit.** A school that asks "what should we do"
needs a document a management committee can sign, not a scorecard. Same frozen
design system, same voice, sixteen A4 pages.

- `plans/_template/plan.html` — the fixed 16-page document: cover, one-page
  summary, the parent decision journey, a 12-point baseline that says out loud it
  is not a score, the five pillars, one page per pillar, the admissions funnel,
  measurement, paid media, the Nov–Jun calendar, the 90-day roadmap, three
  investment tiers, risks and compliance, next steps. Placeholders only — no
  client data.
- `plans/_template/plan.css` — additive plan components (`.pillar`,
  `table.chk`, `table.cal`, `.road`, `.fn`, `.split`, `.logochip`, three-tier
  `.plan-c`). It defines no new type or colour tokens; `src/styles.css` and
  `src/fonts.css` are untouched.
- `plans/plan.config.json` — the single editable block: school, city, state,
  board, fee band, admission year, prepared-on date.
- `npm run plan` (`tools/render-plan.mjs`) — inlines fonts, styles, plan CSS and
  the logo into one self-contained HTML, resolves every token (an unknown token
  is a hard failure, never a blank), measures every page in Chromium at A4, then
  renders the PDF. It refuses to hand back a document that has the wrong page
  count, a non-A4 media box, content overflowing its column or reaching into the
  footer band, cover content under the confidential line, text past the 194 mm
  right margin, a broken image, an unloaded font, a console error, or an
  unresolved token. Measurements land in `reports/plans/<slug>/plan-report.json`.
- Output goes to `reports/`, which is already gitignored, so a client's plan can
  never reach the public export.
- The plan carries no testimonial, no fabricated statistic and no promised
  admission number. Forward-looking figures are labelled arithmetic
  (`seats = enquiries × visit rate × admission rate`), labelled examples, or
  targets. Investment is example pricing with media spend separated and paid at
  cost, 90-day minimum, no guarantee.
- `plans/README.md` and RUNBOOK §11b document the swap and the refusal list.

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
