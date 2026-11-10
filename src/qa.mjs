// Layout QA. Runs before the PDF is accepted.
//
// Checks per page:
//   - no element extends past the 297 mm page height (the #1 cause of a
//     10-page report silently becoming 11 or 12 pages)
//   - no broken images
//   - fonts actually loaded (Instrument Serif + Inter)
//   - exactly 10 sections
//   - no console errors
import fs from "node:fs";
import path from "node:path";
import { findChrome, log } from "./util.mjs";

export async function qaLayout({ htmlFile, expectPages = 10, toleranceMm = 1.0 }) {
  const { chromium: pw } = await import("playwright-core");
  const browser = await pw.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  const errors = [];
  const failedRequests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
    page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
    page.on("pageerror", err => errors.push("PAGEERROR " + String(err.message).slice(0, 300)));
    page.on("requestfailed", r => failedRequests.push({ url: r.url(), reason: r.failure()?.errorText }));
    await page.goto("file:///" + path.resolve(htmlFile).replace(/\\/g, "/"), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);

    const data = await page.evaluate(() => {
      const pages = [...document.querySelectorAll(".page")];
      const pageInfo = pages.map((p, i) => {
        const pr = p.getBoundingClientRect();
        const px2mm = 297 / pr.height;
        const kids = [...p.querySelectorAll("*")].filter(el => {
          if (el.closest(".glow")) return false;
          const r = el.getBoundingClientRect();
          return r.height > 0 && r.width > 0;
        });
        let maxBottom = 0;
        let worst = null;
        for (const el of kids) {
          const r = el.getBoundingClientRect();
          const bottom = r.bottom - pr.top;
          if (bottom > maxBottom) {
            maxBottom = bottom;
            worst = el.tagName + "." + String(el.className || "").split(" ").slice(0, 2).join(".");
          }
        }
        const images = [...p.querySelectorAll("img")].map(img => ({
          src: img.getAttribute("src"),
          ok: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
        }));
        return {
          page: i + 1,
          heightPx: Math.round(pr.height),
          widthPx: Math.round(pr.width),
          contentMm: +(maxBottom * px2mm).toFixed(1),
          overflowMm: +((maxBottom - pr.height) * px2mm).toFixed(1),
          worst,
          brokenImages: images.filter(x => !x.ok),
          imageCount: images.length,
        };
      });

      const fonts = [...document.fonts].map(f => ({ family: f.family, status: f.status }));
      return {
        pageCount: pages.length,
        pages: pageInfo,
        fontsLoaded: ["Instrument Serif", "Inter"].map(name => ({
          name,
          loaded: fonts.some(f => f.family.replace(/['"]/g, "") === name && f.status === "loaded"),
        })),
        bodyHeight: document.body.scrollHeight,
      };
    });

    const failures = [];
    if (data.pageCount !== expectPages) failures.push(`expected ${expectPages} page sections, found ${data.pageCount}`);
    for (const p of data.pages) {
      if (p.overflowMm > toleranceMm) failures.push(`page ${p.page} overflows by ${p.overflowMm} mm (worst: ${p.worst})`);
      if (p.brokenImages.length) failures.push(`page ${p.page} has ${p.brokenImages.length} broken image(s): ${p.brokenImages.map(b => b.src).join(", ")}`);
    }
    for (const f of data.fontsLoaded) if (!f.loaded) failures.push(`font "${f.name}" did not load`);
    if (errors.length) failures.push(`console errors: ${errors.slice(0, 3).join(" | ")}`);

    const report = {
      ok: failures.length === 0,
      failures,
      pageCount: data.pageCount,
      worstOverflowMm: Math.max(...data.pages.map(p => p.overflowMm)),
      pages: data.pages.map(p => ({ page: p.page, contentMm: p.contentMm, overflowMm: p.overflowMm, images: p.imageCount })),
      fontsLoaded: data.fontsLoaded,
      consoleErrors: errors,
      failedRequests,
      checkedAt: new Date().toISOString(),
    };

    if (!report.ok) log("qa", `FAILED — ${failures.length} issue(s)`);
    else log("qa", `clean — ${data.pageCount} pages, worst overflow ${report.worstOverflowMm} mm`);
    return report;
  } finally {
    await browser.close();
  }
}

export function assertQa(report) {
  if (!report.ok) {
    throw new Error(`Layout QA failed:\n  - ${report.failures.join("\n  - ")}`);
  }
  return report;
}
