# Design specification — the Smart Pursuit audit

This document freezes the **look** of the deliverable. The reference is
the first delivered Smart Pursuit audit. That document is not in this public
repository — it belongs to the client who commissioned it. This spec is the
written form of that design; treat it as the authority.

The styles in `src/styles.css` were extracted **verbatim** from that reference
report. `src/fonts.css` embeds the two typefaces as base64 WOFF2. Treat both files
as frozen assets: changing them changes every future audit and breaks parity with
the sample the client has already seen.

If a change to the design is genuinely required, it is a deliberate version bump:
update this file, regenerate the reference PDF, and re-run `npm run selftest`.

---

## 1. Format

| Property | Value |
| --- | --- |
| Page size | A4 — 210 × 297 mm |
| `@page` margin | `0` (the page supplies its own padding) |
| Page element | `.page { width:210mm; height:297mm; overflow:hidden; page-break-after:always }` |
| Page count | exactly **10** — enforced by `qa.mjs` and `verify.mjs` |
| Print colour | `print-color-adjust: exact` (the navy cover must not be dropped by the browser) |
| Orientation | portrait only |
| Margins inside a page | `.pad { padding:14mm 16mm 0 16mm }` |
| Footer | absolute, `left/right:16mm`, `bottom:8mm` |
| Body background | white `#fff` |

PDF is produced by headless Chromium (`playwright-core`) printing `report.html`.
Do not produce the PDF with any other engine; font kerning and flex layout differ.

---

## 2. Colour tokens

Defined once on `:root` in `src/styles.css`. Never hard-code a hex in the renderer
unless it is one of the translucent cover values already used there.

| Token | Hex | Used for |
| --- | --- | --- |
| `--ink` | `#0B1F1D` | body text, headings, dark circles |
| `--ink2` | `#33443F` | secondary body copy |
| `--mut` | `#6B7B77` | captions, labels, footers |
| `--line` | `#E3E9E7` | primary hairlines |
| `--line2` | `#EFF3F2` | table row separators |
| `--brand` | `#0E9F9A` | teal mark, bars, accents |
| `--brand-dark` | `#0A6E6B` | eyebrows, italics in titles, good scores |
| `--mint` | `#E7F4F2` | `.band` callout |
| `--sand` | `#F7F9F8` | KPI tiles, overall panel |
| `--coral` | `#DE4B24` | poor scores, Critical/High findings, "you" row |
| `--coral-soft` | `#FCEDE7` | highlight background for the client row |
| `--amber` | `#C8860B` | Medium findings, warning scores |
| `--amber-soft` | `#FBF3E0` | (reserved) |
| `--navy` | `#081820` | cover, primary CTA, highlighted plan |

Semantic rules:

- **Coral is not decorative.** It means *measured poor* or *Critical/High*.
- **Amber** means *measured warning* or *Medium*.
- **Teal** is the agency's own colour; it never implies a score.
- The cover is the only full-bleed dark surface. One CTA block on page 10 is the
  only other dark surface. Pages 2–9 are white.

---

## 3. Typography

Two families only:

| Family | Role | Source |
| --- | --- | --- |
| **Instrument Serif** | display: cover title, section titles, big numbers, quotes | `src/fonts.css`, base64 WOFF2 |
| **Inter** | everything else: body, labels, tables, UI | `src/fonts.css`, base64 WOFF2 |

Fallbacks: `Georgia, serif` and `system-ui, sans-serif`. If the embedded fonts
ever fail, the PDF must still be readable — but a font fallback is a defect, not
an acceptable variant.

### Scale (as shipped)

| Element | Family | Size | Line | Weight | Notes |
| --- | --- | --- | --- | --- | --- |
| Cover H1 | Instrument Serif | 46 pt | 0.98 | 400 | `letter-spacing:-.015em` |
| Cover sub | Inter | 10.4 pt | 1.55 | 400 | 72% white |
| Cover stat number | Instrument Serif | 31 pt | 1 | 400 | warm coral `#FF9B7A` for the hot stat |
| Section title `h2.t` | Instrument Serif | 25 pt | 1.06 | 400 | `em` in italic `--brand-dark` |
| Pull quote `.quote` | Instrument Serif | 15 pt | 1.22 | 400 | teal quote marks |
| Plan card headline | Instrument Serif | 20 pt | 1 | 400 | price slot (unused — no prices) |
| KPI number | Instrument Serif | 21 pt | 1 | 400 | coral / amber / teal by state |
| CTA headline | Instrument Serif | 17 pt | 1.1 | 400 | white on navy |
| Step number | Instrument Serif | 19 pt | 1 | 400 | teal |
| Finding title | Inter | 10.4 pt | 1.2 | 700 | tight, sentence case |
| Body | Inter | 9.4 pt | 1.5 | 400 | `--ink` |
| Lede | Inter | 9.8 pt | 1.55 | 400 | `--ink2`, max 158 mm |
| Card body | Inter | 8.4 pt | 1.5 | 400 | |
| Table body | Inter | 8.2 pt | — | 400 | tabular numerals |
| Plan table body | Inter | 7.9 pt | — | 400 | |
| Small / caption | Inter | 7.6 pt | 1.45 | 400 | `--mut` |
| Eyebrow | Inter | 6.6 pt | — | 700 | uppercase, `letter-spacing:.19em` |
| Table head | Inter | 6.2–6.4 pt | — | 700 | uppercase, `.12–.13em` |
| Footer | Inter | 6.4 pt | — | 400 | `--mut`, page `NN / 10` |
| Finding tag | Inter | 5.9 pt | — | 800 | white on coral/amber |
| Method fine print | Inter | 6.6 pt | 1.5 | 400 | `--mut` |

Never introduce a third family, a script face, an icon font, or emoji as icons.

---

## 4. Page furniture

Every page except the cover has the same two pieces of furniture.

### Top bar (`top()` in `render.mjs`)

```
[SP mark]  SMART PURSUIT · audit                    EXECUTIVE SUMMARY
─────────────────────────────────────────────────────────────────────
```

- 6.4 mm rounded-square teal mark with the agency initials, white 7.4 pt, 800.
- Brandline 7 pt, 700, uppercase, `letter-spacing:.14em`; the word after the dot
  is `--mut`, 500.
- Right label 6.6 pt, 600, uppercase, `letter-spacing:.15em`, `--mut`.
- Bottom hairline `--line`, 3 mm padding below the bar, 6 mm to the content.

### Footer (`footer()` in `render.mjs`)

```
Smart Pursuit · Website & conversion audit · EXAMPLE DENTAL CO   05 / 10
```

- 6.4 pt `--mut`; business name in `<b>` `--ink2`.
- Page number tabular, `letter-spacing:.12em`, always `NN / 10`.
- Hairline `--line2` above, 2.4 mm padding.
- The label after the agency name comes from `config/settings.json` →
  `agency.auditLabel`. Set it per niche: "conversion" for a plumber is not the
  same sentence as "patient-conversion" for a clinic. Never hard-code it.

The cover has no top bar and no footer. It carries its own wordmark, a 2.2 mm teal
spine down the left edge, a radial teal glow top-right, and the
`Private & confidential` line bottom-left at 6 pt, 14% uppercase.

**Two strings are live, not frozen.** `agency.name` and `agency.basedIn` are
printed together on the navy block of page 10 (`SMART PURSUIT · <CITY>`), and the
phone and email beside them come from the same `config/settings.json`. Everything
else on the page — geometry, type scale, colour, the `NN / 10` tab — is frozen and
checked by `qa.mjs` and `tools/class-diff.mjs`.

---

## 5. Page-by-page layout

The renderer builds these in this exact order. Page numbers are fixed.

| # | Function | Layout contract |
| --- | --- | --- |
| 1 | `pageCover` | navy full bleed; wordmark + document kind; kicker + 46 pt name; domain · city, state; **3 headline stats** in a bordered 3-column strip; client block bottom-left, agency phone/email bottom-right |
| 2 | `pageSummary` | top bar; eyebrow + 25 pt title + lede; **4 KPI tiles**; two-column: "three things costing you" list + "what is working" band; verdict; "the bill you are already paying" |
| 3 | `pageScorecard` | top bar; 5-row score table (area, bar, score, weight, evidence); overall panel with 26 mm SVG gauge; Lighthouse mobile/desktop/a11y strip; note on how to read it |
| 4 | `pagePatientView` | top bar; title; **two phone frames 45 × 97 mm** + one laptop screenshot; page-height facts; 0–20 s load timeline with coral/amber/teal markers |
| 5 | `pageFindings` 01–03 | top bar; title; three `.find` blocks: severity tag, title, three columns — *What we measured* / *Why it costs you `<subject>`* / *The fix* |
| 6 | `pageFindings` 04–06 | same, plus **"Also on the list"** — up to six one-line measured items |
| 7 | `pageBenchmark` | top bar; measured competitor table **or** Google-target table; "where the gap is" cards; source line |
| 8 | `pagePlan` | top bar; **8-row plan table** (# / change / today / target / effort); two phase cards (rescue, rebuild); closing pull quote |
| 9 | `pageDirection` | top bar; first-screen principles (4 numbered items); optional demo phone frame; three plan cards — Rescue / Rebuild (navy, recommended) / Care; **no prices** |
| 10 | `pageNextSteps` | top bar; three-step process; navy CTA with phone + email; method box; "kept honest" paragraph; audit reference; footer |

Page 8 must always show exactly **8** changes. Page 9 must always show exactly
**3** plan cards. Page 10 must always carry the audit reference and the
"nothing here is a guarantee of revenue" paragraph.

---

## 6. Components

All classes already exist in `src/styles.css`. The renderer must not invent a
class that has no rule — `qa.mjs` does not catch this, but the structural diff in
`docs/RUNBOOK.md` does.

| Component | Class | Rules |
| --- | --- | --- |
| KPI tile | `.kpi` + `.bad` / `.warn` / `.good` | 4 per row; number 21 pt serif; label 6.9 pt |
| Score bar | `.bar` + `.red` / `.amber` | 20 × 1.9 mm track; fill is the score |
| Overall gauge | `.gauge` | 26 mm SVG ring; arc colour follows the overall band |
| Phone frame | `.phone .frame` | 45 × 97 mm, 0.6 mm dark border, 4.6 mm radius, notch |
| Timeline | `.tl` | 34 mm tall; axis at 16 mm; markers coral/teal/amber |
| Finding | `.find` / `.find.med` | 0.9 mm left rule coral/amber; tag + 3-column row |
| Competitor table | `table.tbl` | client row `.you` gets `--coral-soft` and "— you" |
| Plan table | `table.plan` | 5 columns; effort right-aligned, bold target |
| Plan card | `.plan-c` / `.plan-c.hi` | 3 columns; middle card navy |
| Numbered list | `.numlist` | 7 mm dark circle, bold lead-in, 8.2 pt body |
| Callout band | `.band` | mint background, teal text |
| CTA | `.cta` | navy, 7–8 mm padding, phone 15 pt |
| Mono chip | `.mono` | only for literal strings (shortcodes, `og:site_name`, `#`) |

---

## 7. Content rules that affect the design

1. **Exactly six findings.** Three per findings page. If the measurement cannot
   support six defensible findings, the audit is not ready — do not pad.
2. **Exactly four images maximum**: two phone screenshots, one laptop screenshot,
   one optional demo screenshot. Every image must be a real capture. No stock
   photos, no generated mockups, no device renders without a screenshot inside.
3. **No prices in the PDF.** The three plan cards describe scope, not money.
   Pricing is agreed on the call and lives in the internal pricing sheet.
4. **No testimonials, client logos, review stars, patient counts, or revenue
   claims.** There is no component for them, on purpose.
5. **No emoji, no icon library.** Numbered circles and severity tags carry the
   visual language.
6. **Sentence case** for headings; uppercase only for eyebrows, table heads,
   tags, and the brandline.
7. **One idea per page title.** Titles may use one italic clause in
   `--brand-dark`; never a second colour.
8. **Every number is followed by its unit** and, where relevant, the Google
   target. A bare number is a design defect and a trust defect.

---

## 8. Graceful degradation

| Missing input | Design response |
| --- | --- |
| no competitor benchmark | page 7 becomes the Google-target table, with an honest line saying no competitor was measured |
| no demo screenshot | page 9 drops the phone column, the four principles take the full width |
| no shortcode leak | page 6 "also on the list" loses that item; the cover third stat falls back to the H1 count |
| no schema | the schema line is omitted, never printed as "none found" |
| fewer than six findings | the renderer stops producing ten pages and `qa` fails — the operator must fix the measurement, not the CSS |

A page is never padded with filler to reach ten. White space is part of the design;
invented content is not.

---

## 9. Quality gate

`qa.mjs` loads the HTML in Chromium at A4 and checks:

- exactly 10 `.page` elements;
- every page is 297 mm tall and 210 mm wide;
- no element overflows its page horizontally or vertically (worst overflow must
  be `0 mm`);
- fonts are loaded before measurement.

`verify.mjs` additionally checks the PDF: 10 pages, A4 media box (594.96 × 841.92
within tolerance), valid `%PDF-` header, over 100 KB.

### Structural parity check

After any renderer change, compare against the reference:

```
node tools/class-diff.mjs
```

The generated report must have **zero classes with no CSS rule** and no class the
reference does not use. The reference uses one extra class, `tm`, only for the
superscript ™ on the sample client's name — it is optional.

Not a defect: generated HTML is larger than the reference because the fonts are
embedded as base64 (~425 KB vs ~58 KB). The PDF size is dominated by screenshots
(~3.3 MB).

---

## 10. The slop list — never ship these

- A gradient on every card, or more than one gradient on a page.
- Drop shadows on text, glows on body copy, glassmorphism.
- Rounded corners larger than 4.6 mm on a phone frame, 3 mm on a panel.
- A third typeface, decorative scripts, all-caps body text.
- Emoji as icons; generic "rocket", "growth chart", "handshake" illustrations.
- Fake browser chrome showing a site you did not load.
- A score badge with no evidence column next to it.
- A testimonial or logo wall for a client who has not given one.
- Five colours in a chart legend when the data has two series.
- Centred paragraphs longer than two lines.
- A call-to-action that is not a real phone number or a real form.
- Any sentence that promises revenue, rankings, or "10x" anything.

---

## 11. Definition of done for the visual layer

- [ ] `npm run selftest` passes (rubric unchanged)
- [ ] `audit` reports `QA clean — 10 pages, worst overflow 0 mm`
- [ ] `verify` passes `pdf.pages`, `pdf.format`, `pdf.size`, `pdf.header`
- [ ] the HTML uses no unstyled class
- [ ] the cover has exactly three stats, each with a unit/target
- [ ] every page has a top bar except the cover, and a footer with `NN / 10`
- [ ] the six findings are numbered `01`–`06` with the correct severity colours
- [ ] page 9 contains no price
- [ ] a human has opened the PDF and read it end to end before it is attached
