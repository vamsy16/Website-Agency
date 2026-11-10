#!/usr/bin/env node
// Reconstructs binary files from .b64 sidecars, then verifies their SHA-256.
//
// Why this exists: some GitHub upload paths (and some chat tools) only carry
// text. Binary deliverables — the audit PDF, the screenshots the report embeds —
// are therefore stored as `<name>.<ext>.b64` and decoded here.
//
//   node tools/decode-b64.mjs                      # decode every .b64 in the repo
//   node tools/decode-b64.mjs examples             # only under a subdirectory
//   node tools/decode-b64.mjs --verify-only        # check hashes, write nothing
//
// A sidecar may sit next to a `<file>.b64.sha256` containing the hex digest.
// If the digest is present and does not match, the file is NOT written.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT, log, die } from "../src/util.mjs";

const argv = process.argv.slice(2);
const verifyOnly = argv.includes("--verify-only");
const target = argv.find(a => !a.startsWith("--"));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".b64")) out.push(full);
  }
  return out;
}

const start = target ? path.resolve(ROOT, target) : ROOT;
if (!fs.existsSync(start)) die(`No such path: ${target}`);

const files = walk(start);
if (!files.length) {
  console.log("No .b64 sidecars found.");
  process.exit(0);
}

let written = 0;
let failed = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const outFile = file.slice(0, -4);
  let buf;
  try {
    buf = Buffer.from(fs.readFileSync(file, "utf8").replace(/\s+/g, ""), "base64");
  } catch (err) {
    console.error(`  FAIL ${rel}: ${err.message}`);
    failed++;
    continue;
  }
  if (!buf.length) {
    console.error(`  FAIL ${rel}: decoded to zero bytes`);
    failed++;
    continue;
  }

  const shaFile = `${file}.sha256`;
  if (fs.existsSync(shaFile)) {
    const expected = fs.readFileSync(shaFile, "utf8").trim().split(/\s+/)[0].toLowerCase();
    const actual = crypto.createHash("sha256").update(buf).digest("hex");
    if (expected !== actual) {
      console.error(`  FAIL ${rel}: sha256 ${actual} does not match ${expected} — refusing to write`);
      failed++;
      continue;
    }
  }

  if (!verifyOnly) {
    fs.writeFileSync(outFile, buf);
    written++;
  }
  log("decode", `${rel} -> ${path.relative(ROOT, outFile).replace(/\\/g, "/")} (${(buf.length / 1024).toFixed(1)} KB)${fs.existsSync(shaFile) ? " sha256 ok" : ""}`);
}

console.log(`\n${written} file(s) written, ${failed} failure(s), ${files.length} sidecar(s) scanned.`);
if (failed) process.exit(1);
