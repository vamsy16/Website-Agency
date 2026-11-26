// Renders the 10-page A4 audit, byte-for-byte in the same structure as the
// delivered audit. Do not restyle: docs/DESIGN-SPEC.md is the written contract.
//
// Rules enforced here:
//   1. Every printed number comes from `audit.facts`, which is built from the raw
//      measurement file. There is no arithmetic on invented constants.
//   2. Missing optional blocks degrade gracefully (no competitor benchmark ->
//      targets table; no demo screenshot -> text-only direction panel).
//   3. If a narrative override references an unknown fact token the render throws.
import fs from "node:fs";
import path from "node:path";
import { ROOT, escapeHtml, fmtInt, round, adTechLabel, audienceOf, stickyRoutes, telDiffers } from "./util.mjs";

const STYLES = fs.readFileSync(path.join(ROOT, "src", "styles.css"), "utf8");
const FONTS = fs.readFileSync(path.join(ROOT, "src", "fonts.css"), "utf8");

const secNum = ms => (Number.isFinite(ms) ? (ms / 1000).toFixed(1) : "—");
const e = escapeHtml;
/** "1 finding", "3 findings" — a count is never printed with the wrong noun form. */
const countOf = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;

// The audit's own name, e.g. "Website & conversion audit". Configured, because
// a dental practice and a plumber are not audited for the same thing.
const auditLabel = facts => facts.agency.auditLabel || "Website & conversion audit";

function footer(facts, n) {
  return `<footer><span>${e(facts.agency.name || "Smart Pursuit")} · ${e(auditLabel(facts))} · <b>${e(facts.business.legalName)}</b></span><span class="pn">${String(n).padStart(2, "0")} / 10</span></footer>`;
}

function top(facts, right) {
  const marks = (facts.agency.name || "Smart Pursuit").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return `<div class="top">
      <div class="left"><div class="mark">${e(marks)}</div><div class="brandline">${e(facts.agency.name || "Smart Pursuit")} <span>· audit</span></div></div>
      <div class="right">${e(right)}</div>
    </div>`;
}

// ---------------------------------------------------------------- 1. COVER
function pageCover(a, facts) {
  const m = facts.metric;
  const stats = a.cover?.stats || defaultCoverStats(facts, a.findings);
  const marks = (facts.agency.name || "Smart Pursuit").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return `<section class="page cover">
  <div class="glow"></div>
  <div class="rule"></div>
  <div class="inner">
    <div class="toprow">
      <div class="wordmark">
        <div class="mark">${e(marks)}</div>
        <div>
          <div class="txt">${e((facts.agency.name || "Smart Pursuit").toUpperCase())}</div>
          <div class="tag">${e(facts.agency.tagline || "")}</div>
        </div>
      </div>
      <div class="r">${e(a.cover?.kind || auditLabel(facts))}</div>
    </div>

    <div class="mast">
      <div class="kicker">Audit prepared for</div>
      <h1>${a.cover?.headlineHtml || e(facts.business.name)}</h1>
      <div class="sub">
        <b>${e(facts.business.domain)}</b> · ${e(facts.business.city)}, ${e(facts.business.state)}<br>
        ${e(facts.business.localityLine || "")}${facts.business.localityLine ? " · " : ""}Measured ${e(facts.date.long)}
      </div>
    </div>

    <div class="stats">
${stats
  .map(
    s => `      <div class="stat hot">
        <div class="n">${s.n}${s.unit ? `<small> ${e(s.unit)}</small>` : ""}</div>
        <div class="l">${s.label}</div>
      </div>`
  )
  .join("\n")}
    </div>

    <div class="footblock">
      <div class="prep">
        <b>Prepared for</b>
        ${e(facts.business.contactName)}
      </div>
      <div class="contactbox">
        <div class="ph">${e(facts.agency.phone || "")}</div>
        <div>${e(facts.agency.email || "")}</div>
        <div style="color:rgba(255,255,255,.45);letter-spacing:.1em;font-size:6.2pt;margin-top:1mm">${e((facts.agency.name || "Smart Pursuit").toUpperCase())} · WEBSITE DESIGN &amp; CONVERSION</div>
      </div>
    </div>
  </div>
  <div class="conf">Private &amp; confidential — prepared for the named recipient</div>
</section>`;
}

function defaultCoverStats(facts, findings) {
  const m = facts.metric;
  const first = findings.all[0] || { title: "" };
  const third = m.visibleForms === 0 && facts.http.contactShortcode
    ? { n: "1", unit: "", label: "Broken enquiry form. Your Contact page prints raw code where the form should load." }
    : { n: String(m.h1Count), unit: "", label: m.h1Count > 1 ? "H1 headings detected on the homepage. Review whether the page has a clear primary topic." : m.h1Count === 1 ? "H1 heading detected on the homepage." : Number(m.h1Hidden) > 0 ? (Number(m.h1CountDesktop) > 0 ? `H1 headings visible on the 390 px phone view; the desktop layout shows ${m.h1CountDesktop}.` : `H1 headings visible on the 390 px phone view; the markup has ${m.h1Hidden} that ${m.h1Hidden === 1 ? "was" : "were"} not shown.`) : "H1 headings detected on the homepage; review the document outline." };
  return [
    { n: String(m.perfMobile), unit: "/ 100", label: `Lighthouse mobile performance score in this test run.` },
    { n: secNum(m.lcpMs), unit: "s", label: `Largest Contentful Paint in the mobile lab test. Good LCP target: 2.5 s or less.` },
    third,
  ];
}

// ---------------------------------------------------------------- 2. SUMMARY
function pageSummary(a, facts) {
  const m = facts.metric;
  const s = a.summary || defaultSummary(facts, a.findings);
  return `<section class="page">
  <div class="pad">
    ${top(facts, "Executive summary")}
    <div class="eyebrow">The 90-second version</div>
    <h2 class="t">${s.title}</h2>
    <p class="lede">${s.lede}</p>

    <div class="kpis">
      <div class="kpi ${m.perfMobile < 50 ? "bad" : "warn"}"><div class="n">${m.perfMobile}<small>/100</small></div><div class="l">Mobile performance<br>Lighthouse, simulated 4G</div></div>
      <div class="kpi ${m.lcpMs > 4000 ? "bad" : "warn"}"><div class="n">${secNum(m.lcpMs)}<small>s</small></div><div class="l">Largest content appears<br>Google target: 2.5 s</div></div>
      <div class="kpi ${m.ttiMs > 5000 ? "warn" : "good"}"><div class="n">${secNum(m.ttiMs)}<small>s</small></div><div class="l">Until the page is usable<br>(time to interactive)</div></div>
      <div class="kpi bad"><div class="n">${m.visibleForms === 0 ? "0" : m.visibleForms}</div><div class="l">${m.visibleForms === 1 ? "Form" : "Forms"} with fields detected on homepage<br>${m.visibleForms === 0 ? (facts.http.contactShortcode ? "Contact page prints raw code" : "Other contact routes may exist") : "Delivery not tested"}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:8mm;margin-top:1mm">
      <div>
        <div class="eyebrow mut">Prioritised observations</div>
        <div class="numlist">
${s.costs
  .slice(0, 3)
  .map(
    (c, i) => `          <div class="it"><div class="n">${i + 1}</div><div class="b">
            <b>${c.title}</b>
            <p>${c.body}</p>
          </div></div>`
  )
  .join("\n")}
        </div>
      </div>
      <div>
        <div class="band" style="margin-bottom:4mm">
          <h3 style="display:flex;align-items:center;gap:2mm"><span class="badge">Working</span></h3>
          <p style="margin-top:1.4mm">${s.working}</p>
        </div>
        <div class="card" style="background:var(--sand)">
          <h3>The honest verdict</h3>
          <p>${s.verdict}</p>
        </div>
      </div>
    </div>

    ${s.bill ? `<div class="band" style="margin-top:auto;margin-bottom:16mm;background:var(--coral-soft);border-color:#F0C7B8">
      <h3 style="color:#8A2B14">The bill you are already paying</h3>
      <p style="color:#7A2A16;margin-top:1.6mm">${s.bill}</p>
    </div>` : ""}

    ${footer(facts, 2)}
  </div>
</section>`;
}

function defaultSummary(facts, findings) {
  const m = facts.metric;
  const h = facts.http;
  const v = audienceOf(facts.business);
  // Name only the problems this site actually has.
  const issues = [
    h.contactShortcode ? "a broken contact form" : null,
    m.visibleForms === 0 ? (v.health ? "a missing booking flow" : "no enquiry form on the homepage") : null,
    "unoptimised images and leftover scripts",
  ].filter(Boolean);
  const issueText = issues.length > 1 ? `${issues.slice(0, -1).join(", ")} and ${issues[issues.length - 1]}` : issues[0];
  const costs = findings.all.slice(0, 3).map(f => ({ title: f.title + ".", body: f.why }));
  const good = [];
  if (m.words > 300) good.push(`${fmtInt(m.words)} words of real content`);
  if (m.images > 10) good.push(`${m.images} images`);
  if (h.analytics) good.push("Google Analytics present");
  if (m.schemaTypes?.length) good.push(`${m.schemaTypes[0]} structured data`);
  if (facts.http?.canonical) good.push("a canonical tag");
  return {
    title: `Your website, measured.<br>Review the evidence <em>before deciding what to change.</em>`,
    lede: `We ran the same tests Google runs, on the same page a visitor sees when they search for your service on a phone. ${countOf(findings.all.length, "finding")} ${findings.all.length === 1 ? "was" : "were"} identified. ${findings.all.length === 1 ? "Its" : "Their"} effect on enquiries has not been measured.`,
    costs,
    working: `Credit where it is due: ${good.length ? good.join(", ") : "the pages do load"}. These are observed features, not proof of overall site quality.`,
    verdict: `Prioritise the supported findings below. Confirm their relevance and agree a scope before estimating delivery or deciding on a redesign.`,
    bill: h.adTech?.length ? `Tracking-related scripts detected: ${e(h.adTech.map(adTechLabel).join(", "))}. Script presence alone does not establish active paid campaigns or advertising spend.` : null,
  };
}

// ---------------------------------------------------------------- 3. SCORECARD
function pageScorecard(a, facts) {
  const s = facts.scores;
  const rows = [
    ["Speed", s.speed, `Mobile ${facts.metric.perfMobile}/100 · LCP ${facts.metric.lcp} · TBT ${facts.metric.tbt} · ${facts.metric.requests} requests · ${facts.metric.bytes} · server response ${facts.metric.ttfb}`, 30],
    ["Mobile experience", s.mobile, `≈${countOf(Math.round(facts.metric.screens), "screen")} tall · ${countOf(facts.metric.smallTapTargets, "tap target")} under 40 px${Number(facts.metric.minFontPx) > 0 ? ` · body text down to ${facts.metric.minFontPx} px` : ""} · ${facts.metric.h1Count > 0 ? `first H1 starts ${fmtInt(facts.metric.headlineOffsetPx)} px down` : Number(facts.metric.h1Hidden) > 0 ? "no H1 visible at 390 px" : "no H1 headline found"}`, 20],
    // "Contact page reachable" only when the /contact/ probe found a page that is not the homepage.
    ["Conversion", s.conversion, `${facts.metric.visibleForms === 0 ? "No visible form on the home page" : countOf(facts.metric.visibleForms, "visible form")} · ${facts.http.contactShortcode ? "Contact page prints raw code · " : facts.http.contactReachable ? "Contact page reachable · " : ""}${countOf(facts.metric.telLinks, "click-to-call link")}${telDiffers(facts.metric) ? ` (${facts.metric.telLinksDesktop} on the desktop layout)` : ""} · ${countOf(facts.metric.whatsapp, "WhatsApp element")}`, 25],
    ["Design &amp; clarity", s.design, `${facts.metric.sections > 0 ? `${facts.metric.sections} stacked section${facts.metric.sections === 1 ? "" : "s"} · ` : ""}${fmtInt(facts.metric.domNodes)} DOM nodes · ${facts.metric.imagesNoAlt} image${facts.metric.imagesNoAlt === 1 ? "" : "s"} without alt text`, 15],
    ["SEO", s.seo, `Lighthouse SEO ${facts.metric.seo}/100 · ${facts.metric.h1Count} ${Number(facts.metric.h1Hidden) > 0 ? "visible " : ""}H1 heading${facts.metric.h1Count === 1 ? "" : "s"}${Number(facts.metric.h1Hidden) > 0 ? ` (${facts.metric.h1Hidden} hidden)` : ""} · structured data ${schemaState(facts.http)} · ${facts.metric.readMore} “Read More” link${facts.metric.readMore === 1 ? "" : "s"}`, 10],
  ];
  const cls = n => (n <= 3 ? "red" : n <= 6 ? "amber" : ""); // >= 7: default bar colour (no "green" rule exists)
  const overall = s.overall;
  const dash = round((overall / 100) * 264, 0);
  return `<section class="page">
  <div class="pad">
    ${top(facts, "Scorecard")}
    <div class="eyebrow">How the site scores</div>
    <h2 class="t">Five areas, measured — not guessed.</h2>
    <p class="lede" style="max-width:165mm">Speed is Lighthouse. Mobile, design, SEO and conversion are a review of the live page at 390 px wide, cross-checked against the same test data. Scores below 7 / 10 mark the areas to review first; their effect on enquiries was not measured.</p>

    <table class="scores" style="margin-top:7mm">
      <thead><tr><th>Area</th><th>Score</th><th>The evidence</th><th style="text-align:right">Weight</th></tr></thead>
      <tbody>
${rows
  .map(
    ([name, score, evidence, weight]) => `        <tr>
          <td class="area">${name}</td>
          <td class="sc"><span class="bar ${cls(score)}"><i style="width:${score * 10}%"></i></span><span>${score}</span></td>
          <td>${evidence}</td>
          <td class="w">${weight}%</td>
        </tr>`
  )
  .join("\n")}
      </tbody>
    </table>

    <div class="overall">
      <svg class="gauge" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#E9EFED" stroke-width="10"></circle>
        <circle cx="50" cy="50" r="42" fill="none" stroke="${overall <= 50 ? "#DE4B24" : overall <= 69 ? "#C8860B" : "#0E9F9A"}" stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${dash} 264" transform="rotate(-90 50 50)"></circle>
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="800" font-size="25" fill="#0B1F1D">${overall}</text>
        <text x="50" y="67" text-anchor="middle" font-family="Inter" font-weight="600" font-size="9" fill="#6B7B77">/100</text>
      </svg>
      <div class="txt">
        <h3>Overall: ${overall} / 100 — we call ${facts.scoring?.healthyOverall || 70}+ healthy.</h3>
        <p>Weighted by what actually produces ${audienceOf(facts.business).noun}, not by how the site looks in a photo. Conversion and speed together carry 55% of the score.</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3.4mm;margin-top:5mm">
      <div class="card"><div class="eyebrow mut" style="margin-bottom:1.4mm">Mobile</div><div style="font-family:'Instrument Serif',serif;font-size:19pt;line-height:1">${facts.metric.perfMobile}<span style="font-size:9pt;color:var(--mut)">/100</span></div><p class="small" style="margin-top:1.4mm">Lighthouse performance, 4× CPU slowdown, Slow 4G</p></div>
      <div class="card"><div class="eyebrow mut" style="margin-bottom:1.4mm">Desktop</div><div style="font-family:'Instrument Serif',serif;font-size:19pt;line-height:1">${facts.metric.perfDesktop}<span style="font-size:9pt;color:var(--mut)">/100</span></div><p class="small" style="margin-top:1.4mm">Same page under the desktop test profile</p></div>
      <div class="card"><div class="eyebrow mut" style="margin-bottom:1.4mm">Accessibility</div><div style="font-family:'Instrument Serif',serif;font-size:19pt;line-height:1">${facts.metric.accessibility}<span style="font-size:9pt;color:var(--mut)">/100</span></div><p class="small" style="margin-top:1.4mm">Lighthouse accessibility score for the same page</p></div>
    </div>

    ${footer(facts, 3)}
  </div>
</section>`;
}

// ---------------------------------------------------------------- 4. PATIENT VIEW
function pagePatientView(a, facts) {
  const m = facts.metric;
  const shots = a.screens || [];
  const phones = shots.slice(0, 2);
  const laptop = shots.find(s => s.name === "desktop-fold") || shots[2];
  return `<section class="page">
  <div class="pad">
    ${top(facts, "The visitor’s view")}
    <div class="eyebrow">What a visitor actually sees</div>
    <h2 class="t">Captured on a 390 px phone, on ${e(facts.date.long)}.</h2>

    <div class="phones" style="margin-top:6mm">
${phones
  .map(
    (p, i) => `      <div class="phone">
        <div class="frame"><div class="notch"></div><img src="${e(p.src)}" alt=""></div>
        <div class="cap"><b>${e(p.label || `Screen ${i + 1}`)}</b>${p.caption}</div>
      </div>`
  )
  .join("\n")}
      ${laptop ? `<div class="phone">
        <div class="frame" style="height:97mm;background:#fff;border-color:#0D2321"><img src="${e(laptop.src)}" alt="" style="object-position:left top;object-fit:cover"></div>
        <div class="cap"><b>The same site on a laptop</b>Desktop performance score: ${m.perfDesktop}/100. Actual visitor device mix was not measured.</div>
      </div>` : ""}
      <div style="flex:1;padding-left:2mm">
        <div class="eyebrow mut">Also measured</div>
        <div style="display:flex;flex-direction:column;gap:3.4mm;margin-top:1mm">
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${fmtInt(m.pageHeightPx)}<span style="font-size:8pt;color:var(--mut)"> px</span></div><div class="small">page height — about ${Math.round(m.screens)} phone screen${Math.round(m.screens) === 1 ? "" : "s"}</div></div>
          ${m.sections > 0
            ? `<div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${m.sections}</div><div class="small">stacked section${m.sections === 1 ? "" : "s"} on one page</div></div>`
            : `<div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${fmtInt(m.words)}</div><div class="small">words of text on the homepage</div></div>`}
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${m.images}</div><div class="small">image${m.images === 1 ? "" : "s"}, ${fmtInt(m.oversizedImgsKb)} KiB of ${m.images === 1 ? "it" : "them"} oversized</div></div>
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${m.telLinks}</div><div class="small">click-to-call link${m.telLinks === 1 ? "" : "s"}${telDiffers(m) ? ` at 390 px; ${m.telLinksDesktop} on the desktop layout` : " on the whole page"}</div></div>
        </div>
      </div>
    </div>

    <div style="margin-top:9mm">
      <div class="eyebrow mut">The first ${timelineTicks(m)[4]} seconds, measured</div>
      <div class="tl">
        <div class="axis"></div>
        <div class="tick" style="left:0"></div><div class="lbl" style="left:0;transform:none">0 s</div>
        <div class="tick" style="left:25%"></div><div class="lbl" style="left:25%">${timelineTicks(m)[1]} s</div>
        <div class="tick" style="left:50%"></div><div class="lbl" style="left:50%">${timelineTicks(m)[2]} s</div>
        <div class="tick" style="left:75%"></div><div class="lbl" style="left:75%">${timelineTicks(m)[3]} s</div>
        <div class="tick" style="left:100%"></div><div class="lbl" style="left:100%;white-space:nowrap">${timelineTicks(m)[4]} s</div>

        ${timelineMarkers(m)}
      </div>
      <div class="band" style="margin-top:2mm;display:flex;justify-content:space-between;align-items:center;gap:6mm">
        <p style="flex:1"><b>Google’s definition of “good” is 2.5 s.</b> The largest content element rendered at ${m.lcp} in this lab run (${Number(m.lcpMs) > 2500 ? `${m.lcpOver}× the target` : "within the target"}). Real-user experience may differ.</p>
      </div>
    </div>

    ${footer(facts, 4)}
  </div>
</section>`;
}

/** Maps a duration to a position on the 0–20 s timeline, clamped inside the axis. */
/**
 * The four load markers on the page-4 timeline. Every dot sits at its measured
 * time. The axis is 0–20 s, or longer when a marker is slower (see
 * facts.metric.timelineTicksS), so no dot is pinned away from its time; the
 * right-end caps (LCP 96 %, TTI 99 %) only keep two end markers distinct. A label that would print on top of a neighbour's label moves below the
 * axis (or, if both rows are crowded, slides right until it is clear), so two
 * labels never overlap. Markers with room keep the original markup unchanged.
 */
export function timelineLayout(m) {
  const span = timelineTicks(m)[4] * 1000;
  const marks = [
    { cls: "ok", pos: pctPos(m.ttfbMs, span, 2, 95), v: m.ttfb, d: "server responds" },
    { cls: "warn", pos: pctPos(m.fcpMs, span, 2, 95), v: m.fcp, d: "first content<br>appears (FCP)" },
    { cls: "slow", pos: pctPos(m.lcpMs, span, 2, 96), v: m.lcp, d: "largest content appears<br>(LCP)" },
    { cls: "slow", pos: pctPos(m.ttiMs, span, 2, 99), v: m.tti, d: "page becomes<br>interactive" },
  ];
  const GAP = 12; // % of the axis, about 21 mm: clears the widest pair of labels
  const last = { top: -Infinity, below: -Infinity };
  for (const k of [...marks].sort((a, b) => a.pos - b.pos)) {
    const want = row => Math.max(k.pos, last[row] + GAP);
    const row = want("top") === k.pos ? "top"
      : want("below") === k.pos ? "below"
      : want("top") <= want("below") ? "top" : "below";
    k.row = row;
    k.labelPos = Math.min(99, round(want(row), 1));
    last[row] = k.labelPos;
  }
  return marks;
}

function timelineMarkers(m) {
  return timelineLayout(m).map(k => {
    if (k.row === "top" && k.labelPos === k.pos) {
      return `<div class="m ${k.cls}" style="left:${k.pos}%"><div class="v">${k.v}</div><div class="d">${k.d}</div><div class="dot"></div></div>`;
    }
    // Same box as a normal marker with the text hidden, so the dot lines up with the others.
    const dot = `<div class="m ${k.cls}" style="left:${k.pos}%"><div class="v" style="visibility:hidden">${k.v}</div><div class="d" style="visibility:hidden">${k.d}</div><div class="dot"></div></div>`;
    const label = `<div class="m ${k.cls}" style="left:${k.labelPos}%;top:${k.row === "below" ? "22mm" : "0"}"><div class="v">${k.v}</div><div class="d">${k.d}</div></div>`;
    return `${dot}\n        ${label}`;
  }).join("\n        ");
}

/** Axis ticks in seconds (from the facts); older audits without them keep 0–20 s. */
function timelineTicks(m) {
  return Array.isArray(m.timelineTicksS) && m.timelineTicksS.length === 5 ? m.timelineTicksS : [0, 5, 10, 15, 20];
}

function pctPos(ms, max = 20000, minPct = 2, maxPct = 99) {
  if (!Number.isFinite(ms)) return minPct;
  const raw = (ms / max) * 100;
  return Math.min(maxPct, Math.max(minPct, round(raw, 1)));
}

// ---------------------------------------------------------------- 5-6. FINDINGS
function pageFindings(a, facts, list, pageNo, right, heading, subject) {
  if (!list.length) return `<section class="page"><div class="pad">
    ${top(facts, right)}<div class="eyebrow">Evidence limits</div>
    <h2 class="t">No additional supported findings.</h2>
    <p class="lede">The test produced ${countOf(a.findings.all.length, "finding")}, presented on the preceding page. Additional issues have not been invented to fill this report.</p>
    <div class="card"><h3>What this does not establish</h3><p>A limited automated test is not a security, accessibility or complete functional certification. Enquiry delivery and business outcomes have not been measured.</p></div>
    ${footer(facts, pageNo)}</div></section>`;
  return `<section class="page">
  <div class="pad">
    ${top(facts, right)}
    <div class="eyebrow">What we found</div>
    <h2 class="t">${heading}</h2>

    <div style="margin-top:7mm">
${list
  .map(
    f => `
      <div class="find${f.tone === "med" ? " med" : ""}">
        <div class="hd"><span class="tag">${e(f.severity)}</span><h3>${f.id} — ${f.title}</h3></div>
        <div class="row">
          <div>
            <div class="k">What we measured</div>
            <p>${f.measured}</p>
          </div>
          <div>
            <div class="k">Why review this</div>
            <p>${f.why}</p>
          </div>
          <div>
            <div class="k">The fix</div>
            <p>${f.fix} <b>${e(capFirst(f.effort))}.</b></p>
          </div>
        </div>
      </div>`
  )
  .join("\n")}
    </div>

    ${pageNo === 6 && a.also?.length ? `<div class="card" style="margin-top:1mm;background:var(--sand)">
        <div class="eyebrow mut" style="margin-bottom:2mm">Also on the list — smaller, still real</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 8mm;font-size:7.8pt;color:var(--ink2);line-height:1.4">
${a.also.map(x => `          <div>· ${x}</div>`).join("\n")}
        </div>
      </div>` : ""}

    ${footer(facts, pageNo)}
  </div>
</section>`;
}

// ---------------------------------------------------------------- 7. BENCHMARK
function pageBenchmark(a, facts) {
  const b = a.benchmark;
  const rows = b?.rows || [];
  const m = facts.metric;
  const you = {
    name: facts.business.name,
    perf: m.perfMobile,
    lcp: m.lcp,
    tbt: m.tbt,
    ttfb: m.ttfb,
    bytes: m.bytes,
    requests: m.requests,
    you: true,
  };
  const analyse = rows.length > 0;
  const tableRows = analyse
    ? [you, ...rows]
        .map(
          (r, i) => `        <tr${i === 0 ? ' class="you"' : ""}>
          <td>${e(r.name)}</td>
          <td${i === 0 && Number(r.perf) < 50 ? ' class="bad"' : ""}>${r.perf}</td>
          <td${i === 0 && parseFloat(r.lcp) > 4 ? ' class="bad"' : ""}>${e(r.lcp)}</td>
          <td${i === 0 && parseFloat(String(r.tbt).replace(/,/g, "")) > 600 ? ' class="bad"' : ""}>${e(String(r.tbt))}</td>
          <td${i === 0 ? (parseFloat(String(r.ttfb).replace(/,/g, "")) > 1800 ? ' class="bad"' : "") : ' class="good"'}>${e(String(r.ttfb))}</td>
          <td>${e(r.bytes)}</td>
          <td>${e(String(r.requests))}</td>
        </tr>`
        )
        .join("\n")
    : "";

  // Every row of this table is the client's own number, so the competitor-table
  // "you" class (whose CSS appends " — you") is not used; an LCP over target keeps
  // the same coral emphasis inline.
  const lcpHl = Number(m.lcpMs) > 2500 ? ' style="background:var(--coral-soft);color:#8A2B14;font-weight:700"' : "";
  const targets = `<table class="tbl" style="margin-top:8mm">
      <thead><tr><th>Metric (mobile, simulated 4G)</th><th>Today</th><th>Target</th><th>Why that target</th></tr></thead>
      <tbody>
        <tr><td${lcpHl}>Largest Contentful Paint</td><td${lcpHl}>${m.lcp}</td><td${lcpHl}>under 2.5 s</td><td${lcpHl}>Google’s “good” threshold</td></tr>
        <tr><td>Total Blocking Time</td><td${Number(m.tbtMs) > 200 ? ' class="bad"' : ""}>${m.tbt}</td><td>under 200 ms</td><td>Google’s “good” threshold</td></tr>
        <tr><td>Server response</td><td${Number(m.ttfbMs) > 500 ? ' class="bad"' : ""}>${m.ttfb}</td><td>under 500 ms</td><td>our engineering target</td></tr>
        <tr><td>Page weight</td><td${Number(m.bytesKb) > 1600 ? ' class="bad"' : ""}>${m.bytes}</td><td>under 1.6 MB</td><td>our engineering target</td></tr>
        <tr><td>Requests</td><td${Number(m.requests) > 50 ? ' class="bad"' : ""}>${m.requests}</td><td>under 50</td><td>our engineering target</td></tr>
      </tbody>
    </table>`;

  return `<section class="page">
  <div class="pad">
    ${top(facts, "Benchmark")}
    <div class="eyebrow">How you compare</div>
    <h2 class="t">${analyse ? "The sites outranking you are <em>bigger — not faster.</em>" : "The targets are stated. <em>The gap is measurable.</em>"}</h2>
    <p class="lede" style="max-width:165mm">${analyse
      ? `We ran the identical test on ${rows.length} competitor${rows.length === 1 ? "" : "s"} in your category. Every number below came from the same tool, on the same day, with the same throttling.`
      : "No competitor benchmark was measured for this audit, so nothing is claimed about them. What follows are your measured numbers against Google’s published “good” thresholds for LCP and blocking time, and against our own engineering targets for the other three rows."}</p>

    ${analyse ? `<table class="tbl" style="margin-top:8mm">
      <thead>
        <tr>
          <th>Site tested (mobile, simulated 4G)</th>
          <th>Performance</th>
          <th>LCP</th>
          <th>Blocking time</th>
          <th>Server response</th>
          <th>Page weight</th>
          <th>Requests</th>
        </tr>
      </thead>
      <tbody>
${tableRows}
      </tbody>
    </table>` : targets}

    <div class="band" style="margin-top:6mm">
      <h3>${analyse ? "The opening is bigger than the gap" : "Where the gain is"}</h3>
      <p>${analyse
        ? `The table compares only the sites tested in this run. Use the measured gaps to prioritise investigation; improvements require a new test before making comparative claims.`
        : `${gainLine(m)} Investigate hosting, caching, images and scripts before selecting fixes. Implementation cost and results have not been measured.`}</p>
    </div>

    ${analyse ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm">
      <div class="card">
        <div class="eyebrow mut" style="margin-bottom:1.6mm">Where you are already ahead</div>
        <p style="font-size:8.4pt">Lighthouse SEO scores ${m.seo}/100 with ${fmtInt(m.words)} words of content${m.sections > 0 ? ` across ${m.sections} sections` : ""}.</p>
      </div>
      <div class="card">
        <div class="eyebrow mut" style="margin-bottom:1.6mm">Where the gap is widest</div>
        <p style="font-size:8.4pt"><b>Server response: ${m.ttfb}.</b> That is hosting, caching and server-side code — not design.</p>
      </div>
    </div>` : ""}

    <div class="small" style="margin-top:5mm;color:var(--mut)">${analyse
      ? `Same Lighthouse ${a.lighthouseVersion || "12.x"} run, same day, same throttling profile. Public pages only. Full JSON for every test available on request.`
      : `Source: Google’s LCP and TBT thresholds, measured with Lighthouse ${a.lighthouseVersion || "12.x"}; the other targets are ${e(facts.agency.name || "Smart Pursuit")}’s. Public page only, no access to analytics. Full JSON available on request.`}</div>

    ${footer(facts, 7)}
  </div>
</section>`;
}

// ---------------------------------------------------------------- 8. PLAN
function pagePlan(a, facts) {
  const plan = a.plan || defaultPlan(facts, a.findings);
  return `<section class="page">
  <div class="pad">
    ${top(facts, "The plan")}
    <div class="eyebrow">What we would do</div>
    <h2 class="t">${plan.length} changes, in the order we would tackle them.</h2>
    <p class="lede" style="max-width:165mm">Targets below are engineering targets from the same test that produced this report — not promises about revenue. The identical audit is re-run after the work and the before/after numbers are published alongside the finished site.</p>

    <table class="plan" style="margin-top:7mm">
      <thead>
        <tr><th>#</th><th>Change</th><th>Today</th><th>Target</th><th>Effort</th></tr>
      </thead>
      <tbody>
${plan
  .map(
    p => `        <tr><td class="i">${p.id}</td><td class="w">${p.change}</td><td>${p.today}</td><td>${p.target}</td><td class="t">${p.effort}</td></tr>`
  )
  .join("\n")}
      </tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm">
      <div class="band">
        <h3>Weeks 1–2: the rescue</h3>
        <p>${a.phases?.rescue || `The first half of the list. Same design, same content, same brand. Prioritise the measured issues, test the enquiry controls, and re-measure after changes. Timing and results depend on the agreed scope.`}</p>
      </div>
      <div class="card">
        <h3>Weeks 3–4: the rebuild</h3>
        <p>${a.phases?.rebuild || "The second half. A mobile-first homepage built around one action, service pages with clear content, location pages for local search, and analytics that show which page produced which phone call."}</p>
      </div>
    </div>

    <div class="quote" style="margin-top:auto;padding-bottom:16mm">
      <span class="q">“</span>${a.phases?.quote || "You do not need a prettier website. You need the one you already have to answer the phone."}<span class="q">”</span>
    </div>

    ${footer(facts, 8)}
  </div>
</section>`;
}

function defaultPlan(facts, findings) {
  const m = facts.metric;
  const v = audienceOf(facts.business);
  const serverOk = Number.isFinite(m.ttfbMs) && m.ttfbMs <= 500;
  const blockingOk = Number.isFinite(m.tbtMs) && m.tbtMs <= 200;
  const imagesOk = Number(m.oversizedImgsKb) < 100;
  const cookies = `${m.thirdPartyCookies} third-party cookie${m.thirdPartyCookies === 1 ? "" : "s"}`;
  return [
    // A form that exists is tested, not "rebuilt": its delivery was never measured.
    { id: "01", change: facts.http.contactShortcode ? "Contact form rebuilt" : m.visibleForms === 0 ? "Contact form" : "Contact form tested", today: facts.http.contactShortcode ? "Prints raw shortcode; collects nothing" : m.visibleForms === 0 ? "No fields detected; check other routes" : "Form fields detected; delivery untested", target: m.visibleForms > 0 && !facts.http.contactShortcode ? "Test enquiry delivered + thank-you page, tracked" : "Working form + thank-you page, tracked", effort: "<b>1 hour</b>" },
    { id: "02", change: v.health ? "Booking path" : "Enquiry path", today: m.visibleForms === 0 ? "No form on the homepage" : "Form fields detected", target: stickyRoutes(m) ? `${v.health ? "Book" : "Enquiry"} block above fold, linked from the existing ${stickyRoutes(m)}` : v.health ? "Book block above fold + sticky call bar" : "Enquiry block above fold + sticky call bar", effort: "<b>½ day</b>" },
    // Rows whose target the site already meets say so instead of selling work.
    serverOk
      ? { id: "03", change: "Server &amp; caching", today: `${m.ttfb} response`, target: "Already under 500 ms", effort: "—" }
      : { id: "03", change: "Server &amp; caching", today: `${m.ttfb} response`, target: "<b>Under 500 ms</b>", effort: "1 day" },
    imagesOk
      ? { id: "04", change: "Images", today: `${fmtInt(m.oversizedImgsKb)} KiB potential image savings`, target: "Little to gain here", effort: "—" }
      : { id: "04", change: "Images", today: `${fmtInt(m.oversizedImgsKb)} KiB potential image savings`, target: "<b>LCP under 2.5 s</b>", effort: "1 day" },
    blockingOk
      ? { id: "05", change: "Scripts &amp; tracking", today: `${m.tbt} blocking, ${cookies}`, target: "Already under 200 ms", effort: "—" }
      : { id: "05", change: "Scripts &amp; tracking", today: `${m.tbt} blocking, ${cookies}`, target: "<b>Under 200 ms</b>, only scripts in use", effort: "½ day" },
    headlineRow(m),
    { id: "07", change: "Local SEO &amp; schema", today: `${countOf((facts.http.schemaTypes || []).length, "schema type")} detected`, target: "LocalBusiness + locations, hours, area", effort: "1 day" },
    { id: "08", change: "Measurement", today: "Conversion events not tested", target: "Form + call + WhatsApp events", effort: "½ day" },
  ];
}

/**
 * Plan row 06, sold only where the measurement shows a gap: one H1, and a
 * homepage of 6 screens or fewer (the rubric's own threshold). The old fixed
 * target "1 H1, 5 sections" told a 2-section page to add sections.
 */
function headlineRow(m) {
  const h1 = `${m.h1Count} ${Number(m.h1Hidden) > 0 ? "visible " : ""}H1${m.h1Count === 1 ? "" : "s"}`;
  const screens = Number(m.screens);
  const today = Number.isFinite(screens) && screens > 0 ? `${h1}, ≈${countOf(Math.round(screens), "screen")}` : h1;
  const h1Ok = m.h1Count === 1;
  const lengthOk = !(screens > 6);
  const row = (target, effort) => ({ id: "06", change: "Headline &amp; structure", today, target, effort });
  if (h1Ok && lengthOk) return row("Already 1 H1, 6 screens or fewer", "—");
  if (h1Ok) return row("<b>6 screens or fewer</b>, services visible", "2 days");
  if (lengthOk) return row("<b>1 H1</b> naming the service and city", "1 hour");
  return row("<b>1 H1, 6 screens or fewer</b>, services visible", "2 days");
}

/** The Rescue speed line: only the parts whose plan target is not yet met (same thresholds as page 08). */
function speedWork(m) {
  const parts = [
    !(Number.isFinite(m.ttfbMs) && m.ttfbMs <= 500) ? "server" : null,
    !(Number(m.oversizedImgsKb) < 100) ? "images" : null,
    Number(m.bytesKb) > 1600 ? "page weight" : null,
    !(Number.isFinite(m.tbtMs) && m.tbtMs <= 200) ? "scripts" : null,
  ].filter(Boolean);
  return parts.length ? `Speed work: ${parts.join(", ")}` : "Speed re-test after changes";
}

/** The benchmark gap, naming only the metrics that actually miss their target. */
function gainLine(m) {
  const lcpOver = Number(m.lcpMs) > 2500;
  const tbtOver = Number(m.tbtMs) > 200;
  if (lcpOver && tbtOver) return `LCP is ${m.lcp} against a 2.5 s target, and blocking time is ${m.tbt} against 200 ms.`;
  if (lcpOver) return `LCP is ${m.lcp} against a 2.5 s target; blocking time (${m.tbt}) is already within 200 ms.`;
  if (tbtOver) return `Blocking time is ${m.tbt} against 200 ms; LCP (${m.lcp}) is already within 2.5 s.`;
  return `LCP (${m.lcp}) and blocking time (${m.tbt}) are within Google’s thresholds in this run.`;
}

/** "absent" / "present" / "present but incomplete" — only what the markup showed. */
function schemaState(h) {
  const types = h.schemaTypes || [];
  if (!h.schema && !types.length) return "absent";
  if (types.length && (!h.schemaHasPhone || !h.schemaHasAddress)) return "present but incomplete";
  return "present";
}

/** "half a day" -> "Half a day": an effort estimate printed as its own sentence. */
function capFirst(str) {
  const t = String(str || "");
  return t ? `${t[0].toUpperCase()}${t.slice(1)}` : t;
}

// ---------------------------------------------------------------- 9. DIRECTION
function pageDirection(a, facts) {
  const demo = a.demo;
  const m = facts.metric;
  const v = audienceOf(facts.business);
  return `<section class="page">
  <div class="pad">
    ${top(facts, a.demo ? "Direction &amp; investment" : "Direction")}
    <div class="eyebrow">Where this goes</div>
    <h2 class="t">One screen, one decision: <em>call or ${v.health ? "book" : "enquire"}.</em></h2>

    <div style="display:flex;gap:8mm;margin-top:6mm;align-items:flex-start">
      ${demo ? `<div style="flex:0 0 45mm">
        <div style="background:#EFF4F2;border:.3mm solid var(--line);border-radius:4mm;padding:5mm;display:flex;justify-content:center">
          <div style="width:43mm;height:90mm;border:.6mm solid #0D2321;border-radius:4.4mm;overflow:hidden;background:#fff">
            <img src="${e(demo.image)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top center;display:block">
          </div>
        </div>
        <div class="small" style="margin-top:2.6mm;font-size:6.8pt"><b style="color:var(--ink)">Built, not sketched.</b> ${demo.caption}</div>
      </div>` : ""}
      <div style="flex:1">
        <div class="eyebrow mut">What changes on the first screen</div>
        <div class="numlist" style="margin-top:2mm">
          <div class="it"><div class="n">1</div><div class="b"><b>One sentence that says what you do and where.</b><p>${m.h1Count > 1 ? `Replacing the ${m.h1Count} competing H1 headings with one headline` : m.h1Count === 0 ? (Number(m.h1Hidden) > 0 ? "No H1 is visible on the phone view; one headline" : "No H1 headline was found; one headline") : "One headline"} a visitor can repeat to someone else.</p></div></div>
          <div class="it"><div class="n">2</div><div class="b"><b>Two buttons, both real.</b><p>“${v.cta}” opens the form; “Call” dials the number. ${m.deadLinks > 0 ? `No placeholder links (${m.deadLinks} on this page point to # or javascript:void(0)).` : "Every link checked before launch."}</p></div></div>
          <div class="it"><div class="n">3</div><div class="b"><b>Proof, not adjectives.</b><p>Locations, credentials, services, published hours — the facts that make a stranger trust you.</p></div></div>
          <div class="it"><div class="n">4</div><div class="b"><b>Everything above 800 px.</b><p>No scrolling required to find the phone number, the location or the button.</p></div></div>
        </div>
      </div>
    </div>

    <div class="hr"></div>

    <div class="eyebrow mut">Three ways to work together</div>
    <div class="plans" style="margin-top:2.6mm">
      <div class="plan-c">
        <div class="nm">Rescue</div>
        <div class="pr" style="font-family:'Inter';font-size:11pt;font-weight:700;line-height:1.25;letter-spacing:-.02em">Keep the design.<br>Make it work.</div>
        <div class="ds">Items 01–05 of the plan</div>
        <ul>
          <li>${facts.http.contactShortcode ? "Contact form rebuilt" : m.visibleForms === 0 ? `Homepage ${v.health ? "booking" : "enquiry"} form added` : "Contact form tested"} &amp; tracked</li>
          <li>${stickyRoutes(m) ? `${v.health ? "Booking" : "Enquiry"} block, linked from the existing ${stickyRoutes(m)}` : `${v.health ? "Booking" : "Enquiry"} buttons + sticky call bar`}</li>
          <li>${speedWork(m)}</li>
          <li>Schema &amp; local SEO fields</li>
        </ul>
      </div>
      <div class="plan-c hi">
        <div class="nm">Rebuild · recommended</div>
        <div class="pr" style="font-family:'Inter';font-size:11pt;font-weight:700;line-height:1.25;letter-spacing:-.02em">The site the business<br>should already have.</div>
        <div class="ds">Everything, plus the structure</div>
        <ul>
          <li>Everything in Rescue</li>
          <li>New mobile-first homepage</li>
          <li>Service pages, rewritten structure</li>
          <li>Location pages for local search</li>
          <li>Analytics for form, call &amp; WhatsApp</li>
        </ul>
      </div>
      <div class="plan-c">
        <div class="nm">Care plan</div>
        <div class="pr" style="font-family:'Inter';font-size:11pt;font-weight:700;line-height:1.25;letter-spacing:-.02em">Keep it fast<br>after launch.</div>
        <div class="ds">Optional, cancel anytime</div>
        <ul>
          <li>Hosting, backups &amp; uptime checks</li>
          <li>Monthly speed report</li>
          <li>Content and hours updates</li>
          <li>Priority fixes, same day</li>
        </ul>
      </div>
    </div>

    <div class="small" style="margin-top:4mm"><b style="color:var(--ink2)">Pricing is fixed and agreed on the call, not guessed at here</b> — it depends which of the eight items you want. Scope in writing before anything starts, 50% to begin and 50% on launch, no hourly surprises. You own the site, the domain and the code, whether or not you stay with us.</div>

    ${footer(facts, 9)}
  </div>
</section>`;
}

// ---------------------------------------------------------------- 10. NEXT STEPS
function pageNextSteps(a, facts) {
  const m = facts.metric;
  const marks = (facts.agency.name || "Smart Pursuit").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return `<section class="page">
  <div class="pad">
    ${top(facts, "Next steps")}
    <div class="eyebrow">What happens next</div>
    <h2 class="t">Fifteen minutes is enough to <em>decide.</em></h2>
    <p class="lede" style="max-width:160mm">You have the numbers. What you probably do not have is time — which is exactly why this is worth an hour of it. Here is the whole process.</p>

    <div class="steps">
      <div class="step">
        <div class="n">1</div>
        <h4>We talk for 15 minutes</h4>
        <p>You tell us what you want the site to do — more enquiries, fewer phone calls asking for directions, both. We confirm what is worth fixing first.</p>
      </div>
      <div class="step">
        <div class="n">2</div>
        <h4>You get a fixed scope</h4>
        <p>Page by page, date by date, one price. No retainer unless you want the care plan, no lock-in, and you approve the design before anything goes live.</p>
      </div>
      <div class="step">
        <div class="n">3</div>
        <h4>Implement and re-test</h4>
        <p>Agree a scope and schedule, implement the changes, then repeat the measurements. Performance and enquiry improvements are not guaranteed.</p>
      </div>
    </div>

    <div class="cta">
      <div class="l">
        <div class="k">Reply to this audit — or call</div>
        <div class="h">Let’s review the measured findings.<br>Scope and timing agreed before work.</div>
      </div>
      <div class="r">
        <div class="ph">${e(facts.agency.phone || "")}</div>
        <div class="em">${e(facts.agency.email || "")}</div>
        <div style="color:rgba(255,255,255,.45);letter-spacing:.12em;font-size:6pt;margin-top:1.2mm">${e((facts.agency.name || "Smart Pursuit").toUpperCase())} · ${e((facts.agency.basedIn || "").toUpperCase())}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:7mm">
      <div>
        <div class="eyebrow mut">Kept honest</div>
        <p style="font-size:8.2pt;color:var(--ink2);line-height:1.5">
          Measurements are from <b>${e(facts.date.long)}</b>. Scores use the agency rubric. Targets are labelled goals; effort is an estimate, not a measurement. Enquiry or revenue effects have not been measured. No outcome is guaranteed.
        </p>
        <p style="font-size:8.2pt;color:var(--ink2);line-height:1.5;margin-top:2.4mm">
          ${a.demo ? "A working rebuild of the homepage is already running — ask for the link and open it on your own phone. " : ""}If you would rather hand this to your own developer, keep it: the audit is yours. ${e(facts.outreach?.optOutLine || "If you would rather not hear from us again, reply “no thanks” and we will not follow up.")}
        </p>
      </div>
      <div>
        <div class="eyebrow mut">Method</div>
        <div class="method" style="margin-top:0;padding-top:0;border-top:none">
          <p>
            <b>Test:</b> Google Lighthouse ${e(a.lighthouseVersion || "12.x")}, Chrome headless, mobile profile (Moto G Power, 412 × 823), simulated Slow 4G at 1.6 Mbps / 150 ms RTT, 4× CPU slowdown. Desktop pass at 1440 × 900.<br>
            <b>Page:</b> ${e(facts.business.url)} homepage, fetched ${e(facts.date.long)}${facts.date.measuredIst ? `, ${e(facts.date.measuredIst.split(", ").pop())}` : ""}.<br>
            <b>Inspection:</b> headless Chrome at a 390 px viewport for layout, form and link behaviour; raw HTML for markup and schema.<br>
            <b>Comparison:</b> ${a.benchmark?.rows?.length ? e(a.benchmark.rows.map(r => r.name).join(" and ")) + ", same tool, same day." : "none — see the targets table on page 07."}
          </p>
        </div>
      </div>
    </div>

    <div style="margin-top:auto;padding-bottom:16mm">
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:.35mm solid var(--line);padding-top:3.4mm">
        <div style="display:flex;align-items:center;gap:2.6mm">
          <div class="mark">${e(marks)}</div>
          <div>
            <div style="font-size:7.4pt;font-weight:800;letter-spacing:.14em">${e((facts.agency.name || "Smart Pursuit").toUpperCase())}</div>
            <div class="tagline" style="font-size:5.8pt">${e(facts.agency.tagline || "")}</div>
          </div>
        </div>
        <div style="text-align:right;font-size:6.6pt;color:var(--mut);line-height:1.6">
          Audit ref. ${e(facts.ref)}<br>
          Prepared for ${e(facts.business.legalName)} · private &amp; confidential
        </div>
      </div>
    </div>

    ${footer(facts, 10)}
  </div>
</section>`;
}

// ---------------------------------------------------------------- ASSEMBLE
export function renderReport(audit) {
  const facts = audit.facts;
  if (!facts) throw new Error("renderReport: audit.facts is required (build it from the raw measurement)");
  const findings = audit.findings;
  if (!findings || !findings.page1?.length) throw new Error("renderReport: audit.findings.page1 is required");

  const subject = audit.subjectNoun || "customers";
  const pages = [
    pageCover(audit, facts),
    pageSummary(audit, facts),
    pageScorecard(audit, facts),
    pagePatientView(audit, facts),
    pageFindings(audit, facts, findings.page1, 5, "Findings 01–03", audit.headings?.page5 || `${findings.all.length} measured finding${findings.all.length === 1 ? "" : "s"}. <em>Review the supporting evidence.</em>`, subject),
    pageFindings(audit, facts, findings.page2, 6, "Findings 04–06", audit.headings?.page6 || `Further findings — <em>where supported by the test.</em>`, subject),
    pageBenchmark(audit, facts),
    pagePlan(audit, facts),
    pageDirection(audit, facts),
    pageNextSteps(audit, facts),
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${e(facts.agency.name)} — Website & ${audienceOf(facts.business).health ? "Patient" : "Customer"}-Conversion Audit — ${e(facts.business.name)}</title>
<style>${FONTS}</style>
<style>${STYLES}</style>
</head>
<body>

${pages.join("\n\n")}

</body>
</html>
`;
}
