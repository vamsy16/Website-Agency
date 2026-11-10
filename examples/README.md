# examples/ — why there is no sample audit here

This folder is empty on purpose.

The renderer was built against a real, delivered audit: a named dental clinic
in India, measured on one afternoon, rendered to ten A4 pages, and sent to the
owner. That document — and the screenshots, the raw measurement, and the derived
`audit.json` behind it — belongs to that business and is marked private and
confidential. It is not in this public repository, and it should not be added.

## What the withheld bundle contained

For the record, so nobody has to guess or rebuild it from memory:

| Part | What it was |
| --- | --- |
| `raw.json` | one measurement run: business identity, DOM counts, network totals, HTTP probes, Lighthouse mobile + desktop, two competitor benchmarks, screenshot pixel statistics |
| `assets/screen-1.png` | the site at 390 × 844, the first screen |
| `assets/screen-7.png` | the same site further down the page |
| `assets/desktop-fold.png` | the site at 1440 × 900 |
| `assets/demo-mobile-fold.png` | an optional demo screenshot for page 9 |
| `reference/*.pdf` | the deliverable the client received — the visual target |
| `expected/audit.json` | the derived audit: scores, facts, six findings |
| `expected/verify.json` | the third-eye checks that passed on that run |
| `expected/qa.json` | the layout record: page count and worst overflow |

The calibration result it produced was `speed 3 · mobile 4 · conversion 2 ·
design 6 · seo 5 → 36`, with six findings at Critical/Critical/High/High/Medium/
Medium. Those two facts are encoded in `src/findings.mjs` and enforced by
`npm run selftest`, which is why the rubric can still be checked without the
client's file.

## Building a sample of your own

Do not fabricate one. Measure a site you own, or a site whose owner has agreed to
be measured:

```bash
npm run audit -- --url https://a-site-you-control.example --name "Sample Co" --city YourCity --state gujarat
```

That produces `reports/<slug>/`, which is git-ignored. If you want a committed
example later, get written permission from the site owner first — and strip
anything that identifies them unless they said otherwise.

## Never do this

- Do not copy a real `raw.json` and edit the numbers. That is fabrication with
  extra steps, and the third eye cannot catch a number that is internally
  consistent but invented.
- Do not commit a client's audit, screenshots, or PDF, even in a private repo
  you might later open. `reports/` is git-ignored for that reason.
- Do not add testimonials, logos, patient counts or prices to make a sample look
  more impressive. The report says what was measured and nothing else.
