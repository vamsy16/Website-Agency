# Changelog

All notable changes to the Agency OS. Newest first. One line per change; say why
if the reason is not obvious.

## Process — 26 November 2026

- `tools/followups.mjs` — follow-up dates come from what was actually sent: each email is due 3 days after the previous one's `sentAt` (IST), and a step after one not yet sent is projected from its due date or today, whichever is later. It records sends and stops (bounce, reply, opt-out) from a JSON file, keeps each draft's `**Send:**` line in step, refuses a step marked sent ahead of an unsent one, and `--selftest` checks the rule (13 checks).
- Sends recorded from Gmail's Sent copies for the 40 Andhra Pradesh sequences that have been emailed (64 emails, 16–26 November), with their follow-up dates recomputed. The five that bounced (Sree Bhalaji, NEST Sagar, Bhimavaram, Karumuri, Blue Fox) are stopped. The other 14 sequences have not been emailed and are unchanged.

- `docs/ARENA-LEADS-TO-GMAIL.md` — Gmail drafts no longer carry an operator note. Drafts can be sent unedited, so a draft holds only the recipient-facing email; follow-up dates stay in `gmail-drafts.json`, `sequence.json` and the report. A follow-up is drafted on request as a reply in the same thread, its dates moved if the first email went out late.

## Review — 23 November 2026

- Five new Andhra Pradesh audits approved after re-audit with 1.4.2 (runs 45095333140, 45097578295, 45098947793, 45099748499): Smart Care Dental Hospital (Nellore), Dr Swetha Sajja Eye Hospital (Rajahmundry), MJ Naidu Super Speciality Hospital (Vijayawada), Sasya Fertility Centre (Guntur), Ravi Dental Care and Implant Center (Vijayawada). Verify 25/25, 10 pages, 0 mm; every page re-read; every recipient address seen on the business's own site; repository-only dedupe across all branches and history. Dr Swetha Sajja was re-measured once more after a Lighthouse swing (88, 90, 62, 87); the reproducibility run was accepted before its result was known. See `deliverables/runs/2026-11-23-independent-review.md`. Run request disabled; nothing sent.

## 1.4.2 — 23 November 2026

**Independent review of the five Andhra Pradesh audits from run 45095333140: every sentence true for the site it describes.**

- `measure.mjs` — the smallest body font counts only elements that hold text themselves and never a 0 px size. A `font-size:0` wrapper was printed as "Smallest body text: 0 px" (Ravi Dental) and cost the mobile score a font penalty no visitor sees.
- `findings.mjs` — "Contact page reachable" is now a measured fact (`http.contactReachable`): the `/contact/` probe answered 200 with a page that is not the homepage. It had been printed for every report, including a `/contact/` that redirected to the homepage and two that returned 404. TBT prints whole milliseconds ("993 ms", not "992.5 ms") except at the 200 ms threshold; "1 link points to"; the tap-target finding omits a 0 px font and recommends 16 px body text only when the measured text is smaller; the speed fix says "plugins reviewed and any unused ones removed" (plugin paths are measured, unused plugins are not). Rubric unchanged (selftest 36).
- `render.mjs` — singular counts ("1 finding was identified. Its effect…", "1 measured finding", "1 schema type", "1 “Read More” link", and for one screen, tap target, section, image or click-to-call link); plan row 06 no longer tells a 2-section page to grow to "5 sections": it targets one H1 and a homepage of 6 screens or fewer (the rubric's own threshold) and says "Already…" when both are met; the page-07 table attributes only the LCP and TBT thresholds to Google and labels server response, page weight and requests as Smart Pursuit engineering targets (title "The targets are stated"); over-target page weight and requests are highlighted like the other rows.
- Email 1 — a one-finding audit reads "One thing stood out: …" instead of a numbered list whose second item was empty ("2. ."). `sequence.mjs` refuses an empty list item.
- `verify.mjs` — `copy.honesty` also rejects a single finding in the plural, "1 link point to", a 0 px body font, "Contact page reachable" without a measured contact page, "unused plugins removed" and engineering targets attributed to Google.

## Review — 22 November 2026

- Five Andhra Pradesh audits approved after re-audit with 1.4.1 (runs 45016840158, 45018491348): MK Dental, Prathik Dental and Implant Centre, The Dental Studio, Kalyani Dental Clinic, Praveen Dental Care. Verify 25/25, 10 pages, 0 mm; every page re-read and every recipient address seen on the clinic's own site. See `deliverables/runs/2026-11-22-independent-review.md`. Run request disabled; nothing sent.
- `docs/ARENA-LEADS-TO-GMAIL.md` — only the first email is drafted in Gmail (operator instruction): its operator note lists the follow-up dates, every 3 days and only if there is no reply, and a follow-up is drafted only when the operator asks on or after its date. Nothing is scheduled or sent automatically.

## 1.4.1 — 22 November 2026

**Independent review of the five Andhra Pradesh audits (run 45012283217): say only what was measured.**

- `measure.mjs` — first party is the site's own host with or without `www.`, its subdomains and the host the page landed on. The origin-prefix test counted 67 of 71 requests as third-party after a www → bare redirect and listed the clinic's own domain as "external". Cookies use the same dot-bounded rule. `robots.txt` `Sitemap:` lines are recorded.
- `findings.mjs` — a metric inside its threshold is never "over" it ("6.4× and 0.6× over" for a 117 ms TBT); the speed fix lists only measured opportunities (no CDN for a 201 ms server, no plugins on a non-WordPress site; page weight judged against the 1.6 MB target on page 07); the console finding no longer says "Remove the retargeting pixels" unless ad code was seen, and blocking time is no longer attributed to third parties; a 404 at `/sitemap.xml` reads "No XML sitemap", and no finding is made when robots.txt declares one; zero section counts and TTFB decimals are not printed; "also on the list" no longer repeats a printed finding. Rubric unchanged (selftest 36).
- `render.mjs` — removed unmeasured copy ("doing damage you can see in enquiry numbers", "first paint — still looks empty", "pays back fastest", "usually the two cheapest things… to fix", "Contrast and labelling issues", "competing slogans", "theme demo paths"); a page with no H1 says so instead of "headline starts 0 px down"; plan rows whose target is already met say "Already under…" / "Little to gain here" instead of selling the work, and an existing form is "tested", not "rebuilt"; the Rescue speed line names only parts that miss their target; benchmark cells are red only when over target; KPI reads "Forms with fields".
- `render.mjs` layout — the page-8 pull quote, the page-10 sign-off and the page-2 band no longer print over the footer; page-4 timeline labels no longer overlap (dots at their true time; FCP/TTFB no longer pinned at 4.4 s / 1.6 s); "20 s" no longer wraps; score bars ≥ 7 drop the unstyled `green` class (class-diff).
- Second read of the regenerated PDFs (run 45016840158): the page-07 targets table no longer labels the LCP row "— you" (the competitor-table class appends that text; every row there is the client's own number); a list of more than six third-party domains reads "including …"; the Rescue line says "Homepage booking form added" when only the homepage was measured (a contact page may already have a form); "1 image has no alt text"; the time-to-interactive tile uses one decimal like the LCP tile.
- `verify.mjs` — new blocker `facts.firstParty`; `copy.honesty` also rejects the phrases above, "0.x× over", threshold contradictions, an H1 position with no H1, competing headlines with ≤ 1 H1, ad mentions without ad code and "third-party code blocked".
- Emails — step 2 no longer says "None of this needs a new design… pays back fastest" (it asks the developer to confirm the effort); step 3's subject no longer promises "what a fixed version looks like" (no fixed version is sent). `sequence.mjs` bans both phrases.

## Review — 21 November 2026

- Deliverables index now fails closed on the independent-review manifest: automated gate success cannot mark held reports sendable. Five live email contacts documented, with explicit PDF-copy/recipient holds and layout-QA failures.

- Replacement review also excludes UltraTech Cement and Subbayya Gari Hotel under the chain policy; target only existing repository candidates for the next replacement run. Srinidhi held pending independent email confirmation.

- Independent live-site review excludes Indian Terrain and RR Durbar (chains), and Project Antaryami (virtual-assistant franchise network). Their audit history is retained; they must not count toward the five local prospects.

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

## Reference-format rerun — 21 November 2026

- Correct misleading cover H1/performance labels and unsupported enquiry-loss/delivery claims without changing score arithmetic or frozen styles. Add a fail-closed copy-honesty verifier check.
- CSV-only runs filter requested domains before applying the screen cap, preserving all registry duplicate/cooldown/prospect gates.
- Request exactly the five newly researched AP businesses in the full Anoos-reference format. Reports remain held until post-run review; qualitative reviews are not technical audits.

- Diagnose run 44925860790: all five rejected because empty second findings page reduced the document to nine pages. Preserve ten pages with an explicit evidence-limits page; no fabricated findings or relaxed QA. Remove further unsupported summary/plan assertions and label effort estimates.

## Attachment repair — 21 November 2026

- Correct unsupported form, visitor-device, scrolling and LCP narrative without changing scoring or style assets. Remove the negated guarantee wording that unintentionally triggers draft spam review.
- Add explicit repair-only workflow mode to remeasure the eleven existing draft businesses, with no unrelated sourcing and no automatic sending. Existing audit review holds remain.

## Operator cleanup

- Permanently removed the eleven cancelled Gmail drafts and deleted their active lead/audit registry rows, research, PDFs, email sequences and dedicated encrypted repair archives at the operator’s explicit request. This is an intentional exception to the normal append-only registry convention; unrelated records remain.
- Disabled the abandoned run request behind a workflow preflight gate. Existing Git history and unrelated historical archives are not rewritten.
