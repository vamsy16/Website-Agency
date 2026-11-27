# Andhra Pradesh: independent review (27 November 2026)

**Status: five audits approved, three of them after a re-audit.** The machine-readable record is [2026-11-27-independent-review.json](2026-11-27-independent-review.json). Nothing was sent, and no Gmail drafts were created during this review. The operator reviews the PDFs before any draft is made.

## Scope

Requested: five new Andhra Pradesh prospects (operator, 27 November 2026). Each must have an email address published on its own website and no duplicate in this repository. Each audit must pass the automated third-eye check (`verify.json`) and an independent post-audit review confirming that the business, the contact details and every printed claim are real.

| Run | What it did | Outcome |
|---|---|---|
| 45982415490 | Measured leads from `data/ap-websearch-2026-11-27.csv` (8 vetted businesses, target 5, at most 8 attempts, CSV only) | 7 screened: Venkateswara Eye Hospital timed out and Vijaya Hospital answered HTTP 403 (not audited, not counted); 5 audited, verify 26/26 each. Kamakshi Hospital not attempted once the target was reached. **All five held** while this review was in progress; three had defects (below). |
| 45987926898 | Re-audit of AA Hospitals, Dr. Padmavathi Dental and Desai Eye Care with 1.4.6 (`repairOnly`) | Verify 28/28 each (the two new checks included). **All three read clean: these are their published files.** Leelavathi and Skin First keep their run 45982415490 files. |

The hold manifest (`approved: false` for all eight) was committed before the first run, so the index never showed an unreviewed audit as ready.

## Repository-only duplicate check

Gmail was not used to find duplicates. The check used only the repository:

- The duplicate set was built from the full history of all 8 branches (125 commits; the clone was unshallowed first): every version of `data/leads.json` and `data/audits.json`, every lead CSV, every deliverable `sequence.json`/`summary.json`, every outreach record, the docs and the changelog. It holds 278 domains, 308 emails, 601 phone numbers and 263 business names.
- Each candidate was compared on domain, email, phone (last ten digits), and exact and fuzzy name. None matched. The fuzzy hits are different businesses: Dr. Padmavathi Dental against sripadmavathimultispeciality.com and padmavathihospital.org; Venkateswara Eye Hospital against svsshospitals.com; Vijaya Hospital against vijayahospitals.com/.in, vijayamedicalcentre.in and a Vijaya ICU listing; Kamakshi Hospital against kamakshisaidental.com.
- Registries after the final run: **267 leads, 65 audits**, zero duplicate domains in either. Each of the five has one lead row (status `audited`) and one audit row; the re-audits replaced their rows in place.

## Sourcing checks (before any audit)

Each candidate's own homepage and contact page were read on 27 November, and the To: address was read there as text. DNS was checked for every candidate: the Hostinger CDN (CNAME `*.cdn.hstgr.net` or NS `dns-parking.com`), behind most earlier `ERRORED_DOCUMENT_REQUEST` and `NO_FCP` failures, was excluded from this queue. Rejected while sourcing:

- two domains hijacked by gambling sites;
- five sites with no usable email (none, image only, another domain, a template placeholder);
- multi-branch chains;
- one site answering HTTP 500;
- seven Hostinger-CDN sites;
- six repository duplicates;
- 18 registry domains with no DNS.

## Independent live-page review

These checks were made separately from the measurement pipeline, by fetching each business's own pages (and listings where noted) on 27 November 2026.

| Business | City | To: address, and where it is published | Supporting evidence | Decision |
|---|---|---|---|---|
| AA Hospitals | Eluru | anila.amudalapalli@gmail.com, https://aahospitals.in/contact (the screen also found it on the homepage) | Ramachandra Rao Pet, Eluru 534006; +91 93467 36775 and 08812 236399; Dr Anila Sarvani Amudalapalli, MS (Ophthalmology), FOOS, listed by the All India Ophthalmological Society | Real, independent, local |
| Desai Eye Care | Nellore | desaieyecares@gmail.com, https://desaieyecare.in/ (header and footer) | 16-1-676, near Clock Tower, VRC Centre, Nellore 524001; +91 91002 08048; Dr Sanjeeva Kumar Desai, MS, FIAS | Real, independent, local |
| Dr. Padmavathi Dental Hospital & Implant Centre | Kakinada | dr.padmavathi25@gmail.com, https://padmavathisdental.com/ (homepage and /contact) | 7-102, above Suruchi Foods, Thimmapuram, Kakinada 533005 (in the site's structured data; Justdial agrees); 85018 02222, WhatsApp 98490 62794; Dr Padmavathi Devi, BDS, MDS, FAGE | Real, independent, local |
| Leelavathi Advanced Skin & Laser Centre | Guntur | leelavathiskincentre@gmail.com, https://www.leelavathiadvancedskinandlasercentre.in/ (header, contact page and footer) | Puvada Vari Street, Pottur Vari Thota, Guntur 522001; +91 93929 30422; Dr Kavya Chennamsetty, MD | Real, independent, local |
| Skin First | Vijayawada | skinfirstk@gmail.com, https://www.skinfirst.in/ (as text; its contact-page mail link is broken, `mailto:#`) | Opposite NAC Kalyana Vedika, Gurunanak Colony Main Road, Vijayawada 520010; +91 99235 92359, 0866 254 2359; Dr Cherukuri Keerti Chowdary, MBBS, MD (DVL), re-read on the homepage after the audit | Real, independent, local |

Claims re-checked on the live pages after the audit: Skin First's homepage has no form, and it has eight H1 headings (two hero copies and six testimonial names), as the report says (3 visible at 390 px, 5 hidden). AA Hospitals' homepage has no H1 and its counters are built by script; the report says no H1 was found.

## Post-audit PDF review

Every page of every PDF was read as extracted text (pymupdf), and the visitor's-view screenshots were read as images. Each printed claim was checked against the measurement it came from and, where possible, against the live site. `tools/review-pdfs.py` ran on every version; it found none of the defects below until it was taught them.

### Defects in the run 45982415490 PDFs (fixed in 1.4.6, re-audited in run 45987926898)

1. **AA Hospitals: wrong screen count, score and caption.** The PDF said "9,944 px page height — about 3 phone screens" and "≈3 screens tall"; at 844 px a screen that is 11.8. The count divided by `window.innerHeight`, which Chrome reported as about 3,376 px. An element on the page (`div.bottom`) reaches 1,566 px, wider than the 390 px phone, and Chrome then reports a widened window **even at normal zoom**. This was reproduced and the fix tested in a local Chromium under the same mobile emulation. Consequences:
   - the mobile score missed its long-page deduction;
   - the long-page finding was missing;
   - the "first screen" headline count covered about four screens, so the design score lost 1.5 for competing headlines;
   - screen 7 was captioned "the last screen of about 3".

   Re-audited: "about 12 phone screens", 4 findings, mobile 8, design 10, overall 79 (was 78), and the caption reads "screen 7 of about 12".
2. **AA Hospitals: screenshot caught the counters mid-roll.** Screen 7 caught the counters mid-animation, digits overlapping. Screens are now captured after finite animations finish; the new screen 7 shows 12+, 80+, 1280+ and 128+.
3. **Dr. Padmavathi Dental: own storage counted as an outside service.** The clinic's own S3 media bucket (`padmavathis-dental-clinic-media.s3.ap-south-1.amazonaws.com`) was listed among "6 external domains" that share visitor data. A bucket named for the business now counts as first party; the re-audit lists 5 external domains (Google and Instagram hosts).
4. **Desai Eye Care: comma-joined schema type.** It printed "Person,Organization structured data is missing telephone and address" (an array `@type` joined with a comma). It now reads "Organization structured data is missing telephone and address".

The new verify checks:

- **`facts.screens`** (blocker): the count must equal page height over the phone screen at the page's layout scale.
- **`facts.zoom`** (warning): records the view scale at load and after scrolling, the viewport tag and the widest overflowing element.

For AA Hospitals the view scale was 1.00 at load and after scrolling, and the viewport tag has `initial-scale=1.0`. A visitor sees the page at normal size; the widening is a real sideways overflow, reported as "The layout overflows the viewport by 1176 px".

### Final read

All five final PDFs were re-read page by page. Every number printed on pages 1 to 8 matches across pages and with `verify.json`. The cover, scorecard, findings and plan agree with each other. Every LCP and TBT ratio was recomputed. Each email 1 quotes only numbers printed in its PDF, and every email body holds recipient-facing text only.

One cosmetic item was accepted, as the 26 November review accepted "A 81/100" rather than re-measuring: AA Hospitals' extras list prints "1176 px" without a thousands separator. The number is correct. The code now formats it, and the scan asks for a look at any four-digit number without a separator.

## Final audits

| Business | City | To: | Overall (speed/mobile/conversion/design/SEO) | Lighthouse mobile · LCP | Findings | Ref | Run |
|---|---|---|---|---|---|---|---|
| AA Hospitals | Eluru | anila.amudalapalli@gmail.com | 79 (5/8/10/10/8) | 62/100 · 7.1 s | 4 | SP-AUD-2026-11-27-AH | 45987926898 |
| Desai Eye Care | Nellore | desaieyecares@gmail.com | 74 (5/7/10/8/8) | 57/100 · 10.0 s | 4 | SP-AUD-2026-11-27-DEC | 45987926898 |
| Dr. Padmavathi Dental Hospital & Implant Centre | Kakinada | dr.padmavathi25@gmail.com | 74 (4/6/10/10/10) | 60/100 · 37.0 s | 4 | SP-AUD-2026-11-27-DPD | 45987926898 |
| Leelavathi Advanced Skin & Laser Centre | Guntur | leelavathiskincentre@gmail.com | 71 (4/7/10/8/8) | 59/100 · 14.6 s | 3 | SP-AUD-2026-11-27-LAS | 45982415490 |
| Skin First | Vijayawada | skinfirstk@gmail.com | 65 (3/7/8/10/7) | 40/100 · 14.6 s | 5 | SP-AUD-2026-11-27-SF | 45982415490 |

- Every audit is 10 A4 pages with 0 mm overflow, and `emailCheck` is confirmed.
- Verify passes in full: 28/28 for the three re-audits (with the new checks) and 26/26 for the other two.
- Each lead has four drafts in its `emails/` folder, and only email 1 attaches the PDF. Each follow-up is due 3 days after the previous email actually goes out, and only if there is no reply (`tools/followups.mjs`).
- AA Hospitals (79), Desai (74), Dr. Padmavathi (74) and Leelavathi (71) score above the 70 "healthy" line. Their findings are real but make a softer case than Skin First (65), which has no form and a 40/100 mobile score.
- The two-letter references (AH, SF) are correct: the initials come from the words of the name.

## Not published

| Domain | Reason |
|---|---|
| veyehospital.com | Venkateswara Eye Hospital, Ongole. The screen in run 45982415490 could not connect (`UND_ERR_CONNECT_TIMEOUT`). Not audited; still `new`, 0 attempts. Its address was read on its site; the site's services copy has placeholder text. |
| vijayahospitalvzm.com | Vijaya Hospital, Vizianagaram. The homepage answered HTTP 403 to the screen (it serves visitors in a browser). Not audited; still `new`, 0 attempts. |

Kamakshi Hospital, Tirupati (kamakshihospital.com) was not attempted because the target was reached. It stays `new`: never audited, never contacted.

## Limits

- An email published on the business's own site is not proof of inbox deliverability, registration or credentials.
- The run archives in `results/` are encrypted and were not opened in this review. The review used the published PDFs, `verify.json`, `summary.json`, `layout-checks-*.json`, the email drafts and the live sites.
- Lab numbers vary between Lighthouse runs. Across the two runs, AA Hospitals read 63 then 62 (LCP 6.5 then 7.1 s), Dr. Padmavathi 58 then 60 (LCP 44.3 then 37.0 s) and Desai 57 twice (LCP 9.7 then 10.0 s). Each PDF says its numbers come from "this test run". The final run's numbers were accepted before they were known. The numbers are dated 27 November 2026; if outreach slips materially, re-audit before sending.
- Earlier reports used the old screen count. Six of the 65 PDFs in the repository print a count that disagrees with an 844 px screen:
  - Hanuman's, Bhimavaram Hospitals, Blue Fox and Karumuri print about 2,120 px as one screen. That matches Chrome's 980 px layout for pages without a viewport tag, so it is consistent with what a phone shows.
  - R K Hospital prints 9,106 px as 13 screens.
  - AA Hospitals is fixed above.

  Their first emails went out between 16 and 21 November. The sequences are complete or stopped, except Hanuman's, whose step 3 is due on 29 November. Follow-ups quote no measurements, so nothing needs correcting.
