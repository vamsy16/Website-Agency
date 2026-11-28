# Changelog

All notable changes to the Agency OS. Newest first. One line per change; say why
if the reason is not obvious.

## Outreach — 28 November 2026, evening

- First-email Gmail drafts for the five 28 November audits, after the operator reviewed and approved the PDFs: Vedanta Hospitals, Dr Sneha's Skinclin, Skinmed Skin Clinic, SV Children's Hospital and Nandan Hospitals. Created in smartpursuit3@gmail.com at 16:39 IST as new threads with the approved PDF attached, and read back: recipient, subject and body identical to `email-1-first.md`, attachment the size of the file. Before that, Gmail had nothing for any of the five addresses (every folder, spam and trash included). Recorded on step 1 of each `sequence.json` (`gmailDraft`) and in `outreach/<slug>/gmail-drafts.json`. No follow-up drafts; nothing sent.
- Sends recorded (`deliverables/runs/sends-2026-11-28.json`, which now also keeps `gmailThreadId`): step 1 for AA Hospitals (16:21 IST) and Desai Eye Care (16:33 IST), from the 27 November drafts; their step 2 falls due 1 Dec. Not recorded yet, because they were still scheduled at 16:42 IST: step 1 for Dr. Padmavathi (16:43), Leelavathi (16:54) and Skin First (17:09), and step 3 for nine older sequences (19:47–21:26 IST; due 29 Nov by the 3-day rule; the operator's own wording, not `email-3-followup-2.md`). Inbox, last 24 hours: no replies, bounces or opt-outs.
- `docs/STATE.md` said Gmail thread ids were kept in each `sequence.json`; they never were. The send records carry them from 28 Nov, and older threads are found with `in:sent to:<address>`.

## Review — 28 November 2026

- Five new Andhra Pradesh audits approved (runs 46122437174 and 46125570076): Vedanta Hospitals (Kadapa, 75), Dr Sneha's Skinclin (Visakhapatnam, 64), Skinmed Skin Clinic (Visakhapatnam, 63), SV Children's Hospital (Tirupati, 79) and Nandan Hospitals (Vijayawada, 76). Each email was read on the business's own site. None matches anything in the registries, deliverables or the full history of every branch (Gmail was not used for duplicates), and none is behind the Hostinger CDN. `deliverables/runs/2026-11-28-independent-review.{md,json}`.
- The third-eye review held the first run and re-audited four with 1.4.7. Vedanta's report and email 1 claimed "no appointment form" although its "Book Appointment" pop-up has 4 fields. SV Children's printed "about 8 phone screens" for 7.48. Skinmed's and Dr Sneha's screen-7 shots were taken at the wrong depth.
- Kamakshi Hospital, Sri RK Mother & Child Care Hospital and Koncept Skin failed verify, and Maa Eye Care was screened out (a false "foreign" reading of its Wix page). Arka Eye Hospital and Best Rehab were not attempted (target reached). None of them was emailed.
- The workflow now triggers on `arena/9f36e1d5-website-agency`, and `run-request.json` is disabled. No Gmail drafts: the operator reviews the PDFs first. `tools/__pycache__/` is untracked and ignored.

## 1.4.7 — 28 November 2026

From the 28 November independent review (Andhra Pradesh, run 46122437174).

- **A booking form in a pop-up is a form** (`src/measure.mjs`, `src/findings.mjs`). Vedanta Hospitals' three "Book Appointment" buttons open an Elementor pop-up, but the report led with "No appointment form fields were detected on the homepage" (and so did email 1), because only forms visible on the page were counted. With no visible form, the measurement now clicks a button whose label is about booking or contact and that opens a pop-up (Elementor pop-ups, Bootstrap modals, Popup Maker), after every screenshot, and counts the fields then shown; a form already in the markup inside a hidden pop-up counts too, and a click that leaves the page counts nothing. Such a form removes the "no form" finding and both conversion penalties, and the report says "Booking form in a pop-up (“Book An Appointment”)". Tested in local Chromium on an Elementor-style pop-up, a video-only pop-up button and a modal link that leaves the page.
- `verify`: **`facts.popupForm`** (warning) records the pop-up buttons found, the one clicked and the fields counted; the check that blocks a "no form" claim against a measured form now covers the healthcare wording ("No appointment form …") and pop-up forms.
- **Whole screen counts are rounded once, from the unrounded value**: "about 8 phone screens" and "≈8 screens tall" were printed for 6,311 px over 844 px, 7.48 screens (7.48 → 7.5 → 8). The screen is not rounded to whole pixels either (692.5 px at a 320 px layout). The 1-decimal value used for scoring and `facts.screens` is unchanged.
- **Screen 7 is taken in the page's own screens**: the shot stepped 844 px down per screen, so on a page laid out 320 px wide (Wix; a screen is 692.5 px) Skinmed's "screen 7" was 7.3 screens down and Dr Sneha's "last screen" stopped 151 px above the bottom.
- `tools/review-pdfs.py`: the screen-count check uses the unrounded screen and rounds half up as the report does (Python's `round()` rounds 10.5 down); "the last screen of about 7" is no longer flagged (screen 7 is the last screen of a 6.5–6.99-screen page); a "no form" claim is flagged when verify recorded a form in a booking pop-up.

## Outreach — 28 November 2026

- First-email Gmail drafts for the five 27 November audits, at the operator's request: AA Hospitals, Desai Eye Care, Dr. Padmavathi Dental Hospital & Implant Centre, Leelavathi Advanced Skin & Laser Centre and Skin First. Created in smartpursuit3@gmail.com at 12:46 IST with the approved PDF attached and read back: recipient, subject and body identical to `email-1-first.md`, attachment the size of the file. Recorded on step 1 of each `sequence.json` (`gmailDraft`) and in `outreach/<slug>/gmail-drafts.json`. No follow-up drafts; nothing sent.
- Follow-up check at 12:50 IST: nothing reached Gmail's Sent folder after 27 Nov 15:51 and no lead bounced, replied or opted out, so no dates moved. Nothing due on 28 Nov; 29 Nov — step 3 for 21 sequences; 30 Nov — step 3 for four and step 2 for the five 26 November audits. `docs/STATE.md` updated.

## 1.4.6 — 27 November 2026

From the 27 November independent review (Andhra Pradesh, run 45982415490).

- **Phone screens are counted against the page's layout, not the browser window** (`src/measure.mjs`). AA Hospitals printed "about 3 phone screens" for a 9,944 px page (11.8 screens of 844 px): an element wider than the phone at load makes Chrome report `innerHeight` of about 3,300 px, whatever the zoom, and the count divided by that. It also cost the long-page finding, a mobile-score point and put "Last screen" over screen 7. A screen is now 844 px at a 390 px layout (scaled for wider layouts, such as 980 px pages without a viewport tag); `firstScreenClaims` and the slide check use the same box. Reproduced and tested in local Chromium under the same mobile emulation.
- `verify`: **`facts.screens`** (blocker) checks that the count equals page height over that screen; **`facts.zoom`** (warning) records the view scale at load and after scrolling, the viewport tag and the widest overflowing element, so the review can tell whether a visitor first sees the page shrunk.
- Screens are captured after finite animations finish (up to 3 s): AA Hospitals' screen 7 caught its counters mid-roll, digits overlapping.
- **A storage bucket named for the business is first party** (`isOwnStorageHost`, `src/util.mjs`): Dr. Padmavathi Dental's own media bucket on S3 was counted as one of "6 external domains" sharing visitor data. `facts.firstParty` checks it too.
- An array `@type` ("Person,Organization") is printed as the business type alone ("Organization structured data is missing telephone and address"); `copy.honesty` blocks a comma-joined type.
- The sideways-overflow item prints its width with a thousands separator ("1,176 px"; AA Hospitals was the first above 999 px).
- `tools/review-pdfs.py`: flags a screen count that disagrees with the page height, "the last screen of about N" for N ≥ 7, a comma-joined schema type and the business's own bucket listed as external; a two-letter audit reference ("SF" for Skin First) is no longer reported as malformed; asks for a look at a four-digit number without a separator; verify warnings are listed for a look instead of failing the scan.

## Review — 27 November 2026

- Five new Andhra Pradesh audits approved (runs 45982415490 and 45987926898): AA Hospitals (Eluru, 79), Desai Eye Care (Nellore, 74), Dr. Padmavathi Dental Hospital & Implant Centre (Kakinada, 74), Leelavathi Advanced Skin & Laser Centre (Guntur, 71) and Skin First (Vijayawada, 65). Sourced fresh, read on each own site, checked against the full history of every branch, and none behind the Hostinger CDN. `deliverables/runs/2026-11-27-independent-review.{md,json}`.
- The third-eye review held the first run and re-audited three of the five with 1.4.6 (screen count, own storage bucket, schema type wording). Venkateswara Eye Hospital (timed out) and Vijaya Hospital (HTTP 403) were screened out without an audit; Kamakshi Hospital was not attempted. All three stay `new`.
- Seven scheduled mails recorded from Gmail's Sent folder (`deliverables/runs/sends-2026-11-27b.json`); follow-up dates recalculated. The workflow now triggers on `arena/65e78ab2-website-agency`. `run-request.json` is disabled. No Gmail drafts: the operator reviews the PDFs first.

## Handoff — 27 November 2026

**Everything in GitHub, merged into `main`** (operator: "keep everything in GitHub, so that if I run this repo in another agent nothing is missed").

- `docs/STATE.md` — new: read-first handoff with the standing instructions, every batch, follow-ups due, scheduled mail, open questions, incidents, how to run and record things, and how to survive a sandbox reset. `AGENTS.md` points to it.
- 30 sends recorded from Gmail's Sent folder (`deliverables/runs/sends-2026-11-27.json`): step 4 for the ten 16 November leads (complete), step 2 for nine 22/23 November leads and eleven 21 November leads. No replies or bounces since 25 November.
- `outreach/` is no longer git-ignored; the Gmail draft records for the five 26 November audits are committed. The Gmail guide (§4, §6) says so.
- `tools/review-pdfs.py` — new: the third-eye scan used in the 26 November review, rebuilt as a tracked tool after the scratch copy was lost in a sandbox reset (page count, verify, known defect patterns, email-1 numbers in the PDF, email-body hygiene, optional page renders).
- School strategy deliverables carried over from the unmerged branch `arena/353d62eb-website-agency` (entry below, by date), with their `npm run strategy` / `strategy:client` / `automation` scripts. `pdfkit` stays out of `package.json` so the audit workflow's install does not change.

## Outreach — 27 November 2026

- Step-1 Gmail drafts for the five 26 November audits, created in smartpursuit3@gmail.com at the operator's request after they reviewed the PDFs, each with its approved PDF attached. A Gmail search found no earlier mail or drafts for these recipients; each draft was read back. Draft IDs are recorded on step 1 of each `sequence.json` (`gmailDraft`), because the git-ignored `outreach/` copies were lost in a sandbox reset. No follow-up drafts; nothing sent.
- `docs/ARENA-LEADS-TO-GMAIL.md` §6: record each draft's ID and creation time in the deliverable's `sequence.json` as well.

## 1.4.5 — 27 November 2026

- `findings.mjs` — the speed finding's title put "A" before every mobile score, so Dr K Hemanth Kumar's report and email 1 read "A 81/100 mobile score". The article now follows the number (8, 11, 18, 80–89 take "an"), as it already did for the LCP. His approved PDF keeps the old wording (pages 2 and 5); his `email-1-first.md` and Gmail draft say "An 81/100".

## Review — 26 November 2026

- Five new Andhra Pradesh audits approved after re-audit with 1.4.3 and 1.4.4 (runs 45814540402, 45820025821, 45824308238, 45825535687, 45830272690, 45831617819, 45837237021): Vignata Fertility & IVF Center (Guntur), Shravani ENT Hospital (Kakinada), Dr K Hemanth Kumar, neurologist (Kurnool), Deepthi Fertility Centre (Nellore) and Sai Bhaskar Hospitals (Guntur). Each To: address was read on the business's own website, the duplicate check used only this repository, every audit passed verify 26/26, and every final page was re-read. Record: `deliverables/runs/2026-11-26-independent-review.md`. Nothing was sent.
- Ayush Dental Care failed `screenshots.real` and is not published. Simhapuri Dental, Madhu Dental, Fortune Dental and Viswanadha Hospital were not attempted and stay `new`.
- `data/audits.json`: the stale Vignata row ("VF&", 60/100) is removed. `run-request.json` is disabled.

## 1.4.4 — 26 November 2026

**Second pass of the 26 November review, after reading every page of the 1.4.3 re-audit (run 45820025821) and comparing it with the live sites.**

- `measure.mjs` — contact routes, headings and words are counted again after the full-page and scrolled screenshots, and the larger count is kept: content rendered on scroll was missing from the count taken at load. Dr K Hemanth Kumar's homepage was reported with "1 click-to-call link on the whole page" while the live page shows five call links. Both passes are kept in the raw file. Also records call and WhatsApp links inside a fixed or sticky element (`stickyTel`, `stickyWhatsapp`).
- `findings.mjs` / `render.mjs` — the no-form fix no longer tells a site that already keeps call or WhatsApp buttons on screen to add "a sticky Call / Book bar" (Vignata has one); it links the new booking form from the existing buttons, and plan row 02 and the Rescue column say the same. When the desktop pass counts a different number of click-to-call links, the report prints both ("1 click-to-call link at 390 px (5 on the desktop layout)"); a hidden H1 that the desktop layout shows is reported as such. The long-page finding targets "a homepage of 6 screens or fewer" (the rubric's threshold, as in plan row 06) instead of "five sections", which had been prescribed to a page measured at 3 sections. The scorecard's conversion row uses real plurals ("2 click-to-call links", not "link(s)").
- `render.mjs` — the page-4 timeline is 0–20 s, or the slowest marker rounded up to a multiple of 20 s ("The first 60 seconds, measured"); a 37.4 s LCP and a 40.5 s time to interactive had been drawn at the 20 s end of the axis. The ticks are part of the facts, so the verifier traces them.
- `measure.mjs` — headline blocks "seen in the first screen" must be visible to a visitor: hidden, transparent and off-screen slides no longer count. Sai Bhaskar's report quoted two titles from inactive slides that the first-screen screenshot does not show. The same list sets the rubric's "competing headlines" design penalty, so it now counts only what a visitor sees. When no block qualifies, the sentence is left out instead of printing "—".
- `render.mjs` — the cover prints "H1 headings visible at 390 px (8 more hidden in the markup)" instead of "detected", as the scorecard and the finding already did. The executive summary's "credit where it is due" no longer credits the number of images when the same images need re-encoding (Sai Bhaskar: "157 images" beside 5,576 KiB of oversized images).
- `findings.mjs` — the tap-target finding says what was counted: "23 of the 24 interactive elements visible when the page loaded". The same report lists call, "Read More" and placeholder links counted across the whole markup, which read as more links than "24 interactive elements".
- `findings.mjs` — the speed fix covers blocking time over Google's 200 ms when neither render-blocking CSS nor unused JavaScript is large enough to name: Dr K Hemanth Kumar's fix covered only images while the finding cited blocking time at 2.3× the threshold. The scripts are traced first, since which script blocks is not measured.
- `findings.mjs` — when the page is built on a site builder (read from its meta generator), that builder's own file server (GoDaddy's `wsimg.com`, Wix, Squarespace, Hostinger, Square Online, Shopify) is labelled as such, and the healthcare privacy sentence names only outside services. On any other site the builder's server stays an outside service (Deepthi, a WordPress site, loads from `img1.wsimg.com`): on GoDaddy-built sites (Dr K Hemanth Kumar, Shravani ENT) every request to `img1.wsimg.com` had been described as sharing visitor details "with another company", though the same company serves the page.
- `dedupe.mjs` — `recordAudit` also replaces the row of the same domain audited on the same date, not only a row with the same ref: when 1.4.3 corrected Vignata's ref from "VF&" to "VFI", the re-audit appended a second Vignata row to `data/audits.json` (the stale row is removed in the review commit).
- `prospect.mjs` — the screen's homepage fetch retries a network error (no HTTP status) twice, after 15 s and 45 s. Shravani ENT answered the email re-check and then timed out at the re-audit screen minutes later, in two runs in a row, while the site was up from outside GitHub. HTTP error responses are not retried.
- `measure.mjs` — call, email and WhatsApp links inside embedded frames are counted, in both passes. A site builder's custom-HTML block is drawn in an `<iframe>` whose links a visitor sees and taps but the page's own document does not contain: Dr K Hemanth Kumar's homepage shows five call links, four of them in such a block, and was still measured at one after the post-scroll recount. Only frames that are shown, at least 120 × 40 px and not fixed to the screen count (chat widgets are fixed and closed). `tel:` and `mailto:` links match regardless of case and spacing. The desktop screenshot also waits for network idle and for on-screen images before the capture.
- `measure.mjs` / `cli.mjs` / `render.mjs` — the laptop frame on page 4 shows a 45 mm strip of the 1440 px desktop screenshot. It always showed the left edge; it is now placed over the first visible H1 when that headline sits further right in the first desktop screen (centred on it when it fits). Dr K Hemanth Kumar's GoDaddy layout centres its hero, so the left strip showed only the hero's blurred background fill and read as a page that had not loaded. Left-aligned layouts keep the left edge. The H1's text box (not its full-width block) is recorded as `headlineTextBox`.
- `render.mjs` / `verify.mjs` — when the desktop Lighthouse test does not complete, the report says so instead of printing "—/100"; `copy.honesty` rejects "—/100".
- `render.mjs` — page 10 no longer says "Fifteen minutes is enough to decide" and then "worth an hour of it"; the first step is the 15-minute call.
- `styles.css` — the scorecard's score column has room for a two-digit score: "10" ran into its evidence and read as "103 stacked sections" on every report with a 10/10 area; the plan table's change column no longer runs "Measurement" into "Conversion events not tested".
- `verify.mjs` — new check `facts.viewport`: a click-to-call count that differs between 390 px and the desktop layout must be stated as such; its detail records both mobile passes and the desktop count. `copy.honesty` rejects a sticky call bar recommended to a page that already keeps call or WhatsApp buttons on screen.

## 1.4.3 — 26 November 2026

**Independent review of the five Andhra Pradesh audits from run 45814540402: every sentence true for the site it describes.**

- `util.mjs` — audit references use letters and digits only. "Vignata Fertility & IVF Center" printed `SP-AUD-2026-11-26-VF&` on page 10; it is now `VFI`. Other references are unchanged.
- `measure.mjs` — counts the H1s that are in the markup but not visible at 390 px (`h1Hidden`; a desktop-only block, an inactive slide, or content not shown at load). Only visible H1s were counted, so a page whose single H1 is not shown on the phone layout was reported on six pages as having "0 H1 headings detected on the homepage". The rubric still uses the visible count (selftest 36).
- `findings.mjs` / `render.mjs` / `cli.mjs` — with a hidden H1 the report says "0 H1 headings visible on the 390 px phone view; the markup has 1 that was not shown", "no H1 visible at 390 px", "0 visible H1 headings (1 hidden)"; the multiple-H1 finding says how many H1s show at 390 px and how many more the markup holds. The speed finding lists only costs that exist ("render-blocking CSS/JS costing 0 ms" was printed as evidence) and defers CSS only when render-blocking time was measured, otherwise naming the unused JavaScript; "Long tasks blocked the main thread for 1 ms" is no longer printed (a long task is 50 ms or more); "Only 0 H2 headings" reads "No H2 headings"; telephone and address are asked of a business type (LocalBusiness, Organization, Dentist…), not "WebPage structured data"; "No dead links (12 found)" reads "No placeholder links (12 on this page point to # or javascript:void(0))", because some `#` links open menus or slides.
- `verify.mjs` — `report.ref` rejects a reference with anything but letters and digits; `copy.honesty` rejects a zero cost or a sub-50 ms blocking total listed as evidence, "Only 0", a page-type schema said to be missing business fields, `#` links called dead, and a hidden H1 reported as missing.

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

## School strategy deliverables — 21 November 2026

Carried over on 27 November 2026 from branch `arena/353d62eb-website-agency`, which was never merged, so that `main` holds every deliverable. That branch numbered these entries 1.5.0 and 1.6.0; the audit tool's own versions continued at 1.4.x here. `pdfkit` is not added to `package.json` (see the folder's README).

### Automation & AI blueprint (1.6.0 on that branch)

**New deliverable: exhaustive school automation & AI transformation blueprint.**

- `deliverables/2026-11-vizianagaram-school-admissions/Smart_Pursuit_School_Automation_AI_Transformation_Blueprint.pdf` — a 35-page (no page limit), department-by-department automation and AI study for a prospective school client in Vizianagaram, Andhra Pradesh, built by `npm run automation`.
- `build-automation-blueprint.mjs` — flow-based pdfkit renderer: cover, contents, 19 sections, discovery questionnaire and appendices; two-pass build with an authoritative page counter and `Page X of N` footers on every page; zero blank pages; `PAGE COUNT MISMATCH` eliminated.
- `const OPPORTUNITIES` — ~60 opportunities across 13 departments (admissions, finance & fees, academics, HR, parent communication, school office, IT, transport, facilities, library, events, compliance, safety), each with a unique ID (ADM-, FIN-, ACD-, HR-, PAR-, OPS-, IT-, TRN-, FAC-, LIB-, EVT-, COMP-, SAF-) and the full field set: process, user, problem, root cause, solution, category, workflow, trigger, input, output, technology, integrations, human approval, risk, effort, impact, KPI, dependencies, priority, evidence tag.
- Sections 6–8 registers (automation, AI assistance, AI agent), sections 9–10 workflows and architecture, sections 11–15 value analysis, impact estimates, risk register, 8-band prioritisation matrix ("not recommended at present" included) and a multi-phase implementation roadmap extending beyond 90 days.
- Section 16 DPDP Act 2023 / Rules 2025 privacy framework: child = under 18, verifiable parental consent (Section 9(1) / Rule 10), no detrimental or targeted-ad processing of children (Section 9(3)), narrow Fourth Schedule exemptions only, Section 8 safeguards, 72-hour breach reporting, erasure when purpose served, main duties commence 13 May 2027, penalties up to ₹250 crore / ₹200 crore.
- Section 17 Smart Pursuit implementation approach; section 19 final recommendations; Appendix D discovery questionnaire (20 questions per process).
- Evidence rule applied throughout: every finding classified as verified school-specific fact / publicly available evidence / industry-based operational hypothesis / opportunity requiring management validation; no school-specific fact, budget, result or testimonial is invented.
- No images or video: type, colour blocks, rules and vector diagrams only. No stock photography.
- `package.json` — new `automation` script (`node deliverables/.../build-automation-blueprint.mjs`).

### Strategy blueprint (1.5.0 on that branch)

**A second deliverable type: the strategy blueprint.**

- `deliverables/2026-11-vizianagaram-school-admissions/` — a 38-page client-facing
  "School Admissions Growth Strategy" for a prospective school client in Vizianagaram,
  built by `npm run strategy`. This is the document that precedes an audit: market
  research, competitor intelligence, parent behaviour, channel plans, a 90-day roadmap,
  budget models and a measurement framework. Audits stay as they were; nothing in
  `src/` changed and `npm run selftest` still reproduces 3/4/2/6/5 -> 36.
- Renderer is `pdfkit`, not Chromium: the build machine has no browser, no system fonts
  and no pango/cairo, so HTML-to-PDF is unavailable. It also removes the browser from the
  dependency path of a document that must build on any operator machine. `sanitise()`
  converts characters outside WinAnsi (the rupee sign, arrows) to text rather than
  emitting blank glyphs — this is why the PDF says `INR 25,000` and not `₹25,000`.
- Two-pass build: pass one records section start pages, pass two writes them into the
  table of contents. Every build reports `overflows` (any block ending below the bottom
  margin) and `warnings`; both must be empty before the PDF is delivered.
- `build-condensed.mjs` — the 12-page client edition (`npm run strategy:client`), composed
  page by page rather than flowed, so page count cannot drift. Every page carries one message
  and a bottom-anchored KEY TAKEAWAY strip; the build reports page fill and any collision with
  the footer. No photography is used in either edition — the argument against stock classrooms
  is easier to make with type, panels and vector diagrams than with borrowed images.
- Content rule applied throughout: no school-specific fact is invented. Anything about the
  client school is labelled "requires confirmation", competitor claims are tagged verified
  vs interpretation, and no competitor is described as running ads or as having poor
  teaching without direct evidence. Fee figures from directories are flagged as
  third-party and internally inconsistent (one school appears at both 44,000 and 53,500).

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
