/**
 * School Admissions Growth Strategy — PDF renderer.
 *
 * Renders a dark, editorial consulting document from the block lists in
 * content-a.mjs (sections 1–12) and content-b.mjs (sections 13–23).
 *
 * Design tokens are taken from the Smart Pursuit brand palette.
 * Standard PDF fonts are used deliberately: this machine has no system fonts
 * and no browser, so every glyph must come from the embedded AFM set. A
 * sanitise() pass replaces characters outside WinAnsi (e.g. the rupee sign)
 * with text equivalents so nothing renders as a blank box.
 */
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const C = {
  bg: '#0A0A0A',
  panel: '#111111',
  panel2: '#161616',
  white: '#FFFFFF',
  muted: '#A1A1AA',
  dim: '#6B6B72',
  accent: '#7C3AED',
  accentSoft: '#A78BFA',
  line: '#232326',
  ok: '#34D399',
  warn: '#FBBF24',
};

const PAGE = { w: 595.28, h: 841.89 };
const M = { left: 52, right: 52, top: 50, bottom: 56 };
const CW = PAGE.w - M.left - M.right;

/* ------------------------------------------------------------------ */
/* text hygiene                                                        */
/* ------------------------------------------------------------------ */
const REPLACE = [
  [/₹/g, 'INR '],
  [/→/g, ' to '],
  [/←/g, ' from '],
  [/[✓✔]/g, 'Yes'],
  [/[✕✗]/g, 'No'],
  [/[–—]/g, '-'],
  [/[’‘]/g, "'"],
  [/[“”]/g, '"'],
  [/…/g, '...'],
  [/[•]/g, '-'],
  [/≥/g, '>='],
  [/≤/g, '<='],
  [/×/g, 'x'],
  [/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ''],
];

function s(v) {
  let out = String(v ?? '');
  for (const [re, to] of REPLACE) out = out.replace(re, to);
  return out;
}

/* ------------------------------------------------------------------ */
/* renderer                                                            */
/* ------------------------------------------------------------------ */
export function build({ outFile, sections, meta, log = () => {} }) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: meta.title,
      Author: 'Smart Pursuit',
      Subject: meta.subtitle,
      Keywords: 'school admissions, digital marketing, Vizianagaram, Smart Pursuit',
      Creator: 'Smart Pursuit Agency OS',
    },
  });

  const stream = fs.createWriteStream(outFile);
  doc.pipe(stream);

  const ctx = {
    doc,
    y: M.top,
    page: 1,
    overflows: [],
    sectionPages: {},
    current: null,
    warnings: [],
  };

  /* ---------- primitives ---------- */
  const d = () => ctx.doc;

  function bg(pageNumber) {
    const g = d();
    g.rect(0, 0, PAGE.w, PAGE.h).fill(C.bg);
    if (pageNumber && pageNumber > 1) {
      // subtle top accent hairline
      g.rect(0, 0, PAGE.w, 2).fill(C.accent);
      g.save();
      g.fillColor(C.dim).font('Helvetica').fontSize(7).text('SMART PURSUIT', M.left, 32, { characterSpacing: 1.6 });
      g.text('SCHOOL ADMISSIONS GROWTH STRATEGY', M.left, 32, { width: CW, align: 'right', characterSpacing: 1.6 });
      g.restore();
      g.moveTo(M.left, 45).lineTo(PAGE.w - M.right, 45).lineWidth(0.5).strokeColor(C.line).stroke();
    }
  }

  function footer() {
    const g = d();
    const y = PAGE.h - 34;
    g.moveTo(M.left, y - 12).lineTo(PAGE.w - M.right, y - 12).lineWidth(0.5).strokeColor(C.line).stroke();
    g.fillColor(C.dim).font('Helvetica').fontSize(7.5)
      .text('Smart Pursuit  |  Confidential client document', M.left, y, { width: CW * 0.7, characterSpacing: 0.3 });
    g.fillColor(C.muted).font('Helvetica-Bold').fontSize(8)
      .text(String(ctx.page).padStart(2, '0'), M.left, y, { width: CW, align: 'right' });
  }

  function newPage({ withHeader = true } = {}) {
    ctx.fill = ctx.fill || [];
    ctx.fill.push(Math.round(((ctx.y - M.top) / (PAGE.h - M.top - M.bottom)) * 100));
    footer();
    d().addPage();
    ctx.page += 1;
    bg(withHeader ? ctx.page : null);
    ctx.y = M.top + 8;
  }

  function need(h) {
    if (ctx.y + h > PAGE.h - M.bottom) newPage();
  }

  function text(str, { size = 9.5, color = C.white, font = 'Helvetica', x = M.left, width = CW, align = 'left', leading = 1.45, gap = 0, charSpace = 0, opacity } = {}) {
    const g = d();
    g.save();
    g.fillColor(color).font(font).fontSize(size);
    if (opacity !== undefined) g.fillOpacity(opacity);
    const h = g.heightOfString(s(str), { width, align, characterSpacing: charSpace, lineGap: size * (leading - 1) });
    need(h + gap);
    g.fillOpacity(1);
    g.fillColor(color).font(font).fontSize(size);
    if (opacity !== undefined) g.fillOpacity(opacity);
    g.text(s(str), x, ctx.y, { width, align, characterSpacing: charSpace, lineGap: size * (leading - 1) });
    g.restore();
    ctx.y += h + gap;
    if (ctx.y > PAGE.h - M.bottom + 1) ctx.overflows.push(`${ctx.current || 'front'} page ${ctx.page}: text past bottom margin (${Math.round(ctx.y)})`);
  }

  function rule({ color = C.line, gap = 10, weight = 0.6 } = {}) {
    need(gap);
    const g = d();
    g.moveTo(M.left, ctx.y).lineTo(PAGE.w - M.right, ctx.y).lineWidth(weight).strokeColor(color).stroke();
    ctx.y += gap;
  }

  function eyebrow(str, color = C.accentSoft) {
    text(str.toUpperCase(), { size: 7.2, color, font: 'Helvetica-Bold', charSpace: 1.8, gap: 6 });
  }

  function h2(str) {
    need(30);
    ctx.y += 3;
    eyebrow(' ');
    ctx.y -= 6;
    text(str, { size: 11.4, color: C.white, font: 'Helvetica-Bold', leading: 1.18, gap: 1.5 });
    d().moveTo(M.left, ctx.y + 1.5).lineTo(M.left + 20, ctx.y + 1.5).lineWidth(1.4).strokeColor(C.accent).stroke();
    ctx.y += 6;
  }

  function h3(str) {
    need(26);
    text(str, { size: 9.4, color: C.accentSoft, font: 'Helvetica-Bold', leading: 1.25, gap: 2 });
  }

  function p(str, opts = {}) {
    text(str, { size: 8.4, color: C.muted, leading: 1.34, gap: 4.5, ...opts });
  }

  function lead(str) {
    text(str, { size: 9.6, color: '#D4D4D8', leading: 1.32, gap: 6 });
  }

  function bullets(items, { color = C.muted, marker = C.accent, size = 8.3 } = {}) {
    for (const raw of items) {
      const g = d();
      const item = s(raw);
      const h = g.font('Helvetica').fontSize(size).heightOfString(item, { width: CW - 16, lineGap: size * 0.42 });
      need(h + 2.5);
      g.fillColor(marker).circle(M.left + 2.6, ctx.y + size * 0.45, 1.7).fill();
      g.save();
      g.fillColor(color).font('Helvetica').fontSize(size)
        .text(item, M.left + 14, ctx.y, { width: CW - 16, lineGap: size * 0.42 });
      g.restore();
      ctx.y += h + 2.5;
    }
    ctx.y += 1;
  }

  function numbered(items) {
    let i = 0;
    for (const raw of items) {
      i += 1;
      const g = d();
      const item = s(raw);
      const h = Math.max(g.font('Helvetica').fontSize(8.8).heightOfString(item, { width: CW - 26, lineGap: 3.5 }), 12);
      need(h + 3);
      g.save();
      g.fillColor(C.accent).font('Helvetica-Bold').fontSize(8.4)
        .text(String(i).padStart(2, '0'), M.left, ctx.y + 1, { width: 18 });
      g.fillColor(C.muted).font('Helvetica').fontSize(8.8)
        .text(item, M.left + 24, ctx.y, { width: CW - 26, lineGap: 3.5 });
      g.restore();
      ctx.y += h + 2.5;
    }
    ctx.y += 1;
  }

  /* ---------- section opener ---------- */
  // A section starts on a fresh page when there is little room left; otherwise
  // it flows with a compact header. This keeps the document dense enough for a
  // school owner to read in one sitting without losing the divider rhythm.
  function section(sec) {
    const remaining = PAGE.h - M.bottom - ctx.y;
    const fresh = remaining < 250;
    if (fresh) newPage({ withHeader: false });
    const g = d();

    if (fresh) {
      const bandH = 108;
      g.rect(0, 0, PAGE.w, bandH).fill(C.panel);
      g.rect(0, 0, PAGE.w, 3).fill(C.accent);
      g.fillColor('#1E1B2E').font('Helvetica-Bold').fontSize(56).text(s(sec.num), M.left - 2, 26, { width: 160 });
      g.fillColor(C.accent).font('Helvetica-Bold').fontSize(7.8)
        .text(s(sec.kicker ? sec.kicker.toUpperCase() : 'SECTION'), M.left, 60, { characterSpacing: 2 });
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(19).text(s(sec.title), M.left, 72, { width: CW - 20, lineGap: 1 });
      if (sec.blurb) {
        g.fillColor(C.muted).font('Helvetica').fontSize(7.8)
          .text(s(sec.blurb), M.left, 72 + g.heightOfString(s(sec.title), { width: CW - 20, fontSize: 19 }) + 7, { width: CW - 40, lineGap: 2.8 });
      }
      ctx.y = bandH + 14;
    } else {
      const top = ctx.y + 6;
      g.moveTo(M.left, top).lineTo(PAGE.w - M.right, top).lineWidth(0.7).strokeColor(C.line).stroke();
      g.rect(M.left, top - 1, 46, 2).fill(C.accent);
      g.fillColor(C.accent).font('Helvetica-Bold').fontSize(20).text(s(sec.num), M.left, top + 10, { width: 40 });
      const tx = M.left + 40;
      g.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(6.8)
        .text(s(sec.kicker ? sec.kicker.toUpperCase() : 'SECTION'), tx, top + 10, { characterSpacing: 1.8 });
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(14.5).text(s(sec.title), tx, top + 20, { width: CW - 44, lineGap: 1 });
      const titleH = g.heightOfString(s(sec.title), { width: CW - 44, fontSize: 14.5 });
      let by = top + 20 + titleH + 4;
      if (sec.blurb) {
        g.fillColor(C.muted).font('Helvetica').fontSize(7.6)
          .text(s(sec.blurb), tx, by, { width: CW - 50, lineGap: 2.6 });
        by += g.heightOfString(s(sec.blurb), { width: CW - 50, fontSize: 7.6 }) + 2;
      }
      ctx.y = Math.max(by + 6, top + 58);
    }
    ctx.sectionPages[sec.num] = ctx.page;
    ctx.current = sec.num;
  }

  /* ---------- components ---------- */
  function callout(c) {
    const g = d();
    const tone = c.tone || 'accent';
    const bar = tone === 'warn' ? C.warn : tone === 'info' ? '#60A5FA' : C.accent;
    const bodyH = g.font('Helvetica').fontSize(8.3).heightOfString(s(c.text), { width: CW - 44, lineGap: 2.9 });
    const titleH = c.title ? 12 : 0;
    const h = bodyH + titleH + 16;
    need(h + 10);
    const top = ctx.y;
    g.rect(M.left, top, CW, h).fill(C.panel);
    g.rect(M.left, top, 3, h).fill(bar);
    let ty = top + 10;
    if (c.title) {
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(9.6).text(s(c.title), M.left + 20, ty, { width: CW - 40 });
      ty += 12;
    }
    g.fillColor('#C8C8CE').font('Helvetica').fontSize(8.3).text(s(c.text), M.left + 20, ty, { width: CW - 44, lineGap: 2.9 });
    ctx.y = top + h + 7;
  }

  function stats(items) {
    const g = d();
    const cols = items.length;
    const gap = 10;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = 56;
    need(h + 12);
    items.forEach((it, i) => {
      const x = M.left + i * (w + gap);
      g.rect(x, ctx.y, w, h).fill(C.panel);
      g.rect(x, ctx.y, w, 2).fill(C.accent);
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(15.5).text(s(it.value), x + 11, ctx.y + 10, { width: w - 20 });
      g.fillColor(C.muted).font('Helvetica').fontSize(7.8)
        .text(s(it.label), x + 11, ctx.y + 32, { width: w - 22, lineGap: 1.3 });
      if (it.sub) {
        g.fillColor(C.dim).font('Helvetica').fontSize(6.8)
          .text(s(it.sub), x + 11, ctx.y + 45, { width: w - 22, lineGap: 1.1 });
      }
    });
    ctx.y += h + 10;
  }

  function kv(items) {
    const g = d();
    const labelW = 132;
    for (const [k, v] of items) {
      const vh = g.font('Helvetica').fontSize(8.3).heightOfString(s(v), { width: CW - labelW - 12, lineGap: 2.8 });
      need(vh + 5.5);
      const top = ctx.y;
      g.fillColor(C.dim).font('Helvetica-Bold').fontSize(7.4)
        .text(s(k).toUpperCase(), M.left, top + 1, { width: labelW - 8, characterSpacing: 0.9, lineGap: 2 });
      g.fillColor('#D4D4D8').font('Helvetica').fontSize(8.3)
        .text(s(v), M.left + labelW, top, { width: CW - labelW, lineGap: 2.8 });
      ctx.y = top + vh + 5.5;
      g.moveTo(M.left, ctx.y - 5).lineTo(PAGE.w - M.right, ctx.y - 5).lineWidth(0.4).strokeColor(C.line).stroke();
    }
    ctx.y += 6;
  }

  function table(t) {
    const g = d();
    const widths = t.widths || Array(t.head.length).fill(CW / t.head.length);
    const size = t.size || 6.9;
    const pad = 3.4;
    const totalW = widths.reduce((a, b) => a + b, 0);
    const scale = CW / totalW;
    const w = widths.map((x) => x * scale);

    function drawHead() {
      const hh = 14;
      need(hh + 24);
      g.rect(M.left, ctx.y, CW, hh).fill(C.panel2);
      let x = M.left;
      t.head.forEach((cell, i) => {
        g.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(6.9)
          .text(s(cell).toUpperCase(), x + pad, ctx.y + 4.2, { width: w[i] - pad * 2, characterSpacing: 0.55 });
        x += w[i];
      });
      ctx.y += hh;
      g.moveTo(M.left, ctx.y).lineTo(PAGE.w - M.right, ctx.y).lineWidth(0.8).strokeColor(C.accent).stroke();
    }

    drawHead();
    t.rows.forEach((row, ri) => {
      const cells = row.map((c) => s(c));
      const heights = cells.map((c, i) => g.font(c.startsWith('**') ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
        .heightOfString(c.replace(/\*\*/g, ''), { width: w[i] - pad * 2, lineGap: 1.35 }));
      const rh = Math.max(...heights) + pad * 2;
      if (ctx.y + rh > PAGE.h - M.bottom) {
        newPage();
        drawHead();
      }
      if (ri % 2 === 0) g.rect(M.left, ctx.y, CW, rh).fill('#0E0E10');
      let x = M.left;
      cells.forEach((cell, i) => {
        const bold = cell.startsWith('**');
        const body = cell.replace(/\*\*/g, '');
        g.fillColor(bold ? C.white : C.muted).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
          .text(body, x + pad, ctx.y + pad, { width: w[i] - pad * 2, lineGap: 1.35 });
        x += w[i];
      });
      ctx.y += rh;
      g.moveTo(M.left, ctx.y).lineTo(PAGE.w - M.right, ctx.y).lineWidth(0.35).strokeColor(C.line).stroke();
    });
    ctx.y += 4;
    if (t.note) text(t.note, { size: 7, color: C.dim, leading: 1.4, gap: 8 });
    ctx.y += 2;
  }

  function bars(ch) {
    const g = d();
    const labelW = 168;
    const valueW = 86;
    const trackW = CW - labelW - valueW - 12;
    if (ch.title) h3(ch.title);
    const rowH = 21;
    need(ch.items.length * rowH + 16);
    const max = Math.max(...ch.items.map((i) => i.value));
    ch.items.forEach((it) => {
      const y = ctx.y;
      g.fillColor('#C8C8CE').font('Helvetica').fontSize(8.4).text(s(it.label), M.left, y + 3, { width: labelW - 10, lineGap: 1.5 });
      g.rect(M.left + labelW, y + 5, trackW, 10).fill('#1B1B1F');
      const bw = Math.max(3, (it.value / max) * trackW);
      g.rect(M.left + labelW, y + 5, bw, 10).fill(C.accent);
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(8.4)
        .text(s(it.display || it.value), M.left + labelW + trackW + 10, y + 4, { width: valueW - 6, align: 'right' });
      ctx.y = y + rowH;
    });
    if (ch.note) text(ch.note, { size: 7, color: C.dim, leading: 1.4, gap: 8 });
    ctx.y += 6;
  }

  function funnel(f) {
    const g = d();
    const stageH = 22;
    const gap = 2;
    need(f.items.length * (stageH + gap) + 20);
    const numeric = f.items.every((it) => typeof it.value === 'number' && Number.isFinite(it.value));
    const max = numeric ? f.items[0].value : 0;
    const n = f.items.length;
    f.items.forEach((it, i) => {
      const frac = numeric ? it.value / max : Math.max(0.45, 1 - i * 0.07);
      const width = CW * (0.42 + 0.58 * frac);
      const x = M.left;
      const y = ctx.y;
      g.rect(x, y, width, stageH).fill(i === f.items.length - 1 ? C.accent : '#1C1A26');
      if (i !== f.items.length - 1) g.rect(x, y, 2, stageH).fill(C.accentSoft);
      g.fillColor(i === f.items.length - 1 ? C.white : '#E4E4E7').font('Helvetica-Bold').fontSize(8.6)
        .text(s(it.label), x + 10, y + 7, { width: width - 86 });
      g.fillColor(i === f.items.length - 1 ? '#EDE9FE' : C.muted).font('Helvetica-Bold').fontSize(9)
        .text(s(it.value), x + width - 80, y + 6.5, { width: 68, align: 'right' });
      ctx.y = y + stageH + gap;
    });
    if (f.note) text(f.note, { size: 7, color: C.dim, leading: 1.4, gap: 8 });
    ctx.y += 8;
  }

  function journey(j) {
    const g = d();
    const n = j.items.length;
    const gap = 4;
    const w = (CW - gap * (n - 1)) / n;
    const h = 34;
    need(h + 12);
    j.items.forEach((it, i) => {
      const x = M.left + i * (w + gap);
      g.rect(x, ctx.y, w, h).fill(C.panel);
      g.rect(x, ctx.y, w, 2).fill(C.accent);
      g.fillColor(C.accent).font('Helvetica-Bold').fontSize(6.6).text(String(i + 1).padStart(2, '0'), x + 7, ctx.y + 9, { width: w - 14 });
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(7.4).text(s(it.label), x + 7, ctx.y + 20, { width: w - 14, lineGap: 1.4 });
      ctx.y = ctx.y;
    });
    ctx.y += h + 10;
  }

  function phases(ph) {
    const g = d();
    const gap = 12;
    const w = (CW - gap) / 2;
    ph.items.forEach((p, i) => {
      const col = i % 2;
      if (col === 0) {
        // measure row height first
        const hMax = Math.max(...ph.items.slice(i, i + 2).map((pp) => {
          const focusH = pp.focus.reduce((a, f) => a + g.font('Helvetica').fontSize(8).heightOfString(s(f), { width: w - 34, lineGap: 3 }), 0);
          return 64 + focusH + (pp.deliverable ? 30 : 0);
        }));
        need(hMax + 12);
        ctx.rowTop = ctx.y;
        ctx.rowH = hMax;
      }
      const x = M.left + col * (w + gap);
      const y = ctx.rowTop;
      const h = ctx.rowH;
      g.rect(x, y, w, h).fill(C.panel);
      g.rect(x, y, w, 2).fill(C.accent);
      g.fillColor(C.accent).font('Helvetica-Bold').fontSize(7)
        .text(s(p.name).toUpperCase(), x + 14, y + 14, { width: w - 28, characterSpacing: 1.1 });
      g.fillColor(C.dim).font('Helvetica').fontSize(7).text(s(p.days), x + 14, y + 26, { width: w - 28 });
      let fy = y + 42;
      p.focus.forEach((f) => {
        const fh = g.font('Helvetica').fontSize(8).heightOfString(s(f), { width: w - 34, lineGap: 3 });
        g.fillColor(C.accent).circle(x + 17, fy + 4, 1.4).fill();
        g.fillColor(C.muted).font('Helvetica').fontSize(8).text(s(f), x + 24, fy, { width: w - 38, lineGap: 3 });
        fy += fh + 4;
      });
      if (p.deliverable) {
        g.moveTo(x + 14, fy + 4).lineTo(x + w - 14, fy + 4).lineWidth(0.4).strokeColor(C.line).stroke();
        g.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(6.8)
          .text('DELIVERABLE', x + 14, fy + 10, { characterSpacing: 0.8 });
        g.fillColor('#C8C8CE').font('Helvetica').fontSize(7.6)
          .text(s(p.deliverable), x + 14, fy + 20, { width: w - 28, lineGap: 2.4 });
      }
      if (col === 1 || i === ph.items.length - 1) {
        ctx.y = ctx.rowTop + ctx.rowH + 12;
      }
    });
  }

  function tiles(t) {
    const g = d();
    if (t.title) h3(t.title);
    const cols = t.cols || 4;
    const gap = 8;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = 44;
    const rows = Math.ceil(t.items.length / cols);
    need(rows * (h + gap) + 10);
    t.items.forEach((it, i) => {
      const r = Math.floor(i / cols);
      const cIdx = i % cols;
      const x = M.left + cIdx * (w + gap);
      const y = ctx.y + r * (h + gap);
      g.rect(x, y, w, h).fill(C.panel);
      g.rect(x, y, 2, h).fill(C.accent);
      g.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.2)
        .text(s(it.label).toUpperCase(), x + 10, y + 9, { width: w - 18, characterSpacing: 0.5, lineGap: 1.5 });
      g.fillColor(C.white).font('Helvetica-Bold').fontSize(13)
        .text(s(it.value), x + 9, y + 21, { width: w - 18 });
      if (it.sub) g.fillColor(C.muted).font('Helvetica').fontSize(6.6)
        .text(s(it.sub), x + 10, y + 43, { width: w - 18, lineGap: 1.4 });
    });
    ctx.y += rows * (h + gap) + 8;
  }

  function scorecard(sc) {
    table({
      head: ['Area', 'Weight', 'Score /100', 'Basis'],
      widths: [150, 52, 72, 210],
      size: 7.8,
      rows: sc.rows.map((r) => [r.area, r.weight, r.score === null ? 'Not audited' : String(r.score), r.basis]),
      note: sc.note,
    });
  }

  function wire(w) {
    const g = d();
    const gap = 6;
    const wd = (CW - 130 - gap) / 2;
    const bh = 26;
    const rowsN = Math.ceil(w.items.length / 2);
    need(rowsN * (bh + gap) + 16);
    const x0 = M.left;
    w.items.forEach((it, i) => {
      const col = i % 2;
      const r = Math.floor(i / 2);
      const x = x0 + col * (wd + gap);
      const y = ctx.y + r * (bh + gap);
      g.rect(x, y, wd, bh).fill(C.panel);
      g.rect(x, y, 2, bh).fill(i === 0 ? C.accent : '#3F3F46');
      g.fillColor(C.muted).font('Helvetica-Bold').fontSize(6.4).text(String(i + 1).padStart(2, '0'), x + 8, y + 6, { width: 16 });
      g.fillColor('#E4E4E7').font('Helvetica-Bold').fontSize(7.4).text(s(it.label), x + 24, y + 5, { width: wd - 32, lineGap: 1.5 });
      if (it.note) g.fillColor(C.dim).font('Helvetica').fontSize(6.2).text(s(it.note), x + 24, y + 16, { width: wd - 32, lineGap: 1.2 });
    });
    ctx.y += rowsN * (bh + gap) + 8;
  }

  function quote(q) {
    const g = d();
    const h = g.font('Helvetica-Oblique').fontSize(10).heightOfString(s(q.text), { width: CW - 70, lineGap: 4.5 }) + 20;
    need(h + 16);
    const top = ctx.y;
    g.rect(M.left, top, CW, h).fill(C.panel);
    g.fillColor(C.accent).font('Helvetica-Bold').fontSize(30).text('"', M.left + 18, top + 4, { width: 40 });
    g.fillColor('#E4E4E7').font('Helvetica-Oblique').fontSize(10)
      .text(s(q.text), M.left + 44, top + 13, { width: CW - 66, lineGap: 4.5 });
    ctx.y = top + h + 10;
  }

  function spacer(h = 10) { ctx.y += h; }

  /* ---------- cover ---------- */
  function pageFill() {
    ctx.fill = ctx.fill || [];
    return ctx.fill;
  }

  function cover() {
    const g = d();
    g.rect(0, 0, PAGE.w, PAGE.h).fill(C.bg);
    // glow
    const grad = g.linearGradient(0, 0, PAGE.w, PAGE.h);
    grad.stop(0, '#1A1030').stop(0.45, '#0A0A0A').stop(1, '#0A0A0A');
    g.rect(0, 0, PAGE.w, PAGE.h).fill(grad);
    // accent frame
    g.rect(0, 0, 6, PAGE.h).fill(C.accent);
    g.moveTo(M.left, 96).lineTo(M.left + 44, 96).lineWidth(2.5).strokeColor(C.accent).stroke();
    g.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
      .text('SMART PURSUIT', M.left, 64, { characterSpacing: 3.4 });
    g.fillColor(C.muted).font('Helvetica').fontSize(8)
      .text('DIGITAL MARKETING  |  BUSINESS DEVELOPMENT', M.left + 152, 66.5, { characterSpacing: 1.8, width: 320 });

    g.fillColor(C.white).font('Helvetica-Bold').fontSize(41)
      .text('SCHOOL\nADMISSIONS\nGROWTH STRATEGY', M.left, 210, { width: 470, lineGap: 6 });
    g.fillColor(C.accentSoft).font('Helvetica-Bold').fontSize(12)
      .text('Digital Marketing & Local Market Opportunity Blueprint', M.left, 385, { width: 440, lineGap: 3 });

    g.moveTo(M.left, 425).lineTo(PAGE.w - M.right, 425).lineWidth(0.7).strokeColor('#2A2A2E').stroke();

    const facts = [
      ['PREPARED FOR', meta.preparedFor],
      ['MARKET', 'Vizianagaram, Andhra Pradesh'],
      ['CATEGORY', 'Private K-12 school admissions'],
      ['PREPARED BY', 'Smart Pursuit'],
      ['ISSUE', 'November 2026  -  v1.0'],
    ];
    let fy = 452;
    facts.forEach(([k, v]) => {
      g.fillColor(C.dim).font('Helvetica-Bold').fontSize(6.8).text(k, M.left, fy, { characterSpacing: 1.4, width: 120 });
      g.fillColor('#E4E4E7').font('Helvetica').fontSize(9.2).text(s(v), M.left + 130, fy - 0.5, { width: 330, lineGap: 2 });
      fy += 26;
    });

    // bottom band
    g.rect(0, PAGE.h - 96, PAGE.w, 96).fill(C.panel);
    g.rect(0, PAGE.h - 96, PAGE.w, 2).fill(C.accent);
    g.fillColor(C.muted).font('Helvetica').fontSize(7.6)
      .text('This document is a market-based strategy prepared before school-specific discovery. Items marked "requires confirmation" are labelled in the text and listed in Section 23.', M.left, PAGE.h - 78, { width: CW - 10, lineGap: 4 });
    g.fillColor(C.dim).font('Helvetica-Bold').fontSize(7)
      .text('CONFIDENTIAL  -  PREPARED FOR A PROSPECTIVE CLIENT  -  NOT FOR CIRCULATION', M.left, PAGE.h - 40, { characterSpacing: 0.9 });
    ctx.page = 1;
  }

  /* ---------- TOC ---------- */
  function toc(entries, pagesMap) {
    newPage({ withHeader: false });
    const g = d();
    g.rect(0, 0, PAGE.w, 150).fill(C.panel);
    g.rect(0, 0, PAGE.w, 3).fill(C.accent);
    g.fillColor(C.white).font('Helvetica-Bold').fontSize(24).text('Contents', M.left, 58, { width: CW });
    g.fillColor(C.muted).font('Helvetica').fontSize(8.6)
      .text('23 sections  -  market research, competitor intelligence, parent behaviour, channel strategy, 90-day plan', M.left, 94, { width: CW - 40, lineGap: 4 });
    ctx.y = 178;
    entries.forEach((e) => {
      const y = ctx.y;
      const pg = pagesMap[e.num] ? String(pagesMap[e.num]) : '';
      g.fillColor(C.accent).font('Helvetica-Bold').fontSize(7).text(e.num, M.left, y + 1, { width: 24 });
      g.fillColor('#E4E4E7').font('Helvetica-Bold').fontSize(8.4).text(s(e.title), M.left + 26, y, { width: CW - 80 });
      g.fillColor(C.dim).font('Helvetica').fontSize(6.6).text(s(e.sub || ''), M.left + 26, y + 11, { width: CW - 80, lineGap: 1.2 });
      g.fillColor(C.muted).font('Helvetica-Bold').fontSize(8).text(pg, PAGE.w - M.right - 34, y + 1, { width: 34, align: 'right' });
      g.moveTo(M.left + 26, y + 21.5).lineTo(PAGE.w - M.right, y + 21.5).lineWidth(0.3).strokeColor('#1D1D20').stroke();
      ctx.y = y + 25;
    });
  }

  /* ---------- block dispatcher ---------- */
  function render(blocks) {
    for (const b of blocks) {
      switch (b.type) {
        case 'section':
          section(b);
          render(b.blocks || []);
          break;
        case 'h2': h2(b.text); break;
        case 'h3': h3(b.text); break;
        case 'p': p(b.text); break;
        case 'lead': lead(b.text); break;
        case 'eyebrow': eyebrow(b.text); break;
        case 'bullets': bullets(b.items); break;
        case 'numbered': numbered(b.items); break;
        case 'callout': callout(b); break;
        case 'stats': stats(b.items); break;
        case 'kv': kv(b.items); break;
        case 'table': table(b); break;
        case 'bars': bars(b); break;
        case 'funnel': funnel(b); break;
        case 'journey': journey(b); break;
        case 'phases': phases(b); break;
        case 'tiles': tiles(b); break;
        case 'scorecard': scorecard(b); break;
        case 'wire': wire(b); break;
        case 'quote': quote(b); break;
        case 'rule': rule({ gap: b.gap || 12 }); break;
        case 'spacer': spacer(b.h); break;
        case 'pagebreak': newPage(); break;
        default:
          ctx.warnings.push(`unknown block type: ${b.type}`);
      }
      if (ctx.y > PAGE.h - M.bottom + 2) {
        ctx.overflows.push(`${ctx.current || 'front'} p${ctx.page}: block '${b.type}' ended at ${Math.round(ctx.y)} (limit ${Math.round(PAGE.h - M.bottom)})`);
      }
    }
  }

  /* ---------- run ---------- */
  cover();
  toc(meta.toc, meta.tocPages || {});
  for (const sec of sections) render([sec]);
  footer();

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      const buf = fs.readFileSync(outFile);
      // rough page count from the PDF page tree
      const count = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      resolve({ pages: count, warnings: ctx.warnings, overflows: ctx.overflows, sectionPages: ctx.sectionPages, fill: ctx.fill || [] });
    });
    stream.on('error', reject);
  });
}

export { C, PAGE, M, CW };
