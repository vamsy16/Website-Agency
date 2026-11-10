# AGENTS.md — operating rules for this repository

This repo is a production tool. It produces a document that goes to a real
business owner under the agency's name. Treat every change as if the client will
read it, because they will.

Read `docs/RUNBOOK.md` before running anything. Read `docs/AUDIT-SPEC.md` before
changing scoring or findings. Read `docs/DESIGN-SPEC.md` before touching the
renderer.

---

## The seven invariants

1. **Provenance beats prose.** Every number in the report comes from a raw
   measurement file, the rubric, or a Google target that the report labels as a
   target. The renderer must not contain a measurement literal.
2. **The third eye fails closed.** `verify.mjs` runs after QA and before the PDF
   is accepted. A blocker means the audit is not sendable. Never weaken a check
   to get a pass; fix the data.
3. **Dedupe before network.** `runAudit()` calls `checkAudit()` before measuring,
   and `pendingLeads()` never queues a domain that already has an audit. Do not
   move either check later, and do not add a path that skips them.
4. **The rubric is frozen.** `npm run selftest` must print
   `{speed:3,mobile:4,conversion:2,design:6,seo:5,overall:36}`. If it does not,
   the rubric has drifted from the calibration case. Fix the rubric, not the
   numbers it is checked against.
5. **The design is frozen.** `src/styles.css` and `src/fonts.css` were extracted
   verbatim from the delivered audit. Do not restyle. If a layout change is
   genuinely required, update `docs/DESIGN-SPEC.md`, produce a new delivered
   audit, and re-baseline every artifact.
6. **Nothing sends.** There is no mail client and no credentials. Output is
   drafts plus `sequence.json` with `status: "draft"` and
   `neverSendAutomatically: true`.
7. **Public data only.** Leads come from OpenStreetMap, Google Places (key
   optional), or an operator CSV. No scraping of terms-restricted directories,
   no guessed emails.

---

## Commands

```bash
npm install
npm run selftest
npm run run      -- --state "Andhra Pradesh" [--max 5] [--dry-run] [--csv f.csv]
npm run leads    -- --state gujarat [--niches dentist,clinic] [--limit 25] [--csv f.csv]
npm run audit    -- --url https://the-lead.example --name "Business" --city Ahmedabad --state gujarat
npm run audit    -- --from-raw data/raw/<slug>.json [--force]
npm run sequence -- --audit reports/<slug>/audit.json [--send-date YYYY-MM-DD]
npm run verify   -- --audit reports/<slug>/audit.json [--live]
npm run status
npm run decode
```

On Windows PowerShell use `npm.cmd`. Do not run two audits at once; Lighthouse
and Chromium compete for the same machine.

---

## Definition of done for any change

- [ ] `npm run selftest` passes unchanged
- [ ] a fresh live audit yields 10 pages, six findings and 0 mm overflow
- [ ] `verify.json` has `ok: true` and zero blockers
- [ ] `node tools/class-diff.mjs reports/<slug>/report.html` reports no unstyled class
- [ ] no secret, token, `.env` or raw measurement of a real prospect is committed
- [ ] docs updated when behaviour or commands changed, and a `CHANGELOG` note added

If you cannot satisfy all of these, the change is not ready.

---

## File ownership

| Path | Rule |
| --- | --- |
| `src/styles.css`, `src/fonts.css` | frozen assets; changes need explicit approval |
| `src/findings.mjs` | rubric arithmetic; changes must keep `selftest` green |
| `src/render.mjs` | layout; changes must keep 10 pages and 0 mm overflow |
| `src/verify.mjs` | the gate; additions welcome, relaxations are not |
| `src/dedupe.mjs` | registries; never delete a row |
| `src/sequence.mjs` + `templates/emails/` | drafting; never add a sender |
| `config/settings.json` | agency identity and policy; weights must sum to 1 |
| `data/*.json` | append-only registries; keep JSON valid |
| `examples/` | explains what the withheld reference contained; do not add a client's audit here |

---

## Common failure modes

| Symptom | Look at |
| --- | --- |
| PDF becomes 11 pages | `qa.json` → `worstOverflowMm`, rendered content length |
| `numbers.traceable` fails | a literal number added to `render.mjs` or a template |
| `findings.evidence` fails | a finding claims a fact the raw file does not contain |
| `screenshots.real` fails | blank capture, cookie wall, or wrong file path |
| `sequence` refuses | missing opt-out, banned phrase, too long, unresolved placeholder |
| `audit` refuses | duplicate gate — read the reason; do not reach for `--force` first |

---

## Tone

The report is written for a business owner, not for a search engine. Short
sentences. Concrete numbers. No adjectives doing the work a measurement should
do. No fear-selling. If a sentence would embarrass the agency on a sales call, it
does not belong in the PDF.

The emails are the same voice, shorter. One idea per message. One ask. A real
opt-out. No "just following up".
