# Strategy plans

A 16-page A4 digital-marketing strategy for one school, rendered from a template
plus a five-field config. Nothing in this folder contains client data — the school
block lives in `plans/plan.config.json`, and the PDF is written to `reports/plans/`
which is gitignored.

## Why it exists

An audit proves what is broken. A plan is what a school management committee
actually signs. Same design system (`src/styles.css`, `src/fonts.css`), same
voice, but organised around the decision a parent makes and the money a school
spends, with every forward-looking number labelled as an assumption or a target.

## Run it

```powershell
# 1. fill in the school
notepad plans\plan.config.json

# 2. render
npm.cmd run plan
```

Output:

```
reports/plans/<slug>/Smart-Pursuit-Digital-Strategy-<School>.pdf
reports/plans/<slug>/plan-report.json    (per-page layout measurements)
```

```powershell
npm.cmd run plan -- --keep                  # also keep the built plan.html
npm.cmd run plan -- --config plans/other.json
npm.cmd run plan -- --pages 16              # change only if you edit the template
```

## The config

| Key | What it is | Example |
| --- | --- | --- |
| `slug` | output folder | `vizianagaram-school` |
| `school` | school name as it should print | `[School Name]` |
| `city` | town | `Vizianagaram` |
| `state` | state | `Andhra Pradesh` |
| `board` | board or boards | `[Board]` |
| `feeBand` | the fee band the school allows in writing | `[₹ __ per year]` |
| `year` | admission cycle | `2027–28` |
| `preparedOn` | date on the cover | `15 November 2026` |

A value wrapped in `[brackets]` is a placeholder: the render still succeeds, the
run prints which fields are unresolved, and the PDF is a draft. `<` and `>` are
rejected because a value must not be able to break the markup.

## What the renderer refuses

`tools/render-plan.mjs` fails rather than handing back a broken document:

- fewer or more than 16 pages, or a non-A4 media box;
- content overflowing its column, or reaching into the footer band;
- cover content colliding with the confidential line;
- text or an image past the 194 mm right margin;
- broken images, an unloaded font, or a console error;
- any `{{TOKEN}}` left unresolved.

The per-page measurements land in `plan-report.json`, so a layout problem is a
number in a file, not an opinion.

## Editing the document

`_template/plan.html` holds the 16 pages with `{{TOKEN}}` placeholders only.
`_template/plan.css` is additive: it defines blocks a plan needs that an audit
never used (`.pillar`, `table.chk`, `.road`, `.fn`, `.plan-c`) and must not
redefine anything from `src/styles.css`. Restyling the shared type or colour
tokens is out of scope for this folder — see `docs/DESIGN-SPEC.md`.

Two things to keep true when editing:

1. **No measurement literals.** If a number appears, it is arithmetic the school
   can check (`300 × 40% × 35% = 42`), a labelled example, or a target. Never a
   forecast, a testimonial, a ranking, or a guaranteed result.
2. **A4 arithmetic.** `.body` has a 14 mm bottom pad and the footer top sits at
   283 mm. Content that grows past that is caught by the QA gate, not by luck.
