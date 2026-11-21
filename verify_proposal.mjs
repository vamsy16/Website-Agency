import fs from 'fs';
import zlib from 'zlib';
const path = process.argv[2] || 'deliverables/2026-11-vizianagaram-school-admissions/Smart_Pursuit_School_Automation_AI_Solutions_Proposal.pdf';
const buf = fs.readFileSync(path);
const latin = buf.toString('latin1');

function objStream(n) {
  const m = latin.match(new RegExp('(?:^|[^0-9])' + n + ' 0 obj([\\s\\S]*?)endobj'));
  if (!m) return null;
  const b = m[1];
  const si = b.indexOf('stream');
  if (si < 0) return '';
  let s = si + 6;
  if (b[s] === '\r') s++;
  if (b[s] === '\n') s++;
  const e = b.indexOf('endstream', s);
  try { return zlib.inflateSync(Buffer.from(b.slice(s, e), 'latin1')).toString('latin1'); }
  catch (err) { return ''; }
}

const pages = [...latin.matchAll(/\/Type\s*\/Page[^s][\s\S]{0,400}?\/Contents\s+(\d+)\s+0\s+R/g)].map(m => m[1]);

function txt(st) {
  const parts = [...st.matchAll(/\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>/g)].map(x => x[0]);
  let t = '';
  for (const p of parts) {
    if (p.startsWith('<')) {
      const h = p.slice(1, -1).replace(/\s/g, '');
      for (let i = 0; i < h.length; i += 2) t += String.fromCharCode(parseInt(h.substr(i, 2), 16)) + ' ';
    } else {
      t += p.slice(1, -1).replace(/\\([()\\])/g, '$1') + ' ';
    }
  }
  return t.replace(/\s+/g, ' ').trim();
}

const totalPages = pages.length;
console.log('TOTAL PAGES:', totalPages);
let blank = 0, near = 0, nofooter = 0;
const footers = [];
for (let i = 0; i < pages.length; i++) {
  const t = txt(objStream(pages[i]));
  if (t.length < 5) { blank++; console.log('BLANK P' + (i+1)); continue; }
  if (t.length < 80) { near++; console.log('NEAR P' + (i+1) + ' (' + t.length + '): ' + t); }
  const tf = t.replace(/\s+/g, '');            // strip ALL spaces: rejoins char-spaced digits ("1 0" -> "10", "3 2" -> "32")
  const ms = [...tf.matchAll(/Page(\d+)of(\d+)/g)];
  if (ms.length) {
    // "from" (page number) is reliable: digits right before literal "of" are not merged
    footers.push({ p: i+1, from: +ms[0][1], of: +ms[0][2] });
  } else {
    nofooter++; console.log('NO-FOOTER P' + (i+1) + ' (' + t.length + '): ' + t.slice(0,50));
  }
}
console.log('BLANK:', blank, 'NEAR-BLANK:', near, 'NO-FOOTER:', nofooter);
const seq = footers.every((f,i)=>f.from===i+1);
// mode of "of" values (true total dominates over rare merged false values)
const counts = {}; footers.forEach(f=>counts[f.of]=(counts[f.of]||0)+1);
const modeOf = +Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
console.log('FOOTERS:', footers.length, 'sequential 1..32:', seq, 'mode of =', modeOf, '(expect', totalPages, ')');

// Section presence (normalize: lowercase + collapse all spaces to defeat char-spacing)
const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
const all = norm(pages.map(p => txt(objStream(p))).join(' '));
const checks = [
  'Executive Overview','Complete School Automation Ecosystem','Admissions & Enquiry Automation',
  'Parent Communication','Administration & Documents','Finance & Fee Management',
  'Academics & Teaching Support','HR & Staff Operations','Transport, Facilities & Maintenance',
  'Library, Events & Other','IT & Internal Support','Compliance, Safety & DPDP',
  'Integrated AI Agents','Before and After','Business Value Overview','Implementation Roadmap',
  'Smart Pursuit Partnership & Next Steps','RESPONSIBLE AI','PROBLEM','VALUE TO THE SCHOOL','HOW IT WORKS',
  'Central Admissions Enquiry System','Fee Reminders & Receipts','Parent AI Assistant & Notifications',
  'Compliance Calendar & Consent','Bus Attendance & Parent Alerts',
];
for (const c of checks) {
  console.log((all.includes(norm(c)) ? 'OK  ' : 'MISS') + ' ' + c);
}
