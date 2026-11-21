# Reference-format audits — five-business batch

Reference: the operator-selected Anoos Beauty Clinic ten-page audit. Same frozen styles and ten-page structure; fresh live measurements. Scoring calibration remains unchanged. No Gmail or send action performed.

## Results

Run 44925860790 rejected all five reports because the renderer omitted the second findings page when fewer than four findings existed. Fixed with an evidence-limits page, not fabricated findings or a relaxed page-count gate.

Run 44927438741:

| Business | PDF / technical gate | Independent review decision |
|---|---|---|
| Sri Navatha Interior Designs | Ten-page PDF; layout and verifier passed | Review only; hold remains |
| DreamNest Interiors | Ten-page PDF; layout and verifier passed | Review only; hold remains |
| Metro Interiors | Ten-page PDF; layout and verifier passed | Review only; hold remains |
| ImageArt Photography Vizag | Blocked: Lighthouse HTTP 403, provenance.tool | No accepted technical PDF |
| Seven Interiors | Blocked: Lighthouse HTTP 403, provenance.tool | No accepted technical PDF |

The run summary says zero completed audits because the three technically verified reports subsequently failed email-draft review, while the other two failed measurement provenance. The three generated PDFs exist in deliverables; this is not five completed or client-ready audits.

## Second review and outstanding problems

Independent PDF text parsing confirmed ten pages and correct identity/contact for Sri Navatha, DreamNest and Metro. Cover H1 count and performance-score wording are corrected. The render still contains unsupported generalisations about visitors and scrolling. Detected form fields are labelled as working forms although enquiry delivery was not tested. Metro's retrieved website content contains a message form whereas the lab extraction reports zero fields, which must be resolved before accepting a no-form finding. LCP is labelled accurately on the cover but some internal text still calls it the main image rather than the largest content element. The PDFs remain operator-review drafts, not approved sales collateral.

No raw measurements were decrypted or recalculated locally. Verification results and layout diagnostics are runner outputs; PDF-text review is an additional check, not a repeat measurement. No client-ready approval is claimed. Do not use the qualitative two-page reviews as replacements for blocked technical reports.

## Review PDFs

- [Sri Navatha](../andhra-pradesh/2026-11-21/sri-navatha-interior-designs/Smart-Pursuit-Audit-Sri-Navatha-Interior-Designs.pdf)
- [DreamNest](../andhra-pradesh/2026-11-21/dreamnest-interiors/Smart-Pursuit-Audit-DreamNest-Interiors.pdf)
- [Metro](../andhra-pradesh/2026-11-21/metro-interiors/Smart-Pursuit-Audit-Metro-Interiors.pdf)

Technical diagnostics: `layout-checks-44927438741.json`. Approval authority remains `2026-11-21-five-leads-review.json` plus the technical verifier; a green workflow is not five successful audits.
