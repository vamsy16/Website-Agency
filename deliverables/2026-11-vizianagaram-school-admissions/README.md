# School Admissions Growth Strategy — Vizianagaram

**Deliverable:** `SCHOOL-ADMISSIONS-GROWTH-STRATEGY.pdf` — 38 pages, dark editorial layout,
prepared for a prospective school client in Vizianagaram, Andhra Pradesh. November 2026.

This is **not** a website audit. It is the strategy document that precedes an audit: local
market research, competitor intelligence, parent behaviour, channel plans, a 90-day roadmap,
budget models and a measurement framework.

---

## Rebuild

```bash
npm install                                  # pdfkit is a dependency
node deliverables/2026-11-vizianagaram-school-admissions/index.mjs
# or: npm run strategy
```

The build is two-pass: pass one records the page each section starts on, pass two writes those
numbers into the table of contents. Output replaces the PDF in this folder.

Files:

| File | Purpose |
| --- | --- |
| `index.mjs` | Entry point: assembles the 23 sections, runs both passes, prints page count and warnings |
| `build.mjs` | Renderer: A4 dark layout kit (section bands, tables, bars, funnel, roadmap, KPI tiles) |
| `content-a.mjs` | Sections 01–11: executive summary, context, market, competitors, parents, positioning, audit, system, Google, Meta, organic |
| `content-b.mjs` | Sections 12–23: local SEO, website, WhatsApp, offline, campaign, roadmap, budget, KPI, partnership, why-now, next step, sources |

### Why pdfkit and not HTML → Chromium

The build machine has no browser, no system fonts and no pango/cairo, so WeasyPrint and
Playwright are both unavailable. pdfkit writes the PDF directly with the standard AFM font set,
which means:

- no browser dependency, deterministic output, ~160 KB file;
- every glyph must exist in WinAnsi — the renderer's `sanitise()` pass converts `₹` to `INR `,
  arrows to "to", and strips anything else outside the encoding rather than emitting blank boxes;
- no external images are used, deliberately. The document argues against stock photography in
  school marketing; illustrating it with stock classrooms would contradict it.

### Built-in checks

- `overflows` — any block that would end below the bottom margin is reported. Must be empty.
- `warnings` — unknown block types. Must be empty.
- Page count is printed on every build; the Table of Contents page numbers come from pass one.

---

## Research basis

Full source register is Section 23 of the PDF. Verification status in short:

| Claim class | Status |
| --- | --- |
| City population, literacy, households | Verified — Census 2011 derived (census2011.co.in, censusindia.co.in) |
| District population, literacy, urban share, 0–6 population | Verified — official district portal (vizianagaram.ap.gov.in/demography) |
| School counts (3,814 district / 324 block / level split) | UDISE+ derived via schoolspedia.in — not the official portal; labelled as such |
| UDISE+ 2024-25 national enrolment | Secondary analysis of the official release (educationforallinindia.com) |
| Competitor affiliation numbers, establishment years, addresses | icbse.com / cbseschool.org records — may be stale, flagged |
| Competitor website behaviour (Wix site, placeholder carousel captions, no fee page, no WhatsApp) | Observed directly on 21 Nov 2026 — the strongest evidence in the document |
| Partner fee figures (₹16,000–₹53,500 Class X) | Third-party listings via careers360 — internally inconsistent, must be confirmed |
| Google/Meta CPL ranges, visit rates | Vendor benchmarks for Indian metros — used only as a sanity band, never as a local claim |
| AP school reopening date | Sakshi Post 9 Jun 2026 (12 June) vs Economic Times (15 June) — discrepancy stated |
| Anything about the client school | **Not supplied.** Labelled "requires confirmation" throughout |

Deliberately absent: keyword search volumes, competitor ad spend, competitor review counts,
any guarantee of admissions or rankings. None can be verified from outside, so none is asserted.

---

## What the client must confirm before this becomes a proposal

1. School identity, board, affiliation number, classes offered.
2. Fee structure by class, including transport and one-time charges.
3. Board results for the last three years, including failures.
4. Current strength by class and section capacity.
5. Website, Google Business Profile and social handles (for the Section 07 audit to be scored).
6. Last three years of enquiry and admission data, with sources.
7. Why families leave — asked directly, in the discovery session.

---

## Page map

| Pages | Content |
| --- | --- |
| 1 | Cover |
| 2 | Contents |
| 3 | 01 Executive summary |
| 4 | 02 Business context |
| 5-6 | 03 Market |
| 7-8 | 04 Competitor intelligence |
| 9-10 | 05 Parent behaviour |
| 11 | 06 Positioning |
| 12-13 | 07 Digital audit |
| 14 | 08 The admissions system |
| 15-16 | 09 Google Ads |
| 17-18 | 10 Meta Ads |
| 19-20 | 11 Organic social + 30-day calendar |
| 21 | 12 Local SEO |
| 22-23 | 13 Website and landing page |
| 24-25 | 14 WhatsApp lead management |
| 26 | 15 Offline integration |
| 27 | 16 Campaign |
| 28-29 | 17 90-day roadmap |
| 30 | 18 Budget and forecast |
| 31-32 | 19 Measurement |
| 33 | 20 Engagement |
| 34 | 21 Why now |
| 35-36 | 22 Next step |
| 37-38 | 23 Sources and limitations |
