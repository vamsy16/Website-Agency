# Audit specification

This is the contract for a Smart Pursuit website audit. If a deliverable does not
satisfy every clause here, it is not an audit and must not be sent.

The audit answers one question for a business owner: **what is my website
costing me, and what does it look like when that is fixed?** It answers it with
numbers taken from their own live site, on a stated date, using a named tool.

---

## 1. Non-negotiables

1. **Every number in the report comes from a measurement.** No estimates, no
   "industry average", no stock benchmark, no number typed into prose by hand.
2. **The measurement is recorded before the report exists.** The report is
   rendered from `audit.json`, which is built from a raw measurement file.
3. **The date is the date of measurement**, printed on the cover and on page 10,
   and it is the same date the raw file records.
4. **Competitor numbers are only printed if they were measured** with the same
   tool, on the same day, with the same throttling. Otherwise the report prints
   Google's published targets instead of a comparison.
5. **Do not invent** testimonials, client logos, patient counts, revenue,
   conversion rates, treatment prices, review scores or staff names.
6. **The demo is opt-in.** A rebuilt page may be shown only if it exists and was
   actually built. The audit never renders a fabricated screenshot.
7. **Nothing is sent automatically.** The system writes drafts. A human sends.

---

## 2. Provenance chain

```
website  ──►  raw measurement  ──►  audit.json  ──►  report.html  ──►  PDF
             data/raw/…json        scoring+facts   10 A4 pages      qa + verify
```

Each arrow is a file on disk. The third-eye verifier re-reads the raw file and
recomputes the scores and facts; if anything has drifted, the PDF is blocked.

A raw measurement is only valid if it contains:

| Field | Meaning |
| --- | --- |
| `website` | the exact URL measured (must equal the report's business URL) |
| `measuredAt` | ISO timestamp, UTC |
| `measuredAtIst` | human-readable timestamp actually shown on page 10 |
| `mobile.status` | HTTP status of the homepage at 390 px |
| `mobile.dom` | DOM facts: headings, sections, forms, tap targets, fonts, schema |
| `mobile.requests` | count, total bytes, third-party origins |
| `mobile.cookies.thirdParty` | third-party cookies set on load |
| `mobile.consoleErrors` | uncaught console errors captured during load |
| `mobile.blockingMs` | main-thread time consumed by third-party code |
| `http.meta` | WordPress/theme/plugins, analytics, ad-tech, `og:site_name` |
| `http["/contact/"]` | status + the raw shortcode text if one is printed |
| `http["/sitemap.xml"]` | status + whether the body is a real `<urlset>` |
| `lighthouse.mobile` | version, category scores, every metric the report quotes |
| `lighthouse.desktop` | version, scores, metrics |
| `screenshots[]` | file path + pixel stats (mean, sd, white %, colourful %) |

`audit --from-raw` accepts a hand-authored file only when it has this shape and
`tools/image-stats.mjs` produced the pixel statistics. Anything else fails the
third-eye gate.

---

## 3. Scoring rubric

Five areas, each scored out of 10, then weighted. The rubric is fixed arithmetic
on measured values — it is not a judgement call.

### Weights

| Area | Weight |
| --- | --- |
| Speed | 30% |
| Conversion | 25% |
| Mobile experience | 20% |
| Design & clarity | 15% |
| SEO | 10% |

The overall score is weighted **from the five rounded area scores**, so the
scorecard rows and the gauge can never disagree:

```
overall = round(10 × (0.30·speed + 0.20·mobile + 0.25·conversion + 0.15·design + 0.10·seo))
```

### Penalties — Speed (starts at 10)

| Measured | Penalty |
| --- | --- |
| mobile Lighthouse performance < 50 | −2.0 |
| … < 90 | −1.0 |
| LCP > 4 s | −3.0 |
| … > 2.5 s | −1.5 |
| TBT > 600 ms | −1.0 |
| … > 200 ms | −0.5 |
| requests > 100 | −1.0 |
| … > 50 | −0.5 |
| page weight > 3 MB | −1.0 |
| … > 1.6 MB | −0.5 |

### Penalties — Mobile experience (starts at 10)

| Measured | Penalty |
| --- | --- |
| page taller than 12 screens | −2.0 |
| … taller than 6 screens | −1.0 |
| more than 3 tap targets under 40 px | −1.0 |
| … any tap target under 40 px | −0.5 |
| body text smaller than 12 px | −1.5 |
| … smaller than 14 px | −0.75 |
| first H1 starts more than 600 px down | −2.0 |
| … more than 300 px down | −1.0 |
| horizontal overflow | −0.5 |

### Penalties — Conversion (starts at 10)

| Measured | Penalty |
| --- | --- |
| an unrendered form shortcode is visible | −4.5 |
| no visible form with fields on the homepage | −2.5 |
| … and WhatsApp is the only capture route | −1.0 |

### Penalties — Design & clarity (starts at 10)

| Measured | Penalty |
| --- | --- |
| more than 15 stacked sections | −1.5 |
| more than 1 competing headline in the first screen | −1.5 |
| more than 1,000 DOM nodes | −0.5 |
| any image without alt text | −0.5 |

### Penalties — SEO (starts at 10)

| Measured | Penalty |
| --- | --- |
| Lighthouse SEO `s` | −(100 − s) × 0.1 |
| more than one H1 | −1.5 |
| structured data present but missing telephone or address | −1.0 |

Every penalty is clamped to 0–10 per area. All measurements are taken on the
same run as the report; nothing is reused from an earlier audit without
`--force` and a stated reason.

### Calibration

`npm run selftest` recomputes the reference audit from its recorded fixture and
must print exactly:

```
{speed: 3, mobile: 4, conversion: 2, design: 6, seo: 5, overall: 36}
```

If that ever changes, the rubric has drifted from the shipped sample. Fix the
rubric, not the fixture.

---

## 4. Findings

Six findings, severity-ordered `Critical → High → Medium`, tie-broken by the
order in which they were derived. Pages 5 and 6 carry three each.

Each finding has exactly three columns:

1. **What we measured** — the numbers, with units.
2. **Why it costs you `<subject>`** — the mechanism, not a scare word.
3. **The fix** — the smallest change that removes the cause, plus effort.

Each finding also carries an `evidence` array naming the fact paths it depends
on (e.g. `["metric.lcpMs", "metric.tbtMs"]`). The verifier resolves every path
against `audit.facts` and rejects a finding whose evidence is missing or `—`.

**Page 6 also carries "Also on the list"** — up to six smaller, individually
measurable items (alt text, dead `#` links, `og:site_name`, sitemap, tap targets,
schema gaps). Each is generated from a measurement, never written by hand.

### Do not claim

- that a competitor is losing customers — only report their measured metrics;
- that a fix will increase revenue — only state the engineering target;
- a ranking position, a traffic number, or a conversion rate you did not measure;
- a medical, legal or financial outcome;
- that the site is "the worst" or "the best".

---

## 5. The ten pages

| # | Page | Must contain | Fed by |
| --- | --- | --- | --- |
| 1 | Cover | business, domain, city, measurement date, three headline stats | `facts.metric`, `facts.business` |
| 2 | Executive summary | 4 KPIs, three cost items, what is working, verdict, the bill already being paid | `facts`, `findings` |
| 3 | Scorecard | five area scores + evidence + weights, overall gauge, mobile/desktop/a11y | `scores`, `facts.metric` |
| 4 | The visitor's view | two phone screenshots, one laptop screenshot, page-height stats, 0–20 s timeline | `screens`, `facts.metric` |
| 5 | Findings 01–03 | severity, measured, why, fix, effort | `findings.page1` |
| 6 | Findings 04–06 | as above + "Also on the list" | `findings.page2`, `also` |
| 7 | Benchmark | competitor table **or** Google-target table; where the gap is | `benchmark`, `facts.metric` |
| 8 | The plan | 8 changes, today → target, effort; two phases | `plan`, `facts.metric` |
| 9 | Direction | first-screen principles, three service tiers, optional demo screenshot | `demo` |
| 10 | Next steps | three-step process, CTA, method box, "kept honest", audit ref | `facts`, `agency` |

### Graceful degradation

| Missing input | What the report does |
| --- | --- |
| no competitor benchmark | page 7 prints the targets table and says plainly that no competitor was measured |
| no demo screenshot | page 9 drops the phone frame and keeps the four direction points |
| no visible form + no shortcode | findings fall back to the booking-path finding, never to an empty section |
| fewer than six findings | the renderer emits only the pages it has content for, and `qa` fails because the page count is no longer 10 — so the operator must fix the measurement or the finding set |

A page is never padded with invented content to reach ten. If the measurement
cannot support ten pages, the audit is not ready.

---

## 6. Third-eye verification

`node src/cli.mjs verify --audit reports/<slug>/audit.json` runs after render and
before the PDF is accepted. It writes `verify.json` next to the audit.

| Check | Fails when |
| --- | --- |
| `provenance.file` | the raw measurement file is missing |
| `provenance.age` | the measurement is older than 72 hours |
| `provenance.url` | the raw file measured a different URL than the report names |
| `provenance.status` | the homepage did not return HTTP 200 |
| `provenance.tool` | no Lighthouse version is recorded |
| `provenance.ist` | no human-readable timestamp is recorded |
| `scores.*` | a printed area score differs from the rubric |
| `facts.consistent` | any printed metric differs from the raw measurement |
| `findings.evidence` | a finding depends on a fact that is missing, empty or `—` |
| `numbers.traceable` | the report prints a number that is not in the measurement, the rubric or Google's stated targets |
| `report.date` | the report does not state the measurement date |
| `report.ref` | the audit reference is not printed |
| `report.hash` | report.html changed after QA |
| `screenshots.real` | a screenshot is missing, >94% white, or has pixel spread < 12 |
| `pdf.pages` | the PDF is not exactly 10 pages |
| `pdf.format` | the media box is not A4 |
| `pdf.size` | the PDF is under 100 KB |
| `pdf.header` | the file does not start with `%PDF-` |

`--live` additionally re-fetches the site and re-checks the headline claims. Use
it when the audit is more than a day old or when the business says it has fixed
something.

**A blocked audit is not sent.** Either re-measure, or correct the report so it
matches what was measured.

---

## 7. Acceptance checklist

Before an audit leaves the building:

- [ ] `npm run selftest` prints `3 / 4 / 2 / 6 / 5 -> 36`
- [ ] `audit` completed without `--force` (no duplicate)
- [ ] `qa.json` has `ok: true` and worst overflow `0 mm`
- [ ] `verify.json` has `ok: true` and zero blockers
- [ ] PDF is 10 pages, A4, and opens
- [ ] the measurement date on page 10 matches `audit.json`
- [ ] the business name, domain and city are spelled correctly
- [ ] every screenshot shows the real site, not a placeholder
- [ ] the report contains no price, no testimonial, no revenue claim
- [ ] the email drafts reference this audit's actual findings
- [ ] a human has read the PDF end to end
