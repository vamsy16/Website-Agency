# Andhra Pradesh — independent review (21 November 2026)

**Superseded status:** see [five-lead status](2026-11-21-five-leads-status.md). Replacement runs are complete; five published-email contacts identified, but all reports remain unapproved after deeper review.

## Scope and current status

Requested: five new, email-only Andhra Pradesh prospects, duplicate-checked against the repository, followed by an independent second review. **Not yet complete: two retained, three replacements requested.**

Initial measurement run: 44887547155, completed successfully. Replacement run: 44890409337, in progress when this note was written; target three, maximum twenty attempts. Do not treat workflow success alone as proof of five eligible prospects.

## Repository duplicate review

Post-initial-run registries: 220 leads, 43 audits. Compared nonempty domains, lowercased emails, last-ten-digit phones, lowercased name/city pairs in `data/leads.json`, and audit domains in `data/audits.json`: zero duplicate groups in each category. Gmail was not used to determine duplicates. The existing lead row for each new audit is expected, not a duplicate. Audit history is retained, including withheld prospects.

## Independent live-page review

Pages retrieved separately from the measurement pipeline on 21 November 2026:

| Business | Source | Decision |
|---|---|---|
| Indian Terrian / Indian Terrain | https://indianterrain.com/ | Withhold: national ecommerce brand, no verified AP city in audit summary. Added domain to chain exclusions. |
| Project Antaryami | https://www.antaryamindia.org/ | Withhold: own site describes a cloud-based virtual-assistant network and franchise enrolment, not a suitable local website prospect. Added domain exclusion. |
| RR Durbar | https://www.rrdurbar.com/ | Withhold: own site advertises multiple outlets, branches and franchising; excluded under the repository's chain/franchise policy. |

## Artifact verification and limits


The verifier's `live: false` means its optional repeat live-fetch mode was not used. It does not mean fixtures were used. The separate page retrievals above are the independent current-site/email relevance check, not another Lighthouse test. Publication of an email is not proof of mailbox deliverability or business registration/physical operations.


## Follow-up required

Pull replacement-run results, check every new `verify.json`, independently retrieve the new prospects' own live contact pages, recheck both registries for duplicates, and update this review with a final five-lead selection. Withheld audits must not be counted or sent merely because their numeric verifier passed.
