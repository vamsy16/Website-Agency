#!/usr/bin/env python3
"""Third-eye scan of a batch of published audits (helps the post-audit review).

  python3 tools/review-pdfs.py deliverables/andhra-pradesh/2026-11-26
  python3 tools/review-pdfs.py <lead-folder> [<lead-folder> ...] [--render tmp/pages] [--json]

Needs pymupdf:  python3 -m venv .venv && .venv/bin/pip install pymupdf
(then run it with .venv/bin/python).

For each lead folder (PDF + verify.json + summary.json + emails/):
  * the PDF has 10 pages and verify.json says ok, with every check passed;
  * the PDF text has none of the defect patterns found in earlier reviews;
  * every measured number quoted in email 1 appears in the PDF, and emails 2-4
    quote no measurements;
  * each email body (the text after the first "---" line) holds only
    recipient-facing text: no operator header, notes, links or markup.
--render DIR also writes pages 2, 3, 4, 5 and 8 as PNG for a visual read.

Exit status 1 when any lead has a defect. "check" items need a human look but
do not fail the run. A clean scan does not replace reading every page against
the live site: it only catches the mistakes already seen once.
"""
import glob
import json
import os
import re
import sys

try:
    import pymupdf as fitz
except ImportError:  # older package name
    try:
        import fitz  # type: ignore
    except ImportError:
        sys.exit("pymupdf is missing: python3 -m venv .venv && .venv/bin/pip install pymupdf")

# (id, regex, kind, what it means). "defect" fails the scan; "check" asks for a look.
PATTERNS = [
    ("plural-placeholder", r"\(s\)", "defect", 'a "(s)" plural placeholder'),
    ("five-sections", r"\bFive sections\b", "defect", 'a section-count target the page was not measured against'),
    ("worth-an-hour", r"\bworth an hour\b", "defect", 'old page-10 wording'),
    ("unmeasured-score", r"—/100|-/100\b", "defect", 'a score printed although the test did not complete'),
    ("only-zero", r"\bOnly 0\b", "defect", '"Only 0 ..." wording'),
    ("dead-links", r"\bdead links?\b", "defect", 'links to "#" called dead links'),
    # 1-3 initials, letters and digits only (src/util.mjs auditRef; verify report.ref).
    # Two-word names legitimately give two initials ("Skin First" -> SF); the defect
    # this catches is a stray symbol such as "SP-AUD-2026-11-26-VF&".
    ("bad-ref", r"SP-AUD-\d{4}-\d{2}-\d{2}-(?![A-Z0-9]{1,3}(?:\s|$))[^\s]{1,6}", "defect", 'a malformed audit reference'),
    ("unformatted-number", r"\b\d{4,} (?:px|ms|KiB)\b", "check", 'a four-digit number printed without a thousands separator ("1176 px")'),
    ("schema-comma", r"\b[A-Z][A-Za-z]+,[A-Z][A-Za-z]+ structured data", "defect", 'an array schema type printed comma-joined ("Person,Organization")'),
    ("zero-cost", r"\bcosting [01] ms\b|\b[01] ms of (?:render-)?blocking", "defect", 'a zero cost listed as evidence'),
    ("zero-h1", r"\b0 H1\b", "h1", 'hidden H1s reported as "0 H1"'),
    ("webpage-schema", r"\b(?:WebPage|WebSite)\b[^.]{0,80}\b(?:missing|lacks|without)\b[^.]{0,40}\b(?:phone|telephone|address)", "defect",
     'a page-type schema said to lack business fields'),
    ("article", r"\b[Aa] (?:8\d?|11|18)(?:/100|\.\d+ s\b| s\b| ms\b)", "defect", '"a" before a number read with a vowel sound ("an 81/100")'),
    ("another-company", r"\banother company\b", "check", 'third-party wording: fine for outside services, wrong for the site builder\'s own file server'),
]
NUM = re.compile(r"\d+(?:[.,]\d+)?\s?(?:/100|ms\b|s\b|%|KiB\b|MB\b|screens?\b)")
BODY_FORBIDDEN = ["DRAFT", "operator", "github", "reports/", "Send:", "Attachments:", "**", "<!--", "TODO", "edit before"]
RENDER_PAGES = [2, 3, 4, 5, 8]


def norm(t):
    return re.sub(r"\s+", " ", t.replace("\u00a0", " ").replace("\u202f", " ")).strip()


def body_of(md):
    parts = re.split(r"^---\s*$", md, maxsplit=1, flags=re.M)
    return parts[1].strip() if len(parts) == 2 else md.strip()


def lead_folders(args):
    out = []
    for a in args:
        if glob.glob(os.path.join(a, "*.pdf")):
            out.append(a)
        else:
            out += sorted(os.path.dirname(p) for p in glob.glob(os.path.join(a, "*", "*.pdf")))
    return out


def review(folder, render_dir=None):
    slug = os.path.basename(folder.rstrip("/"))
    r = {"lead": slug, "defects": [], "checks": []}
    pdf = glob.glob(os.path.join(folder, "*.pdf"))[0]
    doc = fitz.open(pdf)
    pages = [norm(p.get_text()) for p in doc]
    text = " ".join(pages)
    r["pages"] = len(pages)
    if len(pages) != 10:
        r["defects"].append(f"{len(pages)} pages, expected 10")
    vpath = os.path.join(folder, "verify.json")
    if os.path.exists(vpath):
        v = json.load(open(vpath))
        checks = v.get("checks", [])
        passed = sum(1 for c in checks if c.get("ok"))
        r["verify"] = f"{passed}/{len(checks)}"
        failed = [c for c in checks if not c.get("ok")]
        if not v.get("ok") or any(c.get("severity") != "warning" for c in failed):
            r["defects"].append(f"verify.json not clean ({r['verify']}, ok={v.get('ok')})")
        # A warning (facts.zoom: the phone view was zoomed at load) does not
        # block publishing; the review decides what the report should say.
        for c in failed:
            if c.get("severity") == "warning":
                r["checks"].append(f"verify warning {c.get('id')}: {c.get('detail')}")
    else:
        r["defects"].append("verify.json missing")
    # Hidden H1 count from verify's facts.viewport ("visible H1 0/0, hidden 1, ...").
    # "0 H1" is right for a page with none; it is the defect when H1s exist but are
    # hidden (26 Nov review), unless the sentence says "visible" or "hidden".
    hidden = None
    if os.path.exists(vpath):
        fv = next((c for c in checks if c.get("id") == "facts.viewport"), None)
        m = re.search(r"hidden (\d+)", (fv or {}).get("detail", ""))
        hidden = int(m.group(1)) if m else None
    spath = os.path.join(folder, "summary.json")
    if os.path.exists(spath):
        s = json.load(open(spath))
        r["overall"] = s.get("overall")
        r["to"] = s.get("email")
    for pid, rx, kind, what in PATTERNS:
        for i, t in enumerate(pages, 1):
            for m in re.finditer(rx, t):
                ctx = t[max(0, m.start() - 40):m.end() + 40]
                hit = f"p{i} [{pid}] {what}: …{ctx}…"
                if kind == "h1":
                    if hidden == 0 or re.search(r"\b(?:visible|hidden)\b", ctx):
                        continue
                    kind_now = "defect" if hidden else "check"
                else:
                    kind_now = kind
                (r["defects"] if kind_now == "defect" else r["checks"]).append(hit)
    # Page height and screen count must agree (27 Nov review: 9,944 px printed
    # as "about 3 phone screens"). verify's facts.screens names the screen
    # height used; without it, 844 px (390 px layout) or 2,121 px (980 px
    # layout, no viewport tag) are the two layouts seen so far.
    mh = re.search(r"([\d,]+) px page height — about (\d+) phone screen", text)
    if mh:
        px, n = int(mh.group(1).replace(",", "")), int(mh.group(2))
        fs = next((c for c in (checks if os.path.exists(vpath) else []) if c.get("id") == "facts.screens"), None)
        sh = re.search(r"over a (\d+) px screen", (fs or {}).get("detail", ""))
        bases = [int(sh.group(1))] if sh else [844, 2121]
        if not any(abs(round(px / b) - n) <= (0 if sh else 1) for b in bases):
            r["defects"].append(f"p4 [screens] {px:,} px printed as about {n} phone screens (screen of {bases} px)")
        mt = re.search(r"≈(\d+) screens tall", text)
        if mt and int(mt.group(1)) != n:
            r["defects"].append(f"p3/p4 [screens] ≈{mt.group(1)} screens tall vs about {n} phone screens")
    ml = re.search(r"the last screen of about (\d+)", text)
    if ml and int(ml.group(1)) >= 7:
        r["defects"].append(f"p4 [last-screen] screen 7 captioned as the last screen of about {ml.group(1)}")
    # A storage bucket named for the business is its own, not an outside
    # service (27 Nov review: the clinic's media bucket counted as third party).
    if os.path.exists(spath):
        dom_ = (s.get("domain") or "").lower().replace("www.", "")
        labels = dom_.split(".")
        own = (labels[-3] if len(labels) >= 3 and labels[-2] in ("co", "org", "net", "gov", "ac", "edu", "res", "gen", "firm", "ind", "com") else labels[-2] if len(labels) >= 2 else dom_)
        own = re.sub(r"[^a-z0-9]", "", own)
        for host in set(re.findall(r"([a-z0-9][a-z0-9.-]*\.(?:amazonaws\.com|digitaloceanspaces\.com|r2\.dev|blob\.core\.windows\.net|storage\.googleapis\.com|b-cdn\.net))", text.replace("- ", "-").replace(" ", ""))):
            if len(own) >= 6 and own in re.sub(r"[^a-z0-9]", "", host.split(".")[0]):
                r["defects"].append(f"[own-bucket] the business's own storage host listed as external: {host}")
    pdf_flat = text.replace(" ", "")
    for md in sorted(glob.glob(os.path.join(folder, "emails", "email-*.md"))):
        name = os.path.basename(md)
        body = norm(body_of(open(md, encoding="utf-8").read()))
        nums = sorted(set(norm(n) for n in NUM.findall(body)))
        if name.startswith("email-1"):
            r["email1Numbers"] = nums
            missing = [n for n in nums if n.replace(" ", "") not in pdf_flat]
            if missing:
                r["defects"].append(f"{name}: numbers not in the PDF: {missing}")
        elif nums:
            r["checks"].append(f"{name}: quotes measurements {nums} (follow-ups normally quote none)")
        bad = [w for w in BODY_FORBIDDEN if w.lower() in body.lower()]
        if bad:
            r["defects"].append(f"{name}: body contains {bad}")
    if render_dir:
        os.makedirs(render_dir, exist_ok=True)
        for n in RENDER_PAGES:
            if n <= len(doc):
                doc[n - 1].get_pixmap(dpi=60).save(os.path.join(render_dir, f"{slug}-p{n}.png"))
    return r


def main(argv):
    as_json = "--json" in argv
    render_dir = None
    args = []
    it = iter(argv)
    for a in it:
        if a == "--render":
            render_dir = next(it, "tmp/pages")
        elif a != "--json":
            args.append(a)
    if not args:
        sys.exit(__doc__)
    results = [review(f, render_dir) for f in lead_folders(args)]
    if not results:
        sys.exit("no lead folders with a PDF found")
    if as_json:
        print(json.dumps(results, indent=1, ensure_ascii=False))
    else:
        for r in results:
            state = "DEFECTS" if r["defects"] else "clean"
            print(f"{r['lead']:40} {state:8} pages {r['pages']} | verify {r.get('verify')} | overall {r.get('overall')} | email-1 numbers {r.get('email1Numbers')}")
            for d in r["defects"]:
                print(f"   ✗ {d}")
            for c in r["checks"]:
                print(f"   ? {c}")
        if render_dir:
            print(f"pages {RENDER_PAGES} rendered to {render_dir}/")
    return 1 if any(r["defects"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
