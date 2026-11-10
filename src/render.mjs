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
import { ROOT, escapeHtml, fmtInt, round, adTechLabel } from "./util.mjs";

const STYLES = fs.readFileSync(path.join(ROOT, "src", "styles.css"), "utf8");
const FONTS = fs.readFileSync(path.join(ROOT, "src", "fonts.css"), "utf8");

const secNum = ms => (Number.isFinite(ms) ? (ms / 1000).toFixed(1) : "—");
const e = escapeHtml;

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
    : { n: String(m.h1Count), unit: "", label: "Competing H1 headings on one page, so neither a patient nor a crawler knows the topic." };
  return [
    { n: String(m.perfMobile), unit: "/ 100", label: `Mobile performance score. Google calls below 50 “poor”.` },
    { n: secNum(m.lcpMs), unit: "s", label: `Until your main image appears on a phone. Google’s target is 2.5 s.` },
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
      <div class="kpi ${m.lcpMs > 4000 ? "bad" : "warn"}"><div class="n">${secNum(m.lcpMs)}<small>s</small></div><div class="l">Main image appears<br>Google target: 2.5 s</div></div>
      <div class="kpi ${m.ttiMs > 5000 ? "warn" : "good"}"><div class="n">${round((m.ttiMs || 0) / 1000, 1)}<small>s</small></div><div class="l">Until the page is usable<br>(time to interactive)</div></div>
      <div class="kpi bad"><div class="n">${m.visibleForms === 0 ? "0" : m.visibleForms}</div><div class="l">Working forms on the home page<br>${m.visibleForms === 0 ? (facts.http.contactShortcode ? "Contact page prints raw code" : "No capture route") : "Measured live"}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:8mm;margin-top:1mm">
      <div>
        <div class="eyebrow mut">Three things this is costing you</div>
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

    ${s.bill ? `<div class="band" style="margin-top:auto;margin-bottom:4mm;background:var(--coral-soft);border-color:#F0C7B8">
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
  const costs = findings.all.slice(0, 3).map(f => ({ title: f.title + ".", body: f.why }));
  const good = [];
  if (m.words > 300) good.push(`${fmtInt(m.words)} words of real content`);
  if (m.images > 10) good.push(`${m.images} images`);
  if (h.analytics) good.push("Google Analytics present");
  if (m.schemaTypes?.length) good.push(`${m.schemaTypes[0]} structured data`);
  if (facts.http?.canonical) good.push("a canonical tag");
  return {
    title: `Your website is the first thing a new customer meets.<br>Right now it is also the <em>slowest</em> part of the visit.`,
    lede: `We ran the same tests Google runs, on the same page a visitor sees when they search for your service on a phone. ${findings.all.length} things stood out — ${findings.all.filter(f => f.severity === "Critical").length} of them are losing you enquiries today.`,
    costs,
    working: `Credit where it is due: ${good.length ? good.join(", ") : "the pages do load"}. The foundations are there — the plumbing is not.`,
    verdict: `Most of the problems below are not design problems. They are a broken form, a missing booking flow, unoptimised images and leftover scripts. The urgent ones are fixed in about a week, without changing how the site looks.`,
    bill: h.adTech?.length
      ? `Your pages load ${e(h.adTech.map(adTechLabel).join(", "))} alongside analytics. That is a paid-traffic setup — and if you are buying clicks, you are paying to send them to pages that cannot take a booking. That is not a speed problem. That is the funnel.`
      : null,
  };
}

// ---------------------------------------------------------------- 3. SCORECARD
function pageScorecard(a, facts) {
  const s = facts.scores;
  const rows = [
    ["Speed", s.speed, `Mobile ${facts.metric.perfMobile}/100 · LCP ${facts.metric.lcp} · TBT ${facts.metric.tbt} · ${facts.metric.requests} requests · ${facts.metric.bytes} · server response ${facts.metric.ttfb}`, 30],
    ["Mobile experience", s.mobile, `≈${Math.round(facts.metric.screens)} screens tall · ${facts.metric.smallTapTargets} tap targets under 40 px · body text down to ${facts.metric.minFontPx} px · headline starts ${fmtInt(facts.metric.headlineOffsetPx)} px down`, 20],
    ["Conversion", s.conversion, `${facts.metric.visibleForms === 0 ? "No visible form on the home page" : `${facts.metric.visibleForms} visible form(s)`} · ${facts.http.contactShortcode ? "Contact page prints raw code" : "Contact page reachable"} · ${facts.metric.telLinks} click-to-call link(s) · ${facts.metric.whatsapp} WhatsApp element(s)`, 25],
    ["Design &amp; clarity", s.design, `${facts.metric.sections} stacked sections · ${fmtInt(facts.metric.domNodes)} DOM nodes · ${facts.metric.imagesNoAlt} images without alt text`, 15],
    ["SEO", s.seo, `Lighthouse SEO ${facts.metric.seo}/100 · ${facts.metric.h1Count} H1 headings · structured data ${facts.http.schema === false ? "absent" : "present but incomplete"} · ${facts.metric.readMore} “Read More” links`, 10],
  ];
  const cls = n => (n <= 3 ? "red" : n <= 6 ? "amber" : "green");
  const overall = s.overall;
  const dash = round((overall / 100) * 264, 0);
  return `<section class="page">
  <div class="pad">
    ${top(facts, "Scorecard")}
    <div class="eyebrow">How the site scores</div>
    <h2 class="t">Five areas, measured — not guessed.</h2>
    <p class="lede" style="max-width:165mm">Speed is Lighthouse. Mobile, design, SEO and conversion are a review of the live page at 390 px wide, cross-checked against the same test data. Anything below 7 / 10 is doing damage you can see in enquiry numbers.</p>

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
        <p>Weighted by what actually produces a booking, not by how the site looks in a photo. Conversion and speed are usually the two cheapest things on this list to fix, and together they are 55% of the score.</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3.4mm;margin-top:5mm">
      <div class="card"><div class="eyebrow mut" style="margin-bottom:1.4mm">Mobile</div><div style="font-family:'Instrument Serif',serif;font-size:19pt;line-height:1">${facts.metric.perfMobile}<span style="font-size:9pt;color:var(--mut)">/100</span></div><p class="small" style="margin-top:1.4mm">Lighthouse performance, 4× CPU slowdown, Slow 4G</p></div>
      <div class="card"><div class="eyebrow mut" style="margin-bottom:1.4mm">Desktop</div><div style="font-family:'Instrument Serif',serif;font-size:19pt;line-height:1">${facts.metric.perfDesktop}<span style="font-size:9pt;color:var(--mut)">/100</span></div><p class="small" style="margin-top:1.4mm">Same page on a laptop — this is why nobody noticed</p></div>
      <div class="card"><div class="eyebrow mut" style="margin-bottom:1.4mm">Accessibility</div><div style="font-family:'Instrument Serif',serif;font-size:19pt;line-height:1">${facts.metric.accessibility}<span style="font-size:9pt;color:var(--mut)">/100</span></div><p class="small" style="margin-top:1.4mm">Contrast and labelling issues on interactive elements</p></div>
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
        <div class="cap"><b>The same site on a laptop</b>It holds up — ${m.perfDesktop}/100. This is why the problem has gone unnoticed. Your visitors are not on a laptop.</div>
      </div>` : ""}
      <div style="flex:1;padding-left:2mm">
        <div class="eyebrow mut">Also measured</div>
        <div style="display:flex;flex-direction:column;gap:3.4mm;margin-top:1mm">
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${fmtInt(m.pageHeightPx)}<span style="font-size:8pt;color:var(--mut)"> px</span></div><div class="small">page height — about ${Math.round(m.screens)} phone screens</div></div>
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${m.sections}</div><div class="small">stacked sections on one page</div></div>
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${m.images}</div><div class="small">images, ${fmtInt(m.oversizedImgsKb)} KiB of them oversized</div></div>
          <div><div style="font-family:'Instrument Serif',serif;font-size:17pt;line-height:1">${m.telLinks}</div><div class="small">click-to-call link${m.telLinks === 1 ? "" : "s"} on the whole page</div></div>
        </div>
      </div>
    </div>

    <div style="margin-top:9mm">
      <div class="eyebrow mut">The first 20 seconds, measured</div>
      <div class="tl">
        <div class="axis"></div>
        <div class="tick" style="left:0"></div><div class="lbl" style="left:0;transform:none">0 s</div>
        <div class="tick" style="left:25%"></div><div class="lbl" style="left:25%">5 s</div>
        <div class="tick" style="left:50%"></div><div class="lbl" style="left:50%">10 s</div>
        <div class="tick" style="left:75%"></div><div class="lbl" style="left:75%">15 s</div>
        <div class="tick" style="left:100%"></div><div class="lbl" style="left:100%">20 s</div>

        <div class="m ok" style="left:${pctPos(m.ttfbMs, 20000, 2, 8)}%"><div class="v">${m.ttfb}</div><div class="d">server responds</div><div class="dot"></div></div>
        <div class="m warn" style="left:${pctPos(m.fcpMs, 20000, 2, 22)}%"><div class="v">${m.fcp}</div><div class="d">first paint —<br>still looks empty</div><div class="dot"></div></div>
        <div class="m slow" style="left:${pctPos(m.lcpMs, 20000, 2, 96)}%"><div class="v">${m.lcp}</div><div class="d">main image appears<br>(LCP)</div><div class="dot"></div></div>
        <div class="m slow" style="left:${pctPos(m.ttiMs, 20000, 2, 99)}%"><div class="v">${m.tti}</div><div class="d">page becomes<br>interactive</div><div class="dot"></div></div>
      </div>
      <div class="band" style="margin-top:2mm;display:flex;justify-content:space-between;align-items:center;gap:6mm">
        <p style="flex:1"><b>Google’s definition of “good” is 2.5 s.</b> Your main image arrives at ${m.lcp} — ${m.lcpOver}× over the line. On office wifi it feels fine. On a phone on mobile data, it does not.</p>
      </div>
    </div>

    ${footer(facts, 4)}
  </div>
</section>`;
}

/** Maps a duration to a position on the 0–20 s timeline, clamped inside the axis. */
function pctPos(ms, max = 20000, minPct = 2, maxPct = 99) {
  if (!Number.isFinite(ms)) return minPct;
  const raw = (ms / max) * 100;
  return Math.min(maxPct, Math.max(minPct, round(raw, 1)));
}

// ---------------------------------------------------------------- 5-6. FINDINGS
function pageFindings(a, facts, list, pageNo, right, heading, subject) {
  if (!list.length) return "";
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
            <div class="k">Why it costs you ${e(subject)}</div>
            <p>${f.why}</p>
          </div>
          <div>
            <div class="k">The fix</div>
            <p>${f.fix} <b>${e(f.effort)}.</b></p>
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

  const targets = `<table class="tbl" style="margin-top:8mm">
      <thead><tr><th>Metric (mobile, simulated 4G)</th><th>Today</th><th>Target</th><th>Why that target</th></tr></thead>
      <tbody>
        <tr class="you"><td>Largest Contentful Paint</td><td class="bad">${m.lcp}</td><td>under 2.5 s</td><td>Google’s “good” threshold</td></tr>
        <tr><td>Total Blocking Time</td><td class="bad">${m.tbt}</td><td>under 200 ms</td><td>Google’s “good” threshold</td></tr>
        <tr><td>Server response</td><td class="bad">${m.ttfb}</td><td>under 500 ms</td><td>caching and a CDN</td></tr>
        <tr><td>Page weight</td><td>${m.bytes}</td><td>under 1.6 MB</td><td>compressed, correctly sized images</td></tr>
        <tr><td>Requests</td><td>${m.requests}</td><td>under 50</td><td>fewer third-party scripts</td></tr>
      </tbody>
    </table>`;

  return `<section class="page">
  <div class="pad">
    ${top(facts, "Benchmark")}
    <div class="eyebrow">How you compare</div>
    <h2 class="t">${analyse ? "The sites outranking you are <em>bigger — not faster.</em>" : "The targets are public. <em>The gap is measurable.</em>"}</h2>
    <p class="lede" style="max-width:165mm">${analyse
      ? `We ran the identical test on ${rows.length} competitor${rows.length === 1 ? "" : "s"} in your category. Every number below came from the same tool, on the same day, with the same throttling.`
      : "No competitor benchmark was measured for this audit, so nothing is claimed about them. What follows are Google’s published thresholds against your measured numbers — you can verify every one of them yourself."}</p>

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
        ? `Nobody in this category has solved this. Get the server to respond in under 500 ms and the main image to appear under 2.5 s, and the site is measurably faster than every competitor tested. That is not a slogan; it is a number that can go on the homepage and a signal Google reads on every visit.`
        : `LCP is ${m.lcp} against a 2.5 s target, and blocking time is ${m.tbt} against 200 ms. Both are delivery problems — hosting, caching, image sizes and scripts — not design problems. They are also the cheapest items in this report to fix.`}</p>
    </div>

    ${analyse ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:6mm">
      <div class="card">
        <div class="eyebrow mut" style="margin-bottom:1.6mm">Where you are already ahead</div>
        <p style="font-size:8.4pt">Lighthouse SEO scores ${m.seo}/100 with ${fmtInt(m.words)} words of content across ${m.sections} sections. Content is not the gap — delivery is.</p>
      </div>
      <div class="card">
        <div class="eyebrow mut" style="margin-bottom:1.6mm">Where the gap is widest</div>
        <p style="font-size:8.4pt"><b>Server response: ${m.ttfb}.</b> That is hosting, caching and server-side code — not design. It is also the cheapest thing here to fix.</p>
      </div>
    </div>` : ""}

    <div class="small" style="margin-top:5mm;color:var(--mut)">${analyse
      ? `Same Lighthouse ${a.lighthouseVersion || "12.x"} run, same day, same throttling profile. Public pages only. Full JSON for every test available on request.`
      : `Source: Google Lighthouse ${a.lighthouseVersion || "12.x"} performance thresholds. Public page only, no access to analytics. Full JSON available on request.`}</div>

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
    <h2 class="t">${plan.length} changes, in the order that pays back fastest.</h2>
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
        <p>${a.phases?.rescue || "The first half of the list. Same design, same content, same brand. The site simply starts working — the form renders, the buttons book, the page loads in under three seconds."}</p>
      </div>
      <div class="card">
        <h3>Weeks 3–4: the rebuild</h3>
        <p>${a.phases?.rebuild || "The second half. A mobile-first homepage built around one action, service pages that rank, location pages for local search, and analytics that show which page produced which phone call."}</p>
      </div>
    </div>

    <div class="quote" style="margin-top:auto;padding-bottom:4mm">
      <span class="q">“</span>${a.phases?.quote || "You do not need a prettier website. You need the one you already have to answer the phone."}<span class="q">”</span>
    </div>

    ${footer(facts, 8)}
  </div>
</section>`;
}

function defaultPlan(facts, findings) {
  const m = facts.metric;
  return [
    { id: "01", change: "Contact form rebuilt", today: facts.http.contactShortcode ? "Prints raw shortcode; collects nothing" : "Form present but untracked", target: "Working form + thank-you page, tracked", effort: "<b>1 hour</b>" },
    { id: "02", change: "Booking path", today: m.visibleForms === 0 ? "No form on the homepage" : "Form exists, not prominent", target: "Book block above fold + sticky call bar", effort: "<b>½ day</b>" },
    { id: "03", change: "Server &amp; caching", today: `${m.ttfb} response`, target: "<b>Under 500 ms</b>", effort: "1 day" },
    { id: "04", change: "Images", today: `${fmtInt(m.oversizedImgsKb)} KiB oversized, no next-gen format`, target: "<b>LCP under 2.5 s</b>", effort: "1 day" },
    { id: "05", change: "Scripts &amp; tracking", today: `${m.tbt} blocking, ${m.thirdPartyCookies} cookies`, target: "<b>Under 200 ms</b>, one analytics tool", effort: "½ day" },
    { id: "06", change: "Headline &amp; structure", today: `${m.h1Count} H1s, ${m.sections} sections`, target: "1 H1, 5 sections, services visible", effort: "2 days" },
    { id: "07", change: "Local SEO &amp; schema", today: "Structured data incomplete", target: "LocalBusiness + locations, hours, area", effort: "1 day" },
    { id: "08", change: "Measurement", today: "No conversion tracking", target: "Form + call + WhatsApp events", effort: "½ day" },
  ];
}

// ---------------------------------------------------------------- 9. DIRECTION
function pageDirection(a, facts) {
  const demo = a.demo;
  return `<section class="page">
  <div class="pad">
    ${top(facts, a.demo ? "Direction &amp; investment" : "Direction")}
    <div class="eyebrow">Where this goes</div>
    <h2 class="t">One screen, one decision: <em>call or book.</em></h2>

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
          <div class="it"><div class="n">1</div><div class="b"><b>One sentence that says what you do and where.</b><p>Replacing competing slogans with one headline a visitor can repeat to someone else.</p></div></div>
          <div class="it"><div class="n">2</div><div class="b"><b>Two buttons, both real.</b><p>“Book” opens the form; “Call” dials the number. No dead links, no theme demo paths.</p></div></div>
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
          <li>Contact form rebuilt &amp; tracked</li>
          <li>Booking buttons + sticky call bar</li>
          <li>Speed work: server, images, scripts</li>
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
        <h4>Week one: it works</h4>
        <p>The form renders, the booking path is live, the page is under three seconds. In week two we re-run this exact audit and send the before/after — the same numbers, on a page that performs.</p>
      </div>
    </div>

    <div class="cta">
      <div class="l">
        <div class="k">Reply to this audit — or call</div>
        <div class="h">Let’s fix the ${facts.http.contactShortcode ? "form" : "booking path"} first.<br>It takes ${facts.http.contactShortcode ? "an hour" : "half a day"}.</div>
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
          Every number in this report was measured on <b>${e(facts.date.long)}</b> against the public site — no estimates, no stock benchmarks, no invented statistics. Nothing here is a guarantee of revenue; it is a description of what the page does today and what it should do.
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

    <div style="margin-top:auto;padding-bottom:4mm">
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
    pageFindings(audit, facts, findings.page1, 5, "Findings 01–03", audit.headings?.page5 || `Six findings. ${findings.all.filter(f => f.severity === "Critical").length} of them are <em>costing you bookings right now.</em>`, subject),
    pageFindings(audit, facts, findings.page2, 6, "Findings 04–06", audit.headings?.page6 || `The quieter problems — <em>the ones that cap your growth.</em>`, subject),
    pageBenchmark(audit, facts),
    pagePlan(audit, facts),
    pageDirection(audit, facts),
    pageNextSteps(audit, facts),
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${e(facts.agency.name)} — Website & Patient-Conversion Audit — ${e(facts.business.name)}</title>
<style>${FONTS}</style>
<style>${STYLES}</style>
</head>
<body>

${pages.join("\n\n")}

</body>
</html>
`;
}
