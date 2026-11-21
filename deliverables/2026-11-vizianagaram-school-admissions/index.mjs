/**
 * Build the School Admissions Growth Strategy PDF.
 *
 * Two passes: the first records which page each section starts on, the second
 * writes those numbers into the table of contents.
 *
 *   node deliverables/2026-11-vizianagaram-school-admissions/index.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { sectionsA } from './content-a.mjs';
import { sectionsB } from './content-b.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'SCHOOL-ADMISSIONS-GROWTH-STRATEGY.pdf');

const sections = [...sectionsA, ...sectionsB];

const toc = [
  ['01', 'Executive summary', 'The opportunity in one page'],
  ['02', 'Business context', 'What we know, assume, and must confirm'],
  ['03', 'The Vizianagaram market', 'City and district data, supply structure, catchment'],
  ['04', 'Competitor intelligence', 'Ten institutions, verified gaps, opportunity analysis'],
  ['05', 'Parent behaviour', 'Eight segments, the decision journey, timing'],
  ['06', 'Positioning and differentiation', 'Three concepts, USP, messaging system'],
  ['07', 'Digital presence audit', 'The 100-point instrument, ready to apply'],
  ['08', 'The admissions system', 'Six working parts and who owns each'],
  ['09', 'Google Ads strategy', 'Keyword map, structure, copy, tracking'],
  ['10', 'Meta Ads strategy', 'Audiences, eight concepts, follow-up'],
  ['11', 'Organic social system', 'Twelve pillars, thirty-day calendar'],
  ['12', 'Local SEO', 'Google Business Profile, keywords, reviews'],
  ['13', 'Website and landing page', 'Fifteen sections, CTA wording, technical spec'],
  ['14', 'WhatsApp lead management', 'Pipeline, five sequences, tracker structure'],
  ['15', 'Offline and digital integration', 'Nine activities with capture and measurement'],
  ['16', 'The 2027-28 campaign', 'Calendar, theme, six concepts, offer policy'],
  ['17', '90-day implementation plan', 'Four phases, weekly actions, commitments'],
  ['18', 'Budget and forecast', 'Three scenarios, the arithmetic, sensitivity'],
  ['19', 'Measurement framework', 'KPI definitions, data flow, reporting'],
  ['20', 'Smart Pursuit engagement', 'Services, phasing, ways of working'],
  ['21', 'Why now', 'The opportunity and what needs to change'],
  ['22', 'Next step', 'The discovery session and what follows'],
  ['23', 'Sources and limitations', 'Source register and verification checklist'],
].map(([num, title, sub]) => ({ num, title, sub }));

const meta = {
  title: 'School Admissions Growth Strategy - Digital Marketing & Local Market Opportunity Blueprint',
  subtitle: 'Prepared by Smart Pursuit for a prospective school client in Vizianagaram, Andhra Pradesh',
  preparedFor: 'Prospective school client  |  Vizianagaram (identity pending discovery)',
  toc,
  tocPages: {},
};

// pass 1 - page numbers
const pass1 = await build({
  outFile: path.join('/tmp', 'sp-pass1.pdf'),
  sections,
  meta,
});

meta.tocPages = pass1.sectionPages;

// pass 2 - final
const pass2 = await build({ outFile: OUT, sections, meta });

const bytes = fs.statSync(OUT).size;
console.log(JSON.stringify({
  pages: pass2.pages,
  bytes,
  kb: Math.round(bytes / 1024),
  warnings: pass2.warnings,
  sections: Object.keys(pass2.sectionPages).length,
  firstSections: Object.fromEntries(Object.entries(pass2.sectionPages).slice(0, 5)),
}, null, 2));
