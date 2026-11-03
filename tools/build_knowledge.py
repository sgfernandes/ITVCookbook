#!/usr/bin/env python3
"""Build data/knowledge.js — the document corpus behind the dashboard chat.

Reads the Team A "SecondBrain" folder and emits one JS file that the static
dashboard loads (works on GitHub Pages and from file://).

    python3 -I tools/build_knowledge.py /path/to/SecondBrain [--no-submissions]

Each document is tagged with a project id so the chat can scope questions and
the offline search can filter. Application submissions are trimmed to the
technical narrative (from "Project Title and Summary" onward) and contact
details (names in contact fields, emails, phone numbers) are redacted.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "knowledge.js"

# project id -> (markers used to locate the project in the shared decks)
PROJECTS = {
    "armstrong-svc": {
        "team_a": "Armstrong International at SVC Manufacturing",
        "doe": "Technology Developer: Armstrong International",
        "md": "armstrong-svc.md",
        "submission": "submission-52995211-svc-manufacturing-inc.txt",
        "csv": "Armstrong International",
    },
    "bhmc-glidewell": {
        "team_a": "Birmingham Hot Metal Coatings at Glidewell",
        "doe": "Technology Developer: BHMC",
        "md": "bhmc-glidewell.md",
        "submission": "submission-52992159-glidewell-specialties-foundry-co.txt",
        "csv": "Birmingham Hot Metal Coatings",
    },
    "ceia-donaldson": {
        "team_a": "CEIA USA at Donaldson Company",
        "doe": "Technology Developer: CEIA USA",
        "md": "ceia-donaldson.md",
        "submission": None,  # no CEIA submission in the workspace
        "csv": "CEIA USA",
    },
    "element16-svm": {
        "team_a": "Element 16 Technologies at Searles Valley Minerals",
        "doe": "Technology Developer: Element 16",
        "md": "element16-svm.md",
        "submission": "submission-52995362-element-16-technologies-inc.txt",
        "csv": "Element 16",
    },
    "joulesai-manus": {
        "team_a": "JoulesAI at Manus Bio",
        "doe": "Technology Developer: Joules AI",
        "md": "joulesai-manus.md",
        "submission": "submission-52994585-joulesai-inc.txt",
        "csv": "JoulesAI",
    },
}

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"\+?\d[\d\s().-]{8,}\d")
CONTACT_LABELS = {"first name", "last name", "email", "phone", "applicant name",
                  "applicant email", "applicant phone", "number"}


def clean(text: str) -> str:
    text = text.replace("\r", "")
    text = re.sub(r"\[↑\d+L same as msg[^\]]*\]", "", text)  # extraction artifacts
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def redact(text: str) -> str:
    lines, out, skip = text.split("\n"), [], 0
    for line in lines:
        if skip:
            skip -= 1
            out.append("[redacted]")
            continue
        if line.strip().lower() in CONTACT_LABELS:
            out.append(line)
            skip = 1
            continue
        out.append(line)
    text = "\n".join(out)
    text = EMAIL.sub("[email redacted]", text)
    return PHONE.sub("[phone redacted]", text)


def split_on(text: str, markers: dict[str, str]) -> dict[str, str]:
    """Slice `text` into per-project sections that start at each marker."""
    pos = sorted((text.find(m), pid) for pid, m in markers.items() if text.find(m) >= 0)
    # Section boundaries also include any other "Technology Developer:" / "Project N of 5" heading
    heads = sorted({m.start() for m in re.finditer(r"(Technology (Developer|Provider): |Project \d of 5\n)", text)} | {len(text)})
    out = {}
    for start, pid in pos:
        end = next(h for h in heads if h > start)
        out[pid] = text[start:end]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("secondbrain", type=Path)
    ap.add_argument("--profile-csv", type=Path, help="Team A_ITV Projects Profile.csv (default: ../SecondBrain sibling)")
    ap.add_argument("--no-submissions", action="store_true", help="exclude application submission text")
    a = ap.parse_args()
    sb: Path = a.secondbrain
    docs: list[dict] = []

    def add(doc_id, title, project, date, source, text):
        text = clean(text)
        if text:
            docs.append({"id": doc_id, "title": title, "project": project, "date": date, "source": source, "text": text})

    # 1. Team A Technology Discussions (2026-07-29) — split per project
    ta_path = sb / "Team A_ Technology Discussions 2026-07-29.pptx.txt"
    ta = ta_path.read_text(encoding="utf-8")
    for pid, sec in split_on(ta, {p: v["team_a"] for p, v in PROJECTS.items()}).items():
        add(f"{pid}:team-a-2026-07-29", "Team A Technology Discussion — technology evaluation review (Sections 1–20)",
            pid, "2026-07-29", ta_path.name, sec)

    # 2. ITV Initial Technology Assessment presented to DOE (2026-09-29) — split per project
    doe_path = sb / "ITV Initial Tech Assessment Presentation to DOE 2026-09-29 .txt"
    doe = doe_path.read_text(encoding="utf-8")
    for pid, sec in split_on(doe, {p: v["doe"] for p, v in PROJECTS.items()}).items():
        add(f"{pid}:doe-2026-09-29", "ITV Initial Technology Assessment presented to DOE", pid, "2026-09-29", doe_path.name, sec)
    g = doe.find("Guidance (below is from this document")
    if g >= 0:
        end = doe.find("Technology Developer:", g)
        add("portfolio:doe-guidance", "DOE assessment guidance (spaces for opportunity, scale-up method)", "portfolio",
            "2026-09-29", doe_path.name, doe[g:end if end > 0 else g + 2500])

    # 3. Project profile pages + shared framework (Nick & Sam repository, Jun 2026)
    for pid, v in PROJECTS.items():
        p = sb / "projects" / v["md"]
        add(f"{pid}:profile", "Project profile & cookbook-derived M&V approach", pid, "2026-06-25", f"projects/{v['md']}",
            re.sub(r"!\[[^\]]*\]\([^)]*\)", "", p.read_text(encoding="utf-8")))
    add("portfolio:mv-framework", "ITV cookbook-derived M&V framework (shared)", "portfolio", "2026-06-18",
        "projects/mv-framework.md", (sb / "projects" / "mv-framework.md").read_text(encoding="utf-8"))
    add("portfolio:readme", "Portfolio overview & sector analysis", "portfolio", "2026-06-25", "README.md",
        (sb / "README.md").read_text(encoding="utf-8").split("## Source Basis")[0])

    # 4. Team A projects profile workbook (timeline, assignments, KPIs, scale-up notes)
    csv_path = a.profile_csv or (sb.parent / "Team A_ITV Projects Profile.csv")
    if csv_path.exists():
        rows = list(csv.reader(csv_path.open(encoding="utf-8-sig")))
        header = [h.strip().replace("\n", " ") for h in rows[1]]
        for pid, v in PROJECTS.items():
            row = next((r for r in rows[2:] if len(r) > 1 and r[1].startswith(v["csv"])), None)
            if row:
                body = "\n".join(f"{header[i]}: {c.strip()}" for i, c in enumerate(row) if i < len(header) and header[i] and c.strip())
                add(f"{pid}:profile-csv", "Team A ITV Projects Profile (workbook row)", pid, "2026-07-29", csv_path.name, body)

    # 5. Application submissions (2026-01-29), technical narrative only, redacted
    if not a.no_submissions:
        for pid, v in PROJECTS.items():
            if not v["submission"]:
                continue
            raw = (sb / v["submission"]).read_text(encoding="utf-8")
            start = raw.find("Project Title and Summary")
            add(f"{pid}:submission", "ITV application submission (technical narrative)", pid, "2026-01-29",
                v["submission"], redact(raw[start if start >= 0 else 0:]))

    OUT.parent.mkdir(exist_ok=True)
    payload = json.dumps({"generated": "build_knowledge.py", "documents": docs}, ensure_ascii=False, indent=1)
    OUT.write_text("// Generated by tools/build_knowledge.py — do not edit by hand.\nwindow.ITV_KNOWLEDGE = " + payload + ";\n", encoding="utf-8")
    total = sum(len(d["text"]) for d in docs)
    print(f"wrote {OUT.relative_to(REPO)}: {len(docs)} documents, {total:,} chars (~{total // 4:,} tokens)")
    for d in docs:
        print(f"  {d['id']:<40} {len(d['text']):>7,}")


if __name__ == "__main__":
    main()
