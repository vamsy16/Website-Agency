# Andhra Pradesh — independent review (21 November 2026)

## Scope and current status

Requested: five new, email-only Andhra Pradesh prospects, duplicate-checked against the repository, followed by an independent second review. **Not yet complete: two retained, three replacements requested.**

Initial measurement run: 44887547155, completed successfully. Replacement run: 44890409337, in progress when this note was written; target three, maximum twenty attempts. Do not treat workflow success alone as proof of five eligible prospects.

## Repository duplicate review

Post-initial-run registries: 220 leads, 43 audits. Compared nonempty domains, lowercased emails, last-ten-digit phones, lowercased name/city pairs in `data/leads.json`, and audit domains in `data/audits.json`: zero duplicate groups in each category. Gmail was not used to determine duplicates. The existing lead row for each new audit is expected, not a duplicate. Audit history is retained, including withheld prospects.

## Independent live-page review

Pages retrieved separately from the measurement pipeline on 21 November 2026:

| Business | Source | Decision |
|---|---|---|
| Suguna Dental | https://sugunadental.com/contact-us/ | Retain: publishes contact@sugunadental.com, phone 8977088188 and Children's Park Road, Nellore address. |
| Creative Dreamz | https://creativedreamz.in/ | Retain: photography/wedding-film/printing business; publishes creativedreamz1@gmail.com and +91 94933 95333, explicitly serves Vijayawada/Visakhapatnam/AP. Exact physical base not independently established; do not assert a street address or a verified Visakhapatnam headquarters. |
| Indian Terrian / Indian Terrain | https://indianterrain.com/ | Withhold: national ecommerce brand, no verified AP city in audit summary. Added domain to chain exclusions. |
| Project Antaryami | https://www.antaryamindia.org/ | Withhold: own site describes a cloud-based virtual-assistant network and franchise enrolment, not a suitable local website prospect. Added domain exclusion. |
| RR Durbar | https://www.rrdurbar.com/ | Withhold: own site advertises multiple outlets, branches and franchising; excluded under the repository's chain/franchise policy. |

## Artifact verification and limits

Both retained audits have `verify.json` with `ok: true`, `blockers: 0`, `fixture: false`, all 23 checks passing: same-day measurement provenance, HTTP 200, Lighthouse 12.8.2, seven nonblank screenshots, rubric/metric consistency, traceable numbers, report hash and ten-page A4 PDF checks. Suguna score: 61/100; Creative Dreamz: 73/100. These are pipeline results, not independently re-measured scores. Raw measurement files remain in encrypted runner results; this review did not decrypt/recalculate them.

The verifier's `live: false` means its optional repeat live-fetch mode was not used. It does not mean fixtures were used. The separate page retrievals above are the independent current-site/email relevance check, not another Lighthouse test. Publication of an email is not proof of mailbox deliverability or business registration/physical operations.

Draft copy needs operator review before use: both first-touch drafts claim an eight-item fix list although the verifier reports four/five findings; Creative Dreamz's prediction about what a visitor will do at 11 pm is an assumption, not a measured fact. Do not present these statements as verified data. Nothing was sent; no Gmail drafts were created by this review. Existing files in `emails/` remain draft-only artifacts.

## Follow-up required

Pull replacement-run results, check every new `verify.json`, independently retrieve the new prospects' own live contact pages, recheck both registries for duplicates, and update this review with a final five-lead selection. Withheld audits must not be counted or sent merely because their numeric verifier passed.
