#!/usr/bin/env python3
"""Build slides/agentic-program-management.pptx (2 slides + speaker notes).

    python3 tools/build_slides.py

Requires python-pptx. Uses slides/assets/dashboard-overview.png (a dashboard screenshot).
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "slides" / "agentic-program-management.pptx"
SHOT = REPO / "slides" / "assets" / "dashboard-overview.png"
URL = "sgfernandes.github.io/ITVCookbook/dashboard.html"

# Palette matches dashboard.html
PRIMARY = RGBColor(0x00, 0x5A, 0x9C)
PRIMARY_LIGHT = RGBColor(0xE6, 0xF0, 0xF8)
NAVY = RGBColor(0x12, 0x23, 0x3A)
TEXT = RGBColor(0x33, 0x33, 0x33)
MUTED = RGBColor(0x66, 0x70, 0x85)
GREEN = RGBColor(0x1F, 0x9D, 0x55)
GREEN_LIGHT = RGBColor(0xE3, 0xF5, 0xEA)
RED = RGBColor(0xC2, 0x41, 0x41)
RED_LIGHT = RGBColor(0xFD, 0xEC, 0xEC)
AMBER = RGBColor(0xD6, 0x9E, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BORDER = RGBColor(0xDC, 0xE1, 0xE7)
FONT = "Calibri"


def shape(slide, kind, x, y, w, h, fill=None, line=None, radius=None):
    s = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    if radius is not None and kind == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    s.shadow.inherit = False
    return s


def text(slide, x, y, w, h, runs, size=12, color=TEXT, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, italic=False, margin=0.05):
    """runs: str, or list of paragraphs; each paragraph is str or list of (text, {bold, color, size, italic})."""
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for side in ("left", "right", "top", "bottom"):
        setattr(tf, f"margin_{side}", Inches(margin))
    paras = runs if isinstance(runs, list) else [runs]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        for seg in (para if isinstance(para, list) else [(para, {})]):
            t, fmt = seg if isinstance(seg, tuple) else (seg, {})
            r = p.add_run()
            r.text = t
            f = r.font
            f.name = FONT
            f.size = Pt(fmt.get("size", size))
            f.bold = fmt.get("bold", bold)
            f.italic = fmt.get("italic", italic)
            f.color.rgb = fmt.get("color", color)
    return tb


def bullets(slide, x, y, w, h, items, size=11.5, marker="•", marker_color=PRIMARY, space=5):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    for side in ("left", "right", "top", "bottom"):
        setattr(tf, f"margin_{side}", Inches(0.04))
    for i, (lead, rest) in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(space)
        for t, b, c in ((f"{marker}  ", True, marker_color), (lead, True, NAVY), (" " + rest, False, TEXT)):
            r = p.add_run()
            r.text = t
            r.font.name = FONT
            r.font.size = Pt(size)
            r.font.bold = b
            r.font.color.rgb = c
    return tb


def header(slide, kicker, title, subtitle):
    shape(slide, MSO_SHAPE.RECTANGLE, 0, 0, 13.333, 0.12, fill=PRIMARY)
    text(slide, 0.5, 0.28, 9, 0.3, kicker.upper(), size=11, color=GREEN, bold=True)
    text(slide, 0.5, 0.52, 12.3, 0.6, title, size=28, color=PRIMARY, bold=True)
    text(slide, 0.5, 1.08, 12.3, 0.4, subtitle, size=15, color=MUTED)


def banner(slide, msg, size=16):
    b = shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, 0.5, 6.45, 12.333, 0.62, fill=PRIMARY, radius=0.18)
    tf = b.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = msg
    r.font.name = FONT
    r.font.size = Pt(size)
    r.font.bold = True
    r.font.italic = True
    r.font.color.rgb = WHITE
    text(slide, 0.5, 7.12, 12.333, 0.28, f"ITV M&V Cookbook  ·  {URL}", size=9, color=MUTED, align=PP_ALIGN.RIGHT)


def card(slide, x, y, w, h, title, accent, fill):
    shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, fill=fill, radius=0.04)
    shape(slide, MSO_SHAPE.RECTANGLE, x, y + 0.12, 0.07, h - 0.24, fill=accent)
    text(slide, x + 0.25, y + 0.15, w - 0.4, 0.35, title.upper(), size=12.5, color=accent, bold=True)


def notes(slide, body):
    slide.notes_slide.notes_text_frame.text = body.strip()


# ── Slide 1 ───────────────────────────────────────────────────────────────────
def slide_one(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, "Agentic Program Management",
           "From scattered files to one live view of every project",
           "Every ITV project, stage, open question and decision in one place, tracked against the M&V Cookbook")

    # Left: challenge
    card(s, 0.5, 1.65, 3.85, 4.6, "The challenge today", RED, RED_LIGHT)
    chips = [("PDF", 0.78, 2.13), ("PPTX", 1.5, 2.08), ("XLSX", 2.32, 2.16), ("CSV", 3.08, 2.09), ("MD", 3.65, 2.15)]
    for label, cx, cy in chips:
        c = shape(s, MSO_SHAPE.FOLDED_CORNER, cx, cy, 0.58, 0.4, fill=WHITE, line=RED)
        tf = c.text_frame
        tf.margin_left = tf.margin_right = Inches(0.01)
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = label
        r.font.name = FONT
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RED
    bullets(s, 0.72, 2.66, 3.5, 3.55, [
        ("Files spread across folders and formats:", "applications, review decks, DOE assessments, profile workbooks and notes."),
        ("Status is implied, not tracked:", "where a project stands is pieced together from the latest deck or meeting."),
        ("Open questions get lost:", "42 site/vendor questions sit in slide notes with no stage, owner or resolution trail."),
        ("Stakeholders see different versions:", "DOE, tech leads, host sites and vendors each work from their own copy."),
        ("The method and the progress live apart:", "Cookbook stages and gate criteria aren't linked to project status."),
    ], size=11, marker="✕", marker_color=RED, space=4)

    # Arrow
    shape(s, MSO_SHAPE.RIGHT_ARROW, 4.42, 3.7, 0.42, 0.5, fill=PRIMARY)

    # Middle: solution
    card(s, 4.9, 1.65, 3.85, 4.6, "What the dashboard does", GREEN, GREEN_LIGHT)
    bullets(s, 5.12, 2.12, 3.5, 4.1, [
        ("One shared portfolio record:", "5 projects and 23 source documents combined into one versioned file."),
        ("Stage pipeline:", "every project placed in a Cookbook stage, from Planning to Reporting, with milestone progress."),
        ("Gate-controlled progress:", "projects advance only through exit-gate checklists (Gates 1–5); overrides need a written reason."),
        ("Cookbook lifecycle map:", "each project's progress through Cookbook milestones, checklists and gates, with pass dates and overrides."),
        ("Audit trail:", "every resolved question, milestone and stage change is dated in the project history."),
    ], size=12, marker="✓", marker_color=GREEN, space=6)

    # Right: screenshot + stats
    pic = s.shapes.add_picture(str(SHOT), Inches(8.95), Inches(1.65), width=Inches(3.88))
    pic.line.color.rgb = BORDER
    pic.line.width = Pt(0.75)
    text(s, 8.95, 1.65 + pic.height / 914400 + 0.03, 3.88, 0.25, "Live dashboard: summary, stage pipeline, Cookbook lifecycle map",
         size=9, color=MUTED, italic=True, align=PP_ALIGN.CENTER)
    stats = [("5", "projects"), ("23", "source docs"), ("42", "tracked questions"), ("5", "stage gates")]
    for i, (v, l) in enumerate(stats):
        x = 8.95 + i * 0.985
        shape(s, MSO_SHAPE.ROUNDED_RECTANGLE, x, 4.62, 0.93, 0.95, fill=PRIMARY_LIGHT, radius=0.1)
        text(s, x, 4.66, 0.93, 0.45, v, size=22, color=PRIMARY, bold=True, align=PP_ALIGN.CENTER)
        text(s, x, 5.1, 0.93, 0.42, l, size=9, color=MUTED, align=PP_ALIGN.CENTER)
    text(s, 8.95, 5.68, 3.88, 0.55, "Status as of Nov 2026: all five Team A projects in Planning; M&V plans and Gate 1 are next.",
         size=10, color=NAVY, align=PP_ALIGN.CENTER)

    banner(s, "Status is no longer pieced together from files. It is tracked against the Cookbook.")
    notes(s, """
Before this, answering "where is Element 16?" meant opening the application, the July 29 Team A review deck, the September 29 DOE assessment and the project profile spreadsheet, then working out which one was most current.

The dashboard pulls all of that into one shared record that follows the Cookbook's five stages, their checklists and stage gates. Mapping to the AgentM&V decision framework is planned as a next phase.

When a project moves, it moves through a gate: the exit checklist from our stage-gate cheat sheet. If someone advances a project without every gate item checked, they must write a reason. That override is logged and the stage's decisions are flagged red, so nothing moves silently.

Every open question has a stage and a source. When one is resolved, the answer is recorded in the project history with a date.

Today all five Team A projects are in Planning: the DOE initial assessment is done, and the M&V plans and Gate 1 are next.

[Presenter note: dashboard edits are saved in the editor's browser until exported and committed to the repo; the committed file is the shared record. Avoid saying "real-time sync".]
""")


# ── Slide 2 ───────────────────────────────────────────────────────────────────
def slide_two(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, "Agentic Program Management",
           "Ask the portfolio: plain-language access for every stakeholder",
           "An AI assistant that has read every project document and sees each project's live status")

    # Flow
    def flow_box(x, w, title, sub, fill, fg, subfg):
        b = shape(s, MSO_SHAPE.ROUNDED_RECTANGLE, x, 1.65, w, 1.05, fill=fill, radius=0.12)
        text(s, x + 0.1, 1.72, w - 0.2, 0.4, title, size=14, color=fg, bold=True, align=PP_ALIGN.CENTER)
        text(s, x + 0.1, 2.1, w - 0.2, 0.55, sub, size=10, color=subfg, align=PP_ALIGN.CENTER)
        return b

    flow_box(0.5, 2.75, "Project documents", "Applications · technology reviews · DOE assessments · profiles", PRIMARY_LIGHT, PRIMARY, TEXT)
    text(s, 3.27, 1.88, 0.4, 0.5, "+", size=28, color=PRIMARY, bold=True, align=PP_ALIGN.CENTER)
    flow_box(3.7, 2.75, "Live dashboard state", "Stages · gates · open questions · stage history", PRIMARY_LIGHT, PRIMARY, TEXT)
    shape(s, MSO_SHAPE.RIGHT_ARROW, 6.55, 1.93, 0.45, 0.5, fill=PRIMARY)
    flow_box(7.1, 2.55, "AI assistant (Claude)", "Reads everything, reasons over the M&V Cookbook", NAVY, WHITE, RGBColor(0xC9, 0xD6, 0xE6))
    shape(s, MSO_SHAPE.RIGHT_ARROW, 9.75, 1.93, 0.45, 0.5, fill=PRIMARY)
    flow_box(10.3, 2.53, "Answers with sources", "Every claim cited to a document and date", GREEN_LIGHT, GREEN, TEXT)

    # Stakeholder table
    rows = [
        ("DOE program manager", "“Which projects are at risk of missing Gate 1, and why?”"),
        ("M&V tech lead", "“What happened in the Planning stage for BHMC/Glidewell?”"),
        ("Host site", "“What data and meters do you need from us before the baseline?”"),
        ("Technology vendor", "“Which open questions are waiting on us?”"),
        ("New team member", "“Explain the M&V boundary and KPIs for JoulesAI at Manus Bio.”"),
    ]
    tbl = s.shapes.add_table(len(rows) + 1, 2, Inches(0.5), Inches(3.0), Inches(7.55), Inches(3.2)).table
    tbl.columns[0].width = Inches(2.15)
    tbl.columns[1].width = Inches(5.4)
    for c, h in enumerate(("Stakeholder", "Asks in plain language…")):
        cell = tbl.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = PRIMARY
        cell.text = h
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        f = cell.text_frame.paragraphs[0].runs[0].font
        f.name, f.size, f.bold, f.color.rgb = FONT, Pt(12), True, WHITE
    for r, (who, q) in enumerate(rows, start=1):
        for c, val in enumerate((who, q)):
            cell = tbl.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = WHITE if r % 2 else RGBColor(0xF4, 0xF7, 0xFB)
            cell.text = val
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            f = cell.text_frame.paragraphs[0].runs[0].font
            f.name, f.size = FONT, Pt(11.5)
            f.bold = c == 0
            f.italic = c == 1
            f.color.rgb = NAVY if c == 0 else TEXT

    # Why it's different
    card(s, 8.3, 3.0, 4.53, 3.2, "Why it's different", GREEN, GREEN_LIGHT)
    bullets(s, 8.52, 3.45, 4.2, 2.75, [
        ("Grounded:", "answers cite their sources; if the documents don't say, the assistant says so rather than guessing."),
        ("Always current:", "it reads the live dashboard, so answers reflect the latest stage changes."),
        ("Built around the Cookbook:", "answers use Cookbook stages, checklists and gates."),
        ("Claims kept separate from results:", "vendor claims are never presented as verified savings."),
        ("Low barrier to use:", "runs in a web browser; without an API key it still works as a document search."),
    ], size=11.5, marker="✓", marker_color=GREEN, space=4)

    banner(s, "Agentic Program Management: people steer the decisions; AI finds, combines and explains the information.", size=15)
    notes(s, """
The second shift is access. Stakeholders no longer need to know which folder or which deck holds the answer; they just ask.

The assistant has read every project document: the applications, the July 29 technology reviews, the September 29 DOE assessments and the project profiles. It also sees the live dashboard state, so a question like "what happened in the Planning stage for BHMC?" reflects what was logged yesterday, not just what was in last month's deck.

Each stakeholder gets answers in their own terms: DOE sees portfolio risk, tech leads see stage history, host sites see what data is needed, vendors see which questions are waiting on them.

Answers cite their sources, and the assistant is instructed to separate vendor claims from verified results and to say so when the documents don't contain an answer.

People still make the decisions: gate passes and overrides are human actions, recorded and auditable. That split is what we mean by Agentic Program Management.

[Presenter notes: today the assistant answers questions; stage changes are made by people in the dashboard. If showing the assistant updating stages itself, present it as the next phase. Full AI answers need an Anthropic API key entered in the dashboard settings; without one, the chat falls back to document search.]
""")


def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    slide_one(prs)
    slide_two(prs)
    OUT.parent.mkdir(exist_ok=True)
    prs.save(OUT)
    print(f"wrote {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
