#!/usr/bin/env node
// Follow-up dates from what was actually sent.
//
// Each deliverables/<state>/<date>/<slug>/emails/sequence.json lists the four
// emails with a planned date (scheduledFor) and, once the operator has sent
// one, its sentAt. The rule (operator instruction, 22 November 2026): a
// follow-up goes out cadenceDays (3) after the previous email actually went
// out, and only if there is no reply. This tool records sends and recomputes
// every date from sentAt, so a late send moves the rest of the sequence with
// it. A step that follows one not yet sent is projected from that step's due
// date or today, whichever is later. Nothing here sends anything.
//
//   node tools/followups.mjs                  list what is due (read-only)
//   node tools/followups.mjs --record f.json  record sends/stops from f.json, recompute, write
//   node tools/followups.mjs --apply          recompute and write every started sequence
//   node tools/followups.mjs --selftest       check the date rule
//   --today YYYY-MM-DD                        compute as of another day (IST)
//
// f.json:
//   { "sends": [{ "sequence": "2026-11-16/r-k-hospital", "step": 1,
//                 "sentAt": "2026-11-16T15:51:00+05:30" }],
//     "stops": [{ "sequence": "2026-11-16/blue-fox", "at": "2026-11-16T16:49:15+05:30",
//                 "reason": "bounced: gm@bluefoxrestaurant.com — address not found" }] }
// sentAt is the Gmail Sent copy's time, never a planned date. A stop (bounce,
// reply, opt-out) ends the sequence: its unsent emails become "cancelled".

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DELIVERABLES = path.join(ROOT, "deliverables");
const IST = 330 * 60 * 1000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NOTE = "Dates follow what was actually sent: each email is due cadenceDays after the previous one went out (sentAt, IST), and only if there is no reply. A step after one not yet sent assumes that one goes out on its due date or today, whichever is later. Recompute with `node tools/followups.mjs --apply`.";
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function istDay(stamp) {
  if (!STAMP.test(String(stamp)) || Number.isNaN(Date.parse(stamp))) throw new Error(`not a timestamp with a time zone: ${stamp}`);
  return new Date(Date.parse(stamp) + IST).toISOString().slice(0, 10);
}
const istClock = stamp => new Date(Date.parse(stamp) + IST).toISOString().slice(0, 16).replace("T", " ");
function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const longDate = ymd => { const [y, m, d] = ymd.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const todayIST = () => new Date(Date.now() + IST).toISOString().slice(0, 10);

function findSequences(dir = DELIVERABLES, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) findSequences(p, out);
    else if (entry.name === "sequence.json" && path.basename(dir) === "emails") out.push(p);
  }
  return out.sort();
}

// Recompute one sequence from its sentAt values. Returns a new object.
function recompute(seq, today) {
  const s = structuredClone(seq);
  const mails = s.emails;
  const last = mails.reduce((k, e, i) => (e.sentAt ? i : k), -1);
  if (last < 0) return { seq: s, state: "not started" };
  mails.forEach((e, i) => {
    if (i < last && !e.sentAt) throw new Error(`${s.business}: step ${last + 1} is marked sent but step ${i + 1} is not`);
    if (e.sentAt) { istDay(e.sentAt); e.status = "sent"; e.approvedBy = e.approvedBy || "operator"; }
  });
  if (s.status === "stopped") {
    for (const e of mails) if (!e.sentAt) e.status = "cancelled";
    return { seq: s, state: "stopped" };
  }
  const gaps = Array.isArray(s.cadenceDays) ? s.cadenceDays : [];
  mails.forEach((e, i) => {
    let day;
    if (i === 0) day = istDay(e.sentAt);
    else {
      const prev = mails[i - 1];
      const base = prev.sentAt ? istDay(prev.sentAt) : (prev.scheduledFor > today ? prev.scheduledFor : today);
      day = addDays(base, gaps[i - 1] ?? 3);
    }
    e.scheduledFor = day;
    e.scheduledForLong = longDate(day);
  });
  s.sendDate = mails[0].scheduledFor;
  const next = mails.find(e => !e.sentAt);
  s.status = next ? "active" : "complete";
  s.note = NOTE;
  return { seq: s, state: s.status, next };
}

// Mark sends and stops listed in a JSON file. Returns path -> updated sequence.
function record(file, all) {
  const input = JSON.parse(fs.readFileSync(file, "utf8"));
  const pick = frag => {
    const hits = all.filter(p => p.includes(`${path.sep}${frag}${path.sep}emails${path.sep}`));
    if (hits.length !== 1) throw new Error(`"${frag}" matches ${hits.length} sequences`);
    return hits[0];
  };
  const touched = new Map();
  const load = p => { if (!touched.has(p)) touched.set(p, JSON.parse(fs.readFileSync(p, "utf8"))); return touched.get(p); };
  for (const { sequence, step, sentAt } of input.sends || []) {
    istDay(sentAt);
    const s = load(pick(sequence));
    const e = s.emails.find(m => m.step === step);
    if (!e) throw new Error(`${sequence}: no step ${step}`);
    if (e.sentAt && e.sentAt !== sentAt) throw new Error(`${sequence} step ${step}: already recorded as sent at ${e.sentAt}, not ${sentAt}`);
    Object.assign(e, { status: "sent", approvedBy: e.approvedBy || "operator", sentAt });
  }
  for (const { sequence, at, reason } of input.stops || []) {
    istDay(at);
    if (!reason) throw new Error(`${sequence}: a stop needs a reason`);
    const p = pick(sequence), s = load(p), rebuilt = {};
    for (const [k, v] of Object.entries(s)) {          // keep the stop next to status
      if (k === "stoppedAt" || k === "stoppedReason") continue;
      rebuilt[k] = k === "status" ? "stopped" : v;
      if (k === "status") Object.assign(rebuilt, { stoppedAt: at, stoppedReason: reason });
    }
    touched.set(p, rebuilt);
  }
  return touched;
}

// Keep each draft's "**Send:**" line equal to the recomputed date.
function syncDraftHeaders(seqPath, seq) {
  for (const e of seq.emails) {
    const md = path.join(path.dirname(seqPath), path.basename(e.file || `email-${e.step}-${e.id}.md`));
    if (!fs.existsSync(md)) continue;
    const text = fs.readFileSync(md, "utf8");
    const next = text.replace(/^\*\*Send:\*\* .*$/m, `**Send:** ${e.scheduledForLong}`);
    if (next !== text) fs.writeFileSync(md, next);
  }
}

function main(argv) {
  const opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  if (argv.includes("--selftest")) return selftest();
  const today = opt("--today") || todayIST();
  if (!YMD.test(today)) throw new Error(`--today wants YYYY-MM-DD, got ${today}`);
  const all = findSequences();
  const recorded = opt("--record") ? record(opt("--record"), all) : new Map();
  const write = argv.includes("--apply") || recorded.size > 0;
  const rows = [], stopped = [], complete = [];
  let notStarted = 0, written = 0;
  for (const p of all) {
    const before = fs.readFileSync(p, "utf8");
    const { seq, state, next } = recompute(recorded.get(p) || JSON.parse(before), today);
    if (state === "not started") { notStarted++; continue; }
    if (write) {
      const text = JSON.stringify(seq, null, 2) + "\n";
      if (text !== before) { fs.writeFileSync(p, text); written++; }
      if (state !== "stopped") syncDraftHeaders(p, seq);
    }
    const sent = seq.emails.filter(e => e.sentAt), lastSent = sent[sent.length - 1];
    const lastText = `step ${lastSent.step} · ${istClock(lastSent.sentAt)} IST`;
    if (state === "stopped") stopped.push(`${seq.business} — ${seq.stoppedReason || "stopped"}`);
    else if (state === "complete") complete.push(`${seq.business} (final email ${istClock(lastSent.sentAt)} IST)`);
    else rows.push({ due: next.scheduledFor, step: `${next.step}/${seq.emails.length}`, business: seq.business, last: lastText });
  }
  rows.sort((a, b) => a.due.localeCompare(b.due) || a.business.localeCompare(b.business));
  const when = d => { const n = dayDiff(today, d); return n < 0 ? `overdue ${-n}d` : n === 0 ? "due today" : `in ${n} day${n === 1 ? "" : "s"}`; };
  console.log(`Follow-ups as of ${longDate(today)} (IST): each is due 3 days after the previous email went out, only if there is no reply.\n`);
  console.log(`${"STATE".padEnd(12)} ${"DUE".padEnd(11)} ${"STEP".padEnd(5)} ${"BUSINESS".padEnd(44)} LAST SENT`);
  for (const r of rows) console.log(`${when(r.due).padEnd(12)} ${r.due.padEnd(11)} ${r.step.padEnd(5)} ${r.business.slice(0, 44).padEnd(44)} ${r.last}`);
  if (stopped.length) console.log(`\nStopped (${stopped.length}):\n  ${stopped.join("\n  ")}`);
  if (complete.length) console.log(`\nComplete (${complete.length}):\n  ${complete.join("\n  ")}`);
  console.log(`\nNot started: ${notStarted} sequence${notStarted === 1 ? "" : "s"} (no email sent yet).`);
  if (write) console.log(`Wrote ${written} sequence.json file${written === 1 ? "" : "s"}.`);
}

function selftest() {
  const ok = (name, cond) => { console.log(`${cond ? "ok  " : "FAIL"} ${name}`); if (!cond) process.exitCode = 1; };
  const throws = fn => { try { fn(); return false; } catch { return true; } };
  const mk = sent => ({
    business: "Test", status: "draft", cadenceDays: [3, 3, 3], sendDate: "2026-11-15",
    emails: [1, 2, 3, 4].map((step, i) => ({ step, id: `s${step}`, scheduledFor: "2026-11-15", scheduledForLong: "15 November 2026", status: "draft", approvedBy: null, sentAt: sent[i] || null })),
  });
  ok("adding days crosses a month", addDays("2026-11-29", 3) === "2026-12-02");
  ok("a late-evening UTC send counts on the IST day", istDay("2026-11-25T20:00:00Z") === "2026-11-26");
  ok("an IST stamp keeps its day", istDay("2026-11-26T00:10:00+05:30") === "2026-11-26");
  ok("a timestamp without a zone is refused", throws(() => istDay("2026-11-26 16:40")));
  let r = recompute(mk([]), "2026-11-26");
  ok("nothing sent: not started, dates untouched", r.state === "not started" && r.seq.emails[1].scheduledFor === "2026-11-15");
  r = recompute(mk(["2026-11-21T10:19:37+05:30"]), "2026-11-26");
  ok("day zero is the real first send", r.seq.sendDate === "2026-11-21" && r.seq.emails[0].scheduledFor === "2026-11-21");
  ok("an unsent follow-up keeps its real due date (overdue)", r.seq.emails[1].scheduledFor === "2026-11-24" && r.next.step === 2);
  ok("steps after it are projected from today", r.seq.emails[2].scheduledFor === "2026-11-29" && r.seq.emails[3].scheduledFor === "2026-12-02");
  r = recompute(mk(["2026-11-21T10:19:37+05:30", "2026-11-26T16:40:31+05:30"]), "2026-11-26");
  ok("the next step is 3 days after the actual send", r.seq.emails[2].scheduledFor === "2026-11-29" && r.next.step === 3);
  ok("sent steps are marked sent by the operator", r.seq.emails[1].status === "sent" && r.seq.emails[1].approvedBy === "operator");
  r = recompute(mk(["2026-11-16T12:54:00+05:30", "2026-11-20T08:00:09+05:30", "2026-11-23T14:43:00+05:30", "2026-11-26T17:00:00+05:30"]), "2026-11-26");
  ok("all four sent: complete, nothing due", r.state === "complete" && !r.next);
  r = recompute({ ...mk(["2026-11-16T13:10:00+05:30"]), status: "stopped" }, "2026-11-26");
  ok("stopped: the rest is cancelled and nothing is due", r.state === "stopped" && r.seq.emails.slice(1).every(e => e.status === "cancelled"));
  ok("a step sent before the one ahead of it is refused", throws(() => recompute(mk([null, "2026-11-20T08:00:00+05:30"]), "2026-11-26")));
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`followups: ${err.message}`);
  process.exit(1);
}
