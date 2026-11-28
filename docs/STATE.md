# STATE — read this first

_Handoff for the next agent. Last updated 28 November 2026, about 13:00 IST by the Arena agent on branch
`arena/13b58292-website-agency` (merged into `main` through a pull request)._

> **Latest (28 Nov):** the five 27 November audits (AA Hospitals, Desai Eye Care,
> Dr. Padmavathi Dental Hospital & Implant Centre, Leelavathi Advanced Skin & Laser
> Centre, Skin First; `deliverables/andhra-pradesh/2026-11-27/`) have their **first
> emails in Gmail Drafts** since 28 Nov 12:46 IST, at the operator's request, PDF
> attached and read back. Draft IDs are on step 1 of each `sequence.json`
> (`gmailDraft`) and in `outreach/<slug>/gmail-drafts.json`. **Not sent yet**:
> when they reach Gmail's Sent folder, record `sentAt` (section 4); their first
> follow-ups fall due 3 days after that. Follow-up check on 28 Nov: nothing due
> that day; 21 due on 29 Nov, 9 on 30 Nov (section 3).

This repository is the single source of truth for the agency's work. Everything
needed to continue is committed here; nothing lives only in a chat or a sandbox.
Keep it that way (operator instruction, 27 November 2026: "keep everything in
GitHub, so that if I run this repo in another agent nothing is missed").

Agency: **Smart Pursuit**, Vizianagaram · smartpursuit3@gmail.com (the Gmail
mailbox and its only send-as address) · +91 70950 24220. Operator: Vamsi.

## 1. Start and finish of every session

1. Read this file, then `AGENTS.md`, `docs/RUNBOOK.md`,
   `docs/ARENA-LEADS-TO-GMAIL.md` (the operator workflow; Gmail rules in §6) and
   `docs/AUDIT-SPEC.md`.
2. A new Arena session works on a new branch cut from `main`. The audit workflow
   runs only for the branch named in `.github/workflows/agency-run.yml`: set
   `on.push.branches` (line 23) and `env.ARENA_BRANCH` (line 35) to your branch
   before you push a `run-request.json`.
3. Run `node tools/followups.mjs` for today's dues, and record anything that
   reached Gmail's Sent folder since the last record (section 4).
4. Before you finish: record sends, update this file, commit, push, then merge
   your branch into `main` through a pull request. The sandbox can be reset to an
   old snapshot at any time (section 7): anything not pushed is lost.

## 2. Standing instructions from the operator

- State: **Andhra Pradesh**. **5 leads per run** (5 new audits that pass verify).
- **No duplicate leads.** Check duplicates **in this repository only**
  (`data/leads.json`, `data/audits.json`, every deliverable and the git history of
  all branches), **not in Gmail**.
- **Only leads whose email is published on the business's own website.**
- Keep everything **real, live and relevant**; a wrong claim costs the agency the
  lead's trust.
- After auditing, a **third-eye review**: read every page of every PDF against the
  live site, record it in `deliverables/runs/<date>-independent-review.{md,json}`,
  and re-audit until it is clean. `tools/review-pdfs.py` catches known mistakes;
  it does not replace reading.
- **Gmail: only the first email goes into Drafts**, with its PDF attached. Never
  create follow-up drafts in advance. Never send anything.
- **Follow-ups go out 3 days after the previous email actually went out**, only if
  there is no reply. When the operator asks for due follow-ups, draft them as
  **replies in the existing sent thread**.
- **Record the sent time of every email** (the Gmail Sent copy, IST) and calculate
  follow-up dates from it: `node tools/followups.mjs --record <file>`.
- Nothing in a draft that the recipient should not read: no notes, links,
  planned dates or reminders.
- **Keep everything in GitHub** and merged into `main` (27 November 2026).

## 3. Where things stand

### Registries

- `data/leads.json`: 267 leads — 163 new, 64 audited, 40 audit-failed
  (0 duplicate domains). `data/audits.json`: 65 audits (0 duplicate domains).
- Vetted, not behind the Hostinger CDN, not yet audited (status `new`), in
  `data/ap-websearch-2026-11-27.csv`: kamakshihospital.com, Tirupati
  (kamakshihospitaltpt2022@gmail.com; not attempted, target reached);
  veyehospital.com, Ongole (venkateswaraeyehospitalongole@gmail.com; the screen
  timed out on 27 Nov); vijayahospitalvzm.com, Vizianagaram
  (drudayakumar65@gmail.com; answered HTTP 403 to the screen on 27 Nov).
  Re-read each site before queuing it again.
- Vetted but not attempted (status `new`, email read on each own site, all behind
  the Hostinger CDN, so queue them last), in `data/ap-websearch-2026-11-26.csv`:
  simhapuridental.com (simhapuridental.nellore@gmail.com), madhudentalclinic.com
  (madhudentalclinic94@gmail.com), fortunedentalclinics.com
  (fortunedentalvijayawada@gmail.com), viswanadhahospital.com
  (viswanadhahospital@gmail.com).
- Never retry (verify failed `screenshots.real`): kamakshisaidental.com,
  rajudental.in, prasadphysio.com, vennelahospital.com, stardentalhospital.com,
  ratankrishnadental.com, drsiriskinclinic.com, ayushdentalcare.com.

### Andhra Pradesh batches (most recent first)

| Folder `deliverables/andhra-pradesh/…` | Businesses | Review | Email 1 |
|---|---|---|---|
| `2026-11-27/` | AA Hospitals (Eluru), Desai Eye Care (Nellore), Dr. Padmavathi Dental Hospital & Implant Centre (Kakinada), Leelavathi Advanced Skin & Laser Centre (Guntur), Skin First (Vijayawada) | `runs/2026-11-27-independent-review.md` | drafted in Gmail 28 Nov 12:46 IST (PDF attached, read back); not sent yet |
| `2026-11-26/` | Vignata Fertility & IVF Center (Guntur), Sai Bhaskar Hospitals (Guntur), Dr K Hemanth Kumar, neurologist (Kurnool), Shravani ENT Hospital (Kakinada), Deepthi Fertility Centre (Nellore) | `runs/2026-11-26-independent-review.md` | sent 27 Nov 14:59–15:51 IST (recorded) |
| `2026-11-23/` | Smart Care Dental Hospital (Nellore), Dr Swetha Sajja Eye Hospital (Rajahmundry), MJ Naidu Super Speciality Hospital (Vijayawada), Sasya Fertility Centre (Guntur), Ravi Dental Care and Implant Center (Vijayawada) | `runs/2026-11-23-independent-review.md` | sent 23 Nov |
| `2026-11-22/` | MK Dental, Prathik Dental and Implant Centre (Anantapur), The Dental Studio (Visakhapatnam), Kalyani Dental Clinic, Praveen Dental Care (Tirupati) | `runs/2026-11-22-independent-review.md` | sent 23 Nov |
| `2026-11-20/`, `2026-11-15/`, `2026-11-16/` | earlier batches (the full list is `deliverables/README.md`) | `runs/2026-11-21-*`, `runs/2026-11-16-*` | sent 16 and 21 Nov |

### Follow-ups — `node tools/followups.mjs` at 28 November 2026, about 12:55 IST

```text
Follow-ups as of 28 November 2026 (IST): each is due 3 days after the previous email went out, only if there is no reply.

STATE        DUE         STEP  BUSINESS                                     LAST SENT
in 1 day     2026-11-29  3/4   Dr Swetha Sajja Eye Hospital                 step 2 · 2026-11-26 17:16 IST
in 1 day     2026-11-29  3/4   Dr. Ramya Sadaram                            step 2 · 2026-11-26 16:40 IST
in 1 day     2026-11-29  3/4   Hanuman's Hill Rock Cafe & Restaurant        step 2 · 2026-11-26 21:25 IST
in 1 day     2026-11-29  3/4   Iris International Dental Care               step 2 · 2026-11-26 21:49 IST
in 1 day     2026-11-29  3/4   Kalyani Dental Clinic                        step 2 · 2026-11-26 18:14 IST
in 1 day     2026-11-29  3/4   Krishna Hospital                             step 2 · 2026-11-26 21:02 IST
in 1 day     2026-11-29  3/4   Krishna Multispeciality Dental Clinic        step 2 · 2026-11-26 22:24 IST
in 1 day     2026-11-29  3/4   Majji Export Import                          step 2 · 2026-11-26 22:13 IST
in 1 day     2026-11-29  3/4   Milk n More                                  step 2 · 2026-11-26 16:50 IST
in 1 day     2026-11-29  3/4   MJ Naidu Super Speciality Hospital           step 2 · 2026-11-26 17:52 IST
in 1 day     2026-11-29  3/4   MK Dental                                    step 2 · 2026-11-26 18:48 IST
in 1 day     2026-11-29  3/4   MS Dental Hospital                           step 2 · 2026-11-26 22:01 IST
in 1 day     2026-11-29  3/4   Orange Tours & Travels                       step 2 · 2026-11-26 20:52 IST
in 1 day     2026-11-29  3/4   Prathik Dental and Implant Centre            step 2 · 2026-11-26 18:36 IST
in 1 day     2026-11-29  3/4   Praveen Dental Care                          step 2 · 2026-11-26 18:02 IST
in 1 day     2026-11-29  3/4   Ravi Dental Care and Implant Center          step 2 · 2026-11-26 17:40 IST
in 1 day     2026-11-29  3/4   Sasya Fertility Centre                       step 2 · 2026-11-26 17:27 IST
in 1 day     2026-11-29  3/4   Smart Care Dental Hospital                   step 2 · 2026-11-26 17:03 IST
in 1 day     2026-11-29  3/4   Sri Ramadas Motor Transport Ltd              step 2 · 2026-11-26 21:37 IST
in 1 day     2026-11-29  3/4   Sri Sai P.V.R. Hospitals                     step 2 · 2026-11-26 21:13 IST
in 1 day     2026-11-29  3/4   The Dental Studio                            step 2 · 2026-11-26 18:25 IST
in 2 days    2026-11-30  2/4   Deepthi Fertility Centre                     step 1 · 2026-11-27 15:51 IST
in 2 days    2026-11-30  2/4   Dr. K. Hemanth Kumar Neurologist             step 1 · 2026-11-27 15:25 IST
in 2 days    2026-11-30  3/4   Dr. Sushma Dental                            step 2 · 2026-11-27 14:27 IST
in 2 days    2026-11-30  3/4   HR Dental Hospital                           step 2 · 2026-11-27 14:12 IST
in 2 days    2026-11-30  3/4   Jamili Dental Care                           step 2 · 2026-11-27 13:45 IST
in 2 days    2026-11-30  2/4   Sai Bhaskar Hospitals                        step 1 · 2026-11-27 15:13 IST
in 2 days    2026-11-30  2/4   Shravani ENT Hospital                        step 1 · 2026-11-27 15:38 IST
in 2 days    2026-11-30  3/4   Sri Ramachandra Children and Dental Hospital step 2 · 2026-11-27 13:58 IST
in 2 days    2026-11-30  2/4   Vignata Fertility & IVF Center               step 1 · 2026-11-27 14:59 IST

Stopped (5):
  Bhimavaram Hospitals — bounced: info@bhimavaramhospitals.com — no mail server found for the domain (DNS MX lookup failed; Gmail gave up after two days)
  Blue Fox — bounced: gm@bluefoxrestaurant.com — address not found (550)
  Karumuri Super Speciality Hospital Pvt Ltd — bounced: help@karumurihospital.com — the receiving server would not accept a connection (Gmail gave up after two days)
  NEST Sagar Hospital — bounced: support@nesthospital.in — the receiving mail server is misconfigured
  SREE BHALAJI INDUSTRIES PRIVATE LIMITED — bounced: info@bhalajigroup.com — address not found (16 November, and again for the 22 November follow-up)

Complete (10):
  Golden Globe Overseas Consultants (final email 2026-11-26 19:24 IST)
  Khushi Shopping Mall (final email 2026-11-26 19:46 IST)
  Lakshmi Fertility Research and Laparoscopic Surgical Center (final email 2026-11-26 19:35 IST)
  Vizag Water World (final email 2026-11-26 19:12 IST)
  Winsmiths (final email 2026-11-26 19:00 IST)
  Jnanananda Eye Hospital (final email 2026-11-26 20:30 IST)
  Praveen  Hospital (final email 2026-11-26 20:04 IST)
  R K Hospital (final email 2026-11-26 19:58 IST)
  Raghuram Children Hospital (final email 2026-11-26 20:17 IST)
  Sandhya Hi-Tech Vision Care Center (final email 2026-11-26 20:41 IST)

Not started: 19 sequences (no email sent yet).
```

- **Nothing due on 28 Nov.** Gmail checked at 12:50 IST: nothing has reached the
  Sent folder since the last record (27 Nov 15:51 IST, Deepthi step 1), so every
  date above stands. The five 27 November first emails are drafts, not sends.
- Every mail the operator scheduled for 27 Nov went out on time and is recorded
  (`deliverables/runs/sends-2026-11-27b.json`): step 2 for HR Dental Hospital
  (14:12) and Dr. Sushma Dental (14:27); step 1 for Vignata (14:59), Sai Bhaskar
  (15:13), Dr K Hemanth Kumar (15:25), Shravani (15:38) and Deepthi (15:51 IST).
  Gmail thread ids for their follow-ups are in each `sequence.json` and in
  `outreach/<slug>/gmail-drafts.json`.
- Inbox, 26–28 Nov (every folder, spam and trash included): no bounces, replies or
  opt-outs from any lead. **One reply, still unanswered on 28 Nov:** Milestone
  Solarcom Pvt. Ltd. (milestonesolarcomsales@gmail.com, Bilal Mohd. Zaheeruddin)
  wrote on 27 Nov at 15:04 IST: "Can you share your marketing packages proposal
  please". It answers Vamsi's 24 Nov follow-up to a 14 Nov report ("Milestone
  Solar: 6 live Google ads, and every trust counter on the landing page reads
  zero"); that campaign is not tracked in this repository. Gmail message
  1a21c5bd52df544c, thread 1a1c50f925f30304. **Nothing drafted or sent: waiting
  for the operator.**
- Coming up: 29 Nov — step 3 for 21 sequences; 30 Nov — step 3 for Jamili, Sri
  Ramachandra, HR Dental and Dr. Sushma, and step 2 for the five 26 November
  audits. Draft only when the operator asks, after checking each thread for a
  reply or opt-out.
- "Not started: 19" is the five 27 November audits (drafted, not sent) and 14 older
  audits deliberately not emailed: chains, nonprofits, or held by an independent
  review (`deliverables/README.md`, Send? ❌).
- Send records: `deliverables/runs/sends-2026-11-27.json` (30) and
  `sends-2026-11-27b.json` (7). Earlier sends (64 across 40 sequences, recorded
  26 Nov) are in the `sentAt` fields of each `sequence.json`.

## 4. Recording sends and drafting in Gmail

- **Sends**: `list_messages` with `in:sent after:YYYY/MM/DD`; match each recipient
  to a `sequence.json` `to`; the step is the first one without `sentAt`;
  `sentAt` = the message's `internal_date` in IST. Write
  `deliverables/runs/sends-<date>.json`, run
  `node tools/followups.mjs --record <file>`, commit both.
- **Stops**: a reply, bounce (mailer-daemon) or opt-out ends the sequence — add it
  under `stops` in the same file.
- **First emails**: `create_draft` with `file_path` = the audit PDF and the body =
  `emails/email-1-first.md` after its `---` line. Read it back
  (`get_message_text` lists the attachment and its size). Record the draft on
  step 1 of `sequence.json` (`gmailDraft`) and in `outreach/<slug>/gmail-drafts.json`.
- **Follow-ups**: find the thread (`in:sent to:<address>`); `create_draft` with
  `thread_id`, `in_reply_to` and `references` set to the last message's
  Message-ID; body from the step's `email-N-*.md`; no attachment; read it back.
- Gmail connector quirks: scheduled mail is not listed by `list_drafts` or
  `in:sent` (a search without folder filters shows it with a future date); long
  lists truncate (narrow with `to:` or `after:`); `update_draft` changes the
  message ID.

## 5. Running audits (GitHub Actions only)

- To test measurement code (not to audit: the sandbox cannot reach the sites),
  a Chromium comes from npm: `npm install @sparticuz/chromium playwright-core`
  in a scratch folder, unpack `bin/chromium.br` (its `executablePath()` writes
  `/tmp/chromium`) and `bin/al2023.tar.br` (brotli, then tar), and run with
  `LD_LIBRARY_PATH=<unpacked>/lib`. 1.4.6's screen-count fix was reproduced and
  tested this way with Playwright's mobile emulation.
- This sandbox has no Chromium of its own and no general internet, so audits run in
  `.github/workflows/agency-run.yml`, triggered by pushing a changed
  `run-request.json` (`state`, `target`, `max`, `leadsLimit`, `csv`, `csvOnly`,
  `repairOnly` = re-audit only, `reaudit` = domains, `reauditReason`,
  `disabled` = gate only). It is now `disabled: true`.
- The run ends with a bot commit "Agency run: …" (deliverables, registries,
  encrypted raw results in `results/`; the decryption key is not in the repo).
  Then `git fetch` and `git merge --ff-only`.
- Review: `python3 tools/review-pdfs.py deliverables/andhra-pradesh/<date>
  --render tmp/pages` (needs pymupdf), read every page, compare with the live
  sites, write the review record. Write the review JSON with `approved: false`
  before the first re-audit, so the index never shows ✅ early.
- Only one pending run per concurrency group: a newer push cancels the older
  pending run, so list every domain that still needs a re-audit in the latest
  request. `gh run cancel` returns 403. Poll
  `gh run view <id> --json status,conclusion` (steps: `--json jobs`).
- Lighthouse varies between runs (Dr K Hemanth Kumar's mobile score read 64, 73
  and 81): decide to accept a re-run before seeing it. Hostinger/Zyro-hosted sites
  often fail (`ERRORED_DOCUMENT_REQUEST`, `NO_FCP`).

## 6. Incidents and open questions for the operator

- 23 Nov: an internal operator note leaked into the 20 emails sent that day; 10 of
  them included a link to this repository. The guide was fixed (b7e8007).
  **Open:** send those 20 threads a short apology P.S.?
- The repository is **public**: prospect emails, audit PDFs, email drafts and
  these records are visible to anyone. **Open:** make it private?
- **Open:** mark emailed leads `contacted` in `data/leads.json`? First widen the
  twin-email check in `src/cli.mjs` (it only matches `audited`).
- **Open:** reply to Milestone Solarcom's request for a marketing packages
  proposal (section 3)? Still unanswered on 28 Nov. Draft nothing until the
  operator says what to offer.
- Known cosmetic slip: AA Hospitals' PDF prints "1176 px" without a thousands
  separator (page 6); accepted, code fixed in 1.4.6.
- Known wording slip: Dr K Hemanth Kumar's PDF says "A 81/100" (pages 2 and 5).
  1.4.5 fixed the template; his email says "An 81/100".

## 7. Surviving a sandbox reset

The workspace has come back several times as an old snapshot with HEAD at the base commit
(013128b) and a stale working tree. Never commit that state. Restore with:

```bash
B=$(git branch --show-current)
git fetch origin "+refs/heads/$B:refs/remotes/origin/$B"
git reset -q --mixed "refs/remotes/origin/$B"
git diff --binary > /tmp/pre-restore.patch   # keep the stale diff, just in case
git checkout -- .                             # never git reset --hard
```

## 8. Other work in this repository

- `deliverables/2026-11-vizianagaram-school-admissions/` — a school admissions
  growth strategy (38 and 12 pages), an automation and AI blueprint and a
  proposal for a prospective school in Vizianagaram (21 Nov, carried over from
  branch `arena/353d62eb-website-agency`). Rebuild: `npm install --no-save
  pdfkit@^0.21.0`, then `npm run strategy`, `npm run strategy:client` or
  `npm run automation`; `node verify_proposal.mjs` checks the proposal PDF.
- Remote branches: `arena/c484b6b4`, `arena/841dee38` and `arena/c9db4150` were
  merged through PRs #1–#3; `arena/d1645585` (20 Nov runs) has no file that is
  not already here; `arena/353d62eb` is carried over as above.
