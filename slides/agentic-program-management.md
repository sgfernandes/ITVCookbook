# Agentic Program Management: slide content & speaker notes

Deck: [`agentic-program-management.pptx`](agentic-program-management.pptx), 2 slides, 16:9, speaker notes included.
Rebuild with `python3 tools/build_slides.py`. Live dashboard: https://sgfernandes.github.io/ITVCookbook/dashboard.html

---

## Slide 1: From scattered files to one live view of every project

*Every ITV project, stage, open question and decision in one place, tracked against the M&V Cookbook*

**The challenge today**
- **Files spread across folders and formats:** applications (PDF), review decks and DOE assessments (PPTX), profile workbooks (XLSX/CSV) and notes (MD).
- **Status is implied, not tracked:** where a project stands is pieced together from the latest deck or meeting.
- **Open questions get lost:** 42 site/vendor questions sit in slide notes with no stage, owner or resolution trail.
- **Stakeholders see different versions:** DOE, tech leads, host sites and vendors each work from their own copy.
- **The method and the progress live apart:** Cookbook stages and gate criteria aren't linked to project status.

**What the dashboard does**
- **One shared portfolio record:** 5 projects and 23 source documents combined into one versioned file.
- **Stage pipeline:** every project placed in a Cookbook stage, from Planning to Reporting, with milestone progress.
- **Gate-controlled progress:** projects advance only through exit-gate checklists (Gates 1–5); overrides need a written reason.
- **Cookbook lifecycle map:** each project's progress through Cookbook milestones, checklists and gates, with pass dates and overrides.
- **Audit trail:** every resolved question, milestone and stage change is dated in the project history.

**Visual:** dashboard screenshot (summary tiles, stage pipeline, Cookbook lifecycle map) and stat tiles: 5 projects · 23 source docs · 42 tracked questions · 5 stage gates.
*Status as of Nov 2026: all five Team A projects in Planning; M&V plans and Gate 1 are next.*

**Banner:** *Status is no longer pieced together from files. It is tracked against the Cookbook.*

### Speaker notes
Before this, answering "where is Element 16?" meant opening the application, the July 29 Team A review deck, the September 29 DOE assessment and the project profile spreadsheet, then working out which one was most current.

The dashboard pulls all of that into one shared record that follows the Cookbook's five stages, their checklists and stage gates. Mapping to the AgentM&V decision framework is planned as a next phase.

When a project moves, it moves through a gate: the exit checklist from our stage-gate cheat sheet. If someone advances a project without every gate item checked, they must write a reason. That override is logged and the stage's decisions are flagged red, so nothing moves silently.

Every open question has a stage and a source. When one is resolved, the answer is recorded in the project history with a date.

Today all five Team A projects are in Planning: the DOE initial assessment is done, and the M&V plans and Gate 1 are next.

> Presenter note: dashboard edits are saved in the editor's browser until exported and committed to the repo; the committed file is the shared record. Avoid saying "real-time sync".

---

## Slide 2: Ask the portfolio: plain-language access for every stakeholder

*An AI assistant that has read every project document and sees each project's live status*

**Flow:** Project documents (applications · technology reviews · DOE assessments · profiles) **+** Live dashboard state (stages · gates · open questions · stage history) **→** AI assistant (Claude, reasons over the M&V Cookbook) **→** Answers with sources

| Stakeholder | Asks in plain language… |
|---|---|
| DOE program manager | "Which projects are at risk of missing Gate 1, and why?" |
| M&V tech lead | "What happened in the Planning stage for BHMC/Glidewell?" |
| Host site | "What data and meters do you need from us before the baseline?" |
| Technology vendor | "Which open questions are waiting on us?" |
| New team member | "Explain the M&V boundary and KPIs for JoulesAI at Manus Bio." |

**Why it's different**
- **Grounded:** answers cite their sources; if the documents don't say, the assistant says so rather than guessing.
- **Always current:** it reads the live dashboard, so answers reflect the latest stage changes.
- **Built around the Cookbook:** answers use Cookbook stages, checklists and gates.
- **Claims kept separate from results:** vendor claims are never presented as verified savings.
- **Low barrier to use:** runs in a web browser; without an API key it still works as a document search.

**Banner:** *Agentic Program Management: people steer the decisions; AI finds, combines and explains the information.*

### Speaker notes
The second shift is access. Stakeholders no longer need to know which folder or which deck holds the answer; they just ask.

The assistant has read every project document: the applications, the July 29 technology reviews, the September 29 DOE assessments and the project profiles. It also sees the live dashboard state, so a question like "what happened in the Planning stage for BHMC?" reflects what was logged yesterday, not just what was in last month's deck.

Each stakeholder gets answers in their own terms: DOE sees portfolio risk, tech leads see stage history, host sites see what data is needed, vendors see which questions are waiting on them.

Answers cite their sources, and the assistant is instructed to separate vendor claims from verified results and to say so when the documents don't contain an answer.

People still make the decisions: gate passes and overrides are human actions, recorded and auditable. That split is what we mean by Agentic Program Management.

> Presenter notes: today the assistant answers questions; stage changes are made by people in the dashboard. If showing the assistant updating stages itself, present it as the next phase. Full AI answers need an Anthropic API key entered in the dashboard settings; without one, the chat falls back to document search.
