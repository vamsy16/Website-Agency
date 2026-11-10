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
| Google Chrome | installed; `playwright-core` drives it, it does not download one |
| Disk | a few hundred MB for screenshots and PDFs |
| OS | Windows, macOS or Linux. Commands below use `npm`; on PowerShell use `npm.cmd` |
| Network | outbound HTTPS to the target site, Lighthouse needs nothing else; Overpass for leads |

If Chrome is not in a standard location, set `CHROME_PATH` to the executable:

```powershell
$env:CHROME_PATH = "D:\Apps\Chrome\chrome.exe"
```

Install dependencies once:

```powershell
cd "C:\Users\hp\Documents\Agency\Website Agency\agency-os"
npm.cmd install --no-audit --no-fund
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
  "tagline": "Websites that win customers",
  "auditLabel": "Website & conversion audit",
  "phone": "+91 70950 24220",
  "email": "smartpursuit3@gmail.com",
  "basedIn": "Ahmedabad",
  "auditRefPrefix": "SP-AUD"
}
```

These strings are printed on the cover and page 10 and are used in the email
signature. Change them once, everywhere.

Also review:

| Setting | Meaning |
| --- | --- |
| `audit.reauditCooldownDays` | how long a domain is protected from a second audit (default 60) |
| `outreach.cadenceDays` | the three gaps between follow-ups (default `[3,3,3]`) |
| `outreach.dailySendCap` | a human reminder, not enforced by code (default 20) |
| `caps.maxLeadsPerRun` | hard cap on leads added per run (default 25) |
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

1. `config/states/gujarat.json` is loaded (cities, country, default niches).
2. OpenStreetMap Overpass is queried for the niche tags in `config/niches.json`.
3. Google Places is queried **only if** `GOOGLE_MAPS_API_KEY` is set.
4. Businesses without a website are kept as `no-website` and are **not** added
   to the auditable pool (you cannot audit a site that does not exist).
5. Every candidate passes `checkLead()` before insertion: same domain, same
   phone (last 10 digits), or same name + city is a duplicate.
6. New leads are appended to `data/leads.json` and a batch file is written to
   `data/batch-<state>-<date>.json`.

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

## 3. Choose who to audit

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

## 4. The duplicate gate (runs automatically)

`audit` calls `checkAudit()` **before any network request**. It refuses when:

- the domain has an audit inside `reauditCooldownDays` (default 60);
- the domain is marked `status: "blocked"` in `data/audits.json`.

Example refusal:

```
FAILED: Refusing to audit the-lead.example: it is already on file.
  - already audited on 2026-11-08 — cooldown runs to 2027-01-07 (60 days)
```

This is the check that stops a lead receiving the same audit twice. Do not work
around it casually.

`--force` exists for exactly two reasons:

1. a **before/after re-audit** after the client has shipped fixes;
2. re-rendering an archived measurement on a machine whose registry already
   contains that domain.

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

## 5. Audit a live site

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
Audit complete — Example Dental Co
Overall 41/100  ·  speed 4 mobile 3 conversion 5 design 6 seo 7
Findings: 01 Critical · 02 High · 03 High · 04 High · 05 Medium · 06 Medium
PDF:    reports/example-dental-co/Smart-Pursuit-Audit-Example-Dental-Co.pdf (10 pages, 3.1 MB)
Verify: 23 checks passed, 0 warning(s)
```

If instead you see:

```
The third-eye check blocked this audit. Do not send it.
```

open `reports/<slug>/verify.json` and read the failed check. Fix the measurement
or the data; never edit the report text to make the verifier happy.

### Rendering a measurement captured elsewhere

```powershell
npm.cmd run audit -- --from-raw data/raw/<slug>.json
```

`--from-raw` trusts a recorded measurement file instead of touching the network.
It is how an audit captured on one machine is rendered on another, and how a
measurement is re-rendered after a renderer fix without re-measuring. It is
**not** a shortcut for a real lead: the third eye still checks URL, scores,
facts, screenshots and PDF.

The screenshot files the raw file points at must exist on disk. If they arrived
as `.b64` sidecars, decode them first:

```powershell
npm.cmd run decode
```

`--fixture` downgrades the 72-hour freshness check to a warning. It exists for
re-rendering an archived measurement whose age is irrelevant. It is rejected
without `--from-raw`. **Never use it on a lead:** a stale measurement is a
blocker precisely because the site may have changed since.

---

## 6. Run the third eye separately

```powershell
npm.cmd run verify -- --audit reports/<slug>/audit.json
npm.cmd run verify -- --audit reports/<slug>/audit.json --live
```

`--fixture` is accepted only together with `--from-raw`, for archived
measurements; it downgrades the age check. Do not use it on a lead.

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

## 7. Build the email sequence

```powershell
npm.cmd run sequence -- --audit reports/<slug>/audit.json --send-date 2026-11-10
```

`--send-date` is the day **you will actually send email 1**. All other dates are
computed from it: `+3`, `+6`, `+9` days by default.

Output:

```
4 drafts · Example Dental Co
 1. 10 November 2026   Example Dental Co — the enquiry form on your site is broken
 2. 13 November 2026   Re: Example Dental Co — one page is losing the enquiries
 3. 16 November 2026   Re: Example Dental Co — what a fixed version looks like
 4. 19 November 2026   Closing the loop — Example Dental Co
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

## 8. Send — by hand, one at a time

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

## 9. Re-audit and cooldown

After `reauditCooldownDays` (60) the gate opens automatically. Re-audit when:

- the client has shipped fixes and you want before/after proof;
- the site changed materially (new theme, new platform);
- a year has passed and the site has degraded again.

Use `--force` only for a deliberate before/after, and say so in the lead notes.

---

## 10. Status

```powershell
npm.cmd run status
npm.cmd run status -- --json
```

Prints lead counts by status, audit count, and the ten most recent audits with
reference and page count.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `EACCES` / scripts blocked on PowerShell | execution policy blocks `.ps1` shims | use `npm.cmd` / `npx.cmd` |
| `Chrome not found` | Chrome not in a standard path | set `CHROME_PATH` |
| `Cannot find package 'playwright-core'` | dependencies not installed | `npm.cmd install` |
| `ENOENT ... Website%20Agency\...` | old bug where `ROOT` kept URL encoding | fixed with `fileURLToPath`; update the repo |
| PageSpeed Insights returns 429 | shared IP quota | the OS uses local Lighthouse, not the PSI API; do not add PSI |
| Lighthouse takes minutes | local Chrome under load | wait; do not run two audits at once |
| PDF has 11 or 12 pages | content overflow | read `qa.json` → `worstOverflowMm` and the page number; fix content length |
| `pdf.format` fails | non-A4 media box | check `@page{size:A4;margin:0}` is intact |
| `screenshots.real` fails | blank or near-white capture | recapture; check the site actually painted, not a cookie wall |
| `numbers.traceable` fails | a number was typed into prose | find it in the renderer; replace with a `facts.*` value or remove |
| `provenance.age` fails | measurement older than 72 h | re-measure before sending |
| Overpass times out | public endpoint busy | retry, reduce `--limit`, or use `--csv` |
| `No state config for "..."` | state file missing | add `config/states/<state>.json` |
| `Unknown niche` | niche missing from `config/niches.json` | add it |
| Emails contain `—` as `�?"` in the console | PowerShell console encoding | the file is correct UTF-8; verify with an editor, not `Get-Content` |
| `sequence` refuses "missing the opt-out line" | template edited without `{{optOut}}` | restore the placeholder |

---

## 12. Compliance

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

## 13. Daily operating checklist

**Sourcing**

- [ ] `leads --state <state>` run, duplicates skipped
- [ ] new leads triaged and bad fits removed from the audit queue

**Audit**

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
