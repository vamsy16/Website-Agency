# Andhra Pradesh: independent review (28 November 2026, evening)

**Status: five audits approved after six rounds of fixes (1.4.8 to 1.4.13).** Approved: Best Rehab, BEST Super Speciality Hospital, Happy Hospitals, Varma Hospitals and Sunray SVR Hospital. Arka Eye Hospital is held and was replaced: GitHub Actions could not reach its site in four runs. The machine-readable record is [2026-11-28-evening-independent-review.json](2026-11-28-evening-independent-review.json). Nothing was sent, and no Gmail drafts were created. The operator reviews the PDFs before any draft is made.

## Scope

Requested: five new Andhra Pradesh prospects (operator, 28 November 2026, evening). The conditions were the same as in the morning:

- no duplicate leads;
- only leads with an email address;
- everything real, live and relevant;
- a third-eye check that continues after the audit;
- duplicates checked against this repository, not Gmail.

Each audit must pass `verify.json`. It must also pass an independent post-audit review confirming that the business, the contact details and every printed claim are real.

The hold manifest (`approved: false` for all eight candidates) was committed before the first run. So the index never showed an unreviewed audit as ready.

| Run | What it did | Outcome |
|---|---|---|
| 46140450908 | `data/ap-websearch-2026-11-28c.csv` (8 vetted, target 5, at most 8 attempts, CSV only), 1.4.7 | Arka Eye Hospital, Best Rehab, Happy Hospitals, Varma Hospitals and BEST Super Speciality Hospital audited, verify passed. 9Fertility screened out. **All five held**: three defects, fixed in 1.4.8. |
| 46142207127 | Re-audit of the five with 1.4.8 | Best Rehab, Happy, Varma and BEST re-audited. Arka unreachable from Actions (UND_ERR_CONNECT_TIMEOUT). Two more defects, fixed in 1.4.9. |
| 46143717528 | Arka retry | Unreachable again. |
| 46145280391 | Re-audit with 1.4.9, retry Arka, one CSV backup | Best Rehab, Happy and Varma re-audited. BEST, Arka and both backups (Star Dental Experts, Sunray SVR Hospital) timed out. |
| 46147409817 | Retry BEST and Arka with 1.4.9 | BEST re-audited; Arka unreachable a fourth time. The review found the form counts unidentified (fixed in 1.4.10). |
| 46148724811 | 1.4.10: re-audit BEST, Happy and Best Rehab; audit the backup in place of Arka | All three re-audited. Star Dental Experts unreachable again. Sunray SVR Hospital screened ok and audited. The form record exposed Happy's newsletter box (fixed in 1.4.11). |
| 46150069124 | 1.4.11: re-audit Happy | **Happy's published files.** |
| 46150684874 | 1.4.12: re-audit Sunray | **Sunray's published files.** |
| 46151816885 | 1.4.13: re-audit Varma for its own reference | **Varma's published files.** Best Rehab's and BEST's published files are from run 46148724811. |

## Repository-only duplicate check

Gmail was not used to find duplicates. The check used only the repository:

- **Method.** Every remote branch was fetched and the clone unshallowed: 13 branches, 161 commits after tonight's work.
  - Each candidate's domain, emails and phone numbers were searched in the full history of all branches (`git log --all -S`).
  - Each was also compared against `data/leads.json` and `data/audits.json` by domain, email (including addresses the site screen recorded), phone (last ten digits), exact name and city, and a loose name key.
  - The same check ran on the three backups before they were needed.
- **Result before the run: no matches.** Best Rehab and Arka Eye Hospital were already in `data/leads.json`. They had been vetted that morning as backups (`data/ap-websearch-2026-11-28b.csv`, commit 04686cc), never attempted and never emailed. They were reused, not duplicated.
- **Re-run on the final five after the review.** Every hit is one of tonight's own records: the 28c CSV, each lead's own row, and this run's commits. The first commit naming four of the domains is 00c5631, the commit that started this run.
- **One similar name.** "BEST Super Speciality Hospital" and "Best Rehab" (both Vijayawada) are different businesses. Their addresses, phones, emails and social accounts differ, and the sites do not link to each other.
- **Registries after the final run:** 283 leads and 76 audits. No domain appears twice in either, and no audit reference is held twice. Each of the five has one lead row (`audited`) and one audit row.

## Sourcing checks (before any audit)

Each candidate's own homepage and contact page were read on 28 November. The To: address was read there as text. DNS was checked for every candidate.

Rejected while sourcing:

- Hostinger CDN or VPS sites, which end in NO_FCP: srivasavidentalhospital.in, caredentalongole.in, amruthahospital.org, lakshmanorthocare.co.in, siriskin.in, mkskin.in, sankardental.co.in, careandcurehospitals.com, gowthamihospital.com.
- No DNS: sankardental.com, advaitahospital.com, susrutaent.healthcare, asianenthospital.com.
- A hijacked domain: aayushmanhospital.com.
- Unreadable sites: drrajasekhareyehospital.com, reclaimphysiohome.com, gvrchildrenhospital.com, physiotherapycare.in.
- Email not on the site: gghospitals.in, rainbowdentalhospital.in.
- Screened out less than 30 days ago: akiraeyehospital.in, ashalathaivf.com.
- Chains or branches: Partha, Siri Dental, Tejasri, Kolors, KIMS, Medicover, Suseela, Ferty9, Dr Aravind's.
- Charities: CSI Arogyavaram, Mother Vannini.

## Independent live-page review

These checks were made separately from the measurement pipeline, by fetching each business's own pages on 28 November 2026.

| Business | City | To: address, and where it is published | Supporting evidence | Decision |
|---|---|---|---|---|
| Best Rehab | Vijayawada | bestrehabphysio@gmail.com, header of every page and https://www.bestrehabphysio.com/contact.html | Road No 1, Srinivasa Nagar Bank Colony, Bharati Nagar; 9703 907070, 7893 947847; a 50-bed inpatient rehabilitation hospital; four named physiotherapists | Real, independent, local |
| BEST Super Speciality Hospital | Vijayawada | bestsuperspecialityvja@gmail.com, header of every page | D.No 33-26-1, Subbarayudu Gari St, opp. Tanuja Scan, Suryaraopeta 520002; 24x7 helpline 8367722722; 12 doctors; established 2019 | Real, independent, local |
| Happy Hospitals (Shri Ramachandra Joint Replacement Center) | Guntur | srjrcortho@gmail.com, https://happy-hospitals.com/contact-shri-ramachandra-joint-replacement-center. The run's screen also found it in the homepage HTML. | Sanakkayala Factory Road, Pachavari Veedi, Kothapet, Guntur 522001; +91 9030797989; Dr Sivaiah Potla. Not related to sriramachandrahospital.com. | Real, independent, local |
| Varma Hospitals | Bhimavaram | varmahospitals@gmail.com, homepage header and "Get In Touch" footer | Door No. 1-7-4/2-1, Suryanarayana Puram, J.P. Road, Bhimavaram 534202; 08816 227268, 9666399996; about 30 named doctors | Real, independent, local |
| Sunray SVR Hospital | Anantapur | sunraysvrhospital24@gmail.com, in the homepage HTML. The run's site screen found it there at 18:57 and 19:16 IST, and the search index shows it in the site's "Reach Us" block. The reviewer's page reader strips this site's header and footer, so it could not show the address itself. | 25-169-3, Kalyandurgam Road, Rudrampeta, Papampeta, Anantapur 515004; emergency +91 80939 36969; OP Mon–Sat 8 AM–8 PM; six named consultants | Real, independent, local |

## Post-audit PDF review

Every page of every PDF was read as extracted text (pymupdf). The visitor's-view pages were read as images, and their screenshots at full size. Each printed claim was checked against the measurement it came from and against the live site. From 1.4.10, `verify.json` `facts.counted` lists each counted form, with its fields, button and place on the page. It also lists each "Read More" link. Each of these was matched to the live page. `tools/review-pdfs.py` ran on every version.

### Defects found, and the fixes

1. **Arka Eye Hospital: a "page not found" page counted as a reachable contact page** (run 1).
   - /contact/ and /contact.php return the site's "page you were looking for doesn't exist" page with HTTP 200, so the scorecard said "Contact page reachable".
   - Fixed in 1.4.8: a soft-404 is not reachable, and the sitemap finding says missing.
   - Arka was never re-audited: Actions could not reach it.
2. **BEST Super Speciality Hospital: its "Read More..." links counted as 0, and its arrival pop-up covered screen 7 and the laptop view** (run 1). Fixed in 1.4.8.
3. **BEST: the laptop view caught two banner slides mid-fade, and slider copies inflated DOM counts** (1.4.8 re-audit). Fixed in 1.4.9:
   - the laptop view pauses the slider and waits for finite animations;
   - carousel copies are not counted (Varma's images without alt text: 65 → 33).
4. **Form counts could not be identified** (1.4.9). BEST, Happy and Best Rehab each counted a one-field form, and a search box would have counted as a contact form. Fixed in 1.4.10:
   - search boxes are not counted;
   - each counted form and "Read More" link is recorded with its fields, button and place.
5. **Happy Hospitals: a newsletter box scored as an enquiry form** (1.4.10).
   - Its only homepage form is "Subscribe" with one email field. Yet conversion was 10/10, and the plan said to "test the contact form".
   - Fixed in 1.4.11: a one-email-field sign-up is not an enquiry form.
   - Re-audited: the no-form finding applies, conversion is 7 and overall 75. Its contact page has no form either.
6. **Sunray SVR Hospital: 12 "Read More" links where a visitor sees 11** (1.4.10).
   - The page carries its intro twice, and one copy is hidden on phones.
   - Fixed in 1.4.12: links are counted as shown at 390 px. Hidden ones are listed and not counted.
   - Re-audited: 11.
7. **Varma Hospitals took Vedanta Hospitals' reference, and the registry lost Vedanta's audit** (run 1).
   - "Vedanta Hospitals" (morning) and "Varma Hospitals" share initials and date, so both got SP-AUD-2026-11-28-VH.
   - `recordAudit` matched rows by reference first. Varma's audit therefore replaced Vedanta's row in `data/audits.json`, which had 74 rows where 75 were due.
   - Fixed in 1.4.13:
     - a reference held by another business gets a digit;
     - a row is only ever replaced by the same domain;
     - verify accepts the digit.
   - Vedanta's row was restored exactly as it was on `main` (300081d), and Vedanta keeps SP-AUD-2026-11-28-VH, the reference in its draft.
   - Varma was re-audited as SP-AUD-2026-11-28-VH2.
   - The history of `data/audits.json` on every branch shows no other reference ever held by two domains.

Each fix was tested in local Chromium before its run. The tests covered:

- a search box beside a contact form, and search boxes alone;
- a search box with a modal booking form, and a dead "Book" button;
- newsletter-only pages, and a newsletter with a call-back form or a modal booking form;
- hidden duplicate links;
- the reference clash, tested on a copy of the registry.

The rubric selftest reproduced 36 after each fix.

### Checked and accepted

- **Varma, screen 7: overlapping text.** This is how the live page renders, not a capture fault. All five testimonial slides carry the same two long URLs ("https://www.youtube.com/@varmahospitals481", "https://youtu.be/P5zCQDA627M"). At 390 px each wraps onto two lines drawn over each other. The pixels are identical in runs 46140450908 and 46145280391, and the capture code waits for animations; it never stops them.
- **Happy, phone screens: a dark bar over the logo.** This is the phone frame's notch, drawn by the PDF over every phone screenshot. In the screenshot itself the logo is clean.
- **BEST: the fifth "Read More" link is real.** It sits in the "If you have any query or need information about us" band above the footer. The review had counted 4 because its fetch of the page ended before that band, so the review was wrong and the count of 5 was right.
- **BEST and Sunray: "2 visible forms" (BEST) and its newsletter box.** BEST's two are the 6-field appointment form and a newsletter box, both visible. That is a true count, and it was measured before 1.4.11; Sunray's re-audit counts only its appointment form.
- **Best Rehab: "1 visible form" is its newsletter box.** It is a true count. The 5-field appointment form opens from "Book An Appointment", so conversion 10 and the plan to test the contact form stand.
- **BEST: a "Dr.Tommy Shelby" testimonial in screen 7.** It is on the live page; the report repeats nothing from it.

### The morning five, re-checked

The morning's approved PDFs (1.4.7) were checked against tonight's findings, because their drafts are already in Gmail. Every count and form claim matches the live pages:

- **"Read More" counts:** Vedanta 0, Dr Sneha's 0, Skinmed 1, SV Children's 2, Nandan 0.
- **Forms:**
  - Vedanta: a pop-up booking form.
  - Dr Sneha's: an appointment form (name, phone, service).
  - Skinmed: a call-back form.
  - SV Children's: a "Book an appointment" form.
  - Nandan: "Make an Appointment".
- **No newsletter or search box** is counted as a form in any of them.

### Final read

- **Numbers:** every number on pages 1 to 9 matches across pages and with `verify.json`. Ratios recomputed:

  | Business | LCP vs 2.5 s | TBT vs 200 ms |
  |---|---|---|
  | Best Rehab | 3.5 s = 1.4× | 282 ms, over |
  | BEST | 12.3 s = 4.9× | 518 ms = 2.6× |
  | Happy | 3.6 s = 1.4× | 7 ms, within |
  | Varma | 13.5 s = 5.4× | 16 ms, within |
  | Sunray | 8.0 s = 3.2× | 201 ms = 1.0× |

- **Screen counts:** each equals the page height over 844 px, rounded once: 15.76 → 16, 13.44 → 13, 33.33 → 33, 8.31 → 8, 12.68 → 13.
- **Screenshots:** each caption matches its screenshot.
  - BEST's pop-up appears only in screen 1, and its caption says so.
  - Screen 7 and the laptop view are captured after closing the pop-up; the laptop view shows one banner slide.
- **Emails:**
  - Each email 1 quotes only numbers printed in its PDF.
  - Each To: matches `summary.json`.
  - Only email 1 attaches the PDF.
  - None of the 20 bodies holds an internal note.
- **Scan:** `tools/review-pdfs.py` reports all five clean.

## Final audits

| Business | City | To: | Overall (speed/mobile/conversion/design/SEO) | Lighthouse mobile · LCP | Findings | Ref | Run |
|---|---|---|---|---|---|---|---|
| Best Rehab | Vijayawada | bestrehabphysio@gmail.com | 75 (6/4/10/10/9) | 80/100 · 3.5 s | 2 | SP-AUD-2026-11-28-BR | 46148724811 |
| BEST Super Speciality Hospital | Vijayawada | bestsuperspecialityvja@gmail.com | 69 (3/5/10/10/10) | 47/100 · 12.3 s | 4 | SP-AUD-2026-11-28-BSS | 46148724811 |
| Happy Hospitals | Guntur | srjrcortho@gmail.com | 75 (8/5/7/9/10) | 89/100 · 3.6 s | 3 | SP-AUD-2026-11-28-HH | 46150069124 |
| Varma Hospitals | Bhimavaram | varmahospitals@gmail.com | 64 (5/6/7/9/6) | 57/100 · 13.5 s | 6 | SP-AUD-2026-11-28-VH2 | 46151816885 |
| Sunray SVR Hospital | Anantapur | sunraysvrhospital24@gmail.com | 71 (4/5/10/10/9) | 63/100 · 8.0 s | 3 | SP-AUD-2026-11-28-SSH | 46150684874 |

- **Format and checks:** every audit is 10 A4 pages, and `emailCheck` is confirmed. Verify passes in full: 31/31 for Happy and Varma, 30/30 for the others.
- **Drafts:** each lead has four drafts in its `emails/` folder, and only email 1 attaches the PDF. Each follow-up is due 3 days after the previous email actually goes out, and only if there is no reply (`tools/followups.mjs`).
- **Strength of the case:**
  - Varma (64), BEST (69) and Sunray (71) make the strongest case: LCP 5.4×, 4.9× and 3.2× Google's threshold.
  - Varma and Happy also have no enquiry form on the homepage.
  - Best Rehab (75) and Happy (75) are fast on mobile (80 and 89). Their reports rest on page length (16 and 33 screens) and small tap targets, and Happy's also on its missing form.

## Not published

| Domain | Reason |
|---|---|
| arkaeyehospital.com | Arka Eye Hospital, Nellore (info@arkaeyehospital.com in the homepage header). Unreachable from GitHub Actions in four runs, though the reviewer could fetch it. Its only report is the run-1 version with the 1.4.7 defects above. Held and replaced by Sunray SVR Hospital. Never emailed. Re-audit and review it before it is ever sent. |
| 9fertility.com | 9Fertility, Tirupati. The run's site screen found no email, although 9fertility@gmail.com is on its homepage: a screen false negative. Status `new`; re-screened after 30 days. Never emailed. |
| stardentalexperts.com | Star Dental Experts, Eluru. Unreachable from GitHub Actions in two runs. Status `new`; re-queued after 30 days. Never emailed. |

## Limits

- An email published on the business's own site is not proof of inbox deliverability, registration or credentials.
- The run archives in `results/` are encrypted and were not opened in this review. The review used the published PDFs, `verify.json`, `summary.json`, `layout-checks-*.json`, the email drafts and the live sites.
- **Lab numbers vary between Lighthouse runs.** Each re-run was accepted before its numbers were known. Ranges across the re-runs read in this review:

  | Business | Mobile score | LCP |
  |---|---|---|
  | Best Rehab | 80–89 | 2.8–3.5 s |
  | BEST | 47–52 | 7.0–12.3 s |
  | Happy | 89–93 | 2.9–3.6 s |
  | Varma | 56–57 | 13.5–13.6 s |
  | Sunray | 63 both times | 7.2–8.0 s |

  Each PDF says its numbers come from "this test run". The numbers are dated 28 November 2026; if outreach slips materially, re-audit before sending.
- **Unreachable sites.** Why GitHub Actions times out on some of these sites (Arka, Star Dental, and BEST and Sunray in one run) is not known. Where the sites are hosted was not verified.
- **Earlier batches.** Batches before 28 November were measured before 1.4.10–1.4.12. A search box, a newsletter box or a hidden link may be counted in their reports. They were not re-checked in this review; their first emails have already gone out.
