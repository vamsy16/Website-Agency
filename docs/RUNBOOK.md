# Runbook

The operating manual. Follow it in order. Every command is copy-paste ready.

This system does two things and nothing else:

1. **Measure a live website and produce a 10-page audit PDF.**
2. **Write a 1 + 3 email sequence as drafts.**

It does **not** build demo websites, host anything, or send email.

---

## 0. Prerequisites

| Need | Detail |
| --- | --- |
| Node.js | 20 or newer (`node --version`) |
| A Chromium-family browser | Chrome, Edge, Brave or Chromium. `npm install` downloads Playwright's own Chromium, so a fresh machine usually needs nothing |
| Disk | a few hundred MB for the browser, screenshots and PDFs |
| OS | Windows, macOS or Linux. Commands below use `npm`; on PowerShell use `npm.cmd` |
| Network | outbound HTTPS to the target site and to an Overpass mirror for leads |

Install dependencies once:

```powershell
cd "C:\Users\hp\Documents\Agency\Website Agency\agency-os"
npm.cmd install --no-audit --no-fund
```

The `playwright` package downloads its own Chromium during `npm install`. If the
download was skipped (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) or the cache is empty,
the tool installs one itself the first time it needs a browser. Any normal Chrome,
Edge, Brave or Chromium install is used instead when one is present.

Then check the machine:

```powershell
npm.cmd run doctor -- --state "Andhra Pradesh"
```

```
  Agency OS — environment check

  ok    node             node 24.11.0 (needs 20+)
  ok    playwright       "playwright" is installed
  ok    browser          playwright + playwright browser: …/ms-playwright/chromium-1148/chrome-win/chrome.exe
  ok    overpass         https://overpass-api.de answered (3/5 mirrors up)
  ok    overpass.mirror  https://overpass-api.de — answered (412 ms)
  ok    nominatim        boundary lookup: HTTP 200
  ok    state            Andhra Pradesh resolves to a bounding box (Andhra Pradesh, India)
```

`doctor` never asks you for a list of businesses. It answers three questions: is
there a browser, is a lead source reachable, and does the state resolve. Fix
whatever it marks `FAIL`, then run it again.

To point the tool at a specific browser:

```powershell
$env:CHROME_PATH = "D:\Apps\Chrome\chrome.exe"
```

To point lead sourcing at a specific Overpass mirror (comma-separate several):

```powershell
$env:OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"
```

Prove the scoring rubric still reproduces the shipped reference:

```powershell
npm.cmd run selftest
```

Expected:

```
Score rubric calibration: PASS
expected {"speed":3,"mobile":4,"conversion":2,"design":6,"seo":5,"overall":36}
computed {"speed":3,"mobile":4,"conversion":2,"design":6,"seo":5,"overall":36}
```

If this fails, stop. The rubric has drifted from the reference audit and every
future report will be wrong.

---

## 1. Configure the agency identity

Edit `config/settings.json` → `agency`:

```json
"agency": {
  "name": "Smart Pursuit",
  "tagline": "Websites that win patients",
  "auditLabel": "Website & patient-conversion audit",
  "phone": "+91 70950 24220",
  "email": "smartpursuit3@gmail.com",
  "basedIn": "Ahmedabad",
  "auditRefPrefix": "SP-AUD"
}
```

These strings are printed on the cover and page 10 and are used in the email
signature. Change them once, everywhere. `auditLabel` is the noun after the
agency name in every footer — set it per niche ("conversion" for a plumber,
"patient-conversion" for a clinic).

Also review:

| Setting | Meaning |
| --- | --- |
| `audit.reauditCooldownDays` | how long a domain is protected from a second audit (default 60) |
| `outreach.cadenceDays` | the three gaps between follow-ups (default `[3,3,3]`) |
| `outreach.dailySendCap` | a human reminder, not enforced by code (default 20) |
| `caps.maxLeadsPerRun` | hard cap on leads added per run (default 25) |
| `run.auditsPerRun` | audits attempted by one `run` (default 5) |
| `run.leadsPerRun` | leads fetched by one `run` (default 25) |
| `run.maxAuditAttempts` | how many times a failing site is retried before the queue gives up (default 3) |
| `defaults.country`, `defaults.niches` | what an unconfigured state falls back to |
| `scoring.weights` | must sum to 1.00 |

---

## 2. Source leads by state

The operator gives a **state**; the OS returns businesses with a published
website.

```powershell
npm.cmd run leads -- --state gujarat
npm.cmd run leads -- --state gujarat --niches dentist,lawyer --limit 15
npm.cmd run leads -- --state gujarat --csv my-list.csv
```

What happens:

1. `config/states/gujarat.json` is loaded when it exists (cities, country,
   default niches). A state without a config file still works — it is searched by
   its boundary name.
2. OpenStreetMap Overpass is queried for **businesses that publish a website**,
   bounded to the state's administrative area. The website filter is inside the
   query, because OSM returns elements unordered: without it the result cap fills
   with businesses that have no site and the state looks empty.
3. The search is **broad by default**: shops, offices, trades, healthcare,
   restaurants and cafes, hotels, gyms, salons, clinics. Banks, temples, schools,
   government offices, chain branches and government/education domains are
   filtered out. `--niches dentist,clinic` narrows it (and is ranked first);
   `--no-broad` restricts it to those tags only.
4. If the area-name lookup returns nothing, the same query is re-run inside the
   state's bounding box from Nominatim. Either way the result is local: a run for
   Andhra Pradesh cannot return a Kerala business.
5. Several public Overpass mirrors are tried in order, so one unreachable mirror
   does not end the run. Set `OVERPASS_URL` to override the list.
6. Google Places is queried **only if** `GOOGLE_MAPS_API_KEY` is set, and any
   result whose state does not match the requested one is dropped.
7. Every candidate passes `checkLead()` before insertion: same domain, same
   phone (last 10 digits), or same name + city is a duplicate.
8. New leads are appended to `data/leads.json` and a batch file is written to
   `data/batch-<state>-<date>.json`.

You are never asked to supply a list. If every source is unreachable the tool
says which mirrors it tried — run `npm.cmd run doctor` and it will name the
blocked host.

A real example, for one state:

```
openstreetmap broad: 248 business(es) with a website (area, overpass-api.de)
  — filtered out 35 public/non-business, 17 chain branch(es),
    4 government/education site(s), 0 unnamed
```

OSM website coverage in India is roughly 1 business in 100, which is why the
broad search exists: a niche-only pass returns one or two leads for a whole
state, and an empty day is not useful.

Attribution is printed when OSM data is used, and must be kept if the lead list
is ever published:

> Lead data © OpenStreetMap contributors, available under the Open Database
> License (ODbL).

### Add another state

Copy `config/states/gujarat.json` to `config/states/<state>.json` and change:

```json
{
  "state": "Maharashtra",
  "country": "IN",
  "overpassArea": "Maharashtra",
  "adminLevel": 4,
  "cities": ["Mumbai", "Pune", "Nagpur"],
  "defaultNiches": ["dentist", "clinic", "lawyer"],
  "notes": "..."
}
```

`overpassArea` must match the OSM area name exactly. `admin_level` is 4 for most
Indian states.

### Add a niche

Add an entry to `config/niches.json`:

```json
"gym": {
  "label": "Gym",
  "osmTags": ["leisure=fitness_centre"],
  "budget": "medium",
  "why": "Membership is sold on a phone call; a broken form is a lost signup."
}
```

### CSV intake

Header (order is flexible, `name` is required):

```csv
name,website,city,phone,email,niche,address
Smile Works,https://smileworks.example,Ahmedabad,+91 90000 00000,hello@smileworks.example,dentist,"CG Road"
```

A row without a website is skipped with the reason `no website published`.

### Triage

`data/leads.json` is a plain registry. Set the `status` field by hand as the
pipeline advances — nothing in the system reads it when sending, because
nothing sends. Suggested values:

`new` → `audited` → `contacted` → `replied` → `call-booked` → `won` / `lost` /
`do-not-contact`.

Never delete a lead row. The registry is what prevents the same business being
sourced and audited twice.

---

## 3. The daily run — one command, no duplicates

This is the normal way to operate. Give it a state; it sources leads and audits
only the businesses it has never audited.

```powershell
npm.cmd run run -- --state "Andhra Pradesh"
npm.cmd run run -- --state "Andhra Pradesh" --max 3 --niches dentist
npm.cmd run run -- --state "Andhra Pradesh" --no-broad
npm.cmd run run -- --state "Andhra Pradesh" --dry-run
```

`npm.cmd run daily` is the same command under a second name.

What one run does:

1. **Resolve a browser** — first, before any network work, so a machine with no
   Chromium fails once with a fix list instead of failing five times.
2. **Fetch** — sources new leads for the state (Overpass; Places only if
   `GOOGLE_MAPS_API_KEY` is set; or a CSV you pass with `--csv`). Only businesses
   that publish a website. New domains only — duplicates are rejected at intake,
   before anything is measured.
3. **Queue** — asks `pendingLeads()` for businesses that are `new` or
   `audit-failed`, are not inside the 60-day cooldown, are not `blocked`, and
   have not already failed `run.maxAuditAttempts` times.
4. **Audit** — measures, scores, renders, QAs, PDFs and third-eye-verifies each
   one, then writes its 1 + 3 drafts.
5. **Record** — marks the lead `audited` (or `audit-failed` with `lastError`)
   and writes `data/run-<state>-<date>.json`.

The PDF is named after the business: `reports/<slug>/Smart-Pursuit-Audit-<Business-Name>.pdf`.
If a business has no usable name, the domain is used instead.

### Why a second run on the same day does nothing

The queue is computed from `data/leads.json` and `data/audits.json` — not from a
"last run" timestamp. Once a domain has an audit row inside the cooldown, every
later run skips it. Running the command twice is safe, running it in a loop is
safe, and a crash halfway through is safe: the leads already audited stay
audited.

Two states are retried on purpose, because neither is an audit:

| Lead status | Retried? | Why |
| --- | --- | --- |
| `audit-failed` (site down, timeout, third-eye block) | yes, up to `run.maxAuditAttempts` | the site may come back |
| `blocked` (owner opted out) | never | the owner said stop |

A failed attempt is never written to `data/audits.json`, so a broken site cannot
consume a domain's cooldown.

### State names

Any state name works. `Andhra Pradesh`, `Kerala`, `Tamil Nadu` resolve without a
config file: Overpass finds the state boundary by name, and Nominatim supplies a
bounding box if the area lookup comes back empty. A file in `config/states/` only
adds a curated city list (needed for Google Places) and default niches.

Check a state before a run:

```powershell
npm.cmd run doctor -- --state "Tamil Nadu"
```

### Scheduling it

Each run is a fresh process, so the scheduler is trivial.

Windows Task Scheduler, every day at 09:00:

```powershell
$task = 'cmd /c cd /d "C:\Users\hp\Documents\Agency\Website Agency\agency-os" && npm.cmd run run -- --state "Andhra Pradesh"'
schtasks /create /tn "Agency OS daily" /tr $task /sc daily /st 09:00
```

Single quotes around `$task` keep the inner double quotes intact; a nested
`\"` does not survive PowerShell. Check it with `schtasks /query /tn "Agency OS daily" /v /fo list`
and remove it with `schtasks /delete /tn "Agency OS daily" /f`.

cron (macOS / Linux), weekdays at 09:00:

```cron
0 9 * * 1-5 cd /path/to/agency-os && npm run run -- --state "Andhra Pradesh" >> data/cron.log 2>&1
```

`data/` and `reports/` are git-ignored, so a scheduled run never dirties the
repository. It also never sends anything.

### Limits of one run

| Flag | Default | Meaning |
| --- | --- | --- |
| `--max` | `run.auditsPerRun` (5) | audits attempted in this run |
| `--leads-limit` | `run.leadsPerRun` (25) | new leads fetched in this run |
| `--niches` | state default | narrow the search; these are ranked first |
| `--no-broad` | off | request only the `--niches`/default tags, never any business with a website |
| `--no-leads` | off | audit the existing queue, fetch nothing |
| `--no-sequence` | off | audit only, write no drafts |
| `--dry-run` | off | print the queue; fetch and measure nothing |

A run is deliberately small. One audit takes one to three minutes; ten in a row
compete with each other for the machine, and ten near-identical PDFs are harder
to send well than three.

---

## 4. Choose who to audit

A lead is worth an audit when **all** of these are true:

- [ ] the business clearly makes money (established clinic, firm, contractor);
- [ ] the site loads and returns HTTP 200;
- [ ] the site has at least one measurable defect (slow, no form, tiny text,
      competing headlines, dead links);
- [ ] the business publishes a contact route you may use;
- [ ] you have not audited this domain inside the cooldown window.

A lead is **not** worth an audit when the site is already excellent, when the
business is a one-person hobby, or when the only contact route is a form you
would be cold-submitting.

---

## 5. The duplicate gate (runs automatically)

`audit` calls `checkAudit()` **before any network request**. It refuses when:

- the domain has an audit inside `reauditCooldownDays` (default 60);
- the domain is marked `status: "blocked"` in `data/audits.json`.

Example refusal:

```
FAILED: Refusing to audit example.com: it is already on file.
  - already audited on 2026-11-08 — cooldown runs to 2027-01-07 (60 days)
```

This is the check that stops a lead receiving the same audit twice. Do not work
around it casually.

`--force` exists for exactly two reasons:

1. a **before/after re-audit** after the client has shipped fixes;
2. reproducing a recorded measurement on a machine whose registry already contains it.

When you force, the registry records the new audit under the same reference; the
old one is replaced, not duplicated.

### Mark a domain do-not-audit

In `data/audits.json`, set the row for that domain:

```json
{ "domain": "example.com", "status": "blocked", "blockedReason": "owner asked us to stop" }
```

The gate will refuse even with a fresh cooldown, and `--force` will refuse too
because `blocked` is checked before the cooldown. Use this for opt-outs.

---

## 6. Audit a live site

```powershell
npm.cmd run audit -- --url https://example.com --name "Example Dental" --city Ahmedabad --state gujarat
```

Useful flags:

| Flag | Effect |
| --- | --- |
| `--legal-name "Example Dental LLP"` | name printed in the footer |
| `--contact "Dr Rao"` | name used in the greeting and `Prepared for` |
| `--contact-page https://example.com/contact/` | page inspected for a form |
| `--niche dentist` | label only |
| `--skip-lighthouse` | faster, but the report loses its speed score — do not ship this |
| `--force` | override the duplicate gate, with a reason |
| `--live` | after rendering, re-fetch the site and re-check the headline claims |

What the command does, in order:

1. **Gate** — duplicate check.
2. **Measure** — loads the page at 390 × 844 and 1440 × 900 in Chrome, records
   DOM facts, requests, cookies, console errors, main-thread blocking; captures
   screenshots; runs Lighthouse mobile and desktop; probes `/contact/`,
   `/sitemap.xml`, `/robots.txt`, `/wp-json/`; reads ad-tech and analytics from
   network requests.
3. **Score** — the fixed rubric from `docs/AUDIT-SPEC.md`.
4. **Derive** — facts and six findings, each with an `evidence` pointer.
5. **Render** — `reports/<slug>/report.html`, 10 A4 pages.
6. **QA** — Chromium layout check: 10 pages, no overflow, fonts loaded, images
   present, no console errors. Writes `qa.json`. Fails closed.
7. **PDF** — `reports/<slug>/Smart-Pursuit-Audit-<Name>.pdf`.
8. **Third eye** — `verify.mjs` writes `verify.json`. A blocker means the audit
   is not sendable.
9. **Register** — appends to `data/audits.json` (only after verification).

### Reading the result

A good run ends like this:

```
Audit complete — <Business name>
Overall 36/100  ·  speed 3 mobile 4 conversion 2 design 6 seo 5
Findings: 01 Critical · 02 Critical · 03 High · 04 High · 05 Medium · 06 Medium
PDF:    reports/<slug>/Smart-Pursuit-Audit-<Business-Name>.pdf (10 pages)
Verify: 23 checks passed
```

If instead you see:

```
The third-eye check blocked this audit. Do not send it.
```

open `reports/<slug>/verify.json` and read the failed check. Fix the measurement
or the data; never edit the report text to make the verifier happy.

### Render a recorded measurement

```powershell
npm.cmd run audit -- --from-raw data/raw/<slug>/<stamp>.json --force
```

`--from-raw` trusts a recorded measurement file instead of touching the network.
It is how a report is rebuilt on a machine that cannot reach the site, and how a
measurement captured elsewhere is rendered. It is **not** a shortcut for a real
lead: the third eye still checks URL, scores, facts, screenshots and PDF.

`--fixture` exists only for a recorded calibration measurement. It downgrades the
72-hour freshness check to a warning, so the document stays reproducible months
after its measurement date. It is rejected without `--from-raw`. **Never use it
on a lead:** a stale measurement is a blocker precisely because the site may have
changed since.

The screenshot files `raw.json` points at must exist on disk.

---

## 7. Run the third eye separately

```powershell
npm.cmd run verify -- --audit reports/<slug>/audit.json
npm.cmd run verify -- --audit reports/<slug>/audit.json --live
```

`--fixture` is accepted only to re-check a recorded calibration measurement; it
downgrades the age check. Do not use it on a lead.

`--live` re-fetches the site and re-checks the findings that depend on the live
page (homepage status, the shortcode leak, the sitemap). Use it when:

- the audit is more than a day old;
- the business says it has fixed something;
- before attaching the PDF to a follow-up.

A `WARN` is informational. A `FAIL` is a blocker.

### What each check means

| Check | Fix if it fails |
| --- | --- |
| `provenance.file` | the raw measurement was deleted — re-measure |
| `provenance.age` | measurement older than 72 h — re-measure |
| `provenance.url` | raw file measured a different URL — re-measure the right one |
| `provenance.status` | site was not HTTP 200 — do not audit a dead site |
| `provenance.tool` | Lighthouse version missing — re-run with Lighthouse |
| `scores.*` | rubric drift — fix the rubric, not the number |
| `facts.consistent` | a printed metric differs from raw — re-render from raw |
| `findings.evidence` | a finding claims something the measurement does not contain — remove or re-measure |
| `numbers.traceable` | the report prints a number with no source — find it and remove it |
| `screenshots.real` | blank/flat screenshot — recapture |
| `pdf.pages` / `pdf.format` | page overflow or wrong paper — check `qa.json` |
| `report.hash` | HTML changed after QA — re-render and re-QA |

---

## 8. Build the email sequence

```powershell
npm.cmd run sequence -- --audit reports/<slug>/audit.json --send-date 2026-11-10
```

`--send-date` is the day **you will actually send email 1**. All other dates are
computed from it: `+3`, `+6`, `+9` days by default.

Output:

```
4 drafts · <Business name>
 1. 10 November 2026   <Business name> — the enquiry form on your site is broken
 2. 13 November 2026   Re: <Business name> — one page is losing the enquiries
 3. 16 November 2026   Re: <Business name> — what a fixed version looks like
 4. 19 November 2026   Closing the loop — <Business name>
```

Files, in `outreach/<slug>/`:

| File | Purpose |
| --- | --- |
| `email-1-first.md` | audit delivery; attaches the PDF |
| `email-2-followup-1.md` | the money argument |
| `email-3-followup-2.md` | what a fixed version looks like |
| `email-4-followup-3-final.md` | closure; no pitch |
| `sequence.json` | schedule, status `draft`, attachment paths, send dates |

The builder refuses to write drafts when:

- the audit has no `provenance.pdfFile`;
- a draft is missing the opt-out line;
- a draft exceeds its word target by 50+;
- a banned phrase appears (`guarantee`, `risk-free`, `act now`, `100% results`, …);
- a placeholder is unresolved;
- the final mail does not read as a close.

Every draft starts with `<!-- DRAFT — not sent. Sent by the operator only. -->`.

If you send later than planned, **do not hand-edit the dates**. Re-run
`sequence --send-date <actual day>`; it overwrites the drafts with the correct
schedule.

---

## 9. Send — by hand, one at a time

The system has no sender, no SMTP credentials and no scheduler. This is
deliberate.

For each email:

1. Open the draft in `outreach/<slug>/`.
2. Fill `**To:**` with an address the business **published** (their site, their
   Google Business Profile, their LinkedIn, their registry filing). Never a
   guessed or bought address.
3. Email 1: attach the PDF named in `**Attachments:**`. Open it once before
   sending and check the business name, domain and date.
4. Send from the agency mailbox, as a human.
5. Reply to your own sent mail for the follow-ups so they thread (the subjects
   already begin with `Re:`).
6. Record what happened. At minimum, update the lead `status` and the
   `emails[n].status` / `sentAt` fields in `sequence.json`:

```json
{
  "step": 1,
  "status": "sent",
  "approvedBy": "operator",
  "sentAt": "2026-11-10T09:12:00+05:30"
}
```

Respect the daily cap in `settings.json` (20). Fewer, better emails beat volume.

### Cadence

| Email | Day | Content | Attachment |
| --- | --- | --- | --- |
| 1 | day 0 | the audit + two findings | the PDF |
| 2 | day 3 | the money argument (ad-tech or load time) | none |
| 3 | day 6 | what a fixed version looks like | none |
| 4 | day 9 | closure, door left open | none |

If the business replies at any point, stop the sequence. A reply is worth more
than the remaining drafts.

### Opt-outs

If someone says "no thanks", "stop", "unsubscribe", or anything equivalent:

1. Do not send another draft.
2. Mark the lead `status: "do-not-contact"` in `data/leads.json`.
3. Mark the audit row `status: "blocked"` with `blockedReason` in
   `data/audits.json`, so the gate refuses a future re-audit.
4. Keep the row. It is the suppression record.

### Replies that are not opt-outs

- "Send more info" → send the PDF again plus the plan page, and offer two call
  slots.
- "How much?" → do not quote a number you have not scoped. Book the 15-minute
  call, then price from the eight-item plan.
- "We have a developer" → offer the audit as a free handover document; it costs
  nothing and often comes back as a rebuild later.

---

## 10. Re-audit and cooldown

After `reauditCooldownDays` (60) the gate opens automatically. Re-audit when:

- the client has shipped fixes and you want before/after proof;
- the site changed materially (new theme, new platform);
- a year has passed and the site has degraded again.

Use `--force` only for a deliberate before/after, and say so in the lead notes.

---

## 11. Status

```powershell
npm.cmd run status
npm.cmd run status -- --json
```

Prints lead counts by status, audit count, and the ten most recent audits with
reference and page count.

---

## 11b. Render a strategy plan

An audit proves what is broken; a plan is what a management committee signs.
Same design system, same voice, sixteen A4 pages, one config file.

```powershell
notepad plans\plan.config.json      # school, city, state, board, fee band, year
npm.cmd run plan
```

Writes `reports/plans/<slug>/Smart-Pursuit-Digital-Strategy-<School>.pdf` plus
`plan-report.json`, which holds the measured fill of every page.

The render is refused on any of: wrong page count, non-A4 media box, content
overflow, content in the footer band, cover colliding with the confidential line,
text past the right margin, a broken image, an unloaded font, or an unresolved
`{{TOKEN}}`. A value in `[brackets]` is a placeholder — the PDF renders as a
draft and the run names the fields still unresolved.

`reports/` is gitignored, so a client's plan never reaches the public export.
Template rules live in `plans/README.md`.

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `EACCES` / scripts blocked on PowerShell | execution policy blocks `.ps1` shims | use `npm.cmd` / `npx.cmd` |
| `No Chromium-family browser found` | no browser, and the automatic download failed | `npx playwright install chromium`, or `sudo apt-get install -y chromium`, or set `CHROME_PATH`; then `npm run doctor` |
| `Chrome not found` | browser not in a standard path | set `CHROME_PATH`, or `npm run doctor` |
| `Cannot find package 'playwright'` | dependencies not installed | `npm.cmd install` |
| `ENOENT ... Website%20Agency\...` | old bug where `ROOT` kept URL encoding | fixed with `fileURLToPath`; update the repo |
| PageSpeed Insights returns 429 | shared IP quota | the OS uses local Lighthouse, not the PSI API; do not add PSI |
| Lighthouse takes minutes | local browser under load | wait; do not run two audits at once |
| PDF has 11 or 12 pages | content overflow | read `qa.json` → `worstOverflowMm` and the page number; fix content length |
| `pdf.format` fails | non-A4 media box | check `@page{size:A4;margin:0}` is intact |
| `screenshots.real` fails | blank or near-white capture | recapture; check the site actually painted, not a cookie wall |
| `numbers.traceable` fails | a number was typed into prose | find it in the renderer; replace with a `facts.*` value or remove |
| `provenance.age` fails | measurement older than 72 h | re-measure before sending |
| `provenance.tool` fails — `Lighthouse failed (NO_FCP…)` | the page never painted its first pixel inside the 120 s wait, usually a dead or JS-wedged page | the audit is refused rather than scored; retry later, and check the site in a browser. `tools/lighthouse/*.json` hold the wait |
| `Overpass unreachable` — all mirrors | network blocks the mirrors, or all are down | `npm run doctor` names the hosts; set `OVERPASS_URL` to a reachable mirror |
| Overpass times out | public endpoint busy | the next mirror is tried automatically; reduce `--limit` if every one is slow |
| `no config/states/<state>.json` note | that state has no curated city list | harmless: Overpass searches by boundary name. Add a config only for Google Places |
| Every lead skipped, queue empty | they are audited, cooled down, or out of attempts | run `status`; see `data/run-<state>-<date>.json` |
| `Unknown niche` | niche missing from `config/niches.json` | add it |
| Emails contain `—` as `�?"` in the console | PowerShell console encoding | the file is correct UTF-8; verify with an editor, not `Get-Content` |
| `sequence` refuses "missing the opt-out line" | template edited without `{{optOut}}` | restore the placeholder |

---

## 13. Compliance

The system is built to make lawful outreach the easy path.

- **Public contact information only.** The lead adapters read business data that
  the business published (OSM tags, Google Places listings, your own CSV). The
  OS deliberately does not scrape Google Maps results, Yelp, or directories
  whose terms forbid it.
- **No bought lists, no guessed emails.** A lead without a published website is
  not audited. A draft without a published address is not sent.
- **Identify yourself.** Every mail carries the agency name, phone and email.
- **One opt-out, honoured permanently.** Every mail carries the opt-out line;
  the runbook's suppression procedure is record-and-never-contact-again.
- **No false claims.** No revenue promises, no fabricated testimonials, no
  invented statistics. The third eye blocks any number that is not traceable.
- **Reasonable volume.** Default cap 20 sends/day, one lead at a time, at most
  three follow-ups.
- **CAN-SPAM / GDPR.** If you operate in a jurisdiction with stricter rules
  (GDPR legitimate-interest assessments, CASL consent), add the required
  identity and address block and keep a lawful-basis note per lead. The drafts
  are a starting point, not legal advice.

---

## 14. Daily operating checklist

**Sourcing and audit**

- [ ] `run --state <state>` completed; read the summary line
- [ ] nothing new queued? that is normal — it means nothing is left un-audited
- [ ] `data/run-<state>-<date>.json` read: anything in `failed` is a site to look at by hand
- [ ] new leads triaged and bad fits marked in `data/leads.json`

**One audit, by hand (when you want control)**

- [ ] `selftest` passes
- [ ] `audit` completed without `--force` (unless intentional)
- [ ] `qa.json` `ok: true`, worst overflow `0 mm`
- [ ] `verify.json` `ok: true`, zero blockers
- [ ] PDF opened and read end to end by a human
- [ ] business name, domain, city and date are correct
- [ ] no price, testimonial, logo wall or revenue claim

**Outreach**

- [ ] `sequence --send-date <actual day>` run
- [ ] `To:` address is published, not guessed
- [ ] PDF attached once, correct file
- [ ] opt-out line present
- [ ] sent by a human, from a human mailbox
- [ ] lead status and `sequence.json` updated
- [ ] replies answered before the next follow-up is due
- [ ] opt-outs recorded in both registries the same day

### Attachment repair runs

Set `repairOnly: true` and list existing domains in `run-request.json.reaudit` for an operator-requested live audit repair. This uses the existing explicit re-audit path with a recorded reason; it does not reset retry counters or run unrelated lead sourcing. Screening, layout and third-eye verification remain mandatory. Existing review holds remain until new PDF review; first-contact Gmail drafts must not be called ready until the matching PDF is attached and read back.

Set `disabled: true` in `run-request.json` to cancel the current request. The workflow checks this before installing audit tools or contacting prospect websites. Re-enable only for an explicit new operator request.
