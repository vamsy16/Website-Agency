// HTML -> A4 PDF. Refuses to hand back a file it has not counted the pages of.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, findChrome, log } from "./util.mjs";

async function loadPlaywrightChromium() {
  const { chromium: pw } = await import("playwright-core");
  return pw;
}

export async function htmlToPdf({ htmlFile, pdfFile, expectPages = 10 }) {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--font-render-hinting=none", "--disable-lcd-text"],
  });
  ensureDir(path.dirname(pdfFile));
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", err => errors.push("PAGEERROR " + err.message));
    await page.goto("file:///" + path.resolve(htmlFile).replace(/\\/g, "/"), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.pdf({
      path: pdfFile,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    const brokenImages = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute("src"))
    );
    await page.close();
    const info = inspectPdf(pdfFile);
    if (expectPages && info.pages !== expectPages) {
      throw new Error(`PDF has ${info.pages} pages, expected ${expectPages}. A page overflowed or a section was dropped.`);
    }
    const result = { ...info, file: pdfFile, consoleErrors: errors, brokenImages };
    log("pdf", `${path.basename(pdfFile)} — ${info.pages} pages, ${(info.bytes / 1024 / 1024).toFixed(2)} MB`);
    return result;
  } finally {
    await browser.close();
  }
}

/** Counts pages and checks the media box without a PDF library. */
export function inspectPdf(pdfFile) {
  const buf = fs.readFileSync(pdfFile);
  const text = buf.toString("latin1");
  const count = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
  // Chromium writes 594.96 x 841.92 for A4 (210 x 297 mm). Accept a small tolerance
  // so a renderer that rounds to 595 x 842 is not treated as a broken deliverable.
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/g)];
  const a4 = boxes.length > 0 && boxes.every(b =>
    Math.abs(Number(b[3]) - 595.28) < 3 && Math.abs(Number(b[4]) - 841.89) < 3
  );
  return {
    bytes: buf.length,
    pages: count,
    a4,
    mediaBox: boxes.length ? boxes[0].slice(0, 5).slice(1).map(Number) : null,
    header: text.slice(0, 8).startsWith("%PDF-"),
  };
}
