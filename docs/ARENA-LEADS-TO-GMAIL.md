# Arena workflow: leads → verified audits → Gmail drafts

This file contains the full operator prompt. The user supplies a state and the
number of **completed, verified audits** they want. The agent does the rest.

## One-line invocation

Replace the two placeholders and paste this into the Arena Agent chat connected
to this repository:

```text
Read and execute docs/ARENA-LEADS-TO-GMAIL.md with state="[STATE]" and audit_count=[COUNT]; create Gmail drafts only, never send.
```

Example: `state="Gujarat"` and `audit_count=3`.

| Input | Required | Default / meaning |
| --- | --- | --- |
| `state` | Yes | The state to source new business leads from. |
| `audit_count` | Yes | Positive integer; target number of newly completed, verified audits, not merely attempts. |
| `niches` | No | Use the state's configured niches, or the repository defaults. |
| `first_send_date` | No | Today's date in the timezone stated by the operator; otherwise use the current Arena date and report which date you used. This is a planning date, not a scheduled send. |

If a required input is missing, ask only for that input. Never treat a literal
placeholder as a real state or count. Optional inputs may be supplied in the same
message. Do not start a workflow merely because someone opens this document.

---

## Full agent prompt

The instructions below are the execution contract for an explicit invocation.

### 1. Prepare and check access

Read `AGENTS.md`, `docs/RUNBOOK.md`, `docs/AUDIT-SPEC.md`, and
`docs/DESIGN-SPEC.md`. Work on the current Arena branch; do not create or switch
branches.

Check Node.js, installed dependencies, Chrome/Chromium, outbound access to the
lead source and prospect websites, and the Gmail connection. Install permitted
dependencies and run `npm run selftest`. Require the unchanged calibration
result before producing an audit.

Make only necessary runtime or portability fixes, such as replacing the
Windows-specific Lighthouse launcher with a cross-platform invocation. Follow
the repository's acceptance rules for code changes. Do not change the frozen
scoring rubric or report design, and do not weaken duplicate or verification
checks. Do not add SMTP, credentials, or an automatic sender to this repository.

If this sandbox cannot access the required websites or lead source, report the
actual blocker. Never bypass sandbox restrictions or substitute fabricated
leads, measurements, screenshots, or results. Never ask for API keys or passwords
in chat, and never commit credentials.

### 2. Source only new, eligible leads

Use the supported OpenStreetMap, configured Google Places, or operator CSV
adapters. Use the requested state and niches. Do not scrape Google Maps results,
Yelp, or directories whose terms prohibit it. Do not build demo websites.

Before touching a prospect's website, check the lead and audit registries.
Deduplicate by normalized website domain, phone number, and business name plus
city. Exclude domains already audited inside the configured cooldown, blocked
businesses, permanent opt-outs, and leads without an auditable website.

Never use `--force` to fill the count. Never re-audit an existing business just
because a previous attempt failed or an email was missing. Respect the configured
retry limit. Work sequentially, not with competing Lighthouse processes.

Treat `audit_count` as the number of **new audits that pass verification**. A CLI
batch limit may count attempts instead, so inspect actual outcomes and, if needed,
continue with additional distinct eligible leads in properly sized batches.
Stop when the target is reached or eligible candidates are exhausted. Do not loop
forever against the same source results. Report any shortfall honestly.

### 3. Collect published business emails

Use a published email from the lead source, operator CSV, or the business's
official website/contact page. Record its source URL or source field locally.
Do not guess patterns such as `info@domain`, buy lists, or cold-submit contact
forms to discover an address.

If no public email is available, mark the business `email missing`. Keep its
accepted audit and local outreach drafts, but do not invent a recipient or create
an addressed Gmail draft. Report the missing-email case separately.

### 4. Produce and verify each audit

Run the real mobile and desktop Chrome measurements and Lighthouse. Generate the
repository's ten-page A4 PDF, `audit.json`, `qa.json`, and `verify.json`, plus the
normal raw evidence and local outreach sequence.

Do not use `--fixture`, `--skip-lighthouse`, invented screenshots, or unsupported
findings to obtain a pass. A failed or partial report is **NOT SENDABLE**. Do not
attach it to Gmail or count it as a completed audit. Fix a genuine data/runtime
problem and recheck, or move on and record the failure.

Open each accepted PDF with the file-viewer tool. Do not give bare repo-relative
URLs as though they were public web links. Keep client reports, raw measurements,
prospect contact data, and outreach content out of Git. Do not push those artifacts
to GitHub.

### 5. Prepare truthful outreach

Generate the initial audit email and three follow-ups using the repository's
sequence command and configured cadence. Use the supplied `first_send_date`, or
the documented default, for day zero. Calculate the three follow-up dates from
the configured gaps; the current defaults produce +3, +6, and +9 days.

Review the copy against this audit. Correct unsupported template assumptions in
the local outreach drafts: do not claim a broken enquiry form unless it was
measured, and adapt clinic/patient wording to the actual business. Never edit
measurements to match sales copy. Include the configured agency signature and a
real opt-out line. Do not invent prices, revenue results, testimonials, staff
names, or guarantees.

### 6. Create Gmail drafts — never send

Use the connected Gmail connector. Call its list-tools operation first and use
only the listed tools and returned IDs. Check the connected mailbox and configured
agency identity; if they materially disagree, ask before creating drafts under
the wrong identity. Do not set an unverified sender alias.

Before creating anything, search existing Gmail drafts and relevant sent/inbox
messages for the same recipient, business domain, audit reference, and outreach
step. Inspect likely matches. Reuse and record an existing matching draft instead
of creating a duplicate. Respect prior replies and opt-outs; do not continue a
sequence for someone who asked to stop. Limit mailbox reads to what this workflow
needs.

For each accepted audit with a verified public email and no suppression:

1. Create an initial Gmail draft addressed to that email.
2. Attach the actual verified PDF using the connector's workspace-file attachment
   support. Check the file size against the tool's limits first. If attachment
   upload fails, report the draft as incomplete; never substitute a local path or
   pretend the PDF is attached.
3. Create three separate follow-up Gmail drafts, unless a matching step already
   exists. Do not claim an unsent initial email has been delivered.
4. Read the created drafts back and verify recipient, subject, body, planned date,
   outreach step, and the initial PDF attachment.

At the top of each Gmail draft include an operator-only note:

```text
OPERATOR NOTE — [business domain] / [audit reference] / step [1-4].
Planned date: YYYY-MM-DD. Remove this note before sending.
```

Keep the note separate from the recipient-facing message. Save returned Gmail
draft IDs, recipients, email sources, steps, and planned dates in
`outreach/<business>/gmail-drafts.json`, alongside the existing `sequence.json`.
Preserve `status: "draft"` and `neverSendAutomatically: true`. These files contain
prospect data and must remain git-ignored.

Never call `send_draft`, `send_message`, or any other send operation. Do not create
scheduled sends or calendar reminders. The available Gmail draft tools create
drafts; a planned date in a note is **not** a scheduled email and will not trigger
automatically. A human must review, remove operator notes, and decide what to send.

### 7. Record results and report honestly

Update the local lead/audit registries through the repository's normal mechanisms.
Never delete registry rows to get around a duplicate check. Record opt-outs in the
lead and audit registries so later runs honor them.

Finish with a table:

| Business | Website | Published email + source | Audit score | PDF location | Gmail drafts created/reused | Planned dates |

Separately report:

- accepted new audits versus the requested count;
- skipped duplicates, cooldowns, and opt-outs;
- missing emails and incomplete attachments;
- failed measurements, QA failures, and verification blockers;
- existing Gmail drafts reused instead of duplicated;
- any access blocker or shortfall.

Distinguish files actually created and Gmail actions actually confirmed from
anything still blocked. Never claim a draft, attachment, or audit exists without
checking the corresponding result.
