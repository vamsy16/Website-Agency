# Changelog

All notable changes to the Agency OS. Newest first. Keep it short: one line per
change, and say why if the reason is not obvious.

## Unreleased

- Added `docs/ARENA-LEADS-TO-GMAIL.md`: a reusable state/count invocation for deduplicated lead sourcing, verified audit PDFs and deduplicated Gmail drafts with planned follow-up dates. Drafts only; no sending or scheduled-send integration.

## 1.1.0 — 10 November 2026

**The daily run**

- `run` (alias `daily`) — one command for one state: fetch leads, audit only the
  businesses that have never been audited, write their 1 + 3 drafts, and write
  `data/run-<state>-<date>.json`. `--dry-run` prints the queue and measures
  nothing.
- `pendingLeads()` computes the queue from the two registries, so a second run
  on the same day finds nothing to do. No "last run" flag exists to drift.
- A failed measurement is not an audit: it is retried up to
  `run.maxAuditAttempts` times and never consumes a domain's cooldown.

**State names**

- `resolveState()` — any state name works, with or without a config file.
  Overpass finds the boundary by name; `config/states/<state>.json` only adds a
  curated city list and default niches.

**Filenames and identity**

- The audit PDF is named after the business,
  `Smart-Pursuit-Audit-<Business-Name>.pdf`, falling back to the domain.
- `runAudit()` replaces the body of `cmdAudit()` and throws `AuditError`
  (`duplicate` / `dead-site` / `failed`) so a batch survives one bad lead.
- Agency contact details and the niche-specific audit label live in
  `config/settings.json`.
- `agency.name` and `agency.basedIn` are printed on page 10 next to the phone
  and email, so they are live settings, not part of the frozen layout. The
  rest of the page is unchanged and still checked by `qa.mjs`.

## 1.0.0 — 10 November 2026

First public release.

**The pipeline**

- `leads` — geographic lead sourcing from OpenStreetMap (Overpass), Google Places
  (optional key) and operator CSV, with per-state config and niche → tag maps.
- `dedupe` — lead and audit registries, domain normalisation, 60-day audit
  cooldown, do-not-audit list. The audit gate runs *before* any network call.
- `measure` — Playwright + local Lighthouse: mobile and desktop runs, network
  totals, HTTP probes, DOM counts, screenshots at fixed viewports, pixel
  statistics, and optional competitor benchmarks measured the same day.
- `findings` — deterministic rubric (weighted overall, computed from the five
  rounded area scores) plus six findings generated from measured facts, each with
  evidence, cost, fix and effort.
- `render` / `pdf` — ten A4 pages from `audit.json` alone, no measurement
  literals in the renderer, Chromium print-to-PDF, then a real PDF inspection.
- `qa` — layout measured in Chromium: page count, overflow in millimetres, fonts
  loaded, images present, no console errors.
- `verify` — the third eye: provenance, age, URL, scores, fact consistency,
  finding evidence, number traceability, screenshot reality, PDF shape, report
  hash. Blocks the audit rather than warning quietly.
- `sequence` — four drafts (day 0, +3, +6, +9) from the audit's own findings, with
  a mandatory opt-out and a banned-phrase check. Never sends.

**Calibration**

- `selftest` re-derives the calibration case and must print
  `3 / 4 / 2 / 6 / 5 → 36`. It is the drift alarm for the whole scoring system.

**Tools**

- `class-diff` — every emitted class has a CSS rule; page, finding, image and
  footer counts match the contract.
- `encode-b64` / `decode-b64` — hash-checked binary sidecars for transports that
  only carry text.
- `image-stats` — real white ratio, mean luminance and standard deviation for a
  screenshot, used by the verifier to reject a blank capture.

**Notes**

- The delivered reference audit is not in this repository. It belongs to the
  client who commissioned it; `examples/README.md` records what it contained and
  why it is absent.
- Design system (`src/styles.css`, `src/fonts.css`) is frozen and was extracted
  verbatim from that delivered document.
