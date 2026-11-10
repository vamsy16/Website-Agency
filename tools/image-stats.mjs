#!/usr/bin/env node
// Pixel statistics for images, using the same algorithm the measurement step uses.
//
// Why: `audit --from-raw` trusts a recorded measurement file. The third-eye
// verifier refuses a screenshot whose pixels are blank or near-white, because a
// blank screenshot is the classic way a fake audit gets caught. This tool lets an
// operator compute those stats for real image files instead of typing numbers.
//
//   node tools/image-stats.mjs reports/<slug>/assets/*.png
//   node tools/image-stats.mjs a.png b.png > stats.json
import fs from "node:fs";
import path from "node:path";
import { findChrome, log, die } from "../src/util.mjs";

const files = process.argv.slice(2).filter(f => !f.startsWith("-"));
if (!files.length) die("usage: node tools/image-stats.mjs <image.png> [more.png ...]");

const { chromium } = await import("playwright-core");
const browser = await chromium.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function statsFor(file) {
  const b64 = fs.readFileSync(file).toString("base64");
  const page = await browser.newPage();
  try {
    return await page.evaluate(async data => {
      const img = new Image();
      img.src = "data:image/png;base64," + data;
      await img.decode();
      const W = 320;
      const H = Math.max(1, Math.round(img.height * (W / img.width)));
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      let n = 0, white = 0, sum = 0, sum2 = 0, colourful = 0;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        sum += l;
        sum2 += l * l;
        n++;
        if (l > 245) white++;
        if (Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) > 18) colourful++;
      }
      const mean = sum / n;
      return {
        width: img.width,
        height: img.height,
        mean: Math.round(mean),
        sd: Math.round(Math.sqrt(sum2 / n - mean * mean)),
        whitePct: Math.round((white / n) * 100),
        colourfulPct: Math.round((colourful / n) * 100),
      };
    }, b64);
  } finally {
    await page.close();
  }
}

const out = {};
try {
  for (const file of files) {
    if (!fs.existsSync(file)) die(`No such file: ${file}`);
    out[path.basename(file)] = await statsFor(file);
    log("stats", `${path.basename(file)} — ${out[path.basename(file)].width}x${out[path.basename(file)].height}, white ${out[path.basename(file)].whitePct}%, spread ${out[path.basename(file)].sd}`);
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 2));
