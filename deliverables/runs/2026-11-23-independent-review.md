# Andhra Pradesh: independent review (23 November 2026)

**Status: five audits approved after re-audit.** The machine-readable record is [2026-11-23-independent-review.json](2026-11-23-independent-review.json). Nothing was sent, and no Gmail drafts were created as part of this review.

## Scope

Requested: five new Andhra Pradesh prospects. Each must have an email address published on its own website and no duplicate in this repository. Each audit must pass the automated third-eye check (`verify.json`) and an independent post-audit review confirming that the business, the contact details and every printed claim are real.

| Run | What it did | Outcome |
|---|---|---|
| 45095333140 | Measured leads from `data/ap-websearch-2026-11-23.csv` (16 pre-vetted, target 5) | 6 attempted: 5 passed verify, 1 failed (`screenshots.real`). 10 not attempted once the target was reached. **All 5 PDFs held** after review (see pass 1). |
| 45097578295 | Re-audit of the 5 with renderer 1.4.2 | Verify 25/25, 10 pages, 0 mm. Four approved; Dr Swetha Sajja held for one residual (pass 2). |
| 45098947793 | Re-audit of Dr Swetha Sajja (pass 2 fix) | Copy correct; Lighthouse mobile 62 against 88 and 90 earlier, so a reproducibility run was ordered. |
| 45099748499 | Reproducibility re-audit of Dr Swetha Sajja, accepted whatever it measured | Mobile 87, LCP 3.6 s, verify 25/25, 10 pages, 0 mm. **Approved.** |

## Repository-only duplicate check

Gmail was not used to find duplicates. The check used only the repository:

- The duplicate set was built from all 87 commits on all 7 branches: every version of `data/leads.json`, `data/audits.json`, every lead CSV, every deliverable `sequence.json`/`summary.json`, and every audit PDF and folder name. That is 254 domains, 161 emails, 226 phones and 257 business names, including the businesses the operator deleted in a5a261f.
- Each of the 16 candidates was compared on domain, root domain, domain label, email, email domain, phone (last ten digits), exact name and a fuzzy name match. The pipeline's own intake check (`checkLead`) and prospect filter (`notAProspect`) also passed for all 16.
- Fuzzy matches that were checked and found to be different businesses: Smart Care Dental Hospital vs Reliance Smart Point; MJ Naidu Super Speciality Hospital vs Naidu Vari Kunda Biryani (Tenali); Ravi Dental Care vs Ravi Chaitanya Kidney and Children's Hospital and Ravi Neuro and Emergency Hospital (Chittoor).
- Registries after the final run: **259 leads, 55 audits**. There are zero duplicate domains in either registry. Each of the five has exactly one lead row (status `audited`) and one audit row; re-audits replaced their rows in place.

## Sourcing checks (before any audit)

Candidates were found by web search, and each address was read on the business's own website before it entered the CSV. Domain mail servers were checked in DNS, and hosting was checked against the failure history of earlier runs (every recent `ERRORED_DOCUMENT_REQUEST` came from sites behind the Hostinger CDN, so those were placed last in the queue).

Excluded before the CSV: Sarojini Devi Skin Hospital, Talasila Dental and Venkata Padma Hospital (their only published address is on a domain with no mail server); V Dental Care (its mail server is a web host); GG Hospitals (no address on the current site); Identity Dental, Sri Lalitha Dental and AJMS Dental (domains no longer exist); RK Dental Ongole (domain for sale); 32 Dental Care (domain taken over by a betting site); Doctor Physio and Guntur Physiotherapy (HTTP 500); Venkat Padma Ortho (a "coming soon" page); Partha Dental, Unidental and Ethos Dental (multi-state chains); Vijaya Hospital Vizianagaram (same name as an existing lead); Happy Dental Hospital and Dr Ramya's Dentistry (names close to existing leads); Ravi's Dental Care, Vizag (name almost identical to Ravi Dental Care, Vijayawada).

## Independent live-page review

These checks were made separately from the measurement pipeline, by fetching each business's own pages and third-party listings on 23 November 2026.

| Business | City | To: address, and where it is published | Supporting evidence | Decision |
|---|---|---|---|---|
| Smart Care Dental Hospital | Nellore | smartcaredentalhospital@gmail.com, https://smartcaredentalhospital.com/ (header) | Sarai Angadi Centre, Podalakur Road, Dargamitta, Nellore; +91 98665 35139; Drs V Lakshmibhai (BDS), G Srinivasa Ganapathi (BDS), N Venkatesh (MDS, orthodontist), V Ramesh (MDS, oral and maxillofacial surgeon); Justdial: "16 years in healthcare" | Real, independent, local |
| Dr Swetha Sajja Eye Hospital | Rajahmundry | sunetraeyecare2020@gmail.com, https://www.drswethasajja.com/ (header and footer; the only address on the site) | Buddhudu Hospital, Lakshmivarapupeta, Seshayya Metta, Rajamahendravaram 533104; +91 81794 26060; Dr Swetha Sajja, MS (Ophthalmology), neuro-ophthalmology fellowship at Aravind, Madurai; the eye centre at Buddhudu Hospital is listed under her name | Real, independent, local |
| MJ Naidu Super Speciality Hospital | Vijayawada | mjnaiduhospitals@gmail.com, https://mjnaiduhospitals.com/contact-us/ (also lists info@mjnaiduhospitals.com) | 29-13-84 Bramaihyaa Naidu Street, Suryarao Peta, Vijayawada 520002; (0866) 243 5555 / +91 93466 66788; founded 1986 by Dr M J Naidu (MS Ortho, AIIMS); orthopaedic hospital, single site | Real, independent, local |
| Sasya Fertility Centre | Guntur | sasyafertilitycenter@gmail.com, https://www.sasyafertilitycenter.com/ (pipeline screen; the same address appears in business listings) | Seelam Vari Street, beside Vijaya Talkies Road, beside Bank of India, Kothapeta, Guntur 522001; 0863-2211115; Dr Sindhu Kosaraju (MS OBG, Fellow in Reproductive Medicine) | Real, independent, local |
| Ravi Dental Care and Implant Center | Vijayawada | ravidentalcareandimplantcentre@gmail.com, https://ravidentalcare.in/contact-us/ | 29-19-46 Dornakal Road, Suryaraopet, Vijayawada 520002; +91 93473 63515; Dr Anne Ravikanth, MDS (prosthodontist and implantologist); listed in local directories | Real, independent, local |

The pipeline's own email check (`emailCheck: confirmed`) agrees for all five. All five addresses are Gmail mailboxes, so the mail server exists; whether each mailbox is read cannot be tested without sending.

## Post-audit PDF review

Every page of every PDF was read, both as extracted text (pymupdf) and visually. Each printed claim was then checked against the measurement it came from and, where possible, against the live site.

### Pass 1: defects in the run 45095333140 PDFs (fixed in 1.4.2, c51425d)

- **Email 1 for Dr Swetha Sajja** listed "Two things stood out" with an empty second item ("2. .") because the audit had one finding. Email 1 now says "One thing stood out", and the sequence builder refuses an empty list item.
- **"Contact page reachable"** was printed on every report. The `/contact/` probe actually redirected Smart Care to its homepage and returned no page for Dr Swetha Sajja and Sasya. The claim is now made only when `/contact/` answers with a page that is not the homepage (true for MJ Naidu and Ravi Dental, which redirect to `/contact-us/`).
- **Ravi Dental:** "Smallest body text: 0 px" came from a `font-size:0` wrapper, not visible text, and it also cost the mobile score a font penalty. The measurement now counts only elements that render text; Ravi Dental's smallest body text is 14 px and its mobile score is 8 instead of 7.
- **Plurals:** "1 findings were identified", "1 measured findings", "The test produced 1 findings", "1 link point to", "1 schema types", "1 “Read More” links".
- **Plan row 06** told a 2-section page (Ravi Dental) and a 4-section page (Smart Care) to grow to "5 sections". It now targets one H1 and a homepage of 6 screens or fewer (the rubric's own threshold).
- **Page 07** called the 500 ms, 1.6 MB and 50-request targets "Google's published thresholds". Only LCP and TBT are Google's; the other three are now labelled as Smart Pursuit's engineering targets.
- **Smaller fixes:** TBT printed as "992.5 ms" and "128.5 ms" now shows whole milliseconds; "unused plugins removed" (plugin use was never measured) now reads "plugins reviewed and any unused ones removed".

The verifier's `copy.honesty` check now rejects each of these, so they cannot come back silently. No check was weakened, and the rubric is unchanged (selftest 36).

### Pass 2: residual in the run 45097578295 PDFs (fixed in 1e244fb)

- Dr Swetha Sajja, page 2: "1 finding was identified. Their effect on enquiries…" now reads "Its effect". Singular forms were also added for one screen, tap target, section, image or click-to-call link, although none of the five reports needed them.

### Pass 3: reproducibility (Dr Swetha Sajja)

Lighthouse mobile performance for drswethasajja.com was 88, 90, 62 and 87 across four runs on the same morning; LCP was 3.4 s, 3.2 s, 7.6 s and 3.6 s. The 62 came with a 4,033 ms render-blocking estimate and a first paint at 5.0 s instead of 2.3 s, which points to a slow resource during that run. The reproducibility run was accepted before its result was known, and it agrees with three of the four runs. The published report uses it.

A full re-read of the final PDFs found no pass-1, pass-2 or pass-3 defect. Every email 1 quotes findings exactly as they appear in its attached PDF.

## Final audits

| Business | Overall (speed/mobile/conversion/design/SEO) | Lighthouse mobile · LCP | Findings | Ref | Run |
|---|---|---|---|---|---|
| Smart Care Dental Hospital | 85 (9/8/7/10/9) | 91/100 · 2.9 s | 3 | SP-AUD-2026-11-23-SCD | 45097578295 |
| Dr Swetha Sajja Eye Hospital | 81 (7/6/10/10/8) | 87/100 · 3.6 s | 1 | SP-AUD-2026-11-23-DSS | 45099748499 |
| MJ Naidu Super Speciality Hospital | 56 (2/5/8/8/8) | 39/100 · 7.1 s | 4 | SP-AUD-2026-11-23-MNS | 45097578295 |
| Sasya Fertility Centre | 75 (5/5/10/10/10) | 65/100 · 6.0 s | 3 | SP-AUD-2026-11-23-SFC | 45097578295 |
| Ravi Dental Care and Implant Center | 74 (4/8/10/8/9) | 64/100 · 18.7 s | 4 | SP-AUD-2026-11-23-RDC | 45097578295 |

- Every lead has four drafts (23 Nov, 26 Nov, 29 Nov and 2 Dec 2026). Only email 1 attaches the PDF.
- Smart Care Dental (85) and Dr Swetha Sajja (81) score above the 70 "healthy" line. Their audits are honest but carry a weaker case than MJ Naidu, Sasya and Ravi Dental. Dr Swetha Sajja's report has a single medium finding; page 6 states that no further findings were invented.
- The reports carry 1 to 4 findings, not 6, because only supported findings are printed, so `tools/class-diff.mjs` reports "expected 6 findings". This is by design, not a defect.

## Not published

| Domain | Reason |
|---|---|
| drsiriskinclinic.com | Verify failed `screenshots.real` (blank or flat capture). Not retried. |

Ten CSV leads were not attempted because the target was reached: Ayush Dental Care, Vignata Fertility & IVF Center, Shravani ENT Hospital, Dr K Hemanth Kumar (neurologist), Deepthi Fertility Centre, Sai Bhaskar Hospitals, Simhapuri Dental Hospital, Madhu Dental Clinic, Fortune Dental and Viswanadha Hospital. They stay in the registry as `new`: never audited, never contacted.

## Limits

- An email published on the business's own site is not proof of inbox deliverability, registration or credentials.
- The verifier's `live: false` means its optional repeat live-fetch mode was not used. It does not mean fixtures were used.
- The run archives in `results/` are encrypted and were not opened in this review. The review used the published PDFs, `verify.json`, `summary.json`, `layout-checks-*.json`, the drafts and the live sites.
- Lab numbers vary between Lighthouse runs (see pass 3). Each PDF says its numbers come from "this test run". The numbers are dated 23 November 2026; if outreach slips materially, re-audit before sending.
- The five 22 November reports were not re-audited here. They share some of the wording fixed in 1.4.2: "Contact page reachable" (Kalyani Dental's site has no separate contact page), "unused plugins removed" (MK Dental, Prathik Dental) and Google attribution of the engineering targets. None of this changes a measured number. Re-auditing them is an operator decision.
