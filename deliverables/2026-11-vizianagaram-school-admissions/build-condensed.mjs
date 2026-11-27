/**
 * Smart_Pursuit_School_Admissions_Growth_Strategy.pdf
 *
 * The 12-page client-facing edition distilled from the 38-page research
 * blueprint in this folder. One message per page, large type, generous space.
 *
 * No photography is used anywhere: the source document argues that stock
 * classrooms undermine trust, so this edition is built entirely from type,
 * rules, panels and vector diagrams.
 *
 * Every page is composed explicitly (not flowed), so the page count is fixed at
 * 12 and nothing can spill. Each page reports if its content would overrun.
 *
 *   node deliverables/2026-11-vizianagaram-school-admissions/build-condensed.mjs
 */
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'Smart_Pursuit_School_Admissions_Growth_Strategy.pdf');

const C = {
  bg: '#0A0A0A',
  panel: '#111111',
  panel2: '#151517',
  white: '#FFFFFF',
  body: '#C9C9CF',
  muted: '#A1A1AA',
  dim: '#6B6B72',
  accent: '#7C3AED',
  accentSoft: '#A78BFA',
  line: '#242428',
};

const PAGE = { w: 595.28, h: 841.89 };
const M = 46;
const CW = PAGE.w - M * 2;
const TOTAL = 12;

const REPLACE = [
  [/₹/g, 'INR '],
  [/→/g, 'to'],
  [/[–—]/g, '-'],
  [/[’‘]/g, "'"],
  [/[“”]/g, '"'],
  [/…/g, '...'],
  [/≥/g, '>='],
  [/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ''],
];
const s = (v) => REPLACE.reduce((acc, [re, to]) => acc.replace(re, to), String(v ?? ''));

const doc = new PDFDocument({
  size: 'A4',
  margin: 0,
  bufferPages: true,
  info: {
    Title: 'School Admissions Growth Strategy - A Digital Marketing Blueprint',
    Author: 'Smart Pursuit',
    Subject: 'Digital marketing blueprint for a school in Vizianagaram, Andhra Pradesh',
    Creator: 'Smart Pursuit Agency OS',
  },
});
const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

const notes = [];
const fills = [];
let pageNo = 0;

/* ------------------------------------------------------------------ */
/* page scaffold                                                       */
/* ------------------------------------------------------------------ */
function startPage({ bare = false } = {}) {
  pageNo += 1;
  if (pageNo > 1) doc.addPage();
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(C.bg);
  if (bare) return;
  // header
  doc.rect(0, 0, PAGE.w, 2).fill(C.accent);
  doc.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.6)
    .text('SMART PURSUIT', M, 26, { characterSpacing: 1.7, width: 160 });
  doc.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.6)
    .text('SCHOOL ADMISSIONS GROWTH STRATEGY', M, 26, { characterSpacing: 1.7, width: CW, align: 'right' });
  doc.moveTo(M, 38).lineTo(PAGE.w - M, 38).lineWidth(0.5).strokeColor(C.line).stroke();
}

function footer(label) {
  const y = PAGE.h - 34;
  fills.push([pageNo, Math.round(((doc.y - 40) / (y - 14 - 40)) * 100)]);
  if (doc.y > y - 14) notes.push(`p${pageNo}: content bottom ${Math.round(doc.y)} collides with footer (${y - 14})`);
  doc.moveTo(M, y - 10).lineTo(PAGE.w - M, y - 10).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.fillColor(C.dim).font('Helvetica').fontSize(6.8)
    .text(s(label), M, y, { width: CW * 0.8 });
  doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.4)
    .text(`${pageNo} / ${TOTAL}`, M, y, { width: CW, align: 'right' });
}

/** Page heading: purple eyebrow, big title, one-line intro. Returns y. */
function heading(eyebrow, title, intro, { titleSize = 27, introW = CW - 40 } = {}) {
  let y = 62;
  doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(7.8)
    .text(s(eyebrow).toUpperCase(), M, y, { characterSpacing: 2.1 });
  y += 16;
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(titleSize)
    .text(s(title), M, y, { width: CW - 20, lineGap: 1 });
  y += doc.heightOfString(s(title), { width: CW - 20, fontSize: titleSize }) + 12;
  doc.rect(M, y, 34, 2.5).fill(C.accent);
  y += 12;
  if (intro) {
    doc.fillColor(C.muted).font('Helvetica').fontSize(10.4)
      .text(s(intro), M, y, { width: introW, lineGap: 4.4 });
    y += doc.heightOfString(s(intro), { width: introW, fontSize: 10.4 }) + 18;
  }
  return y;
}

/* ------------------------------------------------------------------ */
/* building blocks                                                     */
/* ------------------------------------------------------------------ */
function para(text, { x = M, w = CW, size = 10.4, color = C.body, y, gap = 12, lead = 1.5 } = {}) {
  doc.fillColor(color).font('Helvetica').fontSize(size)
    .text(s(text), x, y, { width: w, lineGap: size * (lead - 1) });
  return y + doc.heightOfString(s(text), { width: w, fontSize: size, lineGap: size * (lead - 1) }) + gap;
}

function bullets(items, { x = M, w = CW, y, size = 10, gap = 9, color = C.body } = {}) {
  for (const item of items) {
    const t = s(item);
    const h = doc.font('Helvetica').fontSize(size).heightOfString(t, { width: w - 16, lineGap: size * 0.45 });
    doc.fillColor(C.accent).circle(x + 2.6, y + size * 0.42, 1.8).fill();
    doc.fillColor(color).font('Helvetica').fontSize(size)
      .text(t, x + 13, y, { width: w - 16, lineGap: size * 0.45 });
    y += h + gap;
  }
  return y;
}

function panel(x, y, w, h, { fill = C.panel, accentTop = false } = {}) {
  doc.rect(x, y, w, h).fill(fill);
  if (accentTop) doc.rect(x, y, w, 2).fill(C.accent);
}

function cards(items, { x = M, y, cols = 3, cardW, cardH = 78, gap = 10, titleSize = 10.2, bodySize = 8.6 } = {}) {
  const w = cardW || (CW - gap * (cols - 1)) / cols;
  const titleLead = 1.2;
  const bodyLead = 2.4;
  let cy = y;
  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (col === 0 && row > 0) cy += cardH + gap;
    const cx = x + col * (w + gap);
    panel(cx, cy, w, cardH, { accentTop: true });

    // Measure the headline with the same width and leading it will be drawn at,
    // then place the body below it. Never advance by a fixed number: a quoted
    // headline wraps to two or three lines and used to collide with the body.
    const tx = it.num ? cx + 30 : cx + 12;
    const tw = w - (it.num ? 42 : 24);
    let ty = cy + 13;
    const titleH = doc.font('Helvetica-Bold').fontSize(titleSize)
      .heightOfString(s(it.title), { width: tw, lineGap: titleLead });

    if (it.num) {
      doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(7).text(s(it.num), cx + 12, ty, { width: 20 });
      ty -= 1;
    }
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(titleSize)
      .text(s(it.title), tx, ty, { width: tw, lineGap: titleLead });
    ty += titleH + 5;

    if (it.body) {
      const bodyH = doc.font('Helvetica').fontSize(bodySize)
        .heightOfString(s(it.body), { width: w - 24, lineGap: bodyLead });
      if (ty + bodyH > cy + cardH - 6) {
        notes.push(`p${pageNo}: card "${it.title}" body overruns panel by ${Math.round(ty + bodyH - (cy + cardH - 6))}pt`);
      }
      doc.fillColor(C.muted).font('Helvetica').fontSize(bodySize)
        .text(s(it.body), cx + 12, ty, { width: w - 24, lineGap: bodyLead });
    }
  });
  const rows = Math.ceil(items.length / cols);
  return y + rows * cardH + (rows - 1) * gap;
}

function statStrip(items, y, { h = 88 } = {}) {
  const gap = 10;
  const w = (CW - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = M + i * (w + gap);
    panel(x, y, w, h);
    doc.rect(x, y, 2, h).fill(C.accent);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(22)
      .text(s(it.value), x + 14, y + 20, { width: w - 24 });
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.2)
      .text(s(it.label).toUpperCase(), x + 14, y + 52, { width: w - 24, characterSpacing: 0.6, lineGap: 1.6 });
    if (it.source) doc.fillColor(C.dim).font('Helvetica').fontSize(6.2)
      .text(s(it.source), x + 14, y + h - 18, { width: w - 24, lineGap: 1.2 });
  });
  return y + h + 14;
}

function callout(y, { title, text, tone = 'accent', h } = {}) {
  const bar = tone === 'warn' ? '#FBBF24' : C.accent;
  const bodyH = doc.font('Helvetica').fontSize(10.4).heightOfString(s(text), { width: CW - 52, lineGap: 4.4 });
  const titleH = title ? 15 : 0;
  const height = h || bodyH + titleH + 24;
  panel(M, y, CW, height);
  doc.rect(M, y, 3, height).fill(bar);
  let ty = y + 12;
  if (title) {
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10.4).text(s(title), M + 22, ty, { width: CW - 44 });
    ty += titleH;
  }
  doc.fillColor(C.body).font('Helvetica').fontSize(10.4)
    .text(s(text), M + 22, ty, { width: CW - 52, lineGap: 4.4 });
  return y + height + 14;
}

/** Bottom-anchored takeaway strip: same baseline on every page. */
function takeaway(text) {
  fills.push([pageNo, Math.round(((doc.y - 40) / (PAGE.h - 78 - 40)) * 100)]);
  const y = PAGE.h - 92;
  const h = 44;
  panel(M, y, CW, h);
  doc.rect(M, y, 3, h).fill(C.accent);
  doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(6.4)
    .text('KEY TAKEAWAY', M + 20, y + 10, { characterSpacing: 1.4 });
  doc.fillColor('#E4E4E7').font('Helvetica-Bold').fontSize(9.4)
    .text(s(text), M + 20, y + 21, { width: CW - 40, lineGap: 2.6 });
}

function sectionLabel(text, y) {
  doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(8.4)
    .text(s(text) , M, y, { characterSpacing: 1.4 });
  return y + 18;
}

/* ================================================================== */
/* PAGE 1 - COVER                                                      */
/* ================================================================== */
startPage({ bare: true });
{
  const grad = doc.linearGradient(0, 0, PAGE.w, PAGE.h);
  grad.stop(0, '#1D1033').stop(0.42, '#0A0A0A').stop(1, '#0A0A0A');
  doc.rect(0, 0, PAGE.w, PAGE.h).fill(grad);
  doc.rect(0, 0, 7, PAGE.h).fill(C.accent);

  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
    .text('SMART PURSUIT', M, 70, { characterSpacing: 3.6 });
  doc.fillColor(C.muted).font('Helvetica').fontSize(7.4)
    .text('DIGITAL MARKETING  |  BUSINESS GROWTH', M + 152, 72.5, { characterSpacing: 1.6, width: 320 });
  doc.moveTo(M, 104).lineTo(M + 46, 104).lineWidth(2.5).strokeColor(C.accent).stroke();

  doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(8.2)
    .text('VIZIANAGARAM  ·  ANDHRA PRADESH', M, 236, { characterSpacing: 2.2 });

  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(40)
    .text('SCHOOL\nADMISSIONS\nGROWTH\nSTRATEGY', M, 262, { width: 470, lineGap: 4 });

  doc.moveTo(M, 520).lineTo(PAGE.w - M, 520).lineWidth(0.8).strokeColor('#2C2C32').stroke();

  doc.fillColor('#DCDCE1').font('Helvetica').fontSize(12.5)
    .text('A Digital Marketing Blueprint to Attract More Parents\nand Grow Student Admissions', M, 540, { width: 420, lineGap: 5 });

  let fy = 640;
  [['PREPARED BY', 'Smart Pursuit'], ['PREPARED FOR', 'School management, Vizianagaram'], ['EDITION', 'Client strategy  ·  12 pages  ·  November 2026']]
    .forEach(([k, v]) => {
      doc.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.6).text(k, M, fy, { characterSpacing: 1.5, width: 110 });
      doc.fillColor(C.body).font('Helvetica').fontSize(9).text(s(v), M + 116, fy - 0.5, { width: 340 });
      fy += 24;
    });

  doc.rect(0, PAGE.h - 70, PAGE.w, 70).fill(C.panel);
  doc.rect(0, PAGE.h - 70, PAGE.w, 2).fill(C.accent);
  doc.fillColor(C.muted).font('Helvetica').fontSize(7.2)
    .text('This edition summarises a 38-page research blueprint prepared for this market. Figures carry their sources; anything specific to the school is confirmed during discovery.', M, PAGE.h - 54, { width: CW - 20, lineGap: 3 });
}

/* ================================================================== */
/* PAGE 2 - THE OPPORTUNITY                                            */
/* ================================================================== */
startPage();
{
  let y = heading(
    'The opportunity',
    'An Opportunity to Reach More Parents',
    'Vizianagaram is a small, education-conscious city where parents research before they visit. The schools that are easy to find and easy to trust are winning enquiries that other schools never see.',
  );

  y = statStrip([
    { value: '81.07%', label: 'City literacy rate', source: 'Census 2011, city (M+OG)' },
    { value: '2.29 lakh', label: 'City population', source: 'Census 2011, 57,919 households' },
    { value: '3,814', label: 'Schools in the district', source: 'UDISE+ derived directory' },
  ], y);

  y = para('Parents here behave like buyers, not like visitors. They search on a phone at night, compare three or four schools, read reviews, ask in a family group, and only then decide whether a campus is worth a Saturday morning. By the time they call, most of the decision is already made.', { y });

  y = sectionLabel('What this means for the school', y);

  y = bullets([
    'The city literacy rate is 81.07% against 53.21% for the surrounding district (Census 2011), so the paying, English-medium market is concentrated in a compact urban core.',
    'Demand is searchable. "Schools near me", "CBSE school in Vizianagaram" and class-specific admission queries are made every week, and are mostly answered by directories rather than by schools.',
    'Category digital standards here are low. In checks on 21 November 2026, leading local CBSE schools published no fees, offered no WhatsApp or campus-visit path, and one still had placeholder captions on its homepage carousel.',
    'The real competitive set is small. Of 3,814 registered schools in the district, only an estimated fifteen to twenty private, English-medium, fee-paying schools compete for these families.',
  ], { y, w: CW - 20 });

  y = para('Timing matters as much as message. Andhra Pradesh reopened schools on 12 June 2026, which puts the next decision window between December and May, with the heaviest enquiry volume from January to March. A school that is invisible in December is arguing with a shortlist that has already been drawn up.', { y, size: 9.4 });
  y += 2;
  callout(y, {
    tone: 'accent',
    text: 'The opportunity is not to spend more on advertising. It is to become the school that is easiest to find, easiest to understand and easiest to visit. Very few schools in this market have built that, and none has built it well.',
  });

  takeaway('The school does not need a bigger market. It needs to be the obvious choice inside a small one.');
  footer('An Opportunity to Reach More Parents');
}

/* ================================================================== */
/* PAGE 3 - HOW PARENTS CHOOSE                                          */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Parent behaviour',
    'What Makes Parents Choose One School Over Another?',
    'Parents do not compare schools on one attribute. They compare a bundle of six things, and they resolve most of them online before they ever arrive on campus.',
  );

  y = cards([
    { title: 'Academic environment', body: 'Class size, teacher attention, results - asked early and checked carefully' },
    { title: 'Teachers', body: 'Who will teach my child, and will they notice when my child struggles?' },
    { title: 'Safety and infrastructure', body: 'Gates, transport, first aid, supervision. Verified by a visit, not by a brochure' },
    { title: 'Student development', body: 'Confidence, spoken English, activities that actually happen every week' },
    { title: 'Fees and convenience', body: 'Total cost, instalments, distance from home, bus timing' },
    { title: 'Reviews and reputation', body: 'What other parents say, in public, on Google and in the family group' },
  ], { y, cols: 3, cardH: 96 });

  y += 6;
  y = sectionLabel('The journey every parent takes', y);

  const steps = [
    ['Discover', 'Sees a reel, a hoarding, or a Maps pin'],
    ['Explore', 'Taps the profile, watches a second video'],
    ['Trust', 'Reads reviews, checks fees, compares'],
    ['Enquire', 'WhatsApp or a form, usually at night'],
    ['Visit', 'Attends with spouse, asks five questions'],
    ['Enrol', 'Decides at home, completes admission'],
  ];
  const gap = 5;
  const w = (CW - gap * (steps.length - 1)) / steps.length;
  const h = 68;
  steps.forEach((st, i) => {
    const x = M + i * (w + gap);
    panel(x, y, w, h);
    doc.rect(x, y, w, 2).fill(C.accent);
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(6.4).text(`0${i + 1}`, x + 8, y + 9, { width: w - 16 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8).text(s(st[0]), x + 8, y + 20, { width: w - 16 });
    doc.fillColor(C.dim).font('Helvetica').fontSize(6.2).text(s(st[1]), x + 8, y + 34, { width: w - 16, lineGap: 1.5 });
    if (i < steps.length - 1) {
      doc.moveTo(x + w + 1, y + h / 2).lineTo(x + w + gap - 1, y + h / 2)
        .lineWidth(1).strokeColor('#3A3A42').stroke();
    }
  });
  y += h + 12;

  doc.fillColor(C.muted).font('Helvetica').fontSize(8.4)
    .text('Where the school currently loses parents', M, y, { width: CW, characterSpacing: 0.3 });
  y += 14;

  y = bullets([
    'Discover and Explore: the school is not visible for the searches and feeds these parents use, so it is never considered.',
    'Trust: fees and results are not published, so the parent cannot compare, and the shortlist closes without the school in it.',
    'Enquire and Visit: enquiries land in a phone that is not answered quickly, and there is no scheduled next step.',
  ], { y, w: CW - 20 });

  takeaway('Every stage a parent passes through is either a chance to be chosen or a chance to be quietly dropped.');
  footer('What Makes Parents Choose One School Over Another?');
}

/* ================================================================== */
/* PAGE 4 - MARKETING OPPORTUNITY / POSITIONING                         */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Positioning',
    'Where Can the School Stand Out?',
    'Every competitor in this market says it offers quality education. Almost none of them proves it in a way a parent can check. That gap is the positioning opportunity.',
  );

  y = sectionLabel('What competitors currently communicate', y);
  y = para('From live checks of local school websites and public listings: broad claims of excellence, named leadership teams, and generic campus language. No fee information, no named parent testimonials, no admission steps, no WhatsApp enquiry, no campus-visit booking. Brand polish without verifiable proof.', { y, size: 9.2 });
  y += 2;

  y = sectionLabel('Four directions the school can own', y);
  y = cards([
    { num: '01', title: 'Attention', body: 'Small classes and individual attention, described concretely: class size, teacher ratio, how a struggling child is helped.' },
    { num: '02', title: 'Confidence', body: 'Spoken English and overall development, evidenced by student speech and weekly activity - not by a slogan.' },
    { num: '03', title: 'Transparency', body: 'The school that publishes fees, results, safety and admission steps. The strongest and hardest to copy.' },
    { num: '04', title: 'Convenience', body: 'Proximity and transport done well: route-level information for the families who actually commute.' },
  ], { y, cols: 2, cardH: 84, titleSize: 11, bodySize: 8.8 });
  y += 6;

  y = para('Choose one direction and lead with it for a full season. A school that claims four things is remembered for none of them; a school that proves one thing becomes the answer a parent gives when a neighbour asks where to admit their child. The remaining directions become supporting proof, not competing headlines. Whichever direction is chosen, it must be provable in a single campus visit: a claim a parent cannot check in ten minutes will not survive the counselling conversation.', { y, size: 9.4 });
  y += 2;

  y = callout(y, {
    tone: 'accent',
    title: 'What parents should remember about the school',
    text: 'One sentence, one promise, one proof. For example: "A 20-student classroom where your child is known by name - and a school that publishes its fees and results before you ask." The exact promise must be chosen only after the school confirms it can evidence it.',
  });

  takeaway('Be the school parents can check, not the school they have to believe.');
  footer('Where Can the School Stand Out?');
}

/* ================================================================== */
/* PAGE 5 - THE SYSTEM (FUNNEL)                                        */
/* ================================================================== */
startPage();
{
  let y = heading(
    'The system',
    'Our Strategy: From Parent Discovery to Student Admission',
    'Five connected stages. Not a set of campaigns - one pipeline, with a clear owner, a tool and a number at every step.',
    { titleSize: 23 },
  );

  const stages = [
    ['ATTRACT', 'Reach the right parents where they already are', 'Google Search for active school searches, plus Instagram and Facebook for parents within reach of the campus.', 1],
    ['ENGAGE', 'Give them a reason to look twice', 'Real school videos: classrooms in session, named teachers, student work, activities that happen every week.', 0.92],
    ['CAPTURE', 'Turn interest into an enquiry', 'A mobile admissions landing page with a four-field form, a WhatsApp button, a call button and a visible fee band.', 0.84],
    ['CONVERT', 'Bring them onto campus', 'Scheduled visits, a scripted forty-minute experience, a written fee sheet, and respectful follow-up on a schedule.', 0.76],
    ['OPTIMISE', 'Improve what the numbers show', 'Weekly review of enquiries, visits and admissions by channel; creative and keyword changes based on evidence.', 0.68],
  ];

  const barH = 46;
  for (const [name, job, detail, frac] of stages) {
    const w = CW * frac;
    const x = M + (CW - w) / 2;
    doc.rect(x, y, w, barH).fill(name === 'CONVERT' ? C.accent : '#1B1826');
    if (name !== 'CONVERT') doc.rect(x, y, 2.5, barH).fill(C.accent);
    doc.fillColor(name === 'CONVERT' ? C.white : C.white).font('Helvetica-Bold').fontSize(10.5)
      .text(s(name), x + 14, y + 9, { width: w - 28, characterSpacing: 1.4 });
    doc.fillColor(name === 'CONVERT' ? '#EDE9FE' : C.muted).font('Helvetica').fontSize(8)
      .text(s(job), x + 14, y + 25, { width: w - 28 });
    y += barH + 6;
    doc.fillColor(C.dim).font('Helvetica').fontSize(7.8)
      .text(s(detail), x + 14, y, { width: Math.min(CW - 60, w + 120), lineGap: 2.4 });
    y += doc.heightOfString(s(detail), { width: Math.min(CW - 60, w + 120), fontSize: 7.8, lineGap: 2.4 }) + 12;
  }

  y = callout(y, {
    tone: 'accent',
    title: 'Smart Pursuit owns stages 1 to 3. Your admissions office owns 4. We run 5 together.',
    text: 'This split matters. No agency can convert a campus visit into an admission on its own, and no school can generate consistent demand without marketing. The plan only works because both halves are defined.',
  });

  takeaway('One pipeline, five stages, two owners. That is the entire strategy.');
  footer('Our Strategy: From Parent Discovery to Student Admission');
}

/* ================================================================== */
/* PAGE 6 - PAID ADVERTISING                                           */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Paid advertising',
    'Reach Parents Who Are Looking for the Right School',
    'Two channels, two different jobs: Google captures parents already searching, Meta creates demand among parents who have not started yet.',
  );

  const colW = (CW - 12) / 2;
  const topY = y;

  // Google panel
  panel(M, topY, colW, 232, { accentTop: true });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text('GOOGLE ADS', M + 14, topY + 14, { characterSpacing: 1.2 });
  doc.fillColor(C.accentSoft).font('Helvetica').fontSize(7.8).text('Capture active demand', M + 14, topY + 31, { width: colW - 28 });
  bullets([
    'Target admissions and school searches in Vizianagaram',
    'One landing page per class and per area',
    'Calls, WhatsApp chats and form enquiries',
    'Negative keywords keep teacher-job traffic out',
    'Cost per enquiry tracked from day one',
  ], { x: M + 14, w: colW - 28, y: topY + 50, size: 8.6, gap: 8.5 });

  // Meta panel
  const rx = M + colW + 12;
  panel(rx, topY, colW, 232, { accentTop: true });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text('META ADS', rx + 14, topY + 14, { characterSpacing: 1.2 });
  doc.fillColor(C.accentSoft).font('Helvetica').fontSize(7.8).text('Create and warm demand', rx + 14, topY + 31, { width: colW - 28 });
  bullets([
    'Parents within a short radius of the campus',
    'School introduction and classroom videos',
    'Genuine activities, facilities and teachers',
    'Admission enquiry and campus visit campaigns',
    'Retargeting for everyone who showed interest',
  ], { x: rx + 14, w: colW - 28, y: topY + 50, size: 8.6, gap: 8.5 });

  y = topY + 232 + 18;
  y = sectionLabel('Sample advertising concepts', y);

  y = cards([
    { num: 'A', title: '"Ask us the fee. We will tell you today."', body: 'Google search ad. Lands on a page with fees published. CTA: See fees and book a visit.' },
    { num: 'B', title: '"See a class in session, not a presentation."', body: 'Meta reel, 20 seconds of real classroom. CTA: Book a Saturday campus visit.' },
    { num: 'C', title: '"Meet the teacher who will teach your child."', body: 'Meta reel with a named teacher. CTA: Message us on WhatsApp.' },
  ], { y, cols: 3, cardH: 100, titleSize: 9, bodySize: 8 });

  y = callout(y + 2, {
    tone: 'warn',
    text: 'No guaranteed lead volumes, admission numbers or costs are quoted in this document. Any figure is a planning assumption, replaced by the school\'s own data within four weeks of launch.',
  });

  takeaway('Google captures demand. Meta creates it. Neither works without a page that answers parent questions.');
  footer('Reach Parents Who Are Looking for the Right School');
}

/* ================================================================== */
/* PAGE 7 - SOCIAL & CONTENT                                           */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Social media and content',
    'Make Parents See, Understand and Trust the School',
    'Organic content is not there to go viral. It is the proof library that advertising points at, and the reason a parent believes the school is real.',
  );

  const pillars = [
    ['01', 'School life', 'Classrooms, activities, celebrations'],
    ['02', 'Teachers', 'Named staff, methods, approach'],
    ['03', 'Academics', 'Learning, progress, student work'],
    ['04', 'Trust', 'Parent testimonials and reviews'],
    ['05', 'Admissions', 'Process, fees, campus visits'],
  ];
  const pgap = 6;
  const pw = (CW - pgap * 4) / 5;
  pillars.forEach((p, i) => {
    const x = M + i * (pw + pgap);
    panel(x, y, pw, 78);
    doc.rect(x, y, pw, 2).fill(C.accent);
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(6.4).text(p[0], x + 9, y + 9, { width: pw - 18 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8.2).text(s(p[1]), x + 9, y + 19, { width: pw - 18 });
    doc.fillColor(C.dim).font('Helvetica').fontSize(6.2).text(s(p[2]), x + 9, y + 32, { width: pw - 18, lineGap: 1.3 });
  });
  y += 78 + 18;

  y = sectionLabel('A realistic week', y);

  const week = [
    ['MON', 'School introduction', 'Reel'],
    ['TUE', 'Classroom learning', 'Reel'],
    ['WED', 'Teacher introduction', 'Reel'],
    ['THU', 'Student activities', 'Carousel'],
    ['FRI', 'Tip for parents', 'Static'],
    ['SAT', 'Campus highlight', 'Reel'],
    ['SUN', 'Admissions / story', 'Story'],
  ];
  const wgap = 5;
  const ww = (CW - wgap * 6) / 7;
  week.forEach((d, i) => {
    const x = M + i * (ww + wgap);
    panel(x, y, ww, 88);
    doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(6.2).text(d[0], x + 7, y + 8, { width: ww - 14, characterSpacing: 0.8 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.4).text(s(d[1]), x + 7, y + 22, { width: ww - 14, lineGap: 1.8 });
    doc.fillColor(C.dim).font('Helvetica').fontSize(6).text(s(d[2]), x + 7, y + 72, { width: ww - 14 });
  });
  y += 88 + 18;

  y = para('Two filming sessions a month, shot on a phone inside the school, cover the entire calendar. Every reel is vertical, subtitled and under thirty seconds, because parents watch in a corridor with the sound off.', { y, size: 9.2 });

  y = sectionLabel('Why consistency pays for itself', y);
  y = bullets([
    'Advertising works better when the profile a parent taps is full of proof rather than announcements.',
    'Retargeting depends on content: without new material there is nothing new to show a warm parent.',
    'Reviews and testimonials compound. They are the cheapest credibility a school can accumulate.',
  ], { y, w: CW - 20, size: 9.2, gap: 6.5 });
  y += 2;

  y = callout(y, {
    tone: 'warn',
    title: 'Authentic material only',
    text: 'Every photograph and video must come from this school: its staff, its students, its classrooms, with parental consent on file. No stock classrooms, no other schools\' images, no generated children. In a city of 2.3 lakh people, a parent will recognise the difference immediately - and one borrowed image costs more trust than a month of posts earns.',
  });

  takeaway('Content is not decoration. It is the evidence that advertising points at.');
  footer('Make Parents See, Understand and Trust the School');
}

/* ================================================================== */
/* PAGE 8 - WEBSITE / GOOGLE / WHATSAPP                                */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Conversion',
    'Make It Easy for Parents to Take the Next Step',
    'Three parts, working as one path: a page that answers the questions, a map listing that gets found, and a phone that answers quickly.',
    { titleSize: 23 },
  );

  const colW = (CW - 20) / 3;
  const blocks = [
    ['A', 'Website and landing page', [
      'School introduction and classes offered',
      'Genuine facilities and activities',
      'Parent testimonials with names',
      'Fees and admission steps',
      'Short enquiry form',
      'WhatsApp, call and campus visit buttons',
    ]],
    ['B', 'Google Business Profile', [
      'Complete profile and correct map pin',
      'Real photos of the campus',
      'Weekly admission updates',
      'Parent reviews, answered',
      'Accurate hours and contact',
      'Local search visibility',
    ]],
    ['C', 'WhatsApp lead management', [
      'Reply in minutes, not days',
      'Fee sheet sent in writing',
      'Campus visit slots offered',
      'Respectful follow-up on schedule',
      'Every enquiry recorded',
      'Enquiry to admission tracked',
    ]],
  ];

  const blockH = 236;
  blocks.forEach(([letter, title, items], i) => {
    const x = M + i * (colW + 10);
    panel(x, y, colW, blockH);
    doc.rect(x, y, colW, 2).fill(C.accent);
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(16).text(letter, x + 14, y + 14, { width: 30 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9.4)
      .text(s(title), x + 34, y + 19, { width: colW - 48, lineGap: 1.4 });
    bullets(items, { x: x + 14, w: colW - 28, y: y + 56, size: 7.9, gap: 6.2 });
  });
  y += blockH + 18;

  y = sectionLabel('How they work together', y);

  const flow = ['Parent searches or sees an ad', 'Lands on the admissions page', 'Taps WhatsApp or calls', 'Admissions office replies', 'Campus visit booked'];
  const fgap = 4;
  const fw = (CW - fgap * 4) / 5;
  flow.forEach((f, i) => {
    const x = M + i * (fw + fgap);
    doc.rect(x, y, fw, 48).fill(i === 4 ? C.accent : C.panel2);
    doc.fillColor(i === 4 ? C.white : C.body).font('Helvetica').fontSize(7.2)
      .text(s(f), x + 8, y + 10, { width: fw - 16, lineGap: 1.8 });
    if (i < 4) {
      doc.moveTo(x + fw + 0.5, y + 24).lineTo(x + fw + fgap - 0.5, y + 24)
        .lineWidth(1).strokeColor('#3F3F48').stroke();
    }
  });
  y += 48 + 18;

  y = callout(y, {
    tone: 'accent',
    title: 'The single commitment that decides this plan',
    text: 'Every parent enquiry answered by a person within fifteen minutes during office hours. Without it, no amount of campaign optimisation reaches admissions. With it, even a modest budget produces campus visits.',
  });

  takeaway('Three elements, one path. Break any one and the enquiry dies between them.');
  footer('Make It Easy for Parents to Take the Next Step');
}

/* ================================================================== */
/* PAGE 9 - 90-DAY ROADMAP                                             */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Execution',
    'A Clear 90-Day Roadmap',
    'Four phases, starting in the current admission season. Each phase ends with something the school can see and a number it can check.',
  );

  const phases = [
    {
      days: 'DAYS 1-15', name: 'Foundation',
      items: ['School discovery and positioning', 'Digital audit of current presence', 'Website and Google profile fixes', 'Creative assets prepared', 'Lead tracking installed'],
      deliver: 'Audit score, positioning, live landing page, tracking verified',
    },
    {
      days: 'DAYS 16-30', name: 'Launch',
      items: ['Search campaigns live', 'Meta awareness and enquiry ads', 'Organic calendar running', 'WhatsApp enquiry management active', 'First campus visits booked'],
      deliver: 'Two channels live, first enquiries recorded',
    },
    {
      days: 'DAYS 31-60', name: 'Optimisation',
      items: ['Weekly performance review', 'New creatives tested', 'Enquiry quality analysed', 'Landing page improved', 'Follow-up process tightened'],
      deliver: 'Cost per enquiry, visit and admission documented',
    },
    {
      days: 'DAYS 61-90', name: 'Growth',
      items: ['Scale the campaigns that work', 'More campus visits booked', 'Local visibility strengthened', 'Conversion improved at counselling', 'Handover pack delivered'],
      deliver: 'A repeatable system the school can operate',
    },
  ];

  const rowH = 112;
  phases.forEach((p, i) => {
    const top = y + i * (rowH + 8);
    panel(M, top, CW, rowH);
    doc.rect(M, top, 3, rowH).fill(i === 0 ? C.accent : '#2E2E36');
    doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(7)
      .text(p.days, M + 18, top + 14, { characterSpacing: 1.3 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(13).text(p.name, M + 18, top + 26, { width: 120 });
    doc.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.2)
      .text('DELIVERABLE', M + 18, top + 58, { characterSpacing: 1 });
    doc.fillColor(C.body).font('Helvetica').fontSize(7.4)
      .text(s(p.deliver), M + 18, top + 68, { width: 132, lineGap: 2.4 });

    // two columns of actions
    const startX = M + 170;
    const colW = (CW - 186) / 2;
    p.items.forEach((it, j) => {
      const col = Math.floor(j / 3);
      const row = j % 3;
      const x = startX + col * (colW + 10);
      const ty = top + 16 + row * 26;
      doc.fillColor(C.accent).circle(x + 2.4, ty + 3.4, 1.6).fill();
      doc.fillColor(C.body).font('Helvetica').fontSize(7.8)
        .text(s(it), x + 11, ty, { width: colW - 12, lineGap: 2 });
    });
  });

  y += phases.length * (rowH + 8) + 4;
  y = para('The school\'s part is not administrative. It is a fifteen-minute response to every enquiry and one filming session a fortnight. Those two commitments are worth more than any single channel investment here.', { y, size: 8.8 });

  takeaway('Ninety days is enough to prove the model, not to finish the work.');
  footer('A Clear 90-Day Roadmap');
}

/* ================================================================== */
/* PAGE 10 - MEASUREMENT                                               */
/* ================================================================== */
startPage();
{
  let y = heading(
    'Measurement',
    'Marketing That Focuses on Admissions, Not Just Likes',
    'Every report opens with students enrolled and what each one cost. Everything below that line is explanation.',
    { titleSize: 23 },
  );

  const tiles = [
    ['Ad investment', 'INR'], ['Parent reach', ''], ['Website visits', ''],
    ['Enquiries', ''], ['Qualified enquiries', ''], ['Cost per enquiry', 'INR'],
    ['WhatsApp chats', ''], ['Calls received', ''], ['Visits booked', ''],
    ['Visits attended', ''], ['Admissions', ''], ['Cost per admission', 'INR'],
  ];
  const gap = 8;
  const w = (CW - gap * 3) / 4;
  const h = 72;
  tiles.forEach(([label], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = M + col * (w + gap);
    const ty = y + row * (h + gap);
    const emphasis = ['Admissions', 'Cost per admission', 'Visits booked'].includes(label);
    panel(x, ty, w, h, { fill: emphasis ? '#1A1526' : C.panel });
    doc.rect(x, ty, 2, h).fill(emphasis ? C.accent : '#33333B');
    doc.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.2)
      .text(s(label).toUpperCase(), x + 10, ty + 12, { width: w - 18, characterSpacing: 0.5, lineGap: 1.5 });
    doc.fillColor(emphasis ? C.white : C.muted).font('Helvetica-Bold').fontSize(15)
      .text('-', x + 10, ty + 30, { width: w - 18 });
    doc.fillColor(C.dim).font('Helvetica').fontSize(5.8)
      .text('reported weekly', x + 10, ty + h - 14, { width: w - 18 });
  });
  y += 3 * (h + gap) + 12;

  y = sectionLabel('What we do with these numbers', y);
  y = bullets([
    'Weeks 1-2 establish the baseline: what an enquiry currently costs, and how many become visits.',
    'From week 3, the weekly review moves budget away from what produces enquiries that do not visit.',
    'Monthly, the whole chain is reported by channel, with the reasons enquiries were lost - fee, distance, speed, competitor.',
  ], { y, w: CW - 20, size: 9.4 });
  y += 4;

  y = cards([
    { title: 'Weekly', body: 'Spend, enquiries, visits booked, admissions, response time' },
    { title: 'Monthly', body: 'Full funnel by channel, creative winners, reasons lost' },
    { title: 'Season close', body: 'Cost per admission by channel, what to repeat next year' },
  ], { y, cols: 3, cardH: 62, titleSize: 9.6, bodySize: 8 });
  y += 2;

  y = callout(y, {
    tone: 'accent',
    text: 'Admissions are confirmed by the school, not by the agency. Campaign numbers describe enquiries; only the school\'s admission records describe business results. The two are reported separately, always.',
  });

  takeaway('If a report cannot say how many students enrolled and what each one cost, it is not a report.');
  footer('Marketing That Focuses on Admissions, Not Just Likes');
}

/* ================================================================== */
/* PAGE 11 - HOW SMART PURSUIT HELPS                                   */
/* ================================================================== */
startPage();
{
  let y = heading(
    'The partner',
    'Your Digital Marketing and Admissions Growth Partner',
    'Ten services, one purpose: more qualified enquiries, more campus visits, more admissions - and evidence for every rupee.',
    { titleSize: 23 },
  );

  const services = [
    ['Digital marketing strategy', 'A plan for this market, reviewed monthly'],
    ['Website and landing pages', 'One page that answers parent questions'],
    ['Google Ads management', 'Capture active school searches'],
    ['Meta Ads management', 'Reach and retarget local parents'],
    ['Social media marketing', 'A consistent, credible presence'],
    ['Content and creative planning', 'Real school footage, planned in advance'],
    ['Local SEO', 'Map visibility and local searches'],
    ['Lead generation', 'Enquiries from every channel, in one place'],
    ['WhatsApp lead management', 'Fast replies, scheduled follow-ups'],
    ['Performance reporting', 'Admissions and cost per admission'],
  ];

  const colW = (CW - 14) / 2;
  services.forEach(([name, purpose], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (colW + 14);
    const ty = y + row * 39;
    doc.fillColor(C.accent).circle(x + 2.4, ty + 5, 1.7).fill();
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8.8).text(s(name), x + 11, ty, { width: colW - 12 });
    doc.fillColor(C.muted).font('Helvetica').fontSize(7.7).text(s(purpose), x + 11, ty + 13, { width: colW - 12 });
    if (i % 2 === 1) doc.moveTo(x, ty + 31).lineTo(x + colW, ty + 31).lineWidth(0.3).strokeColor('#1E1E22').stroke();
  });
  y += 5 * 39 + 12;

  y = para('Every account stays in the school\'s name: domain, website, Google Business Profile, advertising accounts, analytics and enquiry records. Smart Pursuit works as an authorised partner, which means the school can change agencies without losing its history, its reviews or its data.', { y, size: 9.4 });
  y += 4;

  y = sectionLabel('How the engagement runs', y);

  const stages = [['Foundation', 'Weeks 1-2'], ['Launch', 'Weeks 3-6'], ['Optimisation', 'Weeks 7-10'], ['Growth', 'Weeks 11-13']];
  const sgap = 6;
  const sw = (CW - sgap * 3) / 4;
  stages.forEach(([name, when], i) => {
    const x = M + i * (sw + sgap);
    doc.rect(x, y, sw, 58).fill(i === 0 ? '#1A1526' : C.panel);
    doc.rect(x, y, sw, 2).fill(C.accent);
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(6.2).text(`0${i + 1}`, x + 11, y + 10, { width: 20 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8.6).text(name, x + 11, y + 21, { width: sw - 22 });
    doc.fillColor(C.dim).font('Helvetica').fontSize(6.6).text(when, x + 11, y + 34, { width: sw - 22 });
  });
  y += 58 + 18;

  y = callout(y, {
    tone: 'warn',
    title: 'On scope and investment',
    text: 'No price list is included here, deliberately. Scope depends on the number of entry classes, locations and creative volume - and a number invented before discovery would be either padded or unsafe. A written proposal with line-item transparency follows the discovery discussion, and all accounts, data and enquiries stay in the school\'s name.',
  });

  takeaway('A partner who reports admissions, not impressions.');
  footer('Your Digital Marketing and Admissions Growth Partner');
}

/* ================================================================== */
/* PAGE 12 - NEXT STEP                                                 */
/* ================================================================== */
startPage();
{
  let y = heading('Next step', 'Let\'s Build a Stronger Admissions Pipeline', null, { titleSize: 25 });

  const points = [
    ['01', 'Discover more', 'Help more relevant parents in Vizianagaram find the school before they shortlist.'],
    ['02', 'Convert better', 'Turn that interest into qualified enquiries and booked campus visits.'],
    ['03', 'Measure honestly', 'Build a process that improves admissions and can be proved, month after month.'],
  ];
  const pgap = 10;
  const pw = (CW - pgap * 2) / 3;
  points.forEach(([n, title, body], i) => {
    const x = M + i * (pw + pgap);
    panel(x, y, pw, 118);
    doc.rect(x, y, pw, 2).fill(C.accent);
    doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(20).text(n, x + 14, y + 14);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text(s(title), x + 14, y + 44, { width: pw - 28 });
    doc.fillColor(C.muted).font('Helvetica').fontSize(8)
      .text(s(body), x + 14, y + 62, { width: pw - 28, lineGap: 2.6 });
  });
  y += 118 + 22;

  y = sectionLabel('What we need to get started', y);

  const needs = [
    'The school\'s admission targets for the coming season',
    'Priority classes where seats need filling',
    'The school\'s genuine strengths and proof points',
    'A review of current marketing activity',
    'An agreed marketing budget',
    'Finalisation of the implementation plan',
  ];
  const ngap = 6;
  const nw = (CW - ngap) / 2;
  needs.forEach((n, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (nw + ngap);
    const ty = y + row * 34;
    doc.rect(x, ty, nw, 28).fill(C.panel);
    doc.rect(x, ty, 2, 28).fill(C.accent);
    doc.fillColor(C.body).font('Helvetica').fontSize(8.2).text(s(n), x + 12, ty + 10, { width: nw - 24 });
  });
  y += 3 * 34 + 14;

  // closing
  const closeH = 180;
  panel(M, y, CW, closeH);
  doc.rect(M, y, 3, closeH).fill(C.accent);
  doc.fillColor(C.accent).font('Helvetica-Bold').fontSize(26).text('"', M + 20, y + 10, { width: 40 });
  doc.fillColor('#E8E8EC').font('Helvetica-Oblique').fontSize(10.6)
    .text('Every school has something valuable to offer. Our goal is to help the right parents discover it, trust it and experience it.\n\nLet\'s build a marketing system that turns visibility into enquiries, and enquiries into admissions.', M + 44, y + 24, { width: CW - 76, lineGap: 6 });
  doc.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(9)
    .text('SMART PURSUIT', M + 44, y + closeH - 26, { characterSpacing: 2.2 });

  doc.fillColor(C.dim).font('Helvetica').fontSize(6.8)
    .text('Contact details to be added before this document is issued. Nothing in this edition guarantees admissions, rankings or specific campaign results.', M, y + closeH + 14, { width: CW, lineGap: 3 });

  takeaway('Discovery first, then a written plan with the school\'s own numbers in it.');
  footer('Let\'s Build a Stronger Admissions Pipeline');
}

doc.end();

stream.on('finish', () => {
  const bytes = fs.statSync(OUT).size;
  console.log(JSON.stringify({ file: path.basename(OUT), pages: pageNo, kb: Math.round(bytes / 1024), pageFillPct: fills, notes }, null, 2));
});
