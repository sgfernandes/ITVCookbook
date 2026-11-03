# ITV M&V Cookbook — interactive pages

Static GitHub Pages site for the DOE ITV measurement & verification cookbook.

| Page | Purpose |
|---|---|
| `index.html` | Full lifecycle checklist (5 stages) |
| `quick-gate.html` | 1-page stage-gate cheat sheet |
| `baseline-uncertainty.html` | Baseline & uncertainty simulator |
| `dashboard.html` | **Project portfolio dashboard**: stage pipeline, Cookbook lifecycle map, open questions, stage history, LLM chat |

## Portfolio dashboard

- **Stage pipeline.** Each project sits in one of the five Cookbook stages. **Advance** opens that stage's exit gate checklist (Gate 1 … Gate 5). Advancing with unchecked items is logged as a gate override and needs a written justification.
- **Cookbook lifecycle map.** One row per project across the five stages: gates passed (with dates and overrides), milestone progress in the current stage, and open questions already tagged to later stages. Project detail lists the Cookbook checklist sections and exit-gate criteria for the current stage.
- **Project detail.** Milestones, open site/vendor questions (resolve with an answer, or add new ones), dated stage history (log events), boundary, KPIs, risks and planned timeline.
- **Chat.** Ask what happened in any stage, or anything else about the projects.
  - Pick a provider in ⚙ Settings. Keys stay in your browser and are never stored in the repo.
    - **Anthropic (direct):** Claude models via the Anthropic SDK.
    - **CBORG (LBNL AI gateway):** one CBORG key gives access to Anthropic, OpenAI, Google and LBL-hosted models. Choose `api.cborg.lbl.gov`, or `api-local.cborg.lbl.gov` on the LBL network, and use **Load models** to list the models your key can use. See https://cborg.lbl.gov/api_examples/. CBORG's guidance says its API should not be connected to a publicly accessible chatbot, so only use it on a private copy of the dashboard.
    - **Other OpenAI-compatible endpoint:** any gateway that accepts OpenAI-style requests, with your own base URL.
  - The chat sends the document corpus plus the live dashboard state with every question. Prompt caching is used where the provider supports it.
  - Without a key, it runs offline and answers from the dashboard state plus a keyword search of the documents.

### Data files

| File | What it is |
|---|---|
| `data/portfolio.js` | Shared project state (stages, milestones, checklist sections, gates, questions, history). Edit it by hand, or click **Download portfolio.js** in the dashboard and commit the file to share updates. |
| `data/knowledge.js` | Chat corpus, generated from the Team A SecondBrain folder (see below). |

Changes you make in the dashboard are saved in your own browser (localStorage) until you export them and commit the file.

Rebuild the chat corpus after the source documents change:

```bash
python3 -I tools/build_knowledge.py /path/to/SecondBrain --no-submissions
```

`--no-submissions` leaves out the application submission text. If you include it, contact details are redacted, but check that the content is OK to publish before committing it.

### Roadmap

- Map each Cookbook stage to the AgentM&V decision framework (agents A1–A7, decision nodes INGEST/D1–D8, traffic-light governance). Not yet included: the dashboard currently tracks Cookbook stages, milestones and gates only.

## Slides

[`slides/agentic-program-management.pptx`](slides/agentic-program-management.pptx) is a 2-slide deck, with speaker notes, explaining the dashboard as **Agentic Program Management**. The same content and notes are in [`slides/agentic-program-management.md`](slides/agentic-program-management.md). Rebuild the deck with `python3 tools/build_slides.py` (needs python-pptx).
