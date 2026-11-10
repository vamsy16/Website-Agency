#!/usr/bin/env node
// Turns binary files into .b64 sidecars (+ .sha256) for text-only transports.
//
//   node tools/encode-b64.mjs reports/<slug>/*.pdf
//   node tools/encode-b64.mjs reports/<slug>/assets/*.png
//
// The original file is left untouched. Delete the sidecars once real binary
// transport is available; `tools/decode-b64.mjs` will simply find nothing.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT, log, die } from "../src/util.mjs";

const files = process.argv.slice(2).filter(a => !a.startsWith("--"));
if (!files.length) die("usage: node tools/encode-b64.mjs <file> [more files]");

for (const rel of files) {
  const file = path.resolve(ROOT, rel);
  if (!fs.existsSync(file)) die(`No such file: ${rel}`);
  const buf = fs.readFileSync(file);
  const b64 = path.join(file + ".b64");
  fs.writeFileSync(b64, buf.toString("base64"));
  fs.writeFileSync(b64 + ".sha256", crypto.createHash("sha256").update(buf).digest("hex") + "\n");
  log("encode", `${path.relative(ROOT, file).replace(/\\/g, "/")} -> ${path.basename(b64)} (${(buf.length / 1024).toFixed(1)} KB)`);
}
