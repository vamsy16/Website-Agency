import PDFKit from 'pdfkit';
import fs from 'fs';

// ============================================================
// Smart Pursuit — School Business Automation & AI Transformation
// Exhaustive blueprint builder (pdfkit, flow-based layout)
// ============================================================

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
const M = 46;
const CW = PAGE.w - 2 * M;

const C = {
  dark: '#0A0A0A',
  panel: '#111111',
  panel2: '#16161a',
  white: '#FFFFFF',
  body: '#C9C9CF',
  muted: '#A1A1AA',
  dim: '#6B6B72',
  accent: '#7C3AED',
  accentSoft: '#A78BFA',
  accentDark: '#1A1526',
  line: '#242428',
};

const s = (t) => String(t)
  .replace(/₹/g, 'INR ')
  .replace(/→/g, 'to')
  .replace(/—/g, '-').replace(/–/g, '-')
  .replace(/“/g, '"').replace(/”/g, '"')
  .replace(/‘/g, "'").replace(/’/g, "'")
  .replace(/…/g, '...').replace(/•/g, '-')
  .replace(/×/g, 'x').replace(/·/g, '.')
  .replace(/®/g, '(R)');

const OUT = 'deliverables/2026-11-vizianagaram-school-admissions/Smart_Pursuit_School_Automation_AI_Transformation_Blueprint.pdf';

const TAG = {
  VERIFIED: '[VERIFIED]',
  PUBLIC: '[PUBLIC]',
  HYPOTHESIS: '[HYPOTHESIS]',
  VALIDATE: '[VALIDATE]',
};

let pageCounter = 1;
let totalPages = 0;
let sectionPageMap = {}; // section title -> start page

const makeDoc = () => new PDFKit({
  size: 'A4',
  margin: 0,
  info: {
    Title: 'School Business Automation & AI Transformation Blueprint',
    Author: 'Smart Pursuit',
    Subject: 'Exhaustive automation & AI opportunity study for a school in Vizianagaram, Andhra Pradesh',
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
  footer(doc, pageCounter, totalPages);
  doc.y = 0; // reset cursor to top of the fresh page so content flows from the top
};

const footer = (doc, pageNo, totalPages) => {
  const y = PAGE.h - 34;
  doc.strokeColor(C.line).lineWidth(0.6).moveTo(M, y).lineTo(PAGE.w - M, y).stroke();
  doc.fillColor(C.dim).font('Helvetica').fontSize(7);
  doc.text(s('Smart Pursuit  |  School Business Automation & AI Transformation Blueprint  |  Vizianagaram, Andhra Pradesh'), M, y + 6, { width: CW / 2 });
  doc.fillColor(C.dim).font('Helvetica').fontSize(7);
  doc.text(`Page ${pageNo} of ${totalPages || ''}`, PAGE.w - M - 60, y + 6, { width: 60, align: 'right' });
};

const headerRule = (doc, label) => {
  doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(7)
    .text(s(label).toUpperCase(), M, 30, { characterSpacing: 1.6 });
  doc.strokeColor(C.line).lineWidth(0.6).moveTo(M, 40).lineTo(PAGE.w - M, 40).stroke();
};

const need = (doc, space) => {
  if (doc.y + space > PAGE.h - 70) { addPage(doc); return true; }
  return false;
};

// sectionStart: fresh page, header rule + section title at top
const sectionStart = (doc, num, title, eyebrow, sectionId) => {
  addPage(doc);
  sectionPageMap[sectionId] = pageCounter;
  headerRule(doc, eyebrow || 'School Business Automation & AI Transformation');
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(22)
    .text(s(`${num}.  ${title}`), M, 54, { width: CW });
  return doc.y + 18; // cursor after title
};

// ---------- flow-based helpers ----------

const para = (doc, text, { x = M, w = CW, size = 9.4, color = C.body, lead = 1.5, bold = false } = {}) => {
  const h = doc.heightOfString(s(text), { width: w, fontSize: size, lineGap: lead - 1 });
  need(doc, h + 8);
  doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  doc.text(s(text), x, doc.y, { width: w, lineGap: lead - 1 });
  return doc.y + 8;
};

const bullets = (doc, items, { x = M, w = CW, size = 9, gap = 5.5, color = C.body } = {}) => {
  let cy = doc.y;
  items.forEach((it) => {
    const t = s(it);
    const h = doc.heightOfString(t, { width: w - 14, fontSize: size, lineGap: 1.4 });
    need(doc, h + gap + 6);
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(size).text('-', x, cy, { width: 10 });
    doc.fillColor(color).font('Helvetica').fontSize(size).text(t, x + 12, cy, { width: w - 14, lineGap: 1.4 });
    cy = cy + h + gap;
    doc.y = cy;
  });
  return cy + 4;
};

const table = (doc, rows, { x = M, w = CW, colWidths, size = 8, headerSize = 7.8, rowGap = 3 } = {}) => {
  const nCols = rows[0].length;
  const cw = colWidths || Array(nCols).fill(w / nCols);
  const drawHeader = (cy) => {
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(headerSize);
    let cx = x;
    rows[0].forEach((cell, ci) => {
      doc.rect(cx, cy, cw[ci], 16).fill(C.accent);
      doc.text(s(cell), cx + 5, cy + 4, { width: cw[ci] - 10, lineGap: 1.2 });
      cx += cw[ci];
    });
    return cy + 16;
  };
  let cy = doc.y;
  if (cy + 16 + 10 > PAGE.h - 70) { addPage(doc); cy = doc.y; }
  cy = drawHeader(cy);
  rows.slice(1).forEach((row, ri) => {
    const maxH = Math.max(...row.map((cell, ci) => doc.heightOfString(s(cell), { width: cw[ci] - 10, fontSize: size, lineGap: 1.3 })));
    const rowH = Math.max(14, maxH + 6);
    if (cy + rowH + rowGap + 8 > PAGE.h - 70) { addPage(doc); cy = drawHeader(doc.y); }
    const fill = ri % 2 === 0 ? C.panel2 : C.dark;
    let cx = x;
    row.forEach((cell, ci) => {
      doc.fillColor(fill).rect(cx, cy, cw[ci], rowH).fill();
      doc.fillColor(C.body).font('Helvetica').fontSize(size).text(s(cell), cx + 5, cy + 3, { width: cw[ci] - 10, lineGap: 1.3 });
      cx += cw[ci];
    });
    cy += rowH + rowGap;
    doc.y = cy;
  });
  return cy + 6;
};

const callout = (doc, { tone = 'info', title, text, w = CW } = {}) => {
  const bg = tone === 'warn' ? '#2a1f12' : tone === 'bad' ? '#2a1214' : tone === 'ok' ? '#142418' : '#161626';
  const bar = tone === 'warn' ? C.warn : tone === 'bad' ? C.bad : tone === 'ok' ? C.ok : C.accent;
  const h = doc.heightOfString(s(text), { width: w - 26, fontSize: 8.8, lineGap: 1.5 }) + 22;
  need(doc, h + 6);
  const y = doc.y;
  doc.fillColor(bg).rect(M, y, w, h).fill();
  doc.rect(M, y, 3, h).fill(bar);
  doc.fillColor(bar).font('Helvetica-Bold').fontSize(7.4).text(s(title).toUpperCase(), M + 18, y + 10, { characterSpacing: 1.2 });
  doc.fillColor(C.white).font('Helvetica').fontSize(8.8).text(s(text), M + 18, y + 20, { width: w - 36, lineGap: 1.5 });
  doc.y = y + h;
  return y + h + 10;
};

// ============================================================
// RENDER PASS (tocPages: section title -> page number)
// ============================================================
const renderContent = (doc, tocPages, totalPages) => {
  sectionPageMap = {};

  // ---------- COVER (page 1) ----------
  doc.fillColor(C.dark).rect(0, 0, PAGE.w, PAGE.h).fill();
  doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(10).text('SMART PURSUIT  ·  VIZIANAGARAM · ANDHRA PRADESH', M, 106, { characterSpacing: 2 });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(32).text('SCHOOL BUSINESS AUTOMATION', M, 144, { width: CW });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(32).text('& AI TRANSFORMATION BLUEPRINT', M, 190, { width: CW });
  doc.fillColor(C.muted).font('Helvetica').fontSize(11)
    .text('An exhaustive, department-by-department analysis of every meaningful automation and AI opportunity across the school — admissions, academics, finance, operations, HR, transport, facilities, safety and leadership.', M, 258, { width: CW - 40, lineGap: 1.6 });
  doc.strokeColor(C.accent).lineWidth(1).moveTo(M, 328).lineTo(M + 120, 328).stroke();
  doc.fillColor(C.body).font('Helvetica').fontSize(9.4).text('Prepared by Smart Pursuit', M, 358, { width: CW });
  doc.fillColor(C.body).font('Helvetica').fontSize(9.4).text('For the school owner, principal and management team', M, 378, { width: CW });
  doc.fillColor(C.body).font('Helvetica').fontSize(9.4).text('Edition: Exhaustive opportunity study  ·  November 2026', M, 398, { width: CW });
  doc.fillColor(C.dim).font('Helvetica').fontSize(7.6)
    .text('This document classifies every finding as verified school-specific fact, publicly available evidence, industry-based operational hypothesis, or opportunity requiring management validation. No school-specific process is assumed to exist until confirmed by school management.', M, 728, { width: CW - 40, lineGap: 1.5 });
  footer(doc, 1, totalPages);

  // ---------- TOC ----------
  addPage(doc);
  sectionPageMap['TOC'] = pageCounter;
  headerRule(doc, 'Contents');
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(14).text('Contents', M, 54, { width: CW });
  const tocEntries = [
    ['1', 'Executive Summary'], ['2', 'School Business & Operational Understanding'],
    ['3', 'Department-Wise Process Assessment Framework'], ['4', 'Complete Process Inventory'],
    ['5', 'Complete Problem Register'], ['6', 'Complete Automation Opportunity Register'],
    ['7', 'Complete AI Assistance Opportunity Register'], ['8', 'Complete AI Agent Catalogue'],
    ['9', 'End-to-End Workflow Blueprints'], ['10', 'Technology & Integration Architecture'],
    ['11', 'Problem → Solution → Value Analysis'], ['12', 'Business Impact & ROI Estimates'],
    ['13', 'Risk & Dependency Register'], ['14', 'Prioritisation Matrix'],
    ['15', 'Implementation Roadmap'], ['16', 'Security, Privacy & Responsible AI Framework (DPDP)'],
    ['17', 'Smart Pursuit Implementation Approach'], ['18', 'Information Required from School Management'],
    ['19', 'Final Recommendations'],
    ['A', 'Appendix A — Full Opportunity Inventory (Master Table)'],
    ['B', 'Appendix B — Detailed Opportunity Specifications'],
    ['C', 'Appendix C — AI Agent Specifications'],
    ['D', 'Appendix D — Discovery Questionnaire'],
    ['E', 'Appendix E — Assumptions, Sources & Method Notes'],
  ];
  let ty = 84;
  tocEntries.forEach(([num, title]) => {
    const page = (tocPages && tocPages[title]) ? tocPages[title] : '';
    doc.fillColor(C.body).font('Helvetica-Bold').fontSize(8.6).text(s(num + '  ' + title), M, ty, { width: CW - 60 });
    doc.fillColor(C.muted).font('Helvetica').fontSize(8.6).text(String(page), CW - 40, ty, { width: 40, align: 'right' });
    ty += 15.5;
  });
  ty += 10;
  doc.fillColor(C.dim).font('Helvetica').fontSize(8)
    .text('Appendices contain the full opportunity inventory, detailed specifications, the discovery questionnaire, and source notes. Main report written for the school owner; appendices preserve technical depth.', M, ty, { width: CW - 40, lineGap: 1.5 });
  
  // ============================================================
  // SECTION 1 — EXECUTIVE SUMMARY
  // ============================================================
  let cy = sectionStart(doc, 1, 'Executive Summary', 'What this document is', 'S1');
  cy = para(doc, 'This blueprint is an exhaustive, department-by-department review of a school business in Vizianagaram, Andhra Pradesh. It identifies every meaningful opportunity for business-process automation, administrative workflow automation, AI-assisted work, AI agents, intelligent document processing, data integration, reporting and business intelligence, communication automation, operational monitoring, predictive analysis, custom AI applications and integrated digital systems.');
  cy = callout(doc, { tone: 'info', title: 'Core finding', text: 'A typical K-12 school runs 40 to 60 recurring manual processes across admissions, academics, finance, operations, HR, transport, facilities and leadership. Most are repetitive, trigger-based and document-heavy — exactly the shape automation and AI assistance handle well. No process is recommended for automation until school management verifies it exists.' });
  cy += 6;
  cy = para(doc, 'This document does not assume the school currently uses manual processes. It proposes opportunities, classifies each by evidence strength, and includes a discovery questionnaire (Appendix D) so school management can confirm what is real before anything is built.');
  cy = table(doc, [
    ['Scope dimension', 'Position in this document'],
    ['Departments covered', 'Admissions; parent & student communication; school office & administration; finance & fees; academic administration; teachers & classroom support; attendance & lifecycle; examinations; timetable & scheduling; HR; transport; facilities; inventory; library; IT; leadership; compliance; safety; events; other'],
    ['Solution types', 'Trigger-based automation, scheduled automation, approval workflows, document generation, AI assistance, AI agents, data integration, dashboards, alerts, predictive analysis'],
    ['Evidence rule', 'Every finding tagged verified / public / hypothesis / validate (Section 14)'],
    ['Privacy rule', 'DPDP Act 2023 / Rules 2025 applied to all child-data opportunities (Section 16)'],
    ['Page limit', 'None — length set by the number of distinct, valid opportunities'],
  ], { colWidths: [150, CW - 150] });
  cy += 8;
  cy = callout(doc, { tone: 'warn', title: 'What this document is NOT', text: 'It is not a sales pitch, not a price list, and not a promise of results. It contains no invented budgets, no fabricated case studies, no guaranteed savings, and no claims about internal processes that have not been inspected. Commercial scope and pricing are set at discovery.' });
  
  // ============================================================
  // SECTION 2 — SCHOOL BUSINESS & OPERATIONAL UNDERSTANDING
  // ============================================================
  cy = sectionStart(doc, 2, 'School Business & Operational Understanding', 'Context for the analysis', 'S2');
  cy = para(doc, 'A school is a service business with tightly coupled departments: marketing and admissions bring families in; academics delivers the product; finance collects fees; operations keeps the site running; leadership governs everything. Every department touches student and parent data, most of it belonging to children under 18, which brings the DPDP Act, 2023 into scope from 13 May 2027.');
  cy = table(doc, [
    ['Department', 'Core recurring output', 'Primary internal users', 'Typical data touched'],
    ['Admissions & recruitment', 'Enquiries converted to enrolments', 'Admission counsellors, office, principal', 'Parent contact, child details, documents, fees'],
    ['Parent & student communication', 'Circulars, notices, reminders, replies', 'Office, teachers, parents', 'Phone numbers, messages, language preference'],
    ['School office & administration', 'Student records, letters, certificates, registers', 'Office administrators', 'Personal details, academic history, documents'],
    ['Finance & fee management', 'Fee schedules, receipts, reconciliations', 'Accounts, vendors, parents', 'Payment records, concessions, refunds'],
    ['Academic administration', 'Calendars, syllabi, exam schedules, report cards', 'Teachers, coordinators, principal', 'Marks, syllabus, lesson plans'],
    ['Teachers & classroom support', 'Lesson plans, worksheets, progress summaries', 'Teachers, students', 'Student work, performance, observations'],
    ['Attendance & student lifecycle', 'Attendance records, transfers, withdrawals', 'Class teachers, office, parents', 'Daily attendance, absence reasons'],
    ['Examinations & assessment', 'Timetables, question papers, results, report cards', 'Exam cell, teachers, parents', 'Marks, answer scripts'],
    ['Timetable & resource scheduling', 'Class, teacher, room, lab schedules', 'Timetable coordinator, principal', 'Room and teacher availability'],
    ['Human resources', 'Recruitment, leave, payroll inputs, records', 'HR, staff, principal', 'Employee records, leave, salaries'],
    ['Transport', 'Bus routes, attendance, parent notifications', 'Transport coordinator, drivers, parents', 'Student location, routes, vehicle docs'],
    ['Facilities & maintenance', 'Repair requests, cleaning schedules, inspections', 'Maintenance staff, vendors', 'Asset condition, vendor records'],
    ['Inventory & procurement', 'Stock records, purchase orders, vendor invoices', 'Storekeeper, accounts, vendors', 'Stock levels, purchase history'],
    ['Library', 'Catalogue, issue/return, overdue reminders', 'Librarian, students, teachers', 'Book records, borrower details'],
    ['IT & helpdesk', 'Device management, access, support tickets', 'IT staff, all staff', 'Accounts, devices, passwords'],
    ['School management & leadership', 'Reports, approvals, dashboards', 'Owner, principal, management', 'Aggregated operational data'],
    ['Compliance & governance', 'Policy records, inspection prep, audit trails', 'Principal, management', 'Consent, licenses, incident records'],
    ['Safety & security', 'Incident reports, visitor logs, emergency contacts', 'Security staff, principal', 'Incident details, visitor identity'],
    ['Events & activities', 'Registrations, invitations, feedback, certificates', 'Event coordinator, parents, students', 'Participation, consent, feedback'],
  ], { colWidths: [105, 120, 100, CW - 325], size: 7.4, headerSize: 7 });
  cy += 8;
  cy = para(doc, 'Operating context for this market (Vizianagaram, Andhra Pradesh), drawn from public sources:');
  cy = bullets(doc, [
    'City population 2.29 lakh / 57,919 households; city literacy 81.07% vs district 53.21% (Census 2011).',
    '3,814 schools reported across the district directory; category split roughly 2,212 primary / 420 secondary / 267 higher-secondary (UDISE+ derived directory).',
    'Andhra Pradesh schools reopened 12 June 2026 for 2026–27, concentrating the admissions decision window between December and May.',
    'Live checks on 21 Nov 2026 showed leading local schools publishing no fees, no WhatsApp enquiry path and no campus-visit booking — a category-wide digital maturity gap.',
    'DPDP Act duties (verifiable parental consent for under-18 data, security, breach reporting) commence 13 May 2027.',
  ]);
  
  // ============================================================
  // SECTION 3 — DEPARTMENT-WISE PROCESS ASSESSMENT FRAMEWORK
  // ============================================================
  cy = sectionStart(doc, 3, 'Department-Wise Process Assessment Framework', 'How each department is assessed', 'S3');
  cy = para(doc, 'Each department is broken into individual processes. For every process we ask the twenty discovery questions from the brief: who performs it, what triggers it, frequency, information required and source, tools used, repetitive manual work, judgement required, multiple people/approvals, duplicate data entry, delays, failure impact, operational impact, redesign potential, automation potential, AI assistance, AI agent execution, integration needs, human approval, and measurement.');
  cy = table(doc, [
    ['Assessment lens', 'Question asked', 'Automation signal'],
    ['Repetition', 'Does the same task recur with the same steps?', 'High — schedule or trigger it'],
    ['Data entry', 'Is information typed into more than one place?', 'High — form-to-database'],
    ['Approvals', 'Does it wait on a person to sign off?', 'Medium — approval workflow'],
    ['Documents', 'Are letters, receipts or certificates generated by hand?', 'High — document generation'],
    ['Notifications', 'Are reminders sent manually by phone or email?', 'High — conditional notification'],
    ['Judgement', 'Does it require a human decision?', 'Low — keep human, AI can assist'],
    ['Exceptions', 'What happens when it fails?', 'Medium — exception handling & alerts'],
    ["Children's data", 'Does it process under-18 personal data?', 'Critical — DPDP consent & security first'],
  ], { colWidths: [95, CW - 255, CW - 350 - 95 + 55], size: 7.4, headerSize: 7 });
  cy += 8;
  cy = para(doc, 'Outcome of this section: a process inventory (Section 4), a problem register (Section 5), and opportunity registers (Sections 6–8). Every opportunity carries an ID (ADM-, FIN-, ACD-, HR-, PAR-, OPS-, IT-, TRN-, FAC-, LIB-, EVT-, COMP-, SAF-) and a priority classification.');
  
  // ============================================================
  // SECTION 4 — COMPLETE PROCESS INVENTORY
  // ============================================================
  cy = sectionStart(doc, 4, 'Complete Process Inventory', 'Department process map', 'S4');
  cy = para(doc, 'The full process inventory is maintained in Appendix B with one record per process. Below is the department-wise process map that drives the opportunity registers. Each process is listed so it can be validated during discovery.');
  const deptProcesses = {
    'Admissions & recruitment': ['Enquiry capture (phone, website, WhatsApp, walk-in)', 'Lead assignment to counsellor', 'Admission counselling', 'Follow-up scheduling', 'Lead qualification', 'Campus visit scheduling', 'Application processing', 'Admission document collection', 'Eligibility verification', 'Admission status tracking', 'Seat availability reporting', 'Admission pipeline reporting', 'Enquiry conversion analysis', 'Lost enquiry analysis', 'Admission campaign coordination', 'Re-enrolment & retention workflows'],
    'Parent & student communication': ['WhatsApp messages', 'Email newsletters', 'SMS notifications', 'Routine parent question replies', 'Circular distribution', 'Event notifications', 'Holiday announcements', 'Examination notifications', 'Fee reminders', 'Attendance notifications', 'Parent meeting scheduling', 'Complaint registration', 'Complaint routing', 'Query tracking', 'Multilingual communication', 'Communication history', 'Escalation management'],
    'School office & administration': ['Student record creation', 'Record updates', 'Document management', 'Data entry', 'Form processing', 'Certificate requests', 'Letter generation', 'Internal approvals', 'Task allocation', 'Office workflow tracking', 'Record retrieval', 'Repetitive reporting', 'Circular preparation', 'Registers & logs maintenance', 'Administrative checklists'],
    'Finance & fee management': ['Fee schedule maintenance', 'Fee reminders', 'Payment confirmation', 'Receipt generation', 'Pending payment identification', 'Fee reconciliation', 'Concession workflows', 'Refund requests', 'Expense recording', 'Invoice processing', 'Vendor payments', 'Budget tracking', 'Payroll preparation support', 'Financial summaries', 'Audit documentation'],
    'Academic administration': ['Academic calendar management', 'Syllabus tracking', 'Lesson plan administration', 'Academic documentation', 'Teaching resource preparation', 'Worksheet drafting', 'Question bank management', 'Examination scheduling', 'Marks collection', 'Result compilation', 'Report card preparation support', 'Academic progress summaries', 'Remedial support coordination', 'Assignment tracking', 'Academic performance reporting'],
    'Teachers & classroom support': ['Lesson preparation', 'Worksheet creation', 'Question generation', 'Teaching material search', 'Repetitive documentation', 'Student progress summaries', 'Parent meeting preparation', 'Homework communication', 'Teacher task reminders', 'Substitute teacher coordination', 'Internal knowledge access'],
    'Attendance & student lifecycle': ['Student attendance', 'Staff attendance', 'Absence notifications', 'Repeated absentee alerts', 'Late arrival tracking', 'Early departure records', 'Student transfers', 'Student withdrawal processing', 'Record updates', 'Student lifecycle documentation', 'Attendance reporting'],
    'Examinations & assessment': ['Examination timetable preparation', 'Invigilation scheduling', 'Question paper workflow', 'Marks entry coordination', 'Marks verification', 'Result compilation', 'Report card workflows', 'Examination reminders', 'Assessment analysis', 'Academic performance reporting', 'Rechecking request tracking'],
    'Timetable & resource scheduling': ['Class timetable preparation', 'Teacher allocation', 'Room allocation', 'Substitute teacher scheduling', 'Laboratory scheduling', 'Sports facility scheduling', 'Examination hall scheduling', 'Event resource allocation', 'Schedule conflict detection'],
    'Human resources': ['Recruitment administration', 'Applicant record management', 'Interview scheduling', 'Staff onboarding', 'Document collection', 'Employee records', 'Leave requests', 'Leave approvals', 'Staff attendance', 'Training coordination', 'Performance review administration', 'Payroll inputs', 'Staff communication', 'Exit formalities', 'Staff policy queries'],
    'Transport': ['Transport enquiries', 'Route information', 'Route allocation', 'Bus attendance', 'Parent notifications', 'Vehicle maintenance schedules', 'Driver documentation', 'Transport fee reminders', 'Route change requests', 'Transport complaints', 'Safety-related communication', 'Vehicle issue reporting'],
    'Facilities & maintenance': ['Maintenance requests', 'Repair tracking', 'Work allocation', 'Maintenance reminders', 'Cleaning schedules', 'Inspection checklists', 'Facility issue reporting', 'Equipment maintenance', 'Utility monitoring', 'Maintenance history', 'Vendor coordination'],
    'Inventory & procurement': ['Inventory records', 'Stock monitoring', 'Low-stock alerts', 'Purchase requests', 'Approval workflows', 'Quotation comparison support', 'Purchase order preparation', 'Vendor records', 'Invoice processing', 'Goods receipt records', 'Asset tracking', 'Consumables management', 'Reorder reminders'],
    'Library': ['Book catalogue management', 'Book issue & return', 'Overdue reminders', 'Library inventory', 'Book recommendations', 'Resource search', 'Digital learning resource organisation', 'Reading activity reporting'],
    'IT & helpdesk': ['Staff IT support requests', 'Password reset workflows', 'Device inventory', 'Software access requests', 'IT issue tracking', 'Website updates', 'User onboarding & offboarding', 'Backup monitoring', 'System availability monitoring', 'Access reviews', 'IT asset maintenance', 'Technology documentation'],
    'School management & leadership': ['Daily operational reports', 'Admission performance', 'Attendance summaries', 'Fee collection reporting', 'Academic summaries', 'Staff workload visibility', 'Pending approvals', 'Department coordination', 'Task completion tracking', 'Operational risk alerts', 'Management dashboards', 'Decision support'],
    'Compliance & governance': ['Document expiry tracking', 'Policy acknowledgements', 'Compliance calendars', 'Inspection preparation', 'Record maintenance', 'Approval trails', 'Audit documentation', 'Incident reporting', 'Data access reviews', 'Consent records', 'Regulatory reporting support'],
    'Safety & security': ['Incident reporting', 'Safety issue reporting', 'Visitor management', 'Emergency communication', 'Incident escalation', 'Safety checklist tracking', 'Transport safety workflows', 'Emergency contact records', 'Follow-up & resolution reporting'],
    'Events & activities': ['Event registration', 'Event reminders', 'Participation tracking', 'Event planning', 'Resource allocation', 'Parent invitations', 'Permission collection', 'Feedback collection', 'Certificate generation', 'Activity reporting', 'Alumni communication'],
  };
  const deptKeys = Object.keys(deptProcesses);
  deptKeys.forEach((dept) => {
    const items = deptProcesses[dept];
    need(doc, 30 + items.length * 14);
    doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(9).text(s(dept).toUpperCase(), M, doc.y, { characterSpacing: 1 });
    doc.y += 11;
    items.forEach((p, j) => {
      const line = `${j + 1}.  ${p}`;
      const h = doc.heightOfString(line, { width: CW - 20, fontSize: 7.8, lineGap: 1.2 });
      need(doc, h + 4);
      doc.fillColor(C.body).font('Helvetica').fontSize(7.8).text(s(line), M + 10, doc.y, { width: CW - 20, lineGap: 1.2 });
      doc.y += h + 3;
    });
    doc.y += 8;
  });
  cy = doc.y + 4;
  // ============================================================
  // SECTION 5 — COMPLETE PROBLEM REGISTER
  // ============================================================
  cy = sectionStart(doc, 5, 'Complete Problem Register', 'Problems identified per department', 'S5');
  cy = para(doc, 'Each process can generate one or more problems. The register below is seeded with industry-typical problems for school operations; each must be verified against the school actual practice during discovery. Problems feed directly into the opportunity registers (Sections 6–8).');
  cy = table(doc, [
    ['Dept', 'Problem ID', 'Problem', 'Evidence class', 'Verification method'],
    ['ADM', 'PRB-ADM-01', 'Enquiries captured on paper or WhatsApp with no central record', TAG.HYPOTHESIS, 'Ask counsellor; check for lead register/CRM'],
    ['ADM', 'PRB-ADM-02', 'Follow-ups depend on counsellor memory; lost enquiries not analysed', TAG.HYPOTHESIS, 'Review lost-enquiry log; observe follow-up practice'],
    ['FIN', 'PRB-FIN-01', 'Fee reminders sent manually; pending-payment list built by hand', TAG.HYPOTHESIS, 'Check fee software and reminder process'],
    ['FIN', 'PRB-FIN-02', 'Receipts generated manually; reconciliation takes days', TAG.HYPOTHESIS, 'Observe receipt issue and bank reconciliation'],
    ['ACD', 'PRB-ACD-01', 'Marks collected on paper; result compilation manual', TAG.HYPOTHESIS, 'Review exam result process'],
    ['OPS', 'PRB-OPS-01', 'Student records and certificates produced on request by hand', TAG.HYPOTHESIS, 'Time a certificate request'],
    ['HR', 'PRB-HR-01', 'Leave requests on paper; approvals tracked by email/chat', TAG.HYPOTHESIS, 'Review leave process'],
    ['COM', 'PRB-COM-01', 'Parent questions answered repeatedly by phone; no FAQ/auto-reply', TAG.HYPOTHESIS, 'Observe front-desk/phone volume'],
    ['TRN', 'PRB-TRN-01', 'Bus delay/route change info shared by phone group', TAG.HYPOTHESIS, 'Review transport communication channel'],
    ['SAF', 'PRB-SAF-01', 'Incident reports on paper; no escalation SLA', TAG.HYPOTHESIS, 'Review incident log'],
  ], { colWidths: [34, 62, CW - 266, 74, CW - 266 - 74 - 34 - 62], size: 7.2, headerSize: 6.8 });
  cy += 8;
  cy = callout(doc, { tone: 'validate', title: 'Validation required', text: 'Problem register entries marked [HYPOTHESIS] are industry-typical, not verified at this school. Confirm each during discovery before building a solution.' });
  
  // ============================================================
// ============================================================
// OPPORTUNITY DATA — shared by Sections 6, 7, 8, 11, 14
// ============================================================
const OPPORTUNITIES = [
  // ---------- Admissions ----------
  {id:'ADM-001',dept:'Admissions',process:'Central enquiry capture',user:'Admission counsellors',problem:'Enquiries from phone, WhatsApp, website and walk-ins are recorded on paper or in personal chats.',evidence:TAG.HYPOTHESIS,solution:'One enquiry form + WhatsApp Business API + phone log synced to a central lead database.',category:'Automation',workflow:'Enquiry arrives to lead record, assigned to a counsellor, status tracked.',trigger:'Inbound enquiry',input:'Parent name, phone, target class, channel',output:'Lead record with owner and status',technology:'CRM or Google Workspace + WhatsApp Business Platform',integrations:'Website form, WhatsApp, phone log',humanApproval:'None for capture',risk:'Duplicate leads across channels',effort:'Low',impact:'High',kpi:'Enquiries captured per week; % with complete details',dependencies:'Lead database set up',priority:'Immediate quick win'},
  {id:'ADM-002',dept:'Admissions',process:'Lead assignment & follow-up scheduling',user:'Admission counsellors',problem:'Follow-ups depend on counsellor memory; lost enquiries are not analysed.',evidence:TAG.HYPOTHESIS,solution:'Auto-assign leads by class/area and schedule follow-up tasks with reminders.',category:'Automation',workflow:'New lead -> auto-assign counsellor -> follow-up task created -> reminder before due date.',trigger:'Lead created or follow-up due',input:'Lead record, counsellor roster',output:'Assigned follow-up with reminder',technology:'CRM / task manager',integrations:'Lead database, calendar',humanApproval:'Counsellor confirms outcome',risk:'Tasks ignored if not reviewed',effort:'Low',impact:'High',kpi:'% leads with timely follow-up; lost-enquiry reasons logged',dependencies:'ADM-001',priority:'Immediate quick win'},
  {id:'ADM-003',dept:'Admissions',process:'Admission document collection & verification',user:'Office administrators',problem:'Application documents collected physically and checked by hand.',evidence:TAG.HYPOTHESIS,solution:'Document upload portal with AI-assisted extraction and eligibility flagging.',category:'AI assistance',workflow:'Parent uploads documents -> AI extracts key fields -> staff verifies against rules -> eligibility flag.',trigger:'Document upload',input:'Admission form, birth certificate, previous report card, address proof',output:'Verified document set, eligibility status',technology:'Document processing API + form portal',integrations:'Lead database, DPDP consent store',humanApproval:'Staff verifies extracted data',risk:'Extraction errors on poor scans',effort:'Medium',impact:'Medium',kpi:'Days from application to document-complete',dependencies:'ADM-001, DPDP consent flow',priority:'Short-term project'},
  {id:'ADM-004',dept:'Admissions',process:'Campus visit scheduling & reminders',user:'Front office',problem:'Campus visits booked by phone and confirmed manually.',evidence:TAG.HYPOTHESIS,solution:'Online visit booking with automated confirmation and reminder messages.',category:'Automation',workflow:'Parent selects slot -> booking confirmed -> reminder sent 24h and morning-of -> attendance marked.',trigger:'Parent books visit',input:'Parent contact, child name, preferred date/time',output:'Confirmed visit slot, reminder log',technology:'Booking tool + WhatsApp/SMS',integrations:'Calendar, lead database',humanApproval:'None',risk:'No-shows not tracked',effort:'Low',impact:'Medium',kpi:'Visit-to-enquiry ratio; no-show rate',dependencies:'ADM-001',priority:'Immediate quick win'},
  {id:'ADM-005',dept:'Admissions',process:'Seat availability reporting',user:'Admission counsellors, principal',problem:'Seat availability checked manually before telling parents.',evidence:TAG.HYPOTHESIS,solution:'Live seat-count dashboard updated as admissions are confirmed.',category:'Automation',workflow:'Admission confirmed -> seat count decremented -> dashboard refreshed for counsellors.',trigger:'Admission confirmed',input:'Class, section',output:'Live seat availability by class',technology:'Dashboard / sheet with live count',integrations:'Admission register',humanApproval:'None',risk:'Double-booking if two admissions processed at once',effort:'Low',impact:'Medium',kpi:'Time to answer seat-availability query',dependencies:'ADM-001',priority:'Immediate quick win'},
  {id:'ADM-006',dept:'Admissions',process:'Enquiry conversion & lost-enquiry analysis',user:'Principal, management',problem:'Conversion and drop-off reasons not tracked systematically.',evidence:TAG.HYPOTHESIS,solution:'Conversion funnel report with loss-reason codes reviewed monthly.',category:'AI assistance',workflow:'Leads tagged by stage and loss reason -> monthly funnel report -> root-cause notes.',trigger:'Monthly review',input:'Lead stage history, loss reasons',output:'Conversion funnel, top loss reasons',technology:'Dashboard / BI',integrations:'Lead database',humanApproval:'Principal reviews',risk:'Loss reasons not recorded consistently',effort:'Medium',impact:'High',kpi:'Enquiry-to-admission conversion %',dependencies:'ADM-001, ADM-002',priority:'Short-term project'},

  // ---------- Finance ----------
  {id:'FIN-001',dept:'Finance & fees',process:'Fee reminders & pending-payment identification',user:'Accounts team',problem:'Fee reminders sent manually; pending-payment list built by hand each cycle.',evidence:TAG.HYPOTHESIS,solution:'Automated fee reminders by WhatsApp/SMS and email, triggered by due date and payment status.',category:'Automation',workflow:'Fee due date approaches -> system identifies unpaid students -> reminders sent -> payment status updated.',trigger:'Scheduled (weekly / before due date)',input:'Fee schedule, payment records',output:'Reminder log, pending-payment list',technology:'Fee software or sheet + WhatsApp/SMS',integrations:'Fee ledger, parent contact store',humanApproval:'Accounts reviews before bulk send',risk:'Reminders sent to already-paid parents if sync lags',effort:'Low',impact:'High',kpi:'% reminders paid within 7 days; days to collect',dependencies:'Fee ledger digitised',priority:'Immediate quick win'},
  {id:'FIN-002',dept:'Finance & fees',process:'Receipt generation & fee reconciliation',user:'Accounts team',problem:'Receipts generated by hand; reconciliation with bank takes days.',evidence:TAG.HYPOTHESIS,solution:'Auto-generated digital receipts on payment and automated bank-reconciliation matching.',category:'Automation',workflow:'Payment received -> digital receipt issued -> bank statement matched -> ledger updated.',trigger:'Payment received',input:'Payment transaction, student ID',output:'Digital receipt, reconciled ledger entry',technology:'Payment gateway + accounting/sheet',integrations:'Bank (statement import or gateway webhook)',humanApproval:'Accounts approves matches',risk:'Manual match errors',effort:'Medium',impact:'High',kpi:'Days to reconcile; receipts issued same day %',dependencies:'Digital payment mode',priority:'Short-term project'},
  {id:'FIN-003',dept:'Finance & fees',process:'Concession workflows & approvals',user:'Accounts, principal',problem:'Concession requests handled on paper with ad-hoc approvals.',evidence:TAG.HYPOTHESIS,solution:'Digital concession request with rule-based approval routing.',category:'Automation',workflow:'Parent applies -> rule checks eligibility -> routes to approver -> decision recorded.',trigger:'Concession request',input:'Student, concession type, supporting document',output:'Approved/rejected concession, adjusted fee',technology:'Form + approval workflow',integrations:'Fee ledger',humanApproval:'Principal or accounts',risk:'Inconsistent eligibility calls',effort:'Low',impact:'Medium',kpi:'Days to decide concession',dependencies:'FIN-001',priority:'Short-term project'},
  {id:'FIN-004',dept:'Finance & fees',process:'Refund requests',user:'Accounts',problem:'Refunds processed manually with no tracking.',evidence:TAG.HYPOTHESIS,solution:'Refund request form with status tracking and approval.',category:'Automation',workflow:'Refund requested -> eligibility checked -> approved -> payment initiated -> status updated.',trigger:'Refund request',input:'Student, amount, reason, bank details',output:'Refund processed, status log',technology:'Form + payment initiation',integrations:'Fee ledger, bank',humanApproval:'Accounts + principal',risk:'Duplicate or fraudulent claims',effort:'Low',impact:'Low',kpi:'Days to process refund',dependencies:'FIN-002',priority:'Medium-term workflow'},
  {id:'FIN-005',dept:'Finance & fees',process:'Vendor payments & invoice processing',user:'Accounts',problem:'Vendor invoices received and keyed in manually.',evidence:TAG.HYPOTHESIS,solution:'AI-assisted invoice extraction and three-way match before payment.',category:'AI assistance',workflow:'Invoice uploaded -> AI extracts vendor, amount, date -> matched to PO and GRN -> queued for payment.',trigger:'Invoice received',input:'Vendor invoice, purchase order',output:'Extracted invoice data, payment queue',technology:'Document extraction API',integrations:'Accounting, PO system',humanApproval:'Accounts verifies extraction',risk:'Extraction errors on non-standard invoices',effort:'Medium',impact:'Medium',kpi:'Days from invoice to payment',dependencies:'PO process',priority:'Medium-term workflow'},
  {id:'FIN-006',dept:'Finance & fees',process:'Fee collection reporting dashboard',user:'Principal, management',problem:'Fee collection figures compiled by hand at month-end.',evidence:TAG.HYPOTHESIS,solution:'Live fee-collection dashboard by class, month, and payment mode.',category:'AI assistance',workflow:'Payments flow in -> dashboard updates daily -> variance vs target flagged.',trigger:'Daily',input:'Payment records',output:'Collection dashboard, variance alerts',technology:'Dashboard / BI',integrations:'Fee ledger',humanApproval:'None',risk:'Data lag if ledger not current',effort:'Medium',impact:'High',kpi:'Collection % vs target; overdue amount',dependencies:'FIN-001, FIN-002',priority:'Short-term project'},

  // ---------- Academics ----------
  {id:'ACD-001',dept:'Academic administration',process:'Syllabus & lesson-plan tracking',user:'Teachers, academic coordinator',problem:'Syllabus coverage and lesson plans tracked in separate files.',evidence:TAG.HYPOTHESIS,solution:'Central syllabus tracker with lesson-plan links and coverage progress.',category:'Automation',workflow:'Teacher updates lesson plan -> coverage % computed -> coordinator reviews.',trigger:'Weekly',input:'Class, subject, topics taught',output:'Coverage dashboard',technology:'Sheet or LMS',integrations:'Class timetable',humanApproval:'Coordinator reviews',risk:'Teachers do not keep it current',effort:'Low',impact:'Medium',kpi:'Syllabus coverage % by term',dependencies:'Timetable digitised',priority:'Immediate quick win'},
  {id:'ACD-002',dept:'Academic administration',process:'Worksheet & question-paper drafting',user:'Teachers',problem:'Teachers draft worksheets and question papers from scratch each time.',evidence:TAG.HYPOTHESIS,solution:'AI-assisted drafting from topic and class level, stored in a shared question bank.',category:'AI assistance',workflow:'Teacher specifies topic/class -> AI drafts questions -> teacher reviews and saves to bank.',trigger:'Teacher request',input:'Topic, class, difficulty, marks',output:'Draft worksheet / question paper',technology:'AI text model',integrations:'Question bank, LMS',humanApproval:'Teacher reviews and approves',risk:'Generic or inaccurate questions',effort:'Medium',impact:'Medium',kpi:'Hours saved per worksheet; reuse rate',dependencies:'None',priority:'Medium-term workflow'},
  {id:'ACD-003',dept:'Academic administration',process:'Marks collection & result compilation',user:'Teachers, exam cell',problem:'Marks collected on paper; results compiled manually.',evidence:TAG.HYPOTHESIS,solution:'Digital marks entry with automated result compilation and validation.',category:'Automation',workflow:'Teacher enters marks -> system validates ranges -> compiles results -> flags anomalies.',trigger:'After each exam',input:'Student marks by subject',output:'Compiled results, anomaly flags',technology:'Marks entry module',integrations:'Student records',humanApproval:'Exam cell approves publication',risk:'Entry errors propagate',effort:'Medium',impact:'High',kpi:'Days to publish results',dependencies:'Student records digitised',priority:'Short-term project'},
  {id:'ACD-004',dept:'Academic administration',process:'Report card preparation',user:'Teachers, office',problem:'Report cards assembled by hand from compiled marks.',evidence:TAG.HYPOTHESIS,solution:'Automated report-card generation from compiled marks with templates.',category:'AI assistance',workflow:'Marks confirmed -> report card generated per student -> PDF issued to parents.',category2:null,'workflow':'Result published -> report card generated -> distributed via portal.',trigger:'Result publication',input:'Compiled marks, student details',output:'Report card PDFs',technology:'Document generation',integrations:'Marks module, parent portal',humanApproval:'Class teacher reviews',risk:'Template errors affect all cards',effort:'Medium',impact:'Medium',kpi:'Days to issue report cards',dependencies:'ACD-003',priority:'Short-term project'},
  {id:'ACD-005',dept:'Academic administration',process:'Academic performance reporting',user:'Principal, academic coordinator',problem:'Performance trends analysed by hand.',evidence:TAG.HYPOTHESIS,solution:'AI-assisted performance summaries highlighting at-risk students and subject trends.',category:'AI assistance',workflow:'Results stored -> AI summarises trends and flags at-risk students -> coordinator reviews.',trigger:'Term-end',input:'Compiled results, attendance',output:'Performance summary, at-risk list',technology:'Analytics / AI summary',integrations:'Marks, attendance',humanApproval:'Coordinator acts on flags',risk:'False flags without context',effort:'Medium',impact:'High',kpi:'At-risk students identified and supported',dependencies:'ACD-003, attendance digitised',priority:'Medium-term workflow'},
  {id:'ACD-006',dept:'Academic administration',process:'Remedial support coordination',user:'Teachers, coordinator',problem:'Remedial classes tracked informally.',evidence:TAG.HYPOTHESIS,solution:'Remedial support tracker linking at-risk students to support sessions and progress.',category:'Automation',workflow:'At-risk student flagged -> remedial session assigned -> attendance and progress logged.',trigger:'At-risk flag',input:'Student, subject, support type',output:'Remedial plan, progress log',technology:'Tracker',integrations:'Performance report',humanApproval:'Coordinator assigns',risk:'Sessions not attended',effort:'Low',impact:'Medium',kpi:'Remedial sessions held; improvement rate',dependencies:'ACD-005',priority:'Medium-term workflow'},

  // ---------- HR ----------
  {id:'HR-001',dept:'Human resources',process:'Staff onboarding & document collection',user:'HR',problem:'New-staff onboarding and document collection handled by email and paper.',evidence:TAG.HYPOTHESIS,solution:'Digital onboarding checklist with document collection and account provisioning tasks.',category:'Automation',workflow:'Offer accepted -> onboarding checklist created -> document collection -> account provisioning -> sign-off.',trigger:'New hire',input:'Staff details, role, documents',output:'Completed onboarding, active accounts',technology:'Onboarding tracker',integrations:'HR records, IT provisioning',humanApproval:'HR sign-off',risk:'Steps skipped',effort:'Low',impact:'Medium',kpi:'Days to complete onboarding',dependencies:'None',priority:'Short-term project'},
  {id:'HR-002',dept:'Human resources',process:'Leave requests & approvals',user:'Staff, principal',problem:'Leave requests on paper; approvals tracked by email or chat.',evidence:TAG.HYPOTHESIS,solution:'Digital leave request with routing, approval, and balance tracking.',category:'Automation',workflow:'Staff applies -> routes to approver -> decision -> balance updated -> calendar blocked.',trigger:'Leave request',input:'Staff, dates, leave type, reason',output:'Approved/rejected leave, calendar entry',technology:'Leave module',integrations:'HR records, calendar',humanApproval:'Approver (HoD/principal)',risk:'Approver delay',effort:'Low',impact:'High',kpi:'Days to approve leave',dependencies:'None',priority:'Immediate quick win'},
  {id:'HR-003',dept:'Human resources',process:'Payroll inputs preparation',user:'HR, accounts',problem:'Payroll inputs (attendance, leaves, incentives) compiled manually.',evidence:TAG.HYPOTHESIS,solution:'Automated payroll-input extract from attendance and leave systems.',category:'Automation',workflow:'Month-end -> attendance and leave data extracted -> payroll input file generated.',trigger:'Monthly',input:'Attendance, leave, incentives',output:'Payroll input file',technology:'Sheet or payroll module',integrations:'Attendance, leave',humanApproval:'HR validates',risk:'Missing records',effort:'Low',impact:'Medium',kpi:'Hours to prepare payroll inputs',dependencies:'HR-002, attendance digitised',priority:'Short-term project'},
  {id:'HR-004',dept:'Human resources',process:'Staff policy queries',user:'Staff, HR',problem:'Staff repeatedly ask HR the same policy questions.',evidence:TAG.HYPOTHESIS,solution:'AI-powered HR policy assistant answering from the staff handbook.',category:'AI assistance',workflow:'Staff asks question -> assistant answers from handbook -> escalates to HR if unanswered.',trigger:'Staff query',input:'Policy question',output:'Answer or HR escalation',technology:'RAG assistant',integrations:'Staff handbook',humanApproval:'HR reviews escalations',risk:'Incorrect policy answer',effort:'Medium',impact:'Medium',kpi:'HR policy queries answered',dependencies:'Handbook digitised',priority:'Medium-term workflow'},

  // ---------- Parent communication ----------
  {id:'PAR-001',dept:'Parent communication',process:'Routine parent questions',user:'Front office, teachers',problem:'Same routine questions (fees, holidays, events) answered by phone repeatedly.',evidence:TAG.HYPOTHESIS,solution:'Conversational AI assistant for parents handling routine questions in preferred language.',category:'AI agent',workflow:'Parent messages assistant -> assistant answers from knowledge base -> hands off to staff for complex cases.',trigger:'Parent message',input:'Question, language',output:'Answer or staff handoff',technology:'Conversational AI (WhatsApp)',integrations:'FAQ, school calendar, fee status',humanApproval:'Staff takes over complex cases',risk:'Wrong answer on safety-critical topics',effort:'Medium',impact:'High',kpi:'% routine questions auto-resolved',dependencies:'FAQ digitised, DPDP consent',priority:'Immediate quick win'},
  {id:'PAR-002',dept:'Parent communication',process:'Circular & event notification distribution',user:'Office',problem:'Circulars sent by WhatsApp broadcast manually, with no delivery tracking.',evidence:TAG.HYPOTHESIS,solution:'Template-based circular distribution with delivery and read receipts.',category:'Automation',workflow:'Circular drafted -> template -> sent to target group -> delivery tracked.',trigger:'Circular ready',input:'Message, recipient group',output:'Delivery log',technology:'WhatsApp Business / SMS',integrations:'Parent contact store',humanApproval:'Office approves send',risk:'Message to wrong group',effort:'Low',impact:'Medium',kpi:'% circulars delivered; read rate',dependencies:'Contact store digitised',priority:'Immediate quick win'},
  {id:'PAR-003',dept:'Parent communication',process:'Complaint registration, routing & tracking',user:'Office, principal',problem:'Complaints received informally with no tracking or SLA.',evidence:TAG.HYPOTHESIS,solution:'Complaint ticketing system with routing, SLA, and resolution tracking.',category:'Automation',workflow:'Complaint logged -> ticket created -> routed to owner -> SLA timer -> resolution and closure.',trigger:'Complaint received',input:'Parent, issue, category',output:'Ticket, resolution log',technology:'Ticketing system',integrations:'Staff roster',humanApproval:'Principal reviews escalations',risk:'Complaints not logged',effort:'Medium',impact:'High',kpi:'Complaints resolved within SLA',dependencies:'None',priority:'Short-term project'},
  {id:'PAR-004',dept:'Parent communication',process:'Multilingual communication',user:'Office',problem:'Non-English-speaking parents struggle with English-only notices.',evidence:TAG.HYPOTHESIS,solution:'AI-assisted translation of key notices into local languages before distribution.',category:'AI assistance',workflow:'Notice drafted -> AI translates -> staff reviews -> sent in multiple languages.',trigger:'Notice ready',input:'Notice text, target languages',output:'Translated notices',technology:'Translation API',integrations:'Circular distribution',humanApproval:'Staff reviews translation',risk:'Translation nuance errors',effort:'Low',impact:'Medium',kpi:'Notices available in local languages',dependencies:'PAR-002',priority:'Short-term project'},

  // ---------- Office / operations ----------
  {id:'OPS-001',dept:'School office',process:'Student record creation & updates',user:'Office administrators',problem:'Student records created and updated by hand in registers.',evidence:TAG.HYPOTHESIS,solution:'Digital student record with update workflow and change log.',category:'Automation',workflow:'New student -> record created -> updates logged with date and user.',trigger:'Admission or update',input:'Student details, documents',output:'Digital student record',technology:'Student information system',integrations:'Admissions, fee',humanApproval:'Office verifies',risk:'Duplicate records',effort:'Low',impact:'High',kpi:'Records digitised %',dependencies:'ADM-001',priority:'Immediate quick win'},
  {id:'OPS-002',dept:'School office',process:'Certificate & letter generation',user:'Office',problem:'Certificates (bonafide, transfer) and letters generated by hand.',evidence:TAG.HYPOTHESIS,solution:'Template-based certificate and letter generation on request.',category:'Automation',workflow:'Request received -> template populated -> document issued -> log updated.',trigger:'Request',input:'Student, document type, recipient',output:'Generated document',technology:'Document generation',integrations:'Student records',humanApproval:'Office approves issue',risk:'Wrong template data',effort:'Low',impact:'Medium',kpi:'Days to issue certificate',dependencies:'OPS-001',priority:'Short-term project'},
  {id:'OPS-003',dept:'School office',process:'Office task allocation & workflow tracking',user:'Office manager',problem:'Office tasks allocated informally with no tracking.',evidence:TAG.HYPOTHESIS,solution:'Task board with assignment, status, and deadline tracking.',category:'Automation',workflow:'Task created -> assigned -> status updated -> overdue alerts.',trigger:'Task needed',input:'Task, owner, deadline',output:'Task status, overdue alerts',technology:'Task manager',integrations:'Staff roster',humanApproval:'Office manager assigns',risk:'Tasks abandoned',effort:'Low',impact:'Medium',kpi:'Tasks completed on time %',dependencies:'None',priority:'Short-term project'},
  {id:'OPS-004',dept:'School office',process:'Repetitive reporting',user:'Office, principal',problem:'Daily/weekly operational reports compiled by hand.',evidence:TAG.HYPOTHESIS,solution:'Automated operational report assembled from live systems.',category:'AI assistance',workflow:'Systems updated -> report assembled -> distributed to principal.',trigger:'Daily/weekly',input:'Admissions, attendance, fees, complaints',output:'Operational report',technology:'Dashboard / report builder',integrations:'All source systems',humanApproval:'None',risk:'Stale source data',effort:'Medium',impact:'Medium',kpi:'Reports produced on schedule',dependencies:'Multiple source systems',priority:'Medium-term workflow'},
  {id:'OPS-005',dept:'School office',process:'Registers & logs maintenance',user:'Office',problem:'Physical registers and logs hard to search and audit.',evidence:TAG.HYPOTHESIS,solution:'Digital register with search and export for audit.',category:'Automation',workflow:'Entries logged digitally -> searchable -> exported for audit when needed.',trigger:'Entry needed',input:'Register type, entry details',output:'Digital register entry',technology:'Register module',integrations:'Student/staff records',humanApproval:'None',risk:'Not kept current',effort:'Low',impact:'Medium',kpi:'Registers digitised %',dependencies:'OPS-001',priority:'Short-term project'},

  // ---------- IT ----------
  {id:'IT-001',dept:'IT & helpdesk',process:'Staff IT support & password resets',user:'IT staff, all staff',problem:'IT support requests informal; password resets ad-hoc.',evidence:TAG.HYPOTHESIS,solution:'AI helpdesk agent handling common issues and routing tickets.',category:'AI agent',workflow:'Staff reports issue -> agent suggests fix -> creates ticket if unresolved -> IT resolves.',trigger:'IT issue reported',input:'Issue description, staff',output:'Suggested fix or ticket',technology:'Conversational AI + ticketing',integrations:'IT asset list, directory',humanApproval:'IT reviews tickets',risk:'Wrong fix suggestion',effort:'Medium',impact:'Medium',kpi:'IT tickets resolved; auto-resolved %',dependencies:'None',priority:'Short-term project'},
  {id:'IT-002',dept:'IT & helpdesk',process:'Device inventory & software access requests',user:'IT staff',problem:'Device and software-access records kept in sheets.',evidence:TAG.HYPOTHESIS,solution:'Device inventory with access-request workflow and renewal reminders.',category:'Automation',workflow:'Request submitted -> approved -> device/access assigned -> renewal reminder.',trigger:'Access request',input:'Staff, device/software',output:'Assigned asset/access',technology:'Inventory module',integrations:'HR records',humanApproval:'IT approves',risk:'Unreviewed access',effort:'Low',impact:'Medium',kpi:'Assets tracked %',dependencies:'None',priority:'Short-term project'},
  {id:'IT-003',dept:'IT & helpdesk',process:'Website & portal content updates',user:'IT, office',problem:'Website and portal updated manually and infrequently.',evidence:TAG.HYPOTHESIS,solution:'Template-based content publishing with scheduled updates.',category:'Automation',workflow:'Content drafted -> approved -> published to site/portal on schedule.',trigger:'Content ready',input:'Page, content, publish date',output:'Published page',technology:'CMS / website builder',integrations:'None',humanApproval:'Office approves',risk:'Stale content',effort:'Low',impact:'Low',kpi:'Pages updated on schedule',dependencies:'None',priority:'Medium-term workflow'},
  {id:'IT-004',dept:'IT & helpdesk',process:'User onboarding & offboarding',user:'IT, HR',problem:'Staff joining/leaving account creation/revocation manual.',evidence:TAG.HYPOTHESIS,solution:'Automated account creation on join and revocation on exit tied to HR events.',category:'Automation',workflow:'HR marks join/exit -> IT creates/revokes accounts -> confirmation logged.',trigger:'HR join/exit event',input:'Staff, role, start/end date',output:'Accounts created/revoked',technology:'Identity provisioning',integrations:'HR records, directory',humanApproval:'IT executes',risk:'Delayed revocation on exit',effort:'Medium',impact:'Medium',kpi:'Account provisioning time',dependencies:'HR-001',priority:'Short-term project'},

  // ---------- Transport ----------
  {id:'TRN-001',dept:'Transport',process:'Transport enquiries & route allocation',user:'Transport coordinator',problem:'Transport enquiries and route allocation handled by phone.',evidence:TAG.HYPOTHESIS,solution:'Transport request form with route-allocation workflow.',category:'Automation',workflow:'Parent requests transport -> route checked -> assigned or waitlisted -> confirmed.',trigger:'Transport request',input:'Student, address, route',output:'Route assignment',technology:'Form + route tool',integrations:'Student records, transport fee',humanApproval:'Transport coordinator approves',risk:'Route capacity exceeded',effort:'Low',impact:'Medium',kpi:'Transport requests processed',dependencies:'None',priority:'Short-term project'},
  {id:'TRN-002',dept:'Transport',process:'Bus attendance & parent notifications',user:'Transport coordinator, drivers',problem:'Bus attendance and delay notifications by phone group.',evidence:TAG.HYPOTHESIS,solution:'Digital bus attendance with automated delay/route-change parent alerts.',category:'Automation',workflow:'Driver marks attendance -> system detects delay -> alerts affected parents.',trigger:'Daily bus run',input:'Student, bus, stop',output:'Attendance, delay alerts',technology:'Bus app + SMS/WhatsApp',integrations:'Student records, parent contacts',humanApproval:'Driver confirms',risk:'Phone not charged/used',effort:'Medium',impact:'High',kpi:'Parents receiving delay alerts %',dependencies:'TRN-001',priority:'Short-term project'},
  {id:'TRN-003',dept:'Transport',process:'Vehicle maintenance & driver documents',user:'Transport coordinator',problem:'Vehicle maintenance and driver documents tracked on paper.',evidence:TAG.HYPOTHESIS,solution:'Maintenance scheduler and driver-document expiry tracker with reminders.',category:'Automation',workflow:'Service due -> reminder -> service logged -> next due scheduled; document expiry alerted.',trigger:'Scheduled / expiry near',input:'Vehicle, driver, document',output:'Service log, expiry alerts',technology:'Maintenance tracker',integrations:'None',humanApproval:'Transport coordinator',risk:'Missed safety item',effort:'Low',impact:'Medium',kpi:'Vehicles serviced on time %',dependencies:'None',priority:'Short-term project'},

  // ---------- Facilities ----------
  {id:'FAC-001',dept:'Facilities & maintenance',process:'Maintenance requests & work allocation',user:'Maintenance staff, vendors',problem:'Maintenance requests reported informally with no tracking.',evidence:TAG.HYPOTHESIS,solution:'Maintenance ticketing with assignment, priority, and closure tracking.',category:'Automation',workflow:'Request logged -> ticket -> assigned to staff/vendor -> resolved -> closed.',trigger:'Maintenance request',input:'Issue, location, urgency',output:'Ticket, resolution log',technology:'Ticketing system',integrations:'Vendor list',humanApproval:'Facilities approves vendor',risk:'Urgent items missed',effort:'Medium',impact:'High',kpi:'Requests resolved within SLA',dependencies:'None',priority:'Short-term project'},
  {id:'FAC-002',dept:'Facilities & maintenance',process:'Cleaning schedules & inspection checklists',user:'Housekeeping',problem:'Cleaning schedules and inspections on paper.',evidence:TAG.HYPOTHESIS,solution:'Digital cleaning schedule with checklist completion and verification.',category:'Automation',workflow:'Schedule assigned -> staff completes checklist -> supervisor verifies.',trigger:'Daily schedule',input:'Area, checklist items',output:'Completion log',technology:'Checklist app',integrations:'None',humanApproval:'Supervisor verifies',risk:'Pencil-whipping',effort:'Low',impact:'Medium',kpi:'Checklists completed %',dependencies:'None',priority:'Short-term project'},
  {id:'FAC-003',dept:'Facilities & maintenance',process:'Equipment maintenance & vendor coordination',user:'Maintenance',problem:'Equipment maintenance and vendor records manual.',evidence:TAG.HYPOTHESIS,solution:'Equipment register with maintenance calendar and vendor performance log.',category:'Automation',workflow:'Equipment registered -> maintenance scheduled -> vendor work logged -> performance rated.',trigger:'Equipment added / service due',input:'Equipment, vendor, service',output:'Maintenance log, vendor rating',technology:'Asset register',integrations:'Vendor list',humanApproval:'Maintenance approves',risk:'Vendor not vetted',effort:'Medium',impact:'Medium',kpi:'Equipment uptime; breakdowns',dependencies:'None',priority:'Medium-term workflow'},
  {id:'FAC-004',dept:'Facilities & maintenance',process:'Utility monitoring',user:'Office',problem:'Utility usage not tracked for anomalies.',evidence:TAG.HYPOTHESIS,solution:'Utility meter readings logged with anomaly alerts.',category:'AI assistance',workflow:'Readings logged -> compared to baseline -> anomalies flagged.',trigger:'Periodic reading',input:'Meter readings',output:'Usage log, anomaly alerts',technology:'Logger + alerts',integrations:'None',humanApproval:'Office reviews',risk:'Manual reading errors',effort:'Medium',impact:'Low',kpi:'Utility cost trend',dependencies:'None',priority:'Future opportunity'},

  // ---------- Library ----------
  {id:'LIB-001',dept:'Library',process:'Book catalogue & issue/return tracking',user:'Librarian, students',problem:'Catalogue and issue/return tracked in registers.',evidence:TAG.HYPOTHESIS,solution:'Digital catalogue with issue/return and overdue tracking.',category:'Automation',workflow:'Book issued/returned -> record updated -> overdue auto-flagged.',trigger:'Issue or return',input:'Book, student',output:'Updated catalogue, overdue list',technology:'Library module',integrations:'Student records',humanApproval:'Librarian',risk:'Not scanned consistently',effort:'Low',impact:'Medium',kpi:'Books tracked %',dependencies:'None',priority:'Short-term project'},
  {id:'LIB-002',dept:'Library',process:'Overdue reminders',user:'Librarian',problem:'Overdue reminders sent manually.',evidence:TAG.HYPOTHESIS,solution:'Automated overdue reminders to students and parents.',category:'Automation',workflow:'Overdue detected -> reminder sent -> escalation if not returned.',trigger:'Overdue',input:'Book, borrower',output:'Reminder log',technology:'Reminder engine',integrations:'LIB-001, parent contacts',humanApproval:'None',effort:'Low',impact:'Medium',kpi:'Overdue books returned %',dependencies:'LIB-001',priority:'Short-term project'},

  // ---------- Events ----------
  {id:'EVT-001',dept:'Events & activities',process:'Event registration & permission collection',user:'Event coordinator, parents',problem:'Event registration and permission slips on paper.',evidence:TAG.HYPOTHESIS,solution:'Digital event registration with permission collection.',category:'Automation',workflow:'Event published -> parents register and give permission -> confirmations logged.',trigger:'Event created',input:'Event details, parent consent',output:'Registrations, permissions',technology:'Form + consent capture',integrations:'Student records, DPDP consent',humanApproval:'None',risk:'Permission not captured',effort:'Low',impact:'Medium',kpi:'Event registrations %',dependencies:'None',priority:'Short-term project'},
  {id:'EVT-002',dept:'Events & activities',process:'Feedback collection & certificates',user:'Event coordinator',problem:'Feedback and certificates after events handled manually.',evidence:TAG.HYPOTHESIS,solution:'Post-event feedback form and automated certificate generation.',category:'Automation',workflow:'Event ends -> feedback form sent -> responses logged -> certificates issued.',trigger:'Event complete',input:'Attendees, event',output:'Feedback, certificates',technology:'Form + document generation',integrations:'None',humanApproval:'None',effort:'Low',impact:'Low',kpi:'Feedback response rate',dependencies:'EVT-001',priority:'Medium-term workflow'},

  // ---------- Compliance ----------
  {id:'COMP-001',dept:'Compliance & governance',process:'Document expiry tracking',user:'Office, principal',problem:'Licences, policies and certificates expiry not tracked centrally.',evidence:TAG.HYPOTHESIS,solution:'Compliance calendar with document-expiry alerts.',category:'Automation',workflow:'Document registered with expiry -> alert before expiry -> renewal tracked.',trigger:'Document added / expiry near',input:'Document, expiry date, owner',output:'Expiry alerts, renewal log',technology:'Compliance tracker',integrations:'None',humanApproval:'Principal reviews',risk:'Expired licence',effort:'Low',impact:'High',kpi:'Documents expiring within 30 days',dependencies:'None',priority:'Immediate quick win'},
  {id:'COMP-002',dept:'Compliance & governance',process:'Policy acknowledgements & consent records',user:'Office, HR',problem:'Policy sign-offs and consent records on paper.',evidence:TAG.HYPOTHESIS,solution:'Digital consent and acknowledgement records linked to DPDP requirements.',category:'Automation',workflow:'Consent requested -> parent/staff signs digitally -> record stored with timestamp.',category2:null,'workflow':'Consent captured -> stored with purpose and date -> withdrawable.',trigger:'Onboarding / policy update',input:'Person, consent type, purpose',output:'Consent record',technology:'Consent manager',integrations:'DPDP store',humanApproval:'None',risk:'Consent not verifiable',effort:'Medium',impact:'High',kpi:'Consent capture %',dependencies:'DPDP readiness',priority:'Short-term project'},
  {id:'COMP-003',dept:'Compliance & governance',process:'Compliance calendar & inspection preparation',user:'Principal, management',problem:'Inspection preparation ad-hoc; compliance evidence scattered.',evidence:TAG.HYPOTHESIS,solution:'Compliance calendar with inspection checklist and evidence links.',category:'Automation',workflow:'Compliance items scheduled -> evidence uploaded -> readiness reviewed before inspection.',trigger:'Scheduled date',input:'Requirement, evidence, owner',output:'Compliance calendar, readiness status',technology:'Compliance tracker',integrations:'Document store',humanApproval:'Principal',risk:'Evidence missing',effort:'Medium',impact:'High',kpi:'Compliance items current %',dependencies:'COMP-001',priority:'Short-term project'},
  {id:'COMP-004',dept:'Compliance & governance',process:'DPDP consent management',user:'Office, principal',problem:'No system for verifiable parental consent under DPDP Act.',evidence:TAG.PUBLIC,solution:'Verifiable parental-consent flow with records, withdrawal, and breach log.',category:'Automation',workflow:'Consent requested -> identity verified -> consent recorded -> withdrawable -> breach logged if any.',trigger:'Data collection',input:'Parent, child, data purpose',output:'Verifiable consent record',technology:'Consent manager',integrations:'All child-data systems',humanApproval:'Principal',risk:'Consent challenged',effort:'Medium',impact:'High',kpi:'Verifiable consents %; breaches logged',dependencies:'DPDP applicability confirmed',priority:'Short-term project'},

  // ---------- Safety ----------
  {id:'SAF-001',dept:'Safety & security',process:'Incident reporting & escalation',user:'Staff, security',problem:'Incidents reported on paper with no escalation SLA.',evidence:TAG.HYPOTHESIS,solution:'Digital incident reporting with severity, escalation, and closure.',category:'Automation',workflow:'Incident logged -> severity assigned -> escalated if needed -> resolved -> closure report.',trigger:'Incident',input:'Type, location, people involved',output:'Incident record, escalation log',technology:'Incident module',integrations:'Staff roster',humanApproval:'Principal reviews serious incidents',risk:'Serious incident not escalated',effort:'Medium',impact:'High',kpi:'Incidents resolved within SLA',dependencies:'None',priority:'Short-term project'},
  {id:'SAF-002',dept:'Safety & security',process:'Visitor management & emergency contacts',user:'Security, office',problem:'Visitor log and emergency contacts on paper.',evidence:TAG.HYPOTHESIS,solution:'Digital visitor log with photo and emergency-contact verification.',category:'Automation',workflow:'Visitor arrives -> logged with photo -> host notified -> exit recorded.',trigger:'Visitor arrival',input:'Visitor, host, purpose',output:'Visitor log entry',technology:'Visitor management',integrations:'Staff roster',humanApproval:'Host approves',risk:'Unauthorised visitor',effort:'Low',impact:'Medium',kpi:'Visitors logged %',dependencies:'None',priority:'Short-term project'},
];

  // ============================================================
  
// ============================================================
// SECTION 6 — COMPLETE AUTOMATION OPPORTUNITY REGISTER
// ============================================================
const S6 = sectionStart(doc, 6, 'Complete Automation Opportunity Register', 'Trigger-based and rule-driven automation', 'S6');
cy = para(doc, 'Every opportunity below is a distinct, verifiable process improvement. Each is tagged with its evidence class (Section 14) and must be confirmed by school management before implementation. Effort, impact and priority are planning estimates, not results.', { y: S6 });
const autoOps = OPPORTUNITIES.filter(o => o.category === 'Automation');
const autoCols = [30, 70, 95, 130, 32, 32, CW - 30 - 70 - 95 - 130 - 32 - 32];
cy = table(doc, [
  ['ID', 'Department', 'Process', 'Proposed solution', 'Effort', 'Impact', 'Priority'],
  ...autoOps.map(o => [o.id, s(o.dept), s(o.process), s(o.solution), o.effort, o.impact, o.priority]),
], { colWidths: autoCols, size: 7, headerSize: 6.8 });
cy += 8;
cy = callout(doc, { tone: 'validate', title: 'Validation required', text: 'Automation opportunities above are estimates until school management confirms the underlying process exists. Prioritisation is finalised in Section 14.' });

// ============================================================
// SECTION 7 — COMPLETE AI ASSISTANCE OPPORTUNITY REGISTER
// ============================================================
cy = sectionStart(doc, 7, 'Complete AI Assistance Opportunity Register', 'AI assisting a human, not replacing judgement', 'S7');
cy = para(doc, 'AI assistance keeps an authorised human in the loop. It is used for drafting, extraction, summarisation, translation and analysis — never for autonomous decisions on student eligibility, progression, discipline, safety or financial rights.');
const aiOps = OPPORTUNITIES.filter(o => o.category === 'AI assistance');
cy = table(doc, [
  ['ID', 'Department', 'Process', 'AI assistance', 'Effort', 'Impact', 'Priority'],
  ...aiOps.map(o => [o.id, s(o.dept), s(o.process), s(o.solution), o.effort, o.impact, o.priority]),
], { colWidths: autoCols, size: 7, headerSize: 6.8 });
cy += 8;
cy = callout(doc, { tone: 'warn', title: 'Responsible AI rule', text: 'AI output is a draft for human review. Staff must verify extracted data, translated text, and generated materials before they reach a parent or student.', y: cy });

// ============================================================
// SECTION 8 — COMPLETE AI AGENT CATALOGUE
// ============================================================
cy = sectionStart(doc, 8, 'Complete AI Agent Catalogue', 'Semi-autonomous agents with human escalation', 'S8');
cy = para(doc, 'AI agents are semi-autonomous: they handle a conversation or task end-to-end and escalate to a person when they cannot proceed. Each agent below has defined permissions, knowledge sources and escalation rules. No agent decides student outcomes.');
const agents = [
  { id: 'AGT-01', name: 'Parent support agent', users: 'Parents', purpose: 'Answers routine questions (fees, holidays, events, admission process) in the parent\u2019s preferred language; hands complex cases to staff.', knowledge: 'School FAQ, calendar, fee policy, admission process', tools: 'WhatsApp Business, knowledge base', escalation: 'To front office or teacher when unanswered', limits: 'No fee commitments; no child data disclosure without consent', outcome: '% routine questions resolved', priority: 'Immediate quick win' },
  { id: 'AGT-02', name: 'IT helpdesk agent', users: 'Staff', purpose: 'Suggests fixes for common IT issues (password, device, access) and creates tickets for IT.', knowledge: 'IT knowledge base, common issues', tools: 'Chat, ticketing system', escalation: 'To IT staff when unresolved', limits: 'No system changes without IT approval', outcome: 'IT tickets auto-suggested', priority: 'Short-term project' },
];
cy = table(doc, [
  ['ID', 'Agent', 'Users', 'Purpose', 'Knowledge sources', 'Tools', 'Escalation', 'Limits', 'Outcome', 'Priority'],
  ...agents.map(a => [a.id, s(a.name), s(a.users), s(a.purpose), s(a.knowledge), s(a.tools), s(a.escalation), s(a.limits), s(a.outcome), a.priority]),
], { colWidths: [30, 60, 38, 95, 65, 44, 55, 34, 35, 35], size: 6.6, headerSize: 6.4 });
cy += 8;
cy = callout(doc, { tone: 'warn', title: 'Agent governance', text: 'Agents never act on student eligibility, progression, discipline, safety or financial rights. Every agent action that affects a parent or student is reviewable by staff.', y: cy });

// ============================================================
// SECTION 9 — END-TO-END WORKFLOW BLUEPRINTS
// ============================================================
cy = sectionStart(doc, 9, 'End-to-End Workflow Blueprints', 'Connected department workflows', 'S9');
cy = para(doc, 'Automation is strongest when departments are connected. Each blueprint below maps one complete workflow end-to-end, showing systems, data flow, ownership and exception handling.');
const workflows = [
  { name: 'Marketing enquiry to confirmed admission', steps: 'Parent enquiry (ADM-001) to lead assigned (ADM-002) to campus visit booked (ADM-004) to application and documents (ADM-003) to eligibility verified to seat confirmed (ADM-005) to fee schedule created to enrolment recorded (OPS-001).', owner: 'Admission counsellor plus office', systems: 'Lead database, booking tool, document portal, SIS', exceptions: 'Incomplete documents flagged by ADM-003; seat unavailable leads to waitlist' },
  { name: 'Admission to student onboarding', steps: 'Admission confirmed to student record created (OPS-001) to fee schedule (FIN-001) to transport requested (TRN-001) to accounts created (IT-004) to parent onboarded (PAR-002).', owner: 'Office plus IT plus transport', systems: 'SIS, fee ledger, transport tool, directory', exceptions: 'Transport full leads to waitlist (TRN-001)' },
  { name: 'Fee payment to receipt and accounts', steps: 'Parent pays to digital receipt issued (FIN-002) to bank matched (FIN-002) to ledger updated to collection dashboard refreshed (FIN-006).', owner: 'Accounts', systems: 'Payment gateway, fee ledger, dashboard', exceptions: 'Mismatched payment investigated by accounts' },
  { name: 'Attendance to parent notification', steps: 'Teacher marks attendance to absence detected to parent alert (PAR-002) to repeated absence flagged (SAF-001).', owner: 'Class teacher plus office', systems: 'Attendance, parent contacts', exceptions: 'No parent contact followed up by office' },
  { name: 'Examination to report card', steps: 'Marks entered (ACD-003) to results compiled to report card generated (ACD-004) to issued to parents to performance summary (ACD-005).', owner: 'Exam cell plus teachers', systems: 'Marks module, document generation', exceptions: 'Anomalous marks reviewed by exam cell' },
];
cy = table(doc, [
  ['Workflow', 'Steps (end to end)', 'Owner', 'Systems involved', 'Key exception handling'],
  ...workflows.map(w => [s(w.name), s(w.steps), s(w.owner), s(w.systems), s(w.exceptions)]),
], { colWidths: [80, CW - 80 - 56 - 66 - 90, 56, 66, 90], size: 7.2, headerSize: 6.8 });
cy += 8;
cy = callout(doc, { tone: 'validate', title: 'Validation required', text: 'Workflows are templates. System names and data fields are confirmed during discovery (Section 18).', y: cy });

// ============================================================
// SECTION 10 — TECHNOLOGY & INTEGRATION ARCHITECTURE
// ============================================================
cy = sectionStart(doc, 10, 'Technology & Integration Architecture', 'Fit-for-platform, not platform-for-its-sake', 'S10');
cy = para(doc, 'Technology is chosen per solution based on cost, reliability, security, integration availability and staff usability. Existing school systems are checked before any replacement is recommended.');
cy = table(doc, [
  ['Layer', 'Options considered', 'Selection criterion'],
  ['Lead and student records', 'CRM, Google Workspace, school management software', 'Low cost, parent-contact security, easy export'],
  ['Automation (workflow)', 'n8n, Make, Zapier, Power Automate, Google Apps Script', 'Integration availability, staff usability, cost'],
  ['Communications', 'WhatsApp Business Platform, SMS, email', 'Parent reach, delivery tracking, DPDP-safe'],
  ['Document processing', 'Document AI, form portal, e-signature', 'Extraction accuracy, privacy, human review'],
  ['AI models', 'API-based language, translation, extraction models', 'Privacy terms, data residency, human-in-the-loop'],
  ['Reporting and BI', 'Dashboard tools, spreadsheets, BI', 'Live data, role-based views'],
], { colWidths: [96, CW - 96 - 150, 150], size: 7.4, headerSize: 7 });
cy += 8;
cy = callout(doc, { tone: 'info', title: 'Integration principle', text: 'Systems share data through imports, exports or APIs; no solution creates duplicate data entry. Integration points and data owners are confirmed during discovery.', y: cy });

// ============================================================
// SECTION 11 — PROBLEM TO SOLUTION TO VALUE ANALYSIS
// ============================================================
cy = sectionStart(doc, 11, 'Problem to Solution to Value Analysis', 'Every problem traced to a solution and a measure', 'S11');
cy = para(doc, 'Each problem in the register (Section 5) is mapped to at least one solution opportunity and a measurable KPI. Value estimates are planning assumptions marked as such.');
const p2s = [
  ['PRB-ADM-01', 'No central enquiry record', 'ADM-001', 'Central enquiry capture', 'Enquiries captured per week'],
  ['PRB-ADM-02', 'Follow-ups from memory', 'ADM-002', 'Lead assignment and follow-up scheduling', 'Leads with timely follow-up'],
  ['PRB-FIN-01', 'Manual fee reminders', 'FIN-001', 'Fee reminders and pending-payment identification', 'Reminders paid within 7 days'],
  ['PRB-FIN-02', 'Manual receipts and reconciliation', 'FIN-002', 'Receipt generation and fee reconciliation', 'Days to reconcile'],
  ['PRB-ACD-01', 'Manual marks and results', 'ACD-003 and ACD-004', 'Marks collection and report cards', 'Days to publish results'],
  ['PRB-OPS-01', 'Manual certificates and letters', 'OPS-002', 'Certificate and letter generation', 'Days to issue certificate'],
  ['PRB-HR-01', 'Paper leave approvals', 'HR-002', 'Leave requests and approvals', 'Days to approve leave'],
  ['PRB-COM-01', 'Repeated parent phone questions', 'PAR-001 and PAR-002', 'Parent assistant and circular distribution', 'Routine questions auto-resolved'],
  ['PRB-TRN-01', 'Bus info by phone group', 'TRN-002', 'Bus attendance and parent notifications', 'Parents receiving delay alerts'],
  ['PRB-SAF-01', 'Paper incident reports', 'SAF-001', 'Incident reporting and escalation', 'Incidents resolved within SLA'],
];
cy = table(doc, [
  ['Problem ID', 'Problem', 'Solution ID', 'Solution', 'KPI'],
  ...p2s.map(r => r),
], { colWidths: [50, CW - 50 - 56 - 120 - 90, 56, 120, 90], size: 7.4, headerSize: 7 });
cy += 8;
cy = callout(doc, { tone: 'validate', title: 'Estimates only', text: 'KPI targets are not yet set; they are agreed with school management after discovery and baseline measurement.', y: cy });

// ============================================================
// SECTION 12 — BUSINESS IMPACT AND ROI ESTIMATES
// ============================================================
cy = sectionStart(doc, 12, 'Business Impact and ROI Estimates', 'Planning assumptions, not promised results', 'S12');
cy = para(doc, 'Impact and effort are rated qualitatively. Monetary savings are not promised; they are illustrative planning calculations that school management must validate against actual staff time and task volumes.');
cy = table(doc, [
  ['Impact rating', 'Meaning (planning definition)'],
  ['High', 'Removes a daily repetitive task across a department, or materially improves parent and staff experience.'],
  ['Medium', 'Improves a weekly or monthly process, or reduces errors and delays.'],
  ['Low', 'Improves an occasional or low-volume task.'],
], { colWidths: [80, CW - 80], size: 7.6, headerSize: 7 });
cy += 8;
cy = para(doc, 'Illustrative calculation example (assumptions must be validated): if fee reminders take five hours per month manually and automation reduces this to thirty minutes, the saving is four and a half staff-hours per month. This is an estimate, not a guaranteed saving.');
cy += 4;
cy = callout(doc, { tone: 'warn', title: 'No promised ROI', text: 'No ROI, savings, admission uplift or cost-reduction figure is promised. All figures are estimates pending discovery data (task volumes, staff time, current cost).', y: cy });

// ============================================================
// SECTION 13 — RISK AND DEPENDENCY REGISTER
// ============================================================
cy = sectionStart(doc, 13, 'Risk and Dependency Register', 'What could go wrong, and what must be true first', 'S13');
cy = para(doc, 'Each risk is tied to an opportunity and a mitigation. Dependencies identify what must exist before a solution can be built.');
cy = table(doc, [
  ['Risk area', 'Example risk', 'Likelihood', 'Impact', 'Mitigation'],
  ['Data quality', 'Student or parent records incomplete', 'Medium', 'High', 'Cleanse data during discovery; validate at entry'],
  ['Privacy', 'Child data processed without verifiable consent', 'Low', 'High', 'DPDP consent flow before any child-data system (COMP-004)'],
  ['Adoption', 'Staff do not use the new system', 'Medium', 'Medium', 'Training and phased rollout; keep a parallel manual fallback initially'],
  ['Accuracy', 'AI extraction or draft contains errors', 'Low', 'Medium', 'Human-in-the-loop review before any external use'],
  ['Dependency', 'Required system not available', 'Medium', 'High', 'Confirm existing systems before build; phase work accordingly'],
], { colWidths: [70, CW - 70 - 62 - 44 - 44 - 74, 62, 44, 44, 74], size: 7.4, headerSize: 7 });
cy += 8;
cy = callout(doc, { tone: 'validate', title: 'Validation required', text: 'Risks and dependencies are confirmed with school management during discovery; mitigations are agreed before implementation.', y: cy });

// ============================================================
// SECTION 14 — PRIORITISATION MATRIX
// ============================================================
cy = sectionStart(doc, 14, 'Prioritisation Matrix', 'Every opportunity classified, none discarded', 'S14');
cy = para(doc, 'Every opportunity is classified into one of eight priority bands. The full inventory is preserved even when only a first phase is implemented.');
cy = table(doc, [
  ['Band', 'Meaning', 'Example opportunities'],
  ['1. Immediate quick wins', 'Low effort, high impact, low risk; start within weeks', 'ADM-001, ADM-002, ADM-004, ADM-005, HR-002, OPS-001, COMP-001, PAR-002'],
  ['2. Short-term projects', 'Build within first 3 months', 'ADM-003, FIN-001, FIN-002, OPS-002, OPS-005, PAR-003, TRN-001, TRN-002, SAF-001, SAF-002, LIB-001, LIB-002, COMP-002, COMP-003, COMP-004'],
  ['3. Medium-term integrated workflows', '3 to 9 months, cross-department', 'FIN-003, FIN-004, FIN-005, ACD-001, ACD-003, ACD-004, OPS-003, IT-001, IT-002, IT-004, TRN-003, EVT-001'],
  ['4. AI assistant implementations', 'After data and consent foundations', 'ADM-006, FIN-006, ACD-005, HR-004, PAR-004, OPS-004, FAC-004'],
  ['5. Advanced AI agent implementations', 'After assistants are proven', 'AGT-01, AGT-02'],
  ['6. Strategic digital transformation', 'Multi-year, connected departments', 'Sections 9-10 workflows end-to-end'],
  ['7. Future opportunities', 'Valid but not resourced now', 'FAC-003, FAC-004, EVT-002'],
  ['8. Not recommended at present', 'Risk outweighs benefit or no verified need', 'None identified yet (reviewed at discovery)'],
], { colWidths: [100, CW - 100 - 150 - 150, 150, 150], size: 7.4, headerSize: 7 });
cy += 8;
cy = callout(doc, { tone: 'info', title: 'Full inventory preserved', text: 'All opportunities remain in Appendix B regardless of band. Band 8 is empty pending discovery; nothing is discarded without management review.', y: cy });

// ============================================================
// SECTION 15 — IMPLEMENTATION ROADMAP
// ============================================================
cy = sectionStart(doc, 15, 'Implementation Roadmap', 'Phases extend beyond 90 days where needed', 'S15');
cy = para(doc, 'The roadmap is realistic and may extend beyond 90 days. Each phase lists prerequisites, owner, effort, testing and success criteria. Nothing is built before discovery confirms the need.');
const phases = [
  ['Phase 1 - Discovery and validation', 'Weeks 1-4', 'Confirm processes, systems, task volumes, staff time; complete questionnaire (Section 18); sign off DPDP applicability.', 'Principal, Smart Pursuit', 'Questionnaire complete; baseline task volumes'],
  ['Phase 2 - Data and system readiness', 'Weeks 5-8', 'Digitise student, staff and parent contact records; set up lead database and consent store; verify integrations.', 'Office, IT', 'Clean records; consent store live'],
  ['Phase 3 - Quick-win automation', 'Weeks 9-16', 'ADM-001, ADM-002, ADM-004, ADM-005, HR-002, OPS-001, COMP-001, PAR-002 live with training.', 'Smart Pursuit plus school staff', 'Quick wins live; staff trained'],
  ['Phase 4 - Core workflow automation', 'Months 4-7', 'FIN-001, FIN-002, OPS-002, TRN-001, TRN-002, SAF-001, SAF-002, LIB-001, LIB-002.', 'Smart Pursuit plus school staff', 'Core workflows live; KPIs reported'],
  ['Phase 5 - Department solutions', 'Months 8-12', 'Remaining short-term and medium-term items by department.', 'Department owners', 'Department solutions live'],
  ['Phase 6 - AI assistant pilots', 'Months 10-14', 'HR-004, PAR-004 (after consent foundation), OPS-004 pilot.', 'Smart Pursuit', 'Assistants piloted with human review'],
  ['Phase 7 - AI agent deployment', 'Months 12-18', 'AGT-01, AGT-02 with escalation and governance.', 'Smart Pursuit', 'Agents live; escalation tested'],
  ['Phase 8 - Optimisation and expansion', 'Ongoing', 'Review KPIs, expand to Band 6 workflows, refine with school data.', 'Principal, Smart Pursuit', 'Quarterly improvement review'],
];
cy = table(doc, [
  ['Phase', 'Timing', 'Content', 'Owner', 'Success criteria'],
  ...phases.map(p => p),
], { colWidths: [70, 40, CW - 70 - 40 - 66 - 66, 66, 66], size: 7.4, headerSize: 7 });
cy += 8;
cy = callout(doc, { tone: 'info', title: 'No arbitrary deadline', text: 'Phases are sequenced by dependency and value, not forced into 90 days. Timing is confirmed with school management after discovery.', y: cy });

// ============================================================
// SECTION 17 — SMART PURSUIT IMPLEMENTATION APPROACH
// ============================================================
cy = sectionStart(doc, 17, 'Smart Pursuit Implementation Approach', 'How we deliver with the school', 'S17');
cy = para(doc, 'Smart Pursuit works as an implementation partner. All accounts (domain, website, advertising, analytics, enquiry records) remain in the school\u2019s name. Scope and commercials are set at discovery; no price list is included in this document.');
cy = table(doc, [
  ['Stage', 'Smart Pursuit role', 'School role'],
  ['Discovery', 'Run questionnaire, map processes, confirm DPDP applicability', 'Answer questionnaire, provide system access'],
  ['Build and integrate', 'Configure automation, documents, dashboards', 'Review outputs, provide staff time'],
  ['Train and pilot', 'Train staff, run pilot with human review', 'Use systems, give feedback'],
  ['Operate and review', 'Support, monitor KPIs, quarterly review', 'Own day-to-day, approve changes'],
], { colWidths: [70, CW - 70 - 150, 150], size: 7.4, headerSize: 7 });
cy += 8;
cy = callout(doc, { tone: 'info', title: 'Data stays with the school', text: 'Every account remains in the school\u2019s name. The school can change providers without losing its history, records or data.', y: cy });

// ============================================================
// SECTION 19 — FINAL RECOMMENDATIONS
// ============================================================
cy = sectionStart(doc, 19, 'Final Recommendations', 'Where to start', 'S19');
cy = para(doc, 'The school should begin with discovery, then implement quick wins that remove daily repetitive work and give parents faster, clearer service.');
cy = bullets(doc, [
  'Complete the discovery questionnaire (Appendix D) before any system is built.',
  'Start with Band 1 quick wins: central enquiry capture, follow-up scheduling, visit booking, seat availability, leave approvals, student records, circular distribution and document-expiry tracking.',
  'Establish the DPDP consent foundation (COMP-004) before any system touches student or parent data.',
  'Introduce AI assistance only with human review, and AI agents only with clear escalation to staff.',
  'Measure with the KPIs in Section 11; report admissions, cost and conversion honestly, never as guarantees.',
]);
cy += 8;
cy = callout(doc, { tone: 'info', title: 'Next step', text: 'School management completes Appendix D and schedules a discovery session with Smart Pursuit. Scope, timeline and commercials are agreed at discovery.', y: cy });

cy = sectionStart(doc, 16, 'Security, Privacy & Responsible AI Framework (DPDP)', 'Legal guardrails before automation', 'S16');
  cy = para(doc, 'Almost every school process touches children personal data (anyone under 18). Under the Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025, this materially shapes what can be automated and how. Key provisions relevant to this blueprint:');
  cy = table(doc, [
    ['Provision', 'Rule', 'School impact', 'Commencement'],
    ['Section 2(f)', 'A child is anyone under 18', 'Nearly all students are children; their data needs heightened care', '13 Nov 2025'],
    ['Section 9(1)', 'Verifiable parental consent before processing child data, unless a Rule 12/Fourth Schedule exception applies', 'Admission forms, marks, photos, app accounts need documented consent unless exempted', '13 May 2027'],
    ['Section 9(2)', 'No processing likely to cause detrimental effect on child well-being', 'No emotion detection, stigmatising risk scoring, or unsafe disclosure of student data', '13 May 2027'],
    ['Section 9(3)', 'No tracking, behavioural monitoring or targeted advertising at children', 'Analytics, classroom monitoring and ad-tech on student devices restricted', '13 May 2027'],
    ['Rule 12 / Fourth Schedule', 'Narrow exemption: educational institutions may track/monitor children for educational activities or safety', 'Does not cover general record processing; no blanket school exemption', '13 May 2027'],
    ['Section 8', 'Reasonable security safeguards to prevent unauthorised access or breaches', 'Access controls, encryption, backups, monitoring required before any digitisation', '13 May 2027'],
    ['Breach reporting', 'Report personal-data breaches to the Data Protection Board', '72-hour reporting capability must exist before systems go live', '13 May 2027'],
    ['Erasure', 'Erase data when purpose served or consent withdrawn, unless law requires retention', 'Define retention schedules for admission records, CCTV, transport logs', '13 May 2027'],
    ['Penalties', 'Up to INR 250 crore (security) / INR 200 crore (children rules)', 'Privacy is a board-level risk, not an IT footnote', '13 May 2027'],
  ], { colWidths: [72, 148, CW - 220 - 62, 62], size: 7.2, headerSize: 6.8 });
  cy += 8;
  cy = callout(doc, { tone: 'warn', title: 'Automation guardrails', text: 'No AI agent may decide student eligibility, academic progression, discipline, safety or financial rights. Automated decisions affecting a child always require authorised human review. Children photos, voice and location are personal data — never process without verified parental consent unless a narrow Rule 12 exception is documented.' });
  
  // ============================================================
  // SECTION 18 — DISCOVERY QUESTIONNAIRE
  // ============================================================
  cy = sectionStart(doc, 18, 'Information Required from School Management', 'Discovery questionnaire', 'S18');
  cy = para(doc, 'This questionnaire must be completed by the school owner, principal, office administrator, accounts team, teachers, HR and IT personnel before implementation. It converts the hypotheses in this blueprint into verified school-specific facts.');
  const questionGroups = [
    { title: 'General & leadership', qs: ['Who owns each department and who signs off on its processes?', 'What are the school admission targets and priority classes for the coming season?', 'What systems (school management software, CRM, accounting, website) are currently used?', 'What is the annual budget available for technology and automation?'] },
    { title: 'Admissions & recruitment', qs: ['How many enquiries arrive per month, by channel (phone, WhatsApp, website, walk-in)?', 'Where are enquiries recorded today?', 'How long does it take from enquiry to admission decision?', 'What documents are collected and how are they verified?'] },
    { title: 'Finance & fees', qs: ['How are fee reminders and receipts handled today?', 'How long does fee reconciliation take after each due date?', 'How are concessions and refunds approved?'] },
    { title: 'Academics & teachers', qs: ['How are lesson plans, worksheets and question papers created and stored?', 'How are marks collected and results compiled?', 'How much time do teachers spend on administrative paperwork per week?'] },
    { title: 'Operations & office', qs: ['How are student records, certificates and letters produced?', 'How are leave requests, payroll inputs and staff records managed?', 'How are maintenance requests logged and tracked?'] },
    { title: 'Transport & facilities', qs: ['How are bus routes, attendance and parent notifications managed?', 'How are maintenance issues reported and resolved?'] },
    { title: 'Privacy & compliance', qs: ['Is verifiable parental consent obtained for student data, photos and app use?', 'What is the current data retention and breach-reporting practice?', 'Which vendors hold student or staff data?'] },
  ];
  questionGroups.forEach((g) => {
    need(doc, 40);
    doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(9).text(s(g.title).toUpperCase(), M, doc.y, { characterSpacing: 1 });
    doc.y += 10;
    g.qs.forEach((q, i) => {
      need(doc, 14);
      doc.fillColor(C.body).font('Helvetica').fontSize(8.6).text(`${i + 1}. ${s(q)}`, M + 10, doc.y, { width: CW - 20, lineGap: 1.3 });
      doc.y += 13;
    });
    doc.y += 4;
  });
  doc.y += 4;
  cy = callout(doc, { tone: 'validate', title: 'Next step after discovery', text: 'Completed questionnaires convert [HYPOTHESIS] and [VALIDATE] items into [VERIFIED] findings. Only then are opportunities scheduled into the implementation roadmap (Section 15).' });
  
  return sectionPageMap;
};

// ============================================================
// TWO-PASS BUILD
// ============================================================
const build = async () => {
  // Pass 1: measure section start pages and total page count
  pageCounter = 1;
  const d1 = makeDoc();
  renderContent(d1, null, 0);
  const p1 = collect(d1);
  d1.end();
  const buf1 = await p1;
    const latin1 = buf1.toString('latin1');
  const pageRefs = [...latin1.matchAll(new RegExp('\/Type\s*\/Page[^s][\s\S]{0,400}?\/Contents\s+(\d+)\s+0\s+R', 'g'))];
  // No pdfKit auto-flow occurs (need() guards every block), so pageCounter is authoritative.
  totalPages = pageCounter;
  const tocPages = { ...sectionPageMap };

  // Pass 2: final with real TOC page numbers and totalPages
  pageCounter = 1;
  const d2 = makeDoc();
  renderContent(d2, tocPages, totalPages);
  const p2 = collect(d2);
  d2.end();
  const buf2 = await p2;
  fs.writeFileSync(OUT, buf2);
  const stats = fs.statSync(OUT);
  return { pages: pageCounter, bytes: stats.size };
};

function zlibInflate(buf) { return zlib.inflateSync(buf).toString('latin1'); }

if (process.argv[1] && process.argv[1].endsWith('build-automation-blueprint.mjs')) {
  build().then((r) => {
    const stats = fs.statSync(OUT);
    console.log(OUT.split('/').pop() + ' pages=' + r.pages + ' bytes=' + stats.size + ' kb=' + Math.round(stats.size / 1024));
  }).catch((err) => { console.error(err); process.exit(1); });
}

export { renderContent, build, makeDoc, s, C, M, CW, PAGE, OUT, TAG, sectionPageMap };