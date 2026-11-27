# Andhra Pradesh: independent review (22 November 2026)

**Status: five audits approved after re-audit.** The machine-readable record is [2026-11-22-independent-review.json](2026-11-22-independent-review.json). Nothing was sent, and no Gmail drafts were created as part of this review.

## Scope

Requested: five new Andhra Pradesh prospects. Each must have an email address published on its own website and no duplicate in this repository. Each audit must pass the automated third-eye check (`verify.json`) and an independent post-audit review confirming that the business, the contact details and every printed claim are real.

| Run | What it did | Outcome |
|---|---|---|
| 45012283217 | Measured 14 leads from `data/ap-websearch-2026-11-22.csv` (target 5) | 11 attempted: 5 passed verify, 5 failed, 1 screened out. 3 not attempted once the target was reached. **All 5 PDFs held** after review (see pass 1). |
| 45016840158 | Re-audit of the 5 with renderer 1.4.1 (pass 1 fixes) | Verify 25/25 for all 5. Every pass-1 defect gone. Minor copy residuals found on re-read (see pass 2). |
| 45018491348 | Re-audit of the 5 with renderer 1.4.1 (pass 2 fixes) | Verify 25/25 for all 5. Layout 10 pages, 0 mm overflow, A4. **Approved.** These are the published files. |

## Repository-only duplicate check

Gmail was not used to find duplicates. The check used only the repository:

- Duplicate set built from all 71 commits of git history. This includes the 11 businesses deleted by the operator in a5a261f and the businesses named in 45 historical audit PDFs.
- Each candidate was compared on domain, root domain, email, phone (last ten digits), name, slug and a fuzzy name match. The pipeline's own intake check (`checkLead`) also passed.
- Fuzzy matches that were checked and found to be different businesses: Praveen Dental vs Praveen Hospital (praveenhospitals.com); Radha Krishna Dental vs Radha Krishna Netralaya; Raju Dental vs blood banks with "raju" in the name.
- Registries after the final run: **243 leads, 50 audits**. There are zero duplicate groups by domain, email, phone or name+city, and no audit domain appears twice. Each of the five has exactly one lead row (status `audited`) and one audit row; re-audits replaced their rows in place.

## Independent live-page review

These checks were made separately from the measurement pipeline, by fetching each business's own pages and directory listings on 22 November 2026.

| Business | City | To: address, and where it is published | Supporting evidence | Decision |
|---|---|---|---|---|
| MK Dental | Kakinada | mkdentalortho@gmail.com, https://mkdentals.com/ | G.O.'s Colony Lane 5, Shanthi Nagar, Kakinada 533003; 078935 43567; Drs Kona Minakshamma MDS and Burri Kiran Karthik MDS | Real, independent, local |
| Prathik Dental and Implant Centre | Anantapur | karthik@prathikdental.com, https://prathikdental.com/contact-us/ | Sai Nagar 7th Cross Main Rd, Anantapur 515001; 08554-296892 / +91 80967 01596; Dr Venkata Karthik K (MDS) confirmed on medibuddy.in | Real, independent, local |
| The Dental Studio | Visakhapatnam | thedentalstudiovizag@gmail.com, http://thedentalstudiovizag.com/contact | 10-27-2/1/1 Facor Layout, Waltair Uplands, Siripuram 530002; +91 63006 00053; the same team runs a second site (Sana Dental Clinic, Maharanipeta), not a chain; listed since 2018 | Real, independent, local |
| Kalyani Dental Clinic | Guntur | kalyanispecialitydental16@gmail.com, https://www.kalyanidentalclinics.com/ | Krishna Nagar 8th Line, Kundal Rd, Guntur 522006; +91 90004 77299; Dr Radhika Kalyani MDS; "since 2005" | Real, independent, local |
| Praveen Dental Care | Tirupati | info@praveendental.in, https://praveendental.in/contact-us.php | 10/13/541a Tilak Rd, Reddy & Reddy's Colony, Tirupati 517501; 988 529 2472; Dr Praveen Kumar; Justdial lists it as "Dr Praveens Dental and Implant Specialities (Praveen Dental Care)" | Real, independent, local |

The pipeline's own email check (`emailCheck: confirmed`) agrees for all five. Two of the sites show theme-placeholder testimonials ("Densher Chingware" on MK Dental, "Sarah Mitchell" on Kalyani). The audits do not cite them, so they do not affect any claim.

## Post-audit PDF review

Every page of every PDF was read, both as extracted text (pymupdf) and visually. Each printed claim was then checked against the measurement it came from.

### Pass 1: defects in the run 45012283217 PDFs (fixed in 1.4.1, acb726a)

- **The Dental Studio:** its own host was listed as an "external domain", and 67 of 71 requests were counted as third-party because the www→bare redirect broke the origin test. First-party hosts are now resolved from the final URL, and verify gained a blocking check, `facts.firstParty`.
- **Kalyani:** printed "6.4× and 0.6× over" although TBT 117 ms is inside the 200 ms target. A 404 at /sitemap.xml was described as "returns a web page".
- **Prathik, Kalyani:** "Remove the retargeting pixels" and "third-party code blocked the main thread", although no ad code was observed and the blocking was not attributed.
- **MK Dental:** "first H1 begins 0 px down" on a page with no H1.
- **Prathik:** "0 stacked sections".
- **All five:**
  - TTFB was printed to three decimals.
  - Unmeasured outcome claims: "doing damage you can see in enquiry numbers", "first paint — still looks empty", "pays back fastest", "cheapest".
  - A screen-7 caption claimed where the address and hours sit.
  - Plan rows sold work whose target was already met; "Contact form rebuilt" appeared where a form exists.
  - Benchmark cells were red even within target, and the "Form fields" tile actually counted forms.
  - Rescue lines and the speed fix were printed whatever the measurement showed.
  - The footer overprinted the page on pages 2, 8 and 10, and the page-4 timeline labels overlapped.
- **Email 2:** "None of this needs a new design… pays back fastest". **Email 3 subject:** "what a fixed version looks like".

Run 45016840158 regenerated all five reports, and a full re-read confirmed none of these defects remain. No check was weakened, and the measurements were not changed.

### Pass 2: residuals in the run 45016840158 PDFs (fixed in 99dea0b)

- The page-7 targets table labelled the LCP row "— YOU" (the label came from a competitor-table style). The row is now just highlighted.
- The time-to-interactive tile printed "21s"; it now has one decimal, like the LCP tile.
- "1 images without alt text" is now singular.
- Lists of more than six external domains now say "including".
- The Rescue line said "Contact form added" when only the homepage was measured; it now says "Homepage booking form added".

A full re-read of run 45018491348 found no pass-1 or pass-2 defect. Every email 1 quotes findings exactly as they appear in its attached PDF.

## Final audits (run 45018491348)

| Business | Overall (speed/mobile/conversion/design/SEO) | Lighthouse mobile · LCP | Findings | Ref |
|---|---|---|---|---|
| MK Dental | 74 (3/8/10/10/9) | 47/100 · 9.4 s | 3 | SP-AUD-2026-11-22-MD |
| Prathik Dental and Implant Centre | 69 (5/4/10/8/9) | 56/100 · 19.4 s | 4 | SP-AUD-2026-11-22-PDA |
| The Dental Studio | 59 (3/5/8/8/8) | 24/100 · 21.0 s | 5 | SP-AUD-2026-11-22-TDS |
| Kalyani Dental Clinic | 78 (5/7/10/9/10) | 71/100 · 16.0 s | 4 | SP-AUD-2026-11-22-KDC |
| Praveen Dental Care | 62 (4/6/7/8/8) | 56/100 · 13.0 s | 4 | SP-AUD-2026-11-22-PDC |

- Every lead has four drafts (22 Nov, 25 Nov, 28 Nov, 1 Dec 2026). Only email 1 attaches the PDF.
- Numbers come from one live Lighthouse run each, and vary between runs. MK Dental scored 80 in the earlier runs and 74 in this one (mobile 55→47); the other overall scores were unchanged. Each PDF says its numbers come from "this test run".
- The reports carry 3 to 5 findings, not 6, because only supported findings are printed. Page 6 states that no further findings were invented, so `tools/class-diff.mjs` reports "expected 6 findings". This is by design, not a defect.

## Not published

| Domain | Reason |
|---|---|
| kamakshisaidental.com | Lighthouse NO_FCP, so verify failed `provenance.tool` |
| rajudental.in, vennelahospital.com, stardentalhospital.com | Lighthouse ERRORED_DOCUMENT_REQUEST, so verify failed `provenance.tool` |
| prasadphysio.com | ERRORED_DOCUMENT_REQUEST, and verify also failed `screenshots.real` |
| ratankrishnadental.com | Screened out: the site did not answer (connect timeout) |

The failed leads were not retried or forced, and audit history is kept.

## Limits

- An email published on the business's own site is not proof of inbox deliverability, registration or credentials.
- The verifier's `live: false` means its optional repeat live-fetch mode was not used. It does not mean fixtures were used.
- The run archives in `results/` are encrypted and were not opened in this review. The review used the published PDFs, `verify.json`, `summary.json`, `layout-checks-*.json` and the drafts.
- The numbers are dated 22 November 2026. If outreach slips materially, re-audit before sending.
