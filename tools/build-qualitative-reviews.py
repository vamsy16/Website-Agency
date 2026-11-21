"""Build limited-scope evidence-review PDFs, separate from the frozen technical audit renderer.
Requires reportlab and pypdf. No network, scoring, registry audit acceptance or mail actions.
"""
import json, re, hashlib, zipfile
from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'data/ap-ai-researched-2026-11-21.json'
batch = json.loads(source.read_text())
out = ROOT / 'deliverables/ai-reviews/2026-11-21'
out.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BrandReview', fontName='Helvetica-Bold', fontSize=11, textColor=HexColor('#176d70'), spaceAfter=14))
styles.add(ParagraphStyle(name='TitleReview', fontName='Helvetica-Bold', fontSize=24, leading=29, textColor=HexColor('#132d40'), spaceAfter=14))
styles.add(ParagraphStyle(name='BodyReview', fontSize=10, leading=15, spaceAfter=9, textColor=HexColor('#25394a')))
styles.add(ParagraphStyle(name='HeadingReview', fontName='Helvetica-Bold', fontSize=13, leading=18, spaceBefore=12, spaceAfter=8, textColor=HexColor('#176d70')))
styles.add(ParagraphStyle(name='SmallReview', fontSize=8, leading=11, spaceAfter=8, textColor=HexColor('#4b5962'), splitLongWords=True))

def para(s, style='BodyReview'):
    return Paragraph(escape(s), styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(HexColor('#d4e0e4'))
    canvas.line(43, 42, A4[0]-43, 42)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(HexColor('#4b5962'))
    canvas.drawString(43, 28, 'SMART PURSUIT | AI-assisted qualitative website review | 21 Nov 2026')
    canvas.drawRightString(A4[0]-43, 28, str(doc.page))
    canvas.restoreState()

# Re-checked with direct page retrievals in this PDF-generation session.
notes = [
    ('Homepage text includes services, FAQ answers, portfolio links and a published email. These are useful starting points for understanding the offer.',
     'The retrieved homepage references an image URL containing "ialicante-mediterranean-homes-475751-unsplash". This is a filename clue, not proof of image ownership, licensing or misrepresentation.',
     'Confirm which images show completed client projects. If inspiration images are used, label them separately. Add scope/location captions only where the business can substantiate them.',
     'Check a representative portfolio entry, confirm photo permissions, and test the enquiry form in an authorised browser session. Do not claim the form is broken based on the extraction notice about JavaScript.'),
    ('The contact page provides a complete showroom address, email, phone options, a WhatsApp link and product-specific enquiry choices.',
     'Extracted form content includes "Maths Captcha: What is 8 + 2?" and "Incorrect answer, please try again." Extraction can expose hidden error text; no initial-load visual defect or submission failure was established.',
     'Review CAPTCHA error-state timing in a browser. Only change behaviour if the error appears before interaction or incorrectly blocks a legitimate enquiry. Preserve the useful product/location fields.',
     'Confirm the local website decision-maker and any branded-product affiliation before outreach. A contact-page review does not establish franchise ownership or that a redesign is needed.'),
    ('The homepage describes several photography services and publishes an address, phone and email next to an event-enquiry form.',
     'Under "Baby Photo shoots", the description begins "Our pre-wedding photoshoots beautifully capture the chemistry...". The displayed email link targets https://imageartphotographyvizag.com/# rather than mailto:. These are directly supported content/link observations.',
     'Replace the baby-shoot description with accurate baby-session information. Change the email anchor to mailto:imageartphotographyvizag@gmail.com while keeping the visible address. Test the resulting link on supported devices.',
     'Review matching copy on the other service cards. No claim is made about revenue impact, enquiry delivery, image authenticity or performance. Published phone digits are preserved without assuming a country-code format.'),
    ('The contact page includes the local address, two phones, a mailto email link, service FAQs and a short enquiry form.',
     'Extracted chat-widget content contains a literal settings fragment followed by "WhatsApp Messageundefined". The footer phone-text link targets /index.php/home/ while another phone control uses tel:+919849333755. Browser visibility/behaviour is untested.',
     'Check whether the widget fragment is exposed to users before classifying it as a visible bug. Where a link is presented as a call action, use a tel: destination consistently and test it. Do not label the entire chat or phone experience broken.',
     'Test mobile call and chat controls, inspect the browser-rendered error state, and confirm consent before any test form submission. Extraction alone does not measure accessibility or mobile layout.'),
    ('The hosted business page lists interior services, the Guntur address, a mailto email link, a phone link and an enquiry route.',
     'The page is hosted at a business-specific ueniweb.com subdomain. Retrieved review entries include dates in 2020 and 2021. These facts do not prove that the business is inactive or that all reviews are outdated.',
     'Ask the owner whether recent project examples can be published. Discuss a custom domain only if it supports their goals; the current hosted platform is not itself a defect. Clarify project types, service area and enquiry requirements with approved copy.',
     'Confirm current trading/contact details directly before outreach and obtain permission for new case studies. No site-security, platform-quality or business-closure conclusion follows from the URL or review dates.')
]
manifest = {'type':'qualitative-evidence-review', 'date':'2026-11-21', 'technicalAuditCompleted':False,
            'pipelineVerifyClaimed':False, 'sent':False, 'reports':[]}
for i, lead in enumerate(batch['leads']):
    slug = re.sub('[^a-z0-9]+', '-', lead['name'].lower()).strip('-')
    filename = f'AI-Website-Review-{slug}.pdf'
    pdf = out / filename
    strength, finding, recommendation, nextcheck = notes[i]
    story = [para('SMART PURSUIT / EVIDENCE FIRST', 'BrandReview'),
             para(lead['name'], 'TitleReview'),
             para('AI-assisted website audit', 'HeadingReview'),
             para('Limited scope: public-page content and contact-path review. Prepared for operator review; not a certified technical or performance audit.'),
             para('Reviewed: 21 November 2026 | '+lead['city']+', Andhra Pradesh', 'SmallReview'),
             para('Scope and evidence', 'HeadingReview'),
             para('This review uses direct retrieval of the public page linked below, checked again during PDF preparation. AI analysis separates observed text/link facts from proposed improvements. No Lighthouse run, visual browser inspection or test submission was performed.'),
             para('Published contact details', 'HeadingReview'),
             para('Website: '+lead['website']), para('Email: '+lead['email']),
             para('Phone: '+' / '.join([lead['phone']]+lead['additionalPhones'])),
             para('Address (business-published): '+lead['address']),
             para('What the page already provides', 'HeadingReview'), para(strength),
             para('Source page', 'HeadingReview')]
    primary = lead['website'] if i == 0 else lead['sourceUrl']
    story.append(Paragraph('<link href="'+escape(primary, quote=True)+'" color="#176d70">'+escape(primary)+'</link>', styles['SmallReview']))
    story.extend([para('Published contact information is not proof of mailbox deliverability, physical operation, ownership or buying intent.', 'SmallReview'),
                  PageBreak(), para('FINDINGS / RECOMMENDATIONS / LIMITS', 'BrandReview'),
                  para('Evidence-led findings', 'TitleReview'),
                  para('Observed in retrieved content', 'HeadingReview'), para(finding),
                  para('Recommended action - not a measured outcome', 'HeadingReview'), para(recommendation),
                  para('What still needs testing', 'HeadingReview'), para(nextcheck),
                  para('Second review / third-eye consistency check', 'HeadingReview'),
                  para('The findings above were checked again against the freshly retrieved source content. Recommendations were reviewed for unsupported claims: no invented score, lost-revenue figure, broken-form assertion, or guarantee is included. This is a second pass by the same AI assistant, not independent external verification.'),
                  para('Unmeasured and excluded', 'HeadingReview'),
                  para('Page speed, Core Web Vitals, mobile rendering, WCAG conformance, security, form delivery, search rankings and conversion rates were not measured. No screenshots or test results are represented as having been captured. These documents do not pass or replace the repository technical-audit verifier.'),
                  para('Provenance and duplicate protection', 'HeadingReview'),
                  para('This batch was checked against the repository lead and audit registries before registration, using domain, email, phone and name/city checks. Gmail was not used. The current registry entry represents this same lead, not a newly discovered duplicate.'),
                  para('Smart Pursuit | +91 70950 24220 | smartpursuit3@gmail.com', 'SmallReview')])
    doc = SimpleDocTemplate(str(pdf), pagesize=A4, rightMargin=43, leftMargin=43, topMargin=43, bottomMargin=57,
                            title=lead['name']+' - AI-assisted qualitative website audit', author='Smart Pursuit')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    reader = PdfReader(pdf)
    text = ' '.join((' '.join(p.extract_text() for p in reader.pages)).split())
    assert len(reader.pages) == 2, (filename, len(reader.pages))
    for expected in [lead['name'], lead['email'], 'Unmeasured and excluded', 'not a certified technical']:
        assert expected in text, (filename, expected)
    assert all(len(p.extract_text())>100 for p in reader.pages)
    manifest['reports'].append({'business':lead['name'],'file':filename,'pages':len(reader.pages),
        'bytes':pdf.stat().st_size,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),
        'sourcePageRechecked':primary,'pdfStructureChecks':'passed; 2 pages, required text present',
        'visualQA': 'not performed', 'reviewScope':'text/link evidence and same-assistant consistency pass'})
(out/'review-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
with zipfile.ZipFile(out/'Five-AP-AI-Website-Reviews.zip','w',zipfile.ZIP_DEFLATED) as z:
    for r in manifest['reports']:
        z.write(out/r['file'],r['file'])
    z.write(out/'review-manifest.json','review-manifest.json')
print(json.dumps(manifest,indent=2))
