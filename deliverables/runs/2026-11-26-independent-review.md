# Andhra Pradesh: independent review (26 November 2026)

**Status: five audits approved after re-audit.** The machine-readable record is [2026-11-26-independent-review.json](2026-11-26-independent-review.json). Nothing was sent, and no Gmail drafts were created as part of this review.

## Scope

Requested: five new Andhra Pradesh prospects. Each must have an email address published on its own website and no duplicate in this repository. Each audit must pass the automated third-eye check (`verify.json`) and an independent post-audit review confirming that the business, the contact details and every printed claim are real.

| Run | What it did | Outcome |
|---|---|---|
| 45814540402 | Measured leads from `data/ap-websearch-2026-11-26.csv` (the 10 vetted leads left over from 23 November, target 5) | 6 attempted: 5 passed verify, 1 failed (`screenshots.real`, Ayush Dental Care). 4 not attempted once the target was reached. **All 5 PDFs held** after review (pass 1). |
| 45820025821 | Re-audit of the 5 with 1.4.3 | Verify 25/25 for all five. **All 5 held** for the pass-2 defects. |
| 45824308238 | Re-audit with the first part of 1.4.4 (cce7c89) | Vignata, Deepthi and Sai Bhaskar re-audited (verify 26/26). Dr K Hemanth Kumar: Lighthouse `PROTOCOL_TIMEOUT`, so verify blocked the new audit on `provenance.tool` and the previous one was kept. Shravani ENT: site unreachable (`ECONNRESET`) at the screen step, previous audit kept. The token cannot cancel runs, so this run finished and was superseded by the next one. |
| 45825535687 | Re-audit of the 5 with the 1.4.4 fixes through c36f6bf | Vignata, Dr K Hemanth Kumar, Deepthi and Sai Bhaskar re-audited (verify 26/26); Shravani's screen hit a connection timeout again and its previous audit was kept. **Vignata and Sai Bhaskar read clean: these are their published files.** Dr K Hemanth Kumar and Deepthi held (pass 3). |
| 45830272690 | Re-audit of Shravani ENT after adding a network retry to the screen | Verify 26/26. Superseded by the next run. |
| 45831617819 | Re-audit of Dr K Hemanth Kumar, Deepthi and Shravani with the pass-3 fixes | Verify 26/26 for all three. Dr K Hemanth Kumar's call links are now 5 (1 in the page, 4 in an embedded frame), as on the live page. **Deepthi and Shravani read clean: these are their published files.** Dr K Hemanth Kumar held for the laptop crop (pass 4). |
| 45837237021 | Re-audit of Dr K Hemanth Kumar with the laptop strip placed over the desktop headline | Verify 26/26, 10 pages, 0 mm. The laptop strip shows the hero, headline and navigation. **Approved: this is its published file.** |

## Repository-only duplicate check

Gmail was not used to find duplicates. The check used only the repository:

- The duplicate set was built from all 99 commits on all 7 branches: 706 paths that ever existed, including 298 versions of the lead and audit registries, every lead CSV, every deliverable `sequence.json`/`summary.json`, and every audit PDF and folder name. The index holds 269 domains, 282 root domains, 302 emails, 217 phones and 269 business names, including businesses the operator deleted earlier.
- Each of the 10 candidates was compared on domain, root domain, domain label, email, email domain, phone (last ten digits), exact name and a fuzzy name match. None matched. The one fuzzy hit, Ayush Dental Care against "Ayush NRI LEPL Health Care Private Limited's Blood Bank" (aayushhospitals.com), is a different business. The pipeline's own intake check (`checkLead`) and prospect filter (`notAProspect`) also passed.
- Registries after the final run: **259 leads, 60 audits** (after removing the stale Vignata row). There are zero duplicate domains in either registry. Each of the five has exactly one lead row (status `audited`) and one audit row; re-audits replaced their rows in place.

## Sourcing checks (before any audit)

The 10 candidates are the vetted leads that were not attempted on 23 November. Each homepage was fetched again on 26 November (all live), and each address was read on the business's own website before the run. DNS showed Simhapuri Dental, Madhu Dental, Fortune Dental and Viswanadha Hospital behind the Hostinger CDN, the source of most `ERRORED_DOCUMENT_REQUEST` and `NO_FCP` failures in earlier runs, so they were placed last in the queue.

## Independent live-page review

These checks were made separately from the measurement pipeline, by fetching each business's own pages and third-party listings on 26 November 2026.

| Business | City | To: address, and where it is published | Supporting evidence | Decision |
|---|---|---|---|---|
| Vignata Fertility & IVF Center | Guntur | vignatafertilityandivfcentre@gmail.com, https://vignataivfcenter.com/ (homepage footer and the contact page) | Janardani Hospital, Gowrishankar Theatre Road, beside Lalitha Hospitals, Kothapet, Guntur 522001; +91 93465 28327; Dr Vignata Nutalapati, MBBS, MS (OBGY), FRM | Real, independent, local |
| Shravani ENT Hospital | Kakinada | shravanienthospital@gmail.com, https://shravanienthospital.com/ (homepage) | Jawahar Street, Salipeta, near TTD Kalyana Mandapam, Kakinada; open 10 am to 5 pm; no phone number on the site. Justdial and inkakinada: Dr S Veer Reddy, MS (DLO), Door No 21-1-29, Jawahar Street, Kakinada 533001 | Real, independent, local |
| Dr K Hemanth Kumar, neurologist | Kurnool | drhemanthneuro@gmail.com, https://neurologistinkurnool.com/contact-%26-appointments | Consults at Kurnool Heart & Multispeciality Hospital, KC Canal Road, A Camp (Monday to Saturday, 10 am to 9 pm); 94410 94410, Adoni 94943 19319. Practo: MBBS (Kurnool Medical College, 2011), MD (NTRUHS, 2017), DM Neurology (SRM, 2020), gold medallist, registration verified | Real; an independent consultant with his own site |
| Deepthi Fertility Centre | Nellore | deepthifertilitycentre@gmail.com, https://deepthifertility.com/about-us/ and the team page (drawn by script, so a plain fetch shows no address; the pipeline's browser screen confirmed it on the site) | Sreehari Nagar, Mini Bypass Road, opposite the TDP office, Nellore 524003; 79972 79952; Dr N Sudeepthi, MBBS, MS (OBG), FNB (Reproductive Medicine); Dr B Suneetha; Dr Cornelius J | Real, independent, local |
| Sai Bhaskar Hospitals | Guntur | bmrhospitalsguntur@gmail.com, https://saibhaskarhospital.com/contact.html | 6/2 Arundelpet, Guntur 522002; 91123 22266 and 1800-123-41730; open 24 hours; Dr Busireddy Narendra Reddy, MS, DNB, MCh (Ortho), APMC registration 71859; a second branch in Vijayawada (two sites, not a chain). The "bmr" prefix is not explained on the site, but it is the address the hospital publishes | Real, independent, local |

The pipeline's own email check (`emailCheck: confirmed`) agrees for all five. All five addresses are Gmail mailboxes, so the mail server exists; whether each mailbox is read cannot be tested without sending.

## Post-audit PDF review

Every page of every PDF was read as extracted text (pymupdf), and the pages most likely to break (cover, scorecard, visitor's view, findings, plan) were also read as images. Each printed claim was checked against the measurement it came from and, where possible, against the live site.

### Pass 1: defects in the run 45814540402 PDFs (fixed in 1.4.3, 157ef8b)

- **Vignata's audit reference** printed as "SP-AUD-2026-11-26-VF&": the ampersand in the name became part of the code. References now use letters only ("VFI").
- **Hidden H1s:** Vignata's report said "0 H1 headings detected on the homepage", but the markup has one H1 that is not shown at 390 px. Sai Bhaskar's 8 hidden slide H1s were not mentioned. Hidden H1s are now counted and stated.
- **Zero costs printed as evidence:** "render-blocking CSS/JS costing 0 ms", with a fix to defer CSS against 0 ms (Shravani), and "Long tasks blocked the main thread for 1 ms". Costs are printed only when they are material, and the fix names only measured costs.
- **Wording:** "Only 0 H2 headings" (now "No H2 headings"); "WebPage structured data is missing telephone and address" (a WebPage entry cannot carry them; now "has no business entry with telephone and address"); "dead links" (links to `#` or `javascript:void(0)` can open menus, so they are now "placeholder links").

The verifier's `copy.honesty` check rejects each of these.

### Pass 2: defects in the run 45820025821 PDFs (fixed in 1.4.4)

- **Vignata:** the no-form fix recommended "a sticky Call / Book bar" to a site that already keeps call and WhatsApp buttons on screen (visible in its own page-4 screenshot). Call and WhatsApp links inside fixed elements are now measured, and the fix links the booking form from the existing button.
- **Dr K Hemanth Kumar:** "1 click-to-call link on the whole page", while the live page shows five call links. Contact routes, headings and words are now also counted after the full-page and scrolled screenshots; the larger count is kept, and a difference between the 390 px and desktop layouts is printed and verified (new check `facts.viewport`).
- **"Five sections on the homepage"** was prescribed to pages measured at 3 sections. The target is now the rubric's own "a homepage of 6 screens or fewer".
- **Sai Bhaskar, page 4:** a 37.4 s LCP and a 40.5 s time to interactive were drawn at the 20 s end of "The first 20 seconds" axis. The axis now extends to cover the slowest marker.
- **Sai Bhaskar, finding 03:** "Headline blocks seen in the first screen" quoted two titles from inactive slides that the first-screen screenshot does not show. Only blocks a visitor can see are listed now; the same list sets the rubric's competing-headlines penalty.
- **Sai Bhaskar, cover and summary:** "2 H1 headings detected" although 8 more are hidden (now "visible at 390 px (8 more hidden in the markup)"); "Credit where it is due: 157 images" beside 5,576 KiB of oversized images (images are no longer credited when they need re-encoding); "23 of 24 interactive elements" beside link counts taken from the whole markup (now "of the 24 interactive elements visible when the page loaded").
- **Dr K Hemanth Kumar, speed fix:** it named only images while the finding cited blocking time at 2.3 times Google's threshold. The fix now covers the scripts behind the blocking time.
- **GoDaddy-built sites (Dr K Hemanth Kumar, Shravani):** every request to GoDaddy's own file server (`img1.wsimg.com`) was described as sharing visitor details "with another company", though GoDaddy already serves the page. Site-builder file servers are now labelled as such, and the privacy sentence names only outside services.
- **Layout and copy on every report:** a 10/10 score ran into its evidence ("103 stacked sections"), the plan table printed "MeasurementConversion events", "link(s)" plurals, and page 10 said "Fifteen minutes is enough to decide" followed by "worth an hour of it".
- **Registry:** the ref correction in 1.4.3 left a second, stale Vignata row in `data/audits.json` ("VF&", 60/100), because rows were matched by ref only. `recordAudit` now also matches the same domain on the same date, and the stale row was removed in this commit.

The rubric is unchanged (selftest 36). No verifier check was weakened; `facts.viewport` is new.

### Pass 3: defects in the run 45825535687 PDFs

- **Dr K Hemanth Kumar, call links:** still "1 click-to-call link on the whole page" after the post-scroll recount, while the live homepage shows five. Four of them sit in a site-builder custom-HTML block, which is drawn in an embedded frame that the page's own document does not contain. Call, email and WhatsApp links in visible, in-flow frames are now counted in both layouts; chat and consent widgets in fixed containers are not (158ea79, a51526a). Run 45831617819 recorded "1 at load, 1 after scrolling, 4 in embedded frames, printed 5, desktop 5".
- **Dr K Hemanth Kumar, desktop score:** the desktop Lighthouse test did not complete in that run, and the report printed "Desktop performance score: —/100". A report now says the test did not complete, and `copy.honesty` rejects "—/100" (158ea79). The test completed in the later runs.
- **Deepthi, a defect introduced by pass 2:** the new site-builder label called `img1.wsimg.com` "GoDaddy's site-builder file server" on a WordPress site that loads one file from it, and left GoDaddy out of the outside services. The label now applies only when the page's meta generator names that builder (4403d4a).
- **Shravani ENT:** its re-audit screen failed with network errors in two runs (`ECONNRESET`, then a connection timeout) while the site was up from outside GitHub. The screen now retries network errors twice (7868164).
- **Registry:** a stale Vignata row ("VF&", 60/100) remained in `data/audits.json` beside the corrected one. `recordAudit` now also matches the same domain on the same date (21bf011), and the stale row is removed in this commit.

### Pass 4: residual in the run 45831617819 PDFs

- **Dr K Hemanth Kumar, page 4:** the laptop frame showed a blur. I first took it for a loading delay; extra image waits (158ea79) did not change it. The image embedded in the PDF showed the real cause: the frame shows a 45 mm strip of the 1440 px desktop screenshot, always from the left edge, and this GoDaddy layout centres its hero, so the left strip held only the hero's blurred background fill. The strip is now placed over the first visible H1 when that headline sits further right in the first desktop screen; left-aligned layouts keep the left edge (af382a8).

### Final read

Every final PDF was re-read as text, and pages 3, 4 and 8 were also checked visually. Automated scans of the text found none of the defect strings above ("(s)" plurals, "Five sections", "worth an hour", "—/100", "Only 0", "dead links", malformed references, zero costs, the WebPage wording, and the plan and scorecard collisions). Every number quoted in each email 1 appears in its PDF. Each lead's emails 2 to 4 quote no measurements.

## Final audits

| Business | City | To: | Overall (speed/mobile/conversion/design/SEO) | Lighthouse mobile · LCP | Findings | Ref | Run |
|---|---|---|---|---|---|---|---|
| Vignata Fertility & IVF Center | Guntur | vignatafertilityandivfcentre@gmail.com | 61 (3/6/7/10/8) | 47/100 · 9.1 s | 4 | SP-AUD-2026-11-26-VFI | 45825535687 |
| Shravani ENT Hospital | Kakinada | shravanienthospital@gmail.com | 73 (5/7/8/10/9) | 57/100 · 7.6 s | 4 | SP-AUD-2026-11-26-SEH | 45831617819 |
| Dr K Hemanth Kumar, neurologist | Kurnool | drhemanthneuro@gmail.com | 72 (5/8/8/8/9) | 81/100 · 4.0 s | 4 | SP-AUD-2026-11-26-DKH | 45837237021 |
| Deepthi Fertility Centre | Nellore | deepthifertilitycentre@gmail.com | 76 (5/7/10/10/7) | 60/100 · 7.7 s | 4 | SP-AUD-2026-11-26-DFC | 45831617819 |
| Sai Bhaskar Hospitals | Guntur | bmrhospitalsguntur@gmail.com | 62 (3/7/8/8/7) | 28/100 · 39.1 s | 5 | SP-AUD-2026-11-26-SBH | 45825535687 |

- Every audit: verify 26/26 (including the new `facts.viewport`), `emailCheck: confirmed`, 10 A4 pages, 0 mm overflow.
- Each lead has four drafts in its `emails/` folder; only email 1 attaches the PDF. Each follow-up is due 3 days after the previous email actually goes out, and only if there is no reply (`tools/followups.mjs`).
- Deepthi (76), Shravani (73) and Dr K Hemanth Kumar (72) score above the 70 "healthy" line. Their findings are real but make a weaker case than Vignata (61) and Sai Bhaskar (62).
- The reports carry 4 or 5 findings, not 6, because only supported findings are printed. This is by design.

## Not published

| Domain | Reason |
|---|---|
| ayushdentalcare.com | Run 45814540402: verify failed `screenshots.real` (blank or flat capture). Not published; not retried. Its address, ayushdental@gmail.com, was published on its site. |

Four CSV leads were not attempted because the target was reached: Simhapuri Dental Hospital (simhapuridental.com), Madhu Dental Clinic (madhudentalclinic.com), Fortune Dental (fortunedentalclinics.com) and Viswanadha Hospital (viswanadhahospital.com). Each has an address on its own site, and all four are behind the Hostinger CDN. They stay in the registry as `new`: never audited, never contacted.

## Limits

- An email published on the business's own site is not proof of inbox deliverability, registration or credentials.
- The verifier's `live: false` means its optional repeat live-fetch mode was not used. It does not mean fixtures were used.
- The run archives in `results/` are encrypted and were not opened in this review. The review used the published PDFs, `verify.json`, `summary.json`, `layout-checks-*.json`, the email drafts and the live sites.
- Lab numbers vary between Lighthouse runs: across the runs above, Shravani's mobile score read 59, 54, 65 and 57; Dr K Hemanth Kumar's 64, 73 and 81; Sai Bhaskar's LCP 30.2, 37.4 and 39.1 s; and Vignata's overall score 60, 63, 66 and 61. Each PDF says its numbers come from "this test run". The final run's numbers were accepted before they were known. The numbers are dated 26 November 2026; if outreach slips materially, re-audit before sending.
- Process gap: no hold manifest was written while this review was in progress, so `deliverables/README.md` showed the five as ✅ between runs, before the defects above were fixed. Nothing was sent or drafted in that time. Future reviews write the manifest with `approved: false` before the first re-audit.
- Sticky buttons and contact routes are read from the page's links, including links in visible embedded frames. A call button drawn without a `tel:` link is not counted.
- Page 4's laptop frame is a strip of the desktop screen, not the whole screen. Shravani's phone screenshots show the cookie banner that greets every visitor on load.
