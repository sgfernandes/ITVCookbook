# ITV M&V Cookbook — interactive pages

Static GitHub Pages site for the DOE ITV measurement & verification cookbook.

| Page | Purpose |
|---|---|
| `index.html` | Full lifecycle checklist (5 stages) |
| `quick-gate.html` | 1-page stage-gate cheat sheet |
| `baseline-uncertainty.html` | Baseline & uncertainty simulator |
| `dashboard.html` | **Project portfolio dashboard**: stage pipeline, AgentM&V framework map, open questions, stage history, LLM chat |

## Portfolio dashboard

- **Stage pipeline.** Each project sits in one of the five Cookbook stages. **Advance** opens that stage's exit gate checklist (Gate 1 … Gate 5). Advancing with unchecked items is logged as a gate override, and the stage's AgentM&V decisions are marked *blocked* (a red, signed decision).
- **AgentM&V framework map.** Shows each project's status on every AgentM&V decision for each stage: INGEST and D1–D8, run by agents A1–A7, with the Layer 4 green/yellow/red sign-off rules.
- **Project detail.** Milestones, open site/vendor questions (resolve with an answer, or add new ones), dated stage history (log events), boundary, KPIs, risks and planned timeline.
- **Chat.** Ask what happened in any stage, or anything else about the projects.
  - With an Anthropic API key (⚙ Settings), it calls Claude straight from your browser. It sends the document corpus as a cached system block, plus the live dashboard state. The key stays in your browser and is never stored in the repo.
  - Without a key, it runs offline and answers from the dashboard state plus a keyword search of the documents.

### Data files

| File | What it is |
|---|---|
| `data/portfolio.js` | Shared project state (stages, milestones, AgentM&V statuses, questions, history). Edit it by hand, or click **Download portfolio.js** in the dashboard and commit the file to share updates. |
| `data/knowledge.js` | Chat corpus, generated from the Team A SecondBrain folder (see below). |

Changes you make in the dashboard are saved in your own browser (localStorage) until you export them and commit the file.

Rebuild the chat corpus after the source documents change:

```bash
python3 -I tools/build_knowledge.py /path/to/SecondBrain --no-submissions
```

`--no-submissions` leaves out the application submission text. If you include it, contact details are redacted, but check that the content is OK to publish before committing it.
