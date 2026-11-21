import PDFKit from 'pdfkit';
import fs from 'fs';

// ============================================================
// Smart Pursuit — School Automation & AI Solutions Proposal
// Visual, premium, client-facing business transformation proposal
// ============================================================

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
const M = 46;
const CW = PAGE.w - 2 * M;

const C = {
  primary: '#0A0A0A',
  secondary: '#111111',
  panel: '#F2F2F4',
  white: '#FFFFFF',
  body: '#1A1A1A',
  muted: '#6B6B72',
  accent: '#7C3AED',
  accentSoft: '#EDE9FE',
  line: '#D9D9DE',
  ok: '#15803d',
  warn: '#B45309',
};

const OUT = 'deliverables/2026-11-vizianagaram-school-admissions/Smart_Pursuit_School_Automation_AI_Solutions_Proposal.pdf';

const s = (t) => String(t)
  .replace(/₹/g, 'INR ')
  .replace(/→/g, 'to')
  .replace(/—/g, '-').replace(/–/g, '-')
  .replace(/“/g, '"').replace(/”/g, '"')
  .replace(/‘/g, "'").replace(/’/g, "'")
  .replace(/…/g, '...').replace(/•/g, '-')
  .replace(/×/g, 'x').replace(/·/g, '.')
  .replace(/®/g, '(R)')
  .replace(/✓/g, '[tick]')
  .replace(/✔/g, '[tick]');

let pageCounter = 1;
let totalPages = 0;

// ---------- explicit cursor (fully controlled by us) ----------
let cursor = 0;
const CONTENT_TOP = 110;
const PAGE_BOTTOM = PAGE.h - 50;

const makeDoc = () => new PDFKit({
  size: 'A4',
  margin: 0,
  info: {
    Title: 'School Automation & AI Solutions Proposal',
    Author: 'Smart Pursuit',
    Subject: 'Visual business transformation proposal for a school in Vizianagaram, Andhra Pradesh',
    Creator: 'Smart Pursuit',
  },
});

const collect = (doc) => new Promise((resolve) => {
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
});

const addPage = (doc) => {
  doc.addPage();
  pageCounter += 1;
  doc.fillColor(C.white).rect(0, 0, PAGE.w, PAGE.h).fill();
  footer(doc, pageCounter, totalPages);
  cursor = CONTENT_TOP;
};

const footer = (doc, pageNo, total) => {
  const y = PAGE.h - 30;
  doc.strokeColor(C.line).lineWidth(0.6).moveTo(M, y).lineTo(PAGE.w - M, y).stroke();
  doc.fillColor(C.muted).font('Helvetica').fontSize(7)
    .text(s('Smart Pursuit  |  School Automation & AI Solutions Proposal'), M, y + 6, { width: CW / 2, characterSpacing: 0 });
  doc.fillColor(C.muted).font('Helvetica').fontSize(7)
    .text(`Page ${pageNo} of ${total || ''}`, PAGE.w - M - 60, y + 6, { width: 60, align: 'right', characterSpacing: 0 });
};

const needSpace = (doc, h) => {
  if (cursor + h > PAGE_BOTTOM) { addPage(doc); return true; }
  return false;
};

// ---------- text measurement ----------
const hOf = (doc, text, { width, size = 9, lead = 1.3 } = {}) =>
  doc.heightOfString(s(text), { width, fontSize: size, lineGap: lead - 1 });

// ---------- typography ----------
const bodyText = (doc, text, { size = 9.6, color = C.body, width = CW, lead = 1.45, bold = false } = {}) => {
  const h = hOf(doc, text, { width, size, lead });
  needSpace(doc, h + 6);
  const y = cursor;
  doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  doc.text(s(text), M, y, { width, lineGap: lead - 1, characterSpacing: 0 });
  cursor = y + h + 6;
  return cursor;
};

const bullets = (doc, items, { size = 9, gap = 6, color = C.body, marker = '[tick]', markerColor = C.accent, width = CW } = {}) => {
  let hTotal = 0;
  const measured = items.map((it) => {
    const t = s(it);
    const h = hOf(doc, t, { width: width - 22, size });
    hTotal += h + gap;
    return { t, h };
  });
  needSpace(doc, hTotal + 4);
  const start = cursor;
  measured.forEach(({ t, h }) => {
    doc.fillColor(markerColor).font('Helvetica-Bold').fontSize(size).text(marker, M, cursor, { width: 14 });
    doc.fillColor(color).font('Helvetica').fontSize(size).text(t, M + 18, cursor, { width: width - 18, lineGap: 1.3 });
    cursor = cursor + h + gap;
  });
  cursor = start + hTotal + 4;
  return cursor;
};

// ---------- cards ----------
const problemCard = (doc, text, { w = CW } = {}) => {
  const h = hOf(doc, text, { width: w - 26, size: 9.2 }) + 22;
  needSpace(doc, h + 10);
  const y = cursor;
  doc.fillColor(C.panel).rect(M, y, w, h).fill();
  doc.fillColor(C.accent).rect(M, y, 4, h).fill();
  doc.fillColor(C.body).font('Helvetica-Bold').fontSize(7.6)
    .text('PROBLEM', M + 14, y + 10, { characterSpacing: 1.4 });
  doc.fillColor(C.body).font('Helvetica').fontSize(9.2)
    .text(s(text), M + 14, y + 22, { width: w - 28, lineGap: 1.35 });
  cursor = y + h + 10;
  return cursor;
};

const solutionCard = (doc, title, text, { w = CW } = {}) => {
  const th = hOf(doc, title, { width: w - 26, size: 11, lead: 1.2 }) + 6;
  const sh = hOf(doc, text, { width: w - 26, size: 9 }) + 14;
  const h = Math.max(th + sh + 26, 64);
  needSpace(doc, h + 10);
  const y = cursor;
  doc.fillColor(C.white).rect(M, y, w, h).fill();
  doc.strokeColor(C.line).lineWidth(0.8).rect(M, y, w, h).stroke();
  doc.fillColor(C.accent).rect(M, y, 4, h).fill();
  doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(11)
    .text(s(title), M + 14, y + 12, { width: w - 28, lineGap: 1.2 });
  doc.fillColor(C.muted).font('Helvetica').fontSize(8.4)
    .text(s(text), M + 14, y + 12 + th + 4, { width: w - 28, lineGap: 1.3 });
  cursor = y + h + 10;
  return cursor;
};

const valueCard = (doc, items, { w = CW, title = 'VALUE TO THE SCHOOL' } = {}) => {
  const th = hOf(doc, title, { width: w - 26, size: 8, lead: 1.2 }) + 6;
  let cy = 0;
  const itemHs = items.map((it) => hOf(doc, it, { width: w - 42, size: 8.8 }));
  let hh = 0;
  itemHs.forEach((x) => { hh += x + 5; });
  const h = th + hh + 12;
  needSpace(doc, h + 8);
  const y = cursor;
  doc.fillColor(C.white).rect(M, y, w, h).fill();
  doc.strokeColor(C.line).lineWidth(0.8).rect(M, y, w, h).stroke();
  doc.fillColor(C.accent).rect(M, y, 4, h).fill();
  doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8)
    .text(s(title).toUpperCase(), M + 14, y + 10, { characterSpacing: 1.4 });
  cy = y + th + 8;
  items.forEach((it, i) => {
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(8.8).text('[tick]', M + 14, cy, { width: 14 });
    doc.fillColor(C.body).font('Helvetica').fontSize(8.8).text(s(it), M + 18, cy, { width: w - 42, lineGap: 1.25 });
    cy = cy + itemHs[i] + 5;
  });
  cursor = y + h + 8;
  return cursor;
};

const sectionBand = (doc, num, title, subtitle) => {
  needSpace(doc, 100);
  const bh = 64;
  const y = cursor;
  doc.fillColor(C.primary).rect(M, y, CW, bh).fill();
  doc.fillColor(C.accent).rect(M, y, 6, bh).fill();
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(15)
    .text(s(`${num}.  ${title}`), M + 18, y + 12, { width: CW - 36 });
  doc.fillColor(C.accentSoft).font('Helvetica').fontSize(8.6)
    .text(s(subtitle), M + 18, y + 12 + 18, { width: CW - 36 });
  cursor = y + bh + 16;
  return cursor;
};

// ---------- diagrams ----------
const box = (doc, x, y, w, h, { fill = C.white, stroke = C.line, radius = 8, text, tColor = C.body, tSize = 8.6, bold = false } = {}) => {
  doc.fillColor(fill).roundedRect(x, y, w, h, radius).fill();
  if (stroke) { doc.strokeColor(stroke).lineWidth(0.8).roundedRect(x, y, w, h, radius).stroke(); }
  if (text) {
    doc.fillColor(tColor).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(tSize);
    doc.text(s(text), x + 8, y + h / 2 - tSize / 2 - 2, { width: w - 16, align: 'center', lineGap: 1 });
  }
};

const arrow = (doc, x1, y1, x2, y2, { color = C.muted, lw = 1.2 } = {}) => {
  doc.strokeColor(color).lineWidth(lw).lineCap('round')
    .moveTo(x1, y1).lineTo(x2, y2).stroke();
  const head = 6;
  if (x1 === x2) {
    const dy = y2 > y1 ? 1 : -1;
    doc.fillColor(color)
      .moveTo(x1 - head / 2, y2 - dy * head).lineTo(x1, y2).lineTo(x1 + head / 2, y2 - dy * head)
      .fill();
  } else {
    const dx = x2 > x1 ? 1 : -1;
    doc.fillColor(color)
      .moveTo(x2 - dx * head, y2 - head / 2).lineTo(x2, y2).lineTo(x2 - dx * head, y2 + head / 2)
      .fill();
  }
};

const vflow = (doc, x, y, steps, { boxW = CW - 40, boxH = 30, gap = 14, tSize = 8.8 } = {}) => {
  let cy = y;
  steps.forEach((step, i) => {
    const h = Math.max(boxH, hOf(doc, step, { width: boxW - 16, size: tSize, lead: 1.1 }) + 12);
    box(doc, x, cy, boxW, h, { fill: C.white, stroke: C.line, text: step, tSize });
    if (i < steps.length - 1) {
      arrow(doc, x + boxW / 2, cy + h, x + boxW / 2, cy + h + gap, { color: C.accent, lw: 1.4 });
    }
    cy = cy + h + gap;
  });
  return cy - gap;
};

// ============================================================
// OPPORTUNITY DATA (from source blueprint)
// ============================================================

const SOLUTIONS = [
  {
    cat: 'Admissions & Enquiry Automation',
    items: [
      { title: 'Central Admissions Enquiry System', tagline: 'Capture, assign and track every parent enquiry in one place', ids: ['ADM-001', 'ADM-002', 'ADM-005'], problem: 'Parent enquiries from phone, WhatsApp, website and walk-ins are recorded on paper or in personal chats, so leads are missed and follow-ups depend on memory.', solution: 'A central enquiry system that captures every lead from any channel, auto-assigns it to a counsellor, shows live seat availability and tracks follow-up status.', steps: ['Parent enquiry (call, WhatsApp, web, walk-in)', 'Lead recorded in central database', 'Auto-assigned to a counsellor by class/area', 'Follow-up task and reminder created', 'Live seat count shown to counsellor', 'Outcome tracked (visit booked / admitted / lost)'], value: ['No missed enquiries', 'Faster follow-up on every lead', 'Instant seat-availability answers', 'Clear ownership of each lead'] },
      { title: 'Campus Visits & Document Collection', tagline: 'Book visits online and verify admission documents digitally', ids: ['ADM-003', 'ADM-004'], problem: 'Campus visits are booked by phone and confirmed manually, and application documents are collected physically and checked by hand.', solution: 'Online visit booking with automated confirmations and reminders, plus a document upload portal where parents submit documents and staff verify them with AI-assisted extraction.', steps: ['Parent books a visit slot online', 'Automated confirmation and reminder sent', 'Parent uploads admission documents', 'AI extracts key fields', 'Staff verifies and flags eligibility', 'Document-complete status recorded'], value: ['Fewer no-shows with reminders', 'Less paper handling', 'Faster document verification', 'Clear eligibility status per applicant'] },
      { title: 'Admission Conversion Tracking', tagline: 'See where enquiries drop off and why', ids: ['ADM-006'], problem: 'Enquiry-to-admission conversion and drop-off reasons are not tracked systematically, so improvement opportunities are missed.', solution: 'A monthly conversion funnel report that tags each lead by stage and loss reason, giving management a clear view of where parents drop off.', steps: ['Leads tagged by stage and loss reason', 'Monthly funnel report generated', 'Top drop-off reasons identified', 'Root-cause notes reviewed with team', 'Improvement actions agreed'], value: ['Visible conversion rate', 'Known reasons for lost enquiries', 'Data-backed admission decisions', 'Monthly improvement loop'] },
    ],
  },
  {
    cat: 'Parent Communication',
    items: [
      { title: 'Parent AI Assistant & Notifications', tagline: 'Answer routine parent questions instantly, in their language', ids: ['PAR-001', 'PAR-002', 'PAR-004'], problem: 'Parents call repeatedly about fees, holidays and events, and key notices are not always available in their preferred language.', solution: 'A conversational AI assistant answers routine parent questions in their preferred language, with template-based circulars and notices sent with delivery and read receipts.', steps: ['Parent sends a question by message', 'AI answers from approved knowledge base', 'Complex cases handed to staff', 'Circulars sent with template', 'Delivery and read receipts logged', 'Notices translated before distribution'], value: ['Fewer repetitive phone calls', 'Instant answers for parents', 'Notices in preferred languages', 'Proof of delivery and reads'] },
      { title: 'Complaint & Query Tracking', tagline: 'Log, route and resolve every parent complaint', ids: ['PAR-003'], problem: 'Parent complaints are received informally with no tracking, ownership or service-level commitment.', solution: 'A complaint ticketing system that logs each complaint, routes it to the right owner, starts an SLA clock and tracks resolution to closure.', steps: ['Complaint logged by parent or staff', 'Ticket routed to the right owner', 'SLA clock started', 'Owner works on resolution', 'Resolution tracked and updated', 'Parent informed of outcome'], value: ['No complaint overlooked', 'Clear owner for every issue', 'Resolution within agreed time', 'Parent confidence in process'] },
    ],
  },
  {
    cat: 'Administration & Documents',
    items: [
      { title: 'Student Records & Certificates', tagline: 'Digital student records and instant certificates', ids: ['OPS-001', 'OPS-002', 'OPS-005'], problem: 'Student records are maintained on paper across registers, and bonafide, transfer and other letters are generated by hand on request.', solution: 'A digital student record with an update workflow and change log, plus template-based certificate and letter generation on request, with searchable registers for audit.', steps: ['Admission confirmed to digital record', 'Updates logged with change history', 'Parent requests certificate or letter', 'Template selected and document generated', 'Document issued to parent', 'Register entry searchable for audit'], value: ['Instant certificates and letters', 'Searchable student records', 'Complete change history', 'Audit-ready registers'] },
      { title: 'Office Tasks & Reporting', tagline: 'Assign office work and assemble reports automatically', ids: ['OPS-003', 'OPS-004'], problem: 'Office tasks are assigned informally with no deadline tracking, and operational reports are assembled by hand from multiple systems.', solution: 'A task board with assignment, status and deadline tracking, plus automated operational reports assembled from live systems.', steps: ['Task created and assigned to owner', 'Status and deadline tracked', 'Owner updates progress', 'Live data pulled from systems', 'Report assembled automatically', 'Report distributed to stakeholders'], value: ['No task falls through cracks', 'Deadlines visible to all', 'Reports ready on time', 'Less manual report assembly'] },
    ],
  },
  {
    cat: 'Finance & Fee Management',
    items: [
      { title: 'Fee Reminders & Receipts', tagline: 'Automated fee reminders and digital receipts', ids: ['FIN-001', 'FIN-002'], problem: 'Fee reminders are sent manually and receipts are generated by hand, so payment tracking and reconciliation take days.', solution: 'Automated fee reminders by WhatsApp, SMS and email triggered by due date, plus auto-generated digital receipts and automated bank-reconciliation matching.', steps: ['Fee due date approaches', 'System identifies unpaid students', 'Reminders sent by WhatsApp/SMS/email', 'Payment received', 'Digital receipt issued', 'Bank statement matched to ledger'], value: ['Reminders sent on time, every cycle', 'Digital receipt on payment day', 'Faster bank reconciliation', 'Clear pending-payment list'] },
      { title: 'Concessions, Refunds & Vendor Payments', tagline: 'Digital approvals for concessions, refunds and invoices', ids: ['FIN-003', 'FIN-004', 'FIN-005'], problem: 'Concessions and refunds are handled on paper with no tracking, and vendor invoices are keyed in manually.', solution: 'Digital concession and refund requests with rule-based approval routing and status tracking, plus AI-assisted invoice extraction and three-way matching before payment.', steps: ['Request submitted (concession, refund or invoice)', 'Rule checks eligibility', 'Routed to the right approver', 'Decision recorded', 'Payment initiated where approved', 'Status visible to all'], value: ['Consistent approval decisions', 'Status tracked end to end', 'Faster invoice processing', 'Fewer errors before payment'] },
      { title: 'Fee Collection Dashboard', tagline: 'Live fee collection by class, month and payment mode', ids: ['FIN-006'], problem: 'Fee collection figures are compiled by hand at month-end, so management sees the numbers late.', solution: 'A live fee-collection dashboard that updates daily by class, month and payment mode, with variance alerts against target.', steps: ['Payments flow in daily', 'Dashboard updates automatically', 'Collection compared to target', 'Variances flagged', 'Management reviews live', 'Action taken on gaps'], value: ['Live collection visibility', 'Monthly figures ready early', 'Variances caught quickly', 'Data-backed fee decisions'] },
    ],
  },
  {
    cat: 'Academics & Teaching Support',
    items: [
      { title: 'Syllabus, Marks & Results', tagline: 'Track coverage, enter marks and compile results digitally', ids: ['ACD-001', 'ACD-003', 'ACD-005'], problem: 'Syllabus coverage and lesson plans sit in separate files, marks are collected on paper, and results are compiled manually.', solution: 'A central syllabus tracker with lesson-plan links, digital marks entry with validation, automated result compilation, and AI-assisted performance summaries.', steps: ['Teacher updates lesson plan and coverage', 'Teacher enters marks digitally', 'System validates and compiles results', 'Results published to parents', 'AI highlights at-risk students', 'Subject trends shared with teachers'], value: ['Coverage visible by term', 'Faster result publication', 'Fewer mark-entry errors', 'At-risk students flagged early'] },
      { title: 'Teaching Support & Remedial', tagline: 'AI-drafted worksheets and tracked remedial support', ids: ['ACD-002', 'ACD-006'], problem: 'Teachers draft worksheets and question papers from scratch each time, and remedial support for at-risk students is not tracked.', solution: 'AI-assisted drafting of worksheets and question papers from topic and class level, stored in a shared question bank, plus a remedial support tracker linking at-risk students to sessions and progress.', steps: ['Teacher specifies topic, class and difficulty', 'AI drafts worksheet or paper', 'Teacher reviews and saves to bank', 'At-risk students identified', 'Support sessions assigned', 'Progress tracked per student'], value: ['Less time drafting materials', 'Reusable question bank', 'Remedial support tracked', 'Progress visible per student'] },
    ],
  },
  {
    cat: 'HR & Staff Operations',
    items: [
      { title: 'Onboarding, Leave & Payroll', tagline: 'Digital staff onboarding, leave and payroll inputs', ids: ['HR-001', 'HR-002', 'HR-003'], problem: 'Staff onboarding, leave requests and payroll inputs are handled on paper or by email and chat.', solution: 'A digital onboarding checklist with document collection and account provisioning, leave requests with routing and balance tracking, and automated payroll-input extraction.', steps: ['New hire offered to checklist created', 'Documents collected, accounts provisioned', 'Staff submits leave request', 'Request routed and approved', 'Leave balance updated automatically', 'Payroll inputs extracted from records'], value: ['Smooth new-staff onboarding', 'Leave decisions on time', 'Accurate leave balances', 'Faster payroll preparation'] },
      { title: 'HR Policy Assistant', tagline: 'Staff handbook questions answered by AI', ids: ['HR-004'], problem: 'Staff repeatedly ask HR the same questions about leave, payroll and policy rules.', solution: 'An AI-powered HR policy assistant that answers routine questions from the staff handbook and escalates unclear cases to HR.', steps: ['Staff asks a policy question', 'AI retrieves handbook answer', 'Answer given to staff', 'Unclear cases escalated to HR', 'HR reviews and responds', 'Handbook kept up to date'], value: ['Fewer repetitive HR queries', 'Instant policy answers', 'HR time freed up', 'Consistent policy guidance'] },
    ],
  },
  {
    cat: 'Transport, Facilities & Maintenance',
    items: [
      { title: 'Bus Attendance & Parent Alerts', tagline: 'Digital bus attendance with automatic delay alerts', ids: ['TRN-002'], problem: 'Bus attendance and delay or route-change information is shared by phone group, so parents are not reliably informed.', solution: 'Digital bus attendance marked by the driver, with automated delay or route-change alerts sent to parents.', steps: ['Driver marks bus attendance', 'System detects delay or route change', 'Parent alert sent automatically', 'Parent receives update', 'Attendance record stored', 'Exception escalated if needed'], value: ['Parents informed of delays', 'Reliable bus attendance record', 'Fewer anxious phone calls', 'Safer student transport'] },
      { title: 'Transport, Facilities & Maintenance', tagline: 'Route allocation, maintenance and cleaning tracked digitally', ids: ['TRN-001', 'TRN-003', 'FAC-001', 'FAC-002', 'FAC-003'], problem: 'Transport route allocation, vehicle maintenance, driver documents and facilities cleaning are tracked informally on paper.', solution: 'A transport request form with route allocation, a maintenance scheduler with driver-document expiry tracking, and a digital cleaning schedule with verified checklists.', steps: ['Transport request submitted', 'Route allocated and confirmed', 'Maintenance scheduled for vehicles', 'Driver-document expiry tracked', 'Cleaning checklist assigned', 'Supervisor verifies completion'], value: ['Organised transport allocation', 'Vehicles serviced on time', 'Driver documents current', 'Cleaning verified and logged'] },
    ],
  },
  {
    cat: 'Library, Events & Other',
    items: [
      { title: 'Library Catalogue & Overdue', tagline: 'Digital book tracking with automated overdue reminders', ids: ['LIB-001', 'LIB-002'], problem: 'Library catalogue and issue/return are tracked in registers, and overdue reminders are sent manually.', solution: 'A digital catalogue with issue/return tracking and auto-flagged overdue books, plus automated overdue reminders to students and parents.', steps: ['Book issued or returned', 'Record updated digitally', 'Overdue flagged automatically', 'Reminder sent to parent', 'Escalation if not returned', 'Return recorded'], value: ['Books tracked accurately', 'Overdue books returned faster', 'Less manual reminder work', 'Clear library records'] },
      { title: 'Event Registration & Certificates', tagline: 'Digital event sign-up, permissions and certificates', ids: ['EVT-001', 'EVT-002'], problem: 'Event registration and permission slips are on paper, and feedback and certificates after events are handled manually.', solution: 'Digital event registration with permission collection, plus post-event feedback forms and automated certificate generation.', steps: ['Event published online', 'Parents register and give permission', 'Confirmations logged', 'Feedback form sent after event', 'Responses logged', 'Certificates issued automatically'], value: ['No lost permission slips', 'Easy event sign-up', 'Feedback collected', 'Certificates ready fast'] },
    ],
  },
  {
    cat: 'IT & Internal Support',
    items: [
      { title: 'IT Helpdesk & Device Inventory', tagline: 'AI IT support and tracked device access', ids: ['IT-001', 'IT-002'], problem: 'Staff IT issues and password resets are handled informally, and device inventory and access requests are manual.', solution: 'An AI helpdesk agent that suggests fixes for common issues and routes tickets, plus a device inventory with access-request workflow and renewal reminders.', steps: ['Staff reports IT issue', 'AI suggests a fix', 'Ticket created if unresolved', 'Device access requested', 'Access approved and tracked', 'Renewal reminder set'], value: ['Faster issue resolution', 'Tracked IT tickets', 'Accurate device inventory', 'Timely access renewals'] },
      { title: 'Accounts Provisioning & Website Updates', tagline: 'Automated accounts and scheduled content publishing', ids: ['IT-003', 'IT-004'], problem: 'Staff account creation and revocation are not tied to HR events, and website or portal content is updated manually.', solution: 'Automated account creation on join and revocation on exit tied to HR events, plus template-based content publishing with scheduled updates.', steps: ['HR join or exit event triggered', 'Account created or revoked', 'Access confirmed', 'Content drafted with template', 'Update scheduled', 'Published to website or portal'], value: ['Access tied to HR events', 'No orphaned accounts', 'Consistent content publishing', 'Scheduled updates'] },
    ],
  },
  {
    cat: 'Compliance, Safety & DPDP',
    items: [
      { title: 'Compliance Calendar & Consent', tagline: 'Track expiries, prepare inspections and manage DPDP consent', ids: ['COMP-001', 'COMP-002', 'COMP-003', 'COMP-004'], problem: 'Licence and policy expiries are not tracked centrally, consent records are on paper, and there is no verifiable parental-consent system under DPDP.', solution: 'A compliance calendar with document-expiry alerts and inspection checklists, digital consent and acknowledgement records, and a verifiable parental-consent flow with breach logging.', steps: ['Documents registered with expiry dates', 'Alerts sent before expiry', 'Consent captured digitally with verification', 'Inspection checklist prepared', 'Evidence linked for readiness', 'Breach logged if any occurs'], value: ['No expired licence or policy', 'Inspection-ready at any time', 'Verifiable parental consent', 'DPDP-aligned records'] },
      { title: 'Incident & Visitor Management', tagline: 'Digital incident reporting and visitor logs', ids: ['SAF-001', 'SAF-002'], problem: 'Incidents are reported on paper with no escalation SLA, and visitor logs and emergency contacts are on paper.', solution: 'Digital incident reporting with severity, escalation and closure, plus a digital visitor log with photo capture and emergency-contact verification.', steps: ['Incident logged by staff', 'Severity assigned', 'Escalated if serious', 'Resolved and closed', 'Visitor logged with photo', 'Host notified, exit recorded'], value: ['Serious incidents escalated', 'Clear incident record', 'Verified visitors on site', 'Safer school environment'] },
    ],
  },
];

const AGENTS = [
  { id: 'AGT-01', name: 'Parent Support Agent', users: 'Parents', purpose: 'Answers routine questions (fees, holidays, events, admission process) in the parent\u2019s preferred language and hands complex cases to staff.', limits: 'No fee commitments; no child data disclosure without consent.', outcome: 'Routine questions resolved without staff time.' },
  { id: 'AGT-02', name: 'IT Helpdesk Agent', users: 'Staff', purpose: 'Suggests fixes for common IT issues (password, device, access) and creates tickets for IT when unresolved.', limits: 'No system changes without IT approval.', outcome: 'Common IT issues resolved faster.' },
];

// ============================================================
// RENDER
// ============================================================

const build = async () => {
  process.stdout.write('BUILD START\n');
  // Pass 1: count pages
  pageCounter = 1;
  cursor = CONTENT_TOP;
  const d1 = makeDoc();
  try { renderContent(d1); } catch (e) { console.error('PASS1 RENDER ERROR', e); throw e; }
  const p1 = collect(d1);
  d1.end();
  await p1;
  totalPages = pageCounter;
  process.stdout.write('PASS1 pages=' + totalPages + '\n');

  // Pass 2: final
  pageCounter = 1;
  cursor = CONTENT_TOP;
  const d2 = makeDoc();
  try { renderContent(d2); } catch (e) { console.error('PASS2 RENDER ERROR', e); throw e; }
  const p2 = collect(d2);
  d2.end();
  const buf2 = await p2;
  fs.writeFileSync(OUT, buf2);
  const stats = fs.statSync(OUT);
  process.stdout.write('BUILD DONE ' + OUT.split('/').pop() + ' pages=' + pageCounter + ' bytes=' + stats.size + ' kb=' + Math.round(stats.size / 1024) + '\n');
};

function renderContent(doc) {
  // ---------- PAGE 1: COVER ----------
  doc.fillColor(C.primary).rect(0, 0, PAGE.w, PAGE.h).fill();
  doc.fillColor(C.accent).rect(0, 0, PAGE.w, 10).fill();
  cursor = 150;
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(30)
    .text(s('School Automation & AI'), M, cursor, { width: CW, align: 'center' });
  cursor = cursor + 40;
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(30)
    .text(s('Solutions Proposal'), M, cursor, { width: CW, align: 'center' });
  cursor = cursor + 26;
  doc.fillColor(C.accentSoft).font('Helvetica').fontSize(13)
    .text(s('A visual business transformation proposal for school operations'), M, cursor, { width: CW, align: 'center' });
  cursor = cursor + 30;
  doc.fillColor(C.muted).font('Helvetica').fontSize(10)
    .text(s('Prepared by Smart Pursuit   \u2022   For School Management'), M, cursor, { width: CW, align: 'center' });
  cursor = cursor + 20;
  doc.fillColor(C.muted).font('Helvetica').fontSize(10)
    .text(s('Vizianagaram, Andhra Pradesh   \u2022   November 2026'), M, cursor, { width: CW, align: 'center' });
  const pillars = [
    ['Problem', 'What the school faces today'],
    ['Solution', 'What Smart Pursuit implements'],
    ['How it works', 'Simple workflow, step by step'],
    ['Value', 'Benefits the school receives'],
  ];
  const pw = (CW - 3 * 16) / 4;
  pillars.forEach((p, i) => {
    const x = M + i * (pw + 16);
    const py = 440;
    doc.fillColor(C.secondary).roundedRect(x, py, pw, 70, 8).fill();
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(11)
      .text(s(p[0]), x, py + 12, { width: pw, align: 'center' });
    doc.fillColor(C.white).font('Helvetica').fontSize(8.2)
      .text(s(p[1]), x + 6, py + 32, { width: pw - 12, align: 'center', lineGap: 1.1 });
  });
  cursor = 740;
  doc.fillColor(C.muted).font('Helvetica').fontSize(8)
    .text(s('All opportunities are grouped into clear solution categories. Every finding is labelled as verified, public evidence, an industry hypothesis, or requiring management validation.'), M, cursor, { width: CW, align: 'center', lineGap: 1.3 });
  cursor = cursor + 30;
  doc.fillColor(C.muted).font('Helvetica').fontSize(8)
    .text(s('Estimated benefits are planning estimates, not guaranteed results. Benefits are confirmed during discovery.'), M, cursor, { width: CW, align: 'center', lineGap: 1.3 });
  footer(doc, 1, totalPages);
  addPage(doc);

  // ---------- PAGE 2: EXECUTIVE OVERVIEW ----------
  doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(8)
    .text('SECTION 1', M, 34, { characterSpacing: 2 });
  doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(22)
    .text('Executive Overview', M, 54, { width: CW });
  doc.strokeColor(C.accent).lineWidth(1.5).moveTo(M, 92).lineTo(M + 120, 92).stroke();
  cursor = 108;
  cursor = bodyText(doc, 'A school runs on many connected processes admissions, fees, academics, attendance, transport, compliance and more. Most still run on paper, phone calls and memory. This proposal shows how Smart Pursuit can turn those everyday processes into simple, automated workflows with AI assistance where it helps, and human oversight where it matters.', { size: 10.5 });
  cursor = cursor + 4;
  cursor = bodyText(doc, 'Each solution in this document follows the same simple structure: the problem it solves, what we propose, how it works step by step, and the value it brings. No technical jargon. No guaranteed outcomes everything is validated with you before anything is built.', { size: 10.5 });
  cursor = cursor + 8;
  cursor = sectionBand(doc, 1, 'What changes for the school', 'Current to proposed');
  const shifts = [
    ['Enquiries on paper and memory', 'Every enquiry captured, assigned and tracked'],
    ['Fee reminders by hand', 'Automated reminders and digital receipts'],
    ['Complaints with no owner', 'Every complaint routed and resolved on time'],
    ['Reports compiled at month-end', 'Live dashboards for management'],
    ['Consent records on paper', 'Verifiable parental consent under DPDP'],
  ];
  const sw = (CW - 16) / 2;
  shifts.forEach((row, i) => {
    const x = M + (i % 2) * (sw + 16);
    const yy = cursor + Math.floor(i / 2) * 50;
    doc.fillColor(C.panel).roundedRect(x, yy, sw, 40, 6).fill();
    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8.6).text(s(row[0]), x + 12, yy + 8, { width: sw - 24 });
    doc.fillColor(C.ok).font('Helvetica-Bold').fontSize(8.6).text(s(row[1]), x + 12, yy + 24, { width: sw - 24 });
  });
  cursor = cursor + Math.ceil(shifts.length / 2) * 50 + 14;
  cursor = bodyText(doc, 'Opportunities are preserved in full none are discarded. Related items are grouped into clear solution categories across admissions, finance, academics, operations, HR, transport, facilities, compliance and IT.', { size: 9.6, color: C.muted });
  addPage(doc);

  // ---------- PAGE 3: ECOSYSTEM ----------
  cursor = sectionBand(doc, 2, 'Complete School Automation Ecosystem', 'One connected system for the whole school');
  cursor = bodyText(doc, 'One connected system. Parents, teachers and staff reach the school through WhatsApp, the website or a portal. An automation engine and AI assistants handle routine work, feeding accurate data into the systems each department uses. Sensitive decisions and student data always stay with authorised staff.', { size: 10 });
  cursor = cursor + 8;
  const ex = M + 40;
  const topY = cursor;
  const users = ['Parents', 'Teachers', 'Staff'];
  const bw = 78, bh = 34, ugap = 24;
  users.forEach((u, i) => {
    const x = ex + i * (bw + ugap);
    box(doc, x, topY, bw, bh, { fill: C.white, stroke: C.accent, text: u, tColor: C.accent, tSize: 10, bold: true });
  });
  const cy2 = topY + bh + 26;
  const channels = ['WhatsApp', 'Website / Portal', 'Email'];
  channels.forEach((c, i) => {
    const x = ex + i * (bw + ugap);
    box(doc, x, cy2, bw, bh, { fill: C.accentSoft, stroke: C.accent, text: c, tColor: C.primary, tSize: 9, bold: true });
  });
  users.forEach((_, i) => {
    arrow(doc, ex + i * (bw + ugap) + bw / 2, topY + bh, ex + i * (bw + ugap) + bw / 2, cy2, { color: C.accent, lw: 1.2 });
  });
  const cy3 = cy2 + bh + 26;
  box(doc, ex, cy3, bw, bh, { fill: C.primary, stroke: C.primary, text: 'Automation Engine', tColor: C.white, tSize: 9, bold: true });
  box(doc, ex + (bw + ugap), cy3, bw, bh, { fill: C.accent, stroke: C.accent, text: 'AI Assistants', tColor: C.white, tSize: 9, bold: true });
  arrow(doc, ex + bw / 2, cy2 + bh, ex + bw / 2, cy3, { color: C.primary, lw: 1.2 });
  arrow(doc, ex + bw + ugap + bw / 2, cy2 + bh, ex + bw + ugap + bw / 2, cy3, { color: C.accent, lw: 1.2 });
  const cy4 = cy3 + bh + 26;
  const systems = ['Lead & Student Records', 'Fee System', 'Timetable / Marks', 'HR & Payroll', 'Transport'];
  const sw2 = 118;
  systems.forEach((c, i) => {
    const x = ex + Math.floor(i / 2) * (sw2 + 16);
    const yy = cy4 + (i % 2) * (bh + 14);
    box(doc, x, yy, sw2, bh, { fill: C.panel, stroke: C.line, text: c, tColor: C.body, tSize: 8.2 });
    arrow(doc, ex + bw / 2, cy3 + bh, x + sw2 / 2, yy, { color: C.muted, lw: 1 });
  });
  cursor = cy4 + bh + 30;
  cursor = bodyText(doc, 'Approved information flows between systems. Access is role-based parents see their own child\u2019s data, staff see what they need, and management sees dashboards. Nothing is built until discovery confirms what you already have.', { size: 9, color: C.muted });
  addPage(doc);

  // ---------- SOLUTION CATEGORIES ----------
  let solNum = 3;
  SOLUTIONS.forEach((cat) => {
    cursor = sectionBand(doc, solNum, cat.cat, cat.items.map((it) => it.title).join(' \u2022 '));
    cursor = bodyText(doc, 'Related opportunities are grouped into one solution card. Each card states the problem, the proposed solution, how it works step by step, and the value to the school. Opportunity IDs are shown for traceability to the source register.', { size: 8.6, color: C.muted });
    cursor = cursor + 8;
    cat.items.forEach((it) => {
      const ph = hOf(doc, it.problem, { width: CW - 28, size: 9.2 }) + 32;
      const sh = hOf(doc, it.solution, { width: CW - 28, size: 9 }) + 16;
      const fh = vflowHeight(doc, it.steps, { boxW: CW - 120, boxH: 26, gap: 10, tSize: 8.2 });
      const vh = valueHeight(doc, it.value, { w: CW - 28, size: 8.6 }) + 24;
      const cardH = 30 + ph + sh + 16 + fh + vh + 60;
      if (cursor + cardH + 30 > PAGE_BOTTOM) { addPage(doc); cursor = CONTENT_TOP; }
      doc.fillColor(C.primary).rect(M, cursor, CW, 30).fill();
      doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(12)
        .text(s(it.title), M + 14, cursor + 7, { width: CW - 200 });
      doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(7.6)
        .text(s(it.ids.join(', ')), PAGE.w - M - 120, cursor + 8, { width: 106, align: 'right' });
      let cy = cursor + 36;
      cy = problemCard(doc, it.problem, { w: CW });
      cy = solutionCard(doc, 'Proposed solution', it.solution, { w: CW });
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8.4)
        .text('HOW IT WORKS', M, cy + 2, { characterSpacing: 1.4 });
      cy = cy + 16;
      cy = vflow(doc, M + 40, cy, it.steps, { boxW: CW - 120, boxH: 26, gap: 10, tSize: 8.2 });
      cy = valueCard(doc, it.value, { w: CW, title: 'Value to the school' });
      doc.fillColor(C.muted).font('Helvetica').fontSize(7.4)
        .text(s(`Source opportunities: ${it.ids.join(', ')}`), M, cy + 2, { width: CW });
      cursor = cy + 20;
    });
    solNum++;
    addPage(doc);
  });

  // ---------- AI AGENTS ----------
  cursor = sectionBand(doc, solNum, 'Integrated AI Agents', 'Semi-autonomous helpers with human escalation');
  cursor = bodyText(doc, 'AI agents are semi-autonomous helpers: they handle a conversation or task end to end and escalate to a person when they cannot proceed. Every agent has defined permissions, approved knowledge sources and clear escalation rules. No agent decides student outcomes.', { size: 10 });
  cursor = cursor + 8;
  AGENTS.forEach((ag) => {
    const h = 96;
    if (cursor + h + 40 > PAGE_BOTTOM) { addPage(doc); cursor = CONTENT_TOP; }
    const y = cursor;
    doc.fillColor(C.panel).roundedRect(M, y, CW, h, 8).fill();
    doc.fillColor(C.accent).rect(M, y, 4, h).fill();
    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(11).text(s(ag.name), M + 16, y + 10, { width: CW - 200 });
    doc.fillColor(C.muted).font('Helvetica').fontSize(8).text(s(`For: ${ag.users}`), PAGE.w - M - 120, y + 11, { width: 106, align: 'right' });
    doc.fillColor(C.body).font('Helvetica').fontSize(8.8)
      .text(s(ag.purpose), M + 16, y + 30, { width: CW - 32 });
    doc.fillColor(C.muted).font('Helvetica').fontSize(7.6)
      .text(s('Guardrails: ' + ag.limits), M + 16, y + 50, { width: CW - 32 });
    doc.fillColor(C.ok).font('Helvetica-Bold').fontSize(7.6)
      .text(s('Outcome: ' + ag.outcome), M + 16, y + 64, { width: CW - 32 });
    cursor = y + h + 14;
  });
  cursor = cursor + 6;
  cursor = bodyText(doc, 'Agent interaction: Parent or staff asks a question \u2192 AI retrieves approved information from the knowledge base \u2192 AI answers or escalates to the responsible staff member \u2192 Staff member resolves and the agent logs the outcome.', { size: 8.8, color: C.muted });
  solNum++;
  addPage(doc);

  // ---------- BEFORE AND AFTER ----------
  cursor = sectionBand(doc, solNum, 'Before and After', 'Illustrative current-state examples');
  cursor = bodyText(doc, 'Illustrative current-state examples only confirmed with you during discovery. Each shows how a routine process changes with automation.', { size: 9, color: C.muted });
  cursor = cursor + 8;
  const ba = [
    { title: 'Admission Enquiry', before: ['Parent calls', 'Staff answers', 'Details written on paper', 'Follow-up by memory', 'Possible missed enquiry'], after: ['Parent enquiry (any channel)', 'Captured in central database', 'Auto-assigned to counsellor', 'Reminder before follow-up', 'Tracked outcome'] },
    { title: 'Fee Collection', before: ['Fee due', 'Reminder by hand', 'Receipt written manually', 'Reconciliation takes days'], after: ['Due date reached', 'Automated reminder sent', 'Digital receipt on payment', 'Bank matched to ledger daily'] },
  ];
  ba.forEach((b, bi) => {
    const h = 260;
    if (cursor + h + 30 > PAGE_BOTTOM) { addPage(doc); cursor = CONTENT_TOP; }
    const x0 = M + bi * ((CW - 20) / 2);
    const w = (CW - 20) / 2;
    doc.fillColor(C.panel).roundedRect(x0, cursor, w, h, 8).fill();
    doc.fillColor(C.warn).roundedRect(x0, cursor, w, 34, 8).fill();
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10).text(s(b.title + '  \u2014  Before'), x0 + 14, cursor + 8, { width: w - 28 });
    let yy = cursor + 42;
    b.before.forEach((s) => {
      doc.fillColor(C.body).font('Helvetica').fontSize(8.6).text(s, x0 + 14, yy, { width: w - 28 });
      arrow(doc, x0 + w - 22, yy + 6, x0 + w - 10, yy + 6, { color: C.warn, lw: 0.8 });
      yy = yy + 16;
    });
    doc.fillColor(C.accent).roundedRect(x0, cursor + h - 34, w, 34, 8).fill();
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10).text(s(b.title + '  \u2014  After'), x0 + 14, cursor + h - 26, { width: w - 28 });
    yy = cursor + h - 34 + 14;
    b.after.forEach((s, si) => {
      doc.fillColor(C.body).font('Helvetica').fontSize(8.6).text(s, x0 + 14, yy, { width: w - 28 });
      if (si < b.after.length - 1) arrow(doc, x0 + w - 22, yy + 6, x0 + w - 10, yy + 6, { color: C.accent, lw: 0.8 });
      yy = yy + 16;
    });
    cursor = cursor + h + 20;
  });
  solNum++;
  addPage(doc);

  // ---------- BUSINESS VALUE ----------
  cursor = sectionBand(doc, solNum, 'Business Value Overview', 'Expected benefits, not guaranteed results');
  cursor = bodyText(doc, 'Value is presented as expected benefits, not guaranteed results. Estimates are validated with you during discovery before any target is set.', { size: 9, color: C.muted });
  cursor = cursor + 10;
  const values = [
    'Faster response to parent enquiries and questions',
    'Fewer missed follow-ups and lost leads',
    'Less repetitive manual data entry',
    'Digital receipts and faster fee reconciliation',
    'Certificates and letters issued on request',
    'Leave, concessions and complaints resolved on time',
    'At-risk students flagged earlier',
    'Live dashboards for management decisions',
    'Verifiable parental consent under DPDP',
    'Safer transport and incident handling',
  ];
  cursor = bullets(doc, values, { size: 9.6, gap: 7, width: CW });
  cursor = cursor + 10;
  cursor = bodyText(doc, 'No savings, admission uplift or cost-reduction figure is promised. All benefits are estimates pending discovery data on task volumes, staff time and current cost.', { size: 8.6, color: C.muted });
  solNum++;
  addPage(doc);

  // ---------- ROADMAP ----------
  cursor = sectionBand(doc, solNum, 'Implementation Roadmap', 'Phases extend beyond 90 days where needed');
  cursor = bodyText(doc, 'Phases extend beyond 90 days where needed. Nothing is built before discovery confirms the need. Timing is agreed with school management.', { size: 9, color: C.muted });
  cursor = cursor + 10;
  const phases = [
    ['Phase 1', 'Discover & Prepare', 'Validate processes, tools and data. Complete the discovery questionnaire. Confirm DPDP applicability.', 'Weeks 1\u20134'],
    ['Phase 2', 'Automate', 'Implement high-value, low-complexity quick wins (enquiries, leave, reminders, receipts).', 'Weeks 5\u201312'],
    ['Phase 3', 'Integrate', 'Connect departments: admissions to records, fees to dashboard, transport to alerts.', 'Months 4\u20137'],
    ['Phase 4', 'Introduce AI', 'Pilot AI assistants and agents with human oversight and escalation.', 'Months 8\u201312'],
    ['Phase 5', 'Optimise', 'Measure KPIs, expand workflows and refine with school data. Ongoing review.', 'Ongoing'],
  ];
  const rw = (CW - 4 * 16) / 5;
  const rh = 150;
  phases.forEach((p, i) => {
    const x = M + i * (rw + 16);
    doc.fillColor(C.white).roundedRect(x, cursor, rw, rh, 8).fill();
    doc.strokeColor(C.line).lineWidth(0.8).roundedRect(x, cursor, rw, rh, 8).stroke();
    doc.fillColor(C.accent).rect(x, cursor, rw, 6).fill();
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(10).text(s(p[0]), x + 14, cursor + 14, { width: rw - 28 });
    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(10.5).text(s(p[1]), x + 14, cursor + 34, { width: rw - 28 });
    doc.fillColor(C.body).font('Helvetica').fontSize(8.2).text(s(p[2]), x + 14, cursor + 52, { width: rw - 28, lineGap: 1.25 });
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(8).text(s(p[3]), x + 14, cursor + 116, { width: rw - 28 });
    if (i < phases.length - 1) arrow(doc, x + rw + 4, cursor + rh / 2, x + rw + 12, cursor + rh / 2, { color: C.muted, lw: 1.2 });
  });
  cursor = cursor + rh + 30;
  cursor = bodyText(doc, 'Scope, timeline and commercials are agreed at discovery. Every account (domain, website, enquiry records) remains in the school\u2019s name.', { size: 9, color: C.muted });
  solNum++;
  addPage(doc);

  // ---------- PARTNERSHIP & NEXT STEPS ----------
  cursor = sectionBand(doc, solNum, 'Smart Pursuit Partnership & Next Steps', 'Scope and commercials agreed at discovery');
  cursor = bodyText(doc, 'Smart Pursuit works as your implementation partner. Scope and commercials are set at discovery no price list is included in this proposal.', { size: 10 });
  cursor = cursor + 10;
  const roles = [
    ['Smart Pursuit', 'Run discovery, configure automation, train staff, run pilots, monitor KPIs.'],
    ['School', 'Complete the discovery questionnaire, provide system access, review outputs, own day-to-day use.'],
  ];
  roles.forEach((r) => {
    const h = 70;
    doc.fillColor(C.panel).roundedRect(M, cursor, CW, h, 8).fill();
    doc.fillColor(C.accent).rect(M, cursor, 4, h).fill();
    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(11).text(s(r[0]), M + 16, cursor + 12, { width: CW - 32 });
    doc.fillColor(C.body).font('Helvetica').fontSize(9).text(s(r[1]), M + 16, cursor + 34, { width: CW - 32, lineGap: 1.3 });
    cursor = cursor + h + 12;
  });
  cursor = cursor + 6;
  cursor = bodyText(doc, 'Next steps:', { size: 10, bold: true });
  cursor = bullets(doc, [
    'Complete the discovery questionnaire before any system is built.',
    'Start with quick wins: central enquiry capture, follow-up scheduling, visit booking, seat availability, leave approvals and certificate generation.',
    'Establish the DPDP consent foundation before any system touches student or parent data.',
    'Introduce AI assistance only with human review, and AI agents only with clear escalation to staff.',
  ], { size: 9.2, gap: 6, width: CW });
  cursor = cursor + 10;
  doc.fillColor(C.primary).rect(M, cursor, CW, 56).fill();
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
    .text('Every school has something valuable to offer. Our goal is to help the right parents discover it, trust it and experience it.', M + 16, cursor + 12, { width: CW - 32 });
  doc.fillColor(C.muted).font('Helvetica').fontSize(8.2)
    .text('Let\u2019s build a system that turns visibility into enquiries and enquiries into admissions.', M + 16, cursor + 30, { width: CW - 32 });
  cursor = cursor + 70;

  // ---------- RESPONSIBLE AI ----------
  cursor = cursor + 8;
  doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(8)
    .text('RESPONSIBLE AI', M, cursor, { characterSpacing: 2 });
  cursor = cursor + 12;
  const rai = [
    'AI uses only approved school information.',
    'Sensitive decisions (eligibility, progression, discipline, fees) remain with authorised staff.',
    'Student and parent data is protected; no tracking or targeted advertising to children.',
    'Important actions require appropriate human approval.',
    'AI responses can be escalated to a person when uncertain.',
  ];
  cursor = bullets(doc, rai, { size: 8.8, gap: 5, width: CW, markerColor: C.ok, marker: '[tick]' });
  addPage(doc);
}

function vflowHeight(doc, steps, o) {
  let h = 0;
  steps.forEach((s) => {
    h += Math.max(o.boxH, hOf(doc, s, { width: o.boxW - 16, size: o.tSize, lead: 1.1 }) + 12) + o.gap;
  });
  return h - o.gap;
}
function valueHeight(doc, items, o) {
  let h = 0;
  items.forEach((it) => {
    h += hOf(doc, it, { width: o.w - 42, size: o.size }) + 5;
  });
  return h;
}

build().then(() => process.stdout.write('BUILD DONE\n')).catch((err) => { console.error('BUILD ERROR', err); process.exit(1); });
