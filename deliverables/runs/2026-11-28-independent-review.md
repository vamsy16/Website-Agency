# Andhra Pradesh: independent review (28 November 2026)

**Status: five audits approved, four of them after a re-audit with 1.4.7.** The machine-readable record is [2026-11-28-independent-review.json](2026-11-28-independent-review.json). Nothing was sent, and no Gmail drafts were created during this review. The operator reviews the PDFs before any draft is made.

## Scope

Requested: five new Andhra Pradesh prospects (operator, 28 November 2026), with no duplicate leads, only leads with an email address, and everything real, live and relevant. The operator asked for a third-eye check that continues after the audit, and for duplicates to be checked against this repository, not Gmail. Each audit must pass the automated third-eye check (`verify.json`) and an independent post-audit review confirming that the business, the contact details and every printed claim are real.

| Run | What it did | Outcome |
|---|---|---|
| 46122437174 | Measured leads from `data/ap-websearch-2026-11-28.csv` (8 vetted businesses, target 5, at most 8 attempts, CSV only) | Vedanta Hospitals, Dr Sneha's Skinclin, Skinmed Skin Clinic and SV Children's Hospital audited, verify 28/28 each. Kamakshi Hospital, Sri RK Mother & Child Care Hospital and Koncept Skin failed verify; Maa Eye Care was screened out. **All four audits held**: the review found the defects below. |
| 46125570076 | Re-audit of the four with 1.4.7, then `data/ap-websearch-2026-11-28b.csv` (target 1) | Re-audits: verify 29/29 for Vedanta (with the new pop-up check) and 28/28 for the other three. **These are their published files.** Nandan Hospitals audited, verify 28/28; the target was reached, so Arka Eye Hospital and Best Rehab were not attempted. |

The hold manifest (`approved: false` for every candidate) was committed before the first run, so the index never showed an unreviewed audit as ready.

## Repository-only duplicate check

Gmail was not used to find duplicates. The check used only the repository:

- Every remote branch was fetched and the clone unshallowed (10 branches, 133 commits). Every candidate's domain, emails and phone numbers were searched in the full history of all branches (`git log --all -S`). The check also compared domain, email (including addresses the site screen recorded), phone (last ten digits), exact name and city, and a loose name key against `data/leads.json` and `data/audits.json`. Name variants were searched in `data/`, `deliverables/` and `outreach/` on every branch tip.
- Result: no matches, except Kamakshi Hospital. It was already in `data/leads.json` as a vetted lead from 27 November (status `new`, 0 attempts, never emailed) and was reused, not duplicated. The name-variant hits were different businesses: Dr. Siri's Speciality Skin & Hair Clinic (drsiriskinclinic.com) against "Skinclin", and the 27 November notes about Kamakshi.
- The three backups for the 5th slot (Nandan Hospitals, Arka Eye Hospital, Best Rehab) went through the same check after run 46122437174 had been merged. None matched.
- Registries after the final run: **277 leads, 70 audits**, zero duplicate domains in either. Each of the five has one lead row (status `audited`) and one audit row; the re-audits replaced their rows in place.

## Sourcing checks (before any audit)

Each candidate's own homepage and contact page were read on 28 November. The To: address was read there as text, and its exact location is recorded in the JSON. DNS was checked for every candidate, and the Hostinger CDN (CNAME `*.cdn.hstgr.net` or NS `dns-parking.com`) was excluded. Rejected while sourcing:

- three domains with no DNS (srilalithadental.com, maheshorthoandspinecentre.com, mgbclinics.com);
- chains or partner branches (Partha Dental, Medicover, Aravind, an Indira IVF partner, Universal Srushti);
- a dental college and a Rotary charity hospital;
- Pragathi IVF, already in the registry;
- Hostinger-CDN sites (saradentalknl.com, rayuduent.com, bayyahospital.com).

## Independent live-page review

These checks were made separately from the measurement pipeline, by fetching each business's own pages on 28 November 2026.

| Business | City | To: address, and where it is published | Supporting evidence | Decision |
|---|---|---|---|---|
| Vedanta Hospitals | Kadapa | vedantahospitalkadapa@gmail.com, footer of every page, including https://vedanthahospital.com/contact/ | 59/294-5-1, Opposite Water Tank, Akkayapalli Park, Kadapa 516002; 08562 256789, +91 96660 15678; multispeciality (cardiology, neurosurgery, ECMO), seven named doctors | Real, independent, local |
| Dr Sneha's Skinclin | Visakhapatnam | skinclinvizag@gmail.com, https://www.drsnehasskinclin.in/contact | 4th floor, R Square, Mithilapuri Colony, Madhurawada 530041; 81210 46464; Dr Sneha Vanapalli, "3 years of dermatology experience" (homepage); Mon–Sat 10:30–8:30 | Real, independent, local |
| Skinmed Skin Clinic | Visakhapatnam | skinmedvizag@gmail.com, https://www.theskinmed.com/contact and the mobile header of the homepage (visible in the audit's screen 1) | +91 93910 82255; clinics at Dutt Island, Siripuram and at Shantipuram; Dr Sriteja, dermatologist; Mon–Sat 10–7, Sun 10–2 | Real, independent, local |
| SV Children's Hospital | Tirupati | svchildrens@gmail.com, https://svchildrenhospital.com/ (contact block) | #140-B, Opposite Anjaneya Swamy Temple, Bhavani Nagar, Tirupati 517501; 0877 2288055; four named doctors | Real, independent, local. Its homepage copy is template text ("ranks #1 in more specialties …"), and the four doctors share one placeholder photo. The report and emails repeat none of it. |
| Nandan Hospitals | Vijayawada | nandanhospitalsvijayawada@gmail.com, header of every page and https://nandanhospitals.com/contact-us.php | #29-28/1-56, Near Pushpa Hotel Centre, Kovelamudivari Street, Suryarao Pet, Vijayawada 520002; 96663 94555, 0866 2433535 (appointments); Dr Moparthi Srinivas, MS, MCh (Orthopaedics), founder | Real, independent, local |

Claims re-checked on the live pages after the audit:

- **Vedanta's H1 and booking routes:** one H1. Three buttons ("Get Appointment" and "Book An Appointment" twice) open the same Elementor pop-up.
- **Sneha's H1s:** two ("Our Expertise", "What People Say About Us"); the homepage form has fields.
- **Skinmed's H1s:** four ("30% OFF On All Anti-Ageing Services", "Schedule a consultation …", "Our Clinic", "What our patient says"); the homepage has a callback form.
- **SV Children's contact routes:** the phone is plain text, with no tel: link, as the report says; the homepage has an appointment form.
- **Nandan's H1 and form:** one H1 ("Nandan multispeciality Hospital"), placed after the slider, services and about blocks, as the report's 3,078 px says. "MAKE AN APPOINTMENT" is a visible form.

## Post-audit PDF review

Every page of every PDF was read as extracted text (pymupdf), and the visitor's-view pages were read as images. Each printed claim was checked against the measurement it came from and, where possible, against the live site. `tools/review-pdfs.py` ran on both versions.

### Defects in the run 46122437174 PDFs (fixed in 1.4.7, re-audited in run 46125570076)

1. **Vedanta Hospitals: a false "no appointment form" claim, in the report and in email 1.** Finding 01 (Critical) read "No appointment form fields were detected on the homepage", and email 1 opened with it. But the site's "Get Appointment" and "Book An Appointment" buttons open an Elementor pop-up form. The measurement counted only forms visible on the page, so the hidden pop-up read as zero. A hospital that knows its own booking form would have dismissed the whole audit on the first line. Verify did not catch it either: its no-form guard matched "no enquiry form" but not the healthcare wording.

   The fix:
   - With no visible form, the measurement now clicks a pop-up button whose label is about booking or contact, after every screenshot, and counts the fields then shown. A click that leaves the page counts nothing.
   - `facts.popupForm` records the result, and the guard now covers "No appointment form".
   - The probe was tested in local Chromium on an Elementor-style pop-up, a video-only pop-up button and a modal link that leaves the page.

   Re-audited: "3 pop-up button(s), 3 about booking ("Get Appointment"); opened: yes, 4 field(s) visible after the click". The finding and both conversion penalties are gone. Conversion is 10, overall 75 (was 67). The report says "Booking form in a pop-up (“Get Appointment”)", and email 1 now leads with the 56/100 mobile score and the 13 screen heights.
2. **SV Children's Hospital: screen count rounded twice.** The PDF printed "about 8 phone screens" and "≈8 screens tall" for 6,311 px over 844 px, which is 7.48 screens: 7.48 was rounded to 7.5, then to 8. Whole counts are now rounded once, from the unrounded value. Re-audited: "about 7 phone screens", "screen 7 of about 7".
3. **Skinmed and Dr Sneha's Skinclin: screen 7 taken at the wrong depth.** On pages laid out 320 px wide (both are Wix sites), a phone screen holds 692.5 px of page, not 844. The screen-7 shot still stepped 844 px per screen, so Skinmed's "screen 7" showed the page 7.3 screens down. Dr Sneha's "last screen" stopped 151 px above the bottom. The shots now step in the page's own screens. Re-audited: Skinmed's screen 7 shows the treatments section; Sneha's last screen ends at the "©2024 Copyright by Skinclin" footer.

Two scan flags were false positives and the scan was corrected:

- **Skinmed's "about 11" is right.** The screen is 844 × 320 / 390 = 692.5 px, so the page is 7,275 / 692.5 = 10.505 screens. The scan had used verify's rounded 693 px (giving 10.497) and Python's round-half-to-even.
- **"The last screen of about 7" is right for a page of 6.94 screens.** Screen 7 is the last screen of any page between 6.5 and 6.99 screens.

### Final read

- **Numbers:** all five final PDFs were re-read page by page. Every number on pages 1 to 8 matches across pages and with `verify.json`, and every LCP and TBT ratio was recomputed. Vedanta: 13.0 / 2.5 = 5.2×. Sneha: 3.3× and 9.1×. Skinmed: 2.9× and 8.7×. SV Children's: 2.0×. Nandan: 2.7× and 2.1×.
- **Screen counts:** each one equals the page height over the page's own screen, rounded once.
- **Screenshots:** each visitor's-view caption matches its screenshot. No pop-up appears in any screenshot.
- **Emails:** each email 1 quotes only numbers printed in its PDF, and every email body holds recipient-facing text only.
- **Scan:** `tools/review-pdfs.py` reports all five clean.

One wording item was accepted. Dr Sneha's finding 04 lists three Wix file servers, each followed by the same explanation ("the file server of Wix's site builder, which this page is built on"). It is accurate and repetitive.

## Final audits

| Business | City | To: | Overall (speed/mobile/conversion/design/SEO) | Lighthouse mobile · LCP | Findings | Ref | Run |
|---|---|---|---|---|---|---|---|
| Vedanta Hospitals | Kadapa | vedantahospitalkadapa@gmail.com | 75 (5/6/10/9/9) | 56/100 · 13.0 s | 4 | SP-AUD-2026-11-28-VH | 46125570076 |
| Dr Sneha's Skinclin | Visakhapatnam | skinclinvizag@gmail.com | 64 (2/5/10/10/8) | 38/100 · 8.2 s | 5 | SP-AUD-2026-11-28-DSS | 46125570076 |
| Skinmed Skin Clinic | Visakhapatnam | skinmedvizag@gmail.com | 63 (2/5/10/10/7) | 40/100 · 7.2 s | 4 | SP-AUD-2026-11-28-SSC | 46125570076 |
| SV Children's Hospital | Tirupati | svchildrens@gmail.com | 79 (6/8/10/8/8) | 71/100 · 5.0 s | 4 | SP-AUD-2026-11-28-SCH | 46125570076 |
| Nandan Hospitals | Vijayawada | nandanhospitalsvijayawada@gmail.com | 76 (5/6/10/10/9) | 57/100 · 6.8 s | 3 | SP-AUD-2026-11-28-NH | 46125570076 |

- **Format and checks:** every audit is 10 A4 pages with 0 mm overflow, and `emailCheck` is confirmed. Verify passes in full: 29/29 for Vedanta, 28/28 for the others.
- **Drafts:** each lead has four drafts in its `emails/` folder, and only email 1 attaches the PDF. Each follow-up is due 3 days after the previous email actually goes out, and only if there is no reply (`tools/followups.mjs`).
- **Strength of the case:**
  - Dr Sneha's (64) and Skinmed (63) make the strongest case: mobile scores of 38 and 40, and blocking time about 9× Google's threshold.
  - Vedanta (75), Nandan (76) and SV Children's (79) score above the 70 "healthy" line. Their findings are real but softer. SV Children's email 1 rests on a 5.0 s LCP and one console error.

## Not published

| Domain | Reason |
|---|---|
| kamakshihospital.com | Kamakshi Hospital, Tirupati. Run 46122437174 failed verify: `screenshots.real` (one section shot was blank white). `audit-failed`, 1 attempt; never emailed. |
| srirkhospital.com | Sri RK Mother & Child Care Hospital, Srikakulam. Lighthouse could not render the page (`NO_FCP`), and the missing score was printed as —/100 (`copy.honesty`). `audit-failed`, 1 attempt; never emailed. |
| konceptskin.com | Koncept Skin, Visakhapatnam. `copy.honesty`: a missing score printed as —/100. `audit-failed`, 1 attempt; never emailed. |
| maaeyecare.com | Maa Eye Care, Kadapa. The run's site screen read the Wix homepage as "foreign" (no India, state, city or Indian phone in the fetched text), although the live site names Kadapa. A screen false negative; still `new`, re-screened after 30 days; never emailed. |

Arka Eye Hospital (arkaeyehospital.com, Nellore) and Best Rehab (bestrehabphysio.com, Vijayawada) were not attempted because the target was reached. Both stay `new`: never audited, never contacted.

**Update, 28 November evening:** both were audited in the evening run. Best Rehab was approved and its hold here lifted; Arka Eye Hospital is held. See [2026-11-28-evening-independent-review.md](2026-11-28-evening-independent-review.md).

## Limits

- An email published on the business's own site is not proof of inbox deliverability, registration or credentials.
- The run archives in `results/` are encrypted and were not opened in this review. The review used the published PDFs, `verify.json`, `summary.json`, `layout-checks-*.json`, the email drafts and the live sites.
- Lab numbers vary between Lighthouse runs. Across the two runs: Vedanta 51 then 56 (LCP 13.1 then 13.0 s); Dr Sneha's 44 then 38 (8.2 s both times); Skinmed 39 then 40 (7.5 then 7.2 s); SV Children's 71 both times (5.6 then 5.0 s). Each PDF says its numbers come from "this test run". The re-run's numbers were accepted before they were known. The numbers are dated 28 November 2026; if outreach slips materially, re-audit before sending.
- Earlier batches were measured before the pop-up probe existed. Any of their reports that says "No appointment/enquiry form fields were detected" was not checked for a pop-up form in this review. Their first emails have already gone out.
