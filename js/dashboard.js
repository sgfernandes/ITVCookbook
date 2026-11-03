/* ITV Portfolio Dashboard — state, rendering and stage tracking.
 * Shared baseline: data/portfolio.js (window.ITV_PORTFOLIO).
 * Local edits persist in localStorage until exported and committed. */
(function () {
  "use strict";

  const BASE = window.ITV_PORTFOLIO;
  const KEY = "itv_portfolio_state_v1";
  const STATUS = {
    pending: "Not started", active: "In progress", review: "Awaiting review", blocked: "Blocked", done: "Done"
  };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const today = () => new Date().toISOString().slice(0, 10);

  let state, hasLocal = false, staleBase = null, selectedId = null, qFilter = "open";

  // ── Persistence ──────────────────────────────────────────────────────────
  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (_) { /* ignore corrupt state */ }
    if (saved && saved.state && Array.isArray(saved.state.projects)) {
      state = saved.state;
      hasLocal = true;
      if (saved.baseVersion !== BASE.version) staleBase = saved.baseVersion;
    } else {
      state = clone(BASE);
    }
    // Framework always comes from the shared file so fixes to it propagate.
    state.framework = clone(BASE.framework);
  }

  function save() {
    hasLocal = true;
    state.asOf = today();
    localStorage.setItem(KEY, JSON.stringify({ baseVersion: BASE.version, savedAt: new Date().toISOString(), state }));
    renderAll();
  }

  function stage(id) { return state.framework.stages.find((s) => s.id === id); }
  function step(id) { return state.framework.agentmvSteps.find((s) => s.id === id); }
  function project(id) { return state.projects.find((p) => p.id === id); }
  function stepStatus(p, stageId, stepId) { return (p.agentmv[`${stageId}:${stepId}`] || {}).status || "pending"; }

  function logEvent(p, ev) {
    p.history.push(Object.assign({ date: today(), stage: p.currentStage, source: "Dashboard update", local: true }, ev));
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function renderAll() {
    $("subtitle").textContent = `${state.team} · ${state.projects.length} projects · state as of ${state.asOf}`;
    renderBanner();
    renderTiles();
    renderPipeline();
    renderMatrix();
    renderDetail();
  }

  function renderBanner() {
    const b = $("banner");
    if (staleBase) {
      b.innerHTML = `⚠ The shared portfolio data was updated (now <b>${esc(BASE.version)}</b>); your local changes are based on <b>${esc(staleBase)}</b>.
        <button class="small" onclick="Dash.useShared()">Load shared data</button>
        <button class="small secondary" onclick="Dash.keepLocal()">Keep my local changes</button>`;
      b.classList.add("show");
    } else if (hasLocal) {
      b.innerHTML = `✎ You have local changes saved in this browser only. To share them, use <b>Download portfolio.js</b> and commit it to <code>data/portfolio.js</code>.`;
      b.classList.add("show");
    } else {
      b.classList.remove("show");
    }
  }

  function openQs(p) { return p.openQuestions.filter((q) => q.status !== "resolved"); }
  function reviewCount(p) { return Object.values(p.agentmv).filter((a) => a.status === "review" || a.status === "blocked").length; }
  function lastEvent(p) { return p.history.slice().sort((a, b) => a.date.localeCompare(b.date)).pop(); }

  function renderTiles() {
    const ps = state.projects;
    const byStage = state.framework.stages.map((s) => [s.name, ps.filter((p) => p.currentStage === s.id).length]).filter(([, n]) => n);
    const oq = ps.reduce((n, p) => n + openQs(p).length, 0);
    const rv = ps.reduce((n, p) => n + reviewCount(p), 0);
    const last = ps.map(lastEvent).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date)).pop();
    const gate1 = ps.filter((p) => p.currentStage > 1).length;
    $("tiles").innerHTML = [
      [ps.length, "Active projects"],
      [byStage.map(([n, c]) => `${c}`).join(" / "), "In " + byStage.map(([n]) => n).join(" / ")],
      [`${gate1}/${ps.length}`, "Passed Gate 1 (M&V Plan)"],
      [oq, "Open site/vendor questions"],
      [rv, "AgentM&V decisions awaiting human review"],
      [last ? last.date : "—", "Latest activity" + (last ? `: ${last.title}` : "")]
    ].map(([v, l]) => `<div class="tile"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join("");
  }

  function progress(p) {
    const ms = stage(p.currentStage).milestones;
    return Math.round((100 * (p.milestonesDone || []).length) / ms.length);
  }

  function renderPipeline() {
    $("pipeline").innerHTML = state.framework.stages.map((s) => {
      const cards = state.projects.filter((p) => p.currentStage === s.id).map((p) => {
        const oq = openQs(p).length, rv = reviewCount(p);
        return `<div class="card ${p.id === selectedId ? "selected" : ""}" onclick="Dash.select('${p.id}')">
          <div class="t">${esc(p.short)}</div>
          <div class="s">${esc(p.title)}</div>
          <div class="bar" title="Stage milestones ${progress(p)}%"><div style="width:${progress(p)}%"></div></div>
          <div class="chips">
            <span class="chip">${progress(p)}% of stage</span>
            ${oq ? `<span class="chip warn">${oq} open Q</span>` : `<span class="chip ok">no open Q</span>`}
            ${rv ? `<span class="chip warn">${rv} to review</span>` : ""}
          </div>
        </div>`;
      }).join("");
      return `<div class="col"><div class="col-head"><div class="n">${s.id}. ${esc(s.name)}</div><div class="o">${esc(s.agentmv.join(" · "))}</div></div>
        <div class="col-body">${cards || '<div class="hint" style="padding:6px">—</div>'}</div></div>`;
    }).join("");
  }

  function renderMatrix() {
    const st = state.framework.stages;
    let h = `<tr><th rowspan="2">Project</th><th rowspan="2">Stage</th>${st.map((s) => `<th class="stagegrp" colspan="${s.agentmv.length}">${s.id}. ${esc(s.name)}</th>`).join("")}</tr>`;
    h += `<tr>${st.map((s) => s.agentmv.map((d) => `<th title="${esc(step(d).agent)} — ${esc(step(d).name)}">${d}</th>`).join("")).join("")}</tr>`;
    for (const p of state.projects) {
      h += `<tr><td class="pname" onclick="Dash.select('${p.id}')">${esc(p.short)}</td><td>${p.currentStage}</td>`;
      for (const s of st) {
        for (const d of s.agentmv) {
          const a = p.agentmv[`${s.id}:${d}`] || {};
          const status = a.status || "pending";
          const tip = `${d} · ${step(d).name} (${step(d).agent})\n${STATUS[status]}${a.note ? "\n" + a.note : ""}`;
          h += `<td title="${esc(tip)}" style="cursor:pointer" onclick="Dash.select('${p.id}', 'agentmv')"><i class="dot st-${status}"></i></td>`;
        }
      }
      h += "</tr>";
    }
    $("matrix").innerHTML = h;
  }

  function list(items) { return `<ul class="tight">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`; }

  function renderDetail() {
    const p = project(selectedId);
    if (!p) { $("detail").innerHTML = ""; return; }
    const cur = stage(p.currentStage);
    const next = stage(p.currentStage + 1);
    const stepper = state.framework.stages.map((s) =>
      `<div class="step ${s.id < p.currentStage ? "done" : s.id === p.currentStage ? "current" : ""}"><div class="c">${s.id < p.currentStage ? "✓" : s.id}</div>${esc(s.name)}</div>`).join("");

    const milestones = cur.milestones.map((m, i) => {
      const done = (p.milestonesDone || []).includes(i);
      return `<label class="ms"><input type="checkbox" ${done ? "checked" : ""} onchange="Dash.toggleMilestone(${i}, this.checked)"> ${esc(m)}</label>`;
    }).join("");

    const agentRows = state.framework.stages.map((s) => {
      const rows = s.agentmv.map((d) => {
        const a = p.agentmv[`${s.id}:${d}`] || {};
        const st = step(d);
        const opts = Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === (a.status || "pending") ? "selected" : ""}>${v}</option>`).join("");
        return `<div class="agent-row">
          <div class="id"><i class="dot st-${a.status || "pending"}"></i> ${d}</div>
          <div><span class="nm">${esc(st.name)}</span><span class="light ${st.light}" title="${esc(state.framework.governance[st.light])}">${st.light}</span>
            <div class="ag">${esc(st.agent)} — ${esc(st.does)}</div>
            ${a.note ? `<div class="nt">${esc(a.note)}</div>` : ""}</div>
          <div><select onchange="Dash.setStep(${s.id}, '${d}', this.value)">${opts}</select></div>
        </div>`;
      }).join("");
      return `<div style="margin-top:8px;font-size:0.8rem;font-weight:700;color:${s.id === p.currentStage ? "var(--primary)" : "var(--muted)"}">Stage ${s.id} · ${esc(s.name)}${s.id === p.currentStage ? " (current)" : ""}</div>${rows}`;
    }).join("");

    const qs = p.openQuestions.filter((q) => qFilter === "all" || (qFilter === "open" ? q.status !== "resolved" : q.status === "resolved"));
    const qHtml = qs.map((q) => `<div class="q ${q.status === "resolved" ? "resolved" : ""}">
        <input type="checkbox" ${q.status === "resolved" ? "checked" : ""} onchange="Dash.toggleQuestion('${q.id}', this.checked)" title="Mark resolved">
        <div class="body"><div class="txt">${esc(q.text)}</div>
          <div class="meta">Stage ${q.stage} · ${esc(stage(q.stage).name)} · ${esc(q.source)}</div>
          ${q.answer ? `<div class="ans">↳ ${esc(q.answer)}</div>` : ""}</div>
        <button class="secondary small" onclick="Chat.ask(${esc(JSON.stringify(`For ${p.short}: what do the documents say that could help answer this open question — "${q.text}"?`))}, '${p.id}')" title="Ask the assistant">Ask</button>
      </div>`).join("") || '<div class="hint">No questions in this view.</div>';

    const hist = p.history.map((e, i) => ({ e, i })).sort((a, b) => b.e.date.localeCompare(a.e.date) || b.i - a.i).map(({ e }) =>
      `<div class="tl-item ${e.local ? "local" : ""}"><div class="d">${esc(e.date)} · Stage ${e.stage} ${esc(stage(e.stage).name)} · ${esc(e.source)}${e.local ? " · local" : ""}</div>
        <div class="tt">${esc(e.title)}</div><div>${esc(e.detail || "")}</div></div>`).join("");

    const stageOpts = state.framework.stages.map((s) => `<option value="${s.id}" ${s.id === p.currentStage ? "selected" : ""}>Stage ${s.id} · ${esc(s.name)}</option>`).join("");

    $("detail").innerHTML = `
    <h2>Project detail</h2>
    <div class="detail" id="detail-card">
      <div class="detail-head">
        <div>
          <h2>${esc(p.name)}</h2>
          <div class="subtitle">${esc(p.title)}</div>
          <div class="chips" style="margin-top:8px">
            <span class="chip">${esc(p.ipmvp)}</span><span class="chip ${p.mvType.startsWith("Non") ? "warn" : "ok"}">${esc(p.mvType)}</span>
            ${p.betterPlants ? '<span class="chip ok">Better Plants partner</span>' : ""}<span class="chip">${esc(p.maturity)}</span>
          </div>
        </div>
        <div class="controls">
          <button onclick="Chat.ask(${esc(JSON.stringify(`Summarize where ${p.short} stands: current stage, what happened in each stage so far, and what is blocking the next gate.`))}, '${p.id}')">💬 Ask about this project</button>
          ${p.currentStage > 1 ? `<button class="secondary" onclick="Dash.moveBack()">← Move back</button>` : ""}
          ${next ? `<button onclick="Dash.openAdvance()">Advance to ${next.id}. ${esc(next.name)} →</button>` : '<span class="chip ok">Final stage</span>'}
        </div>
      </div>
      <div class="stepper">${stepper}</div>

      <div class="grid2">
        <div>
          <h3>Current stage — ${cur.id}. ${esc(cur.name)} (${progress(p)}%)</h3>
          <div class="hint" style="margin-bottom:6px">${esc(cur.objective)}</div>
          ${milestones}
          <div class="hint" style="margin-top:8px"><b>Exit gate:</b> ${esc(cur.gate.id)} — ${esc(cur.gate.title)}</div>
          <h3>Next steps</h3>${list(p.nextSteps || [])}

          <h3>Open questions (${openQs(p).length} open)</h3>
          <div class="filters">
            ${["open", "resolved", "all"].map((f) => `<button class="small secondary ${qFilter === f ? "on" : ""}" onclick="Dash.filterQ('${f}')">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}
          </div>
          ${qHtml}
          <div class="row-form">
            <input type="text" id="new-q" placeholder="Add a question for the site/vendor…">
            <select id="new-q-stage" style="flex:0 0 150px">${stageOpts}</select>
            <button class="small" onclick="Dash.addQuestion()">Add</button>
          </div>

          <h3 id="agentmv-section">AgentM&V decisions</h3>
          <div class="hint">Status per decision node. Yellow/red decisions need human sign-off under the Layer 4 governance policy.</div>
          ${agentRows}
        </div>

        <div>
          <h3>Stage history</h3>
          <div class="tl">${hist}</div>
          <div class="row-form">
            <input type="date" id="ev-date" value="${today()}" style="flex:0 0 150px">
            <select id="ev-stage" style="flex:0 0 170px">${stageOpts}</select>
          </div>
          <div class="row-form">
            <input type="text" id="ev-title" placeholder="Event (e.g. Site visit, meters installed)">
          </div>
          <div class="row-form">
            <input type="text" id="ev-detail" placeholder="Details">
            <button class="small" onclick="Dash.addEvent()">Log event</button>
          </div>

          <h3>Overview</h3>
          <div class="kv">
            <div><b>Technology developer:</b> ${esc(p.vendor)}</div>
            <div><b>Host site:</b> ${esc(p.host)}</div>
            <div><b>Sector:</b> ${esc(p.sector)}</div>
            <div><b>Category:</b> ${esc(p.category)}</div>
            <div><b>Technology:</b> ${esc(p.technology)}</div>
          </div>
          <h3>Claimed benefits</h3>${list(p.claims)}
          <h3>M&V boundary</h3><div class="kv">${esc(p.boundary)}</div>
          <h3>KPIs</h3>${list(p.kpis)}
          <h3>Data collection</h3>${list(p.dataCollection)}
          <h3>Risks</h3>${list(p.risks)}
          <h3>Planned timeline</h3>
          <div class="kv">
            <div><b>Installation:</b> ${esc(p.timeline.install)}</div>
            <div><b>Baseline:</b> ${esc(p.timeline.baseline)}</div>
            <div><b>Post-implementation:</b> ${esc(p.timeline.post)}</div>
            <div><b>M&V duration:</b> ${esc(p.timeline.duration)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  function cur() { return project(selectedId); }

  const Dash = {
    get state() { return state; },
    get selectedId() { return selectedId; },
    project, stage, step, stepStatus, esc,

    select(id, anchor) {
      selectedId = id;
      renderPipeline();
      renderDetail();
      const target = $(anchor === "agentmv" ? "agentmv-section" : "detail");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (window.Chat) window.Chat.setScope(id);
    },

    toggleMilestone(i, on) {
      const p = cur();
      const set = new Set(p.milestonesDone || []);
      on ? set.add(i) : set.delete(i);
      p.milestonesDone = [...set].sort((a, b) => a - b);
      const m = stage(p.currentStage).milestones[i];
      logEvent(p, { title: `${on ? "Milestone completed" : "Milestone reopened"}: ${m}`, detail: "" });
      save();
    },

    setStep(stageId, d, status) {
      const p = cur();
      const key = `${stageId}:${d}`;
      const prev = (p.agentmv[key] || {}).status || "pending";
      p.agentmv[key] = Object.assign({}, p.agentmv[key], { status });
      logEvent(p, { stage: stageId, title: `AgentM&V ${d} (${step(d).name}): ${STATUS[prev]} → ${STATUS[status]}`, detail: step(d).agent });
      save();
    },

    filterQ(f) { qFilter = f; renderDetail(); },

    toggleQuestion(qid, resolved) {
      const p = cur();
      const q = p.openQuestions.find((x) => x.id === qid);
      if (resolved) {
        const ans = prompt(`Resolution / answer for:\n"${q.text}"`, q.answer || "");
        if (ans === null) { renderDetail(); return; }
        q.status = "resolved"; q.answer = ans; q.resolvedOn = today();
        logEvent(p, { stage: q.stage, title: `Question resolved: ${q.text}`, detail: ans });
      } else {
        q.status = "open";
        logEvent(p, { stage: q.stage, title: `Question reopened: ${q.text}`, detail: "" });
      }
      save();
    },

    addQuestion() {
      const p = cur();
      const text = $("new-q").value.trim();
      if (!text) return;
      const st = +$("new-q-stage").value;
      p.openQuestions.push({ id: "q" + Date.now(), text, stage: st, source: `Added ${today()}`, status: "open" });
      logEvent(p, { stage: st, title: `Question raised: ${text}`, detail: "" });
      save();
    },

    addEvent() {
      const p = cur();
      const title = $("ev-title").value.trim();
      if (!title) { $("ev-title").focus(); return; }
      logEvent(p, { date: $("ev-date").value || today(), stage: +$("ev-stage").value, title, detail: $("ev-detail").value.trim() });
      save();
    },

    openAdvance() {
      const p = cur();
      const s = stage(p.currentStage);
      $("gate-title").textContent = `${p.short}: ${s.gate.id} → Stage ${s.id + 1}`;
      $("gate-sub").textContent = `${s.gate.title}. Confirm each exit criterion. Advancing with unchecked items is logged as a gate override (a red, signed decision in AgentM&V terms).`;
      $("gate-items").innerHTML = s.gate.items.map((it, i) => `<label class="ck"><input type="checkbox" class="gate-ck" data-i="${i}" onchange="Dash.gateCheck()"> ${esc(it)}</label>`).join("");
      $("gate-date").value = today();
      $("gate-note").value = "";
      Dash.gateCheck();
      $("gate-modal").classList.add("show");
    },

    gateCheck() {
      const all = [...document.querySelectorAll(".gate-ck")].every((c) => c.checked);
      const b = $("gate-confirm");
      b.textContent = all ? "Advance stage" : "Advance with gate override";
      b.className = all ? "" : "danger";
    },

    confirmAdvance() {
      const p = cur();
      const s = stage(p.currentStage);
      const unchecked = [...document.querySelectorAll(".gate-ck")].filter((c) => !c.checked).map((c) => s.gate.items[+c.dataset.i]);
      const note = $("gate-note").value.trim();
      if (unchecked.length && !note) { alert("A gate override needs a justification note."); $("gate-note").focus(); return; }
      const date = $("gate-date").value || today();
      logEvent(p, {
        date, stage: s.id,
        title: unchecked.length ? `${s.gate.id} passed with override` : `${s.gate.id} passed`,
        detail: (note ? note + " " : "") + (unchecked.length ? `Unchecked: ${unchecked.join("; ")}.` : "All exit criteria confirmed.")
      });
      // Close out the stage's decisions that were awaiting review, then open the next stage.
      for (const d of s.agentmv) {
        const k = `${s.id}:${d}`;
        if (!p.agentmv[k] || p.agentmv[k].status !== "done") p.agentmv[k] = Object.assign({}, p.agentmv[k], { status: unchecked.length ? "blocked" : "done" });
      }
      p.currentStage += 1;
      p.milestonesDone = [];
      const ns = stage(p.currentStage);
      for (const d of ns.agentmv) {
        const k = `${ns.id}:${d}`;
        if (!p.agentmv[k] || p.agentmv[k].status === "pending") p.agentmv[k] = Object.assign({}, p.agentmv[k], { status: "active" });
      }
      logEvent(p, { date, stage: ns.id, title: `Entered Stage ${ns.id}: ${ns.name}`, detail: ns.objective });
      Dash.closeModal("gate-modal");
      save();
    },

    moveBack() {
      const p = cur();
      const reason = prompt(`Move ${p.short} back to Stage ${p.currentStage - 1}? Reason:`);
      if (!reason) return;
      p.currentStage -= 1;
      p.milestonesDone = [];
      logEvent(p, { title: `Moved back to Stage ${p.currentStage}: ${stage(p.currentStage).name}`, detail: reason });
      save();
    },

    closeModal(id) { $(id).classList.remove("show"); },

    exportJSON() { download("itv-portfolio.json", JSON.stringify(state, null, 2), "application/json"); },

    exportJS() {
      const out = clone(state);
      out.version = `${today()}.${Date.now() % 100000}`;
      out.projects.forEach((p) => p.history.forEach((e) => delete e.local));
      const body = "// ITV Team A project portfolio — shared baseline state for dashboard.html.\n" +
        `// Exported from the dashboard on ${today()}. Commit as data/portfolio.js to share.\n` +
        "window.ITV_PORTFOLIO = " + JSON.stringify(out, null, 2) + ";\n";
      download("portfolio.js", body, "text/javascript");
    },

    importJSON(input) {
      const f = input.files[0];
      if (!f) return;
      f.text().then((t) => {
        const s = JSON.parse(t);
        if (!Array.isArray(s.projects)) throw new Error("missing projects[]");
        state = s; state.framework = clone(BASE.framework);
        staleBase = null; save();
      }).catch((e) => alert("Import failed: " + e.message)).finally(() => { input.value = ""; });
    },

    resetLocal() {
      if (!confirm("Discard all local changes and reload the shared portfolio data?")) return;
      localStorage.removeItem(KEY);
      state = clone(BASE); hasLocal = false; staleBase = null;
      renderAll();
    },

    useShared() { localStorage.removeItem(KEY); state = clone(BASE); hasLocal = false; staleBase = null; renderAll(); },
    keepLocal() { staleBase = null; save(); },

    /** Compact live state for the LLM (current stages, statuses, questions, history). */
    liveContext() {
      return {
        asOf: state.asOf, today: today(),
        projects: state.projects.map((p) => ({
          id: p.id, name: p.name, currentStage: `${p.currentStage}. ${stage(p.currentStage).name}`,
          stageMilestones: stage(p.currentStage).milestones.map((m, i) => `${(p.milestonesDone || []).includes(i) ? "[x]" : "[ ]"} ${m}`),
          agentmv: Object.fromEntries(Object.entries(p.agentmv).map(([k, v]) => [k, v.status + (v.note ? ` — ${v.note}` : "")])),
          openQuestions: p.openQuestions.map((q) => `${q.status === "resolved" ? "RESOLVED" : "OPEN"} [stage ${q.stage}] ${q.text}${q.answer ? " → " + q.answer : ""} (${q.source})`),
          history: p.history.map((e) => `${e.date} [stage ${e.stage}] ${e.title}${e.detail ? ": " + e.detail : ""} (${e.source})`),
          nextSteps: p.nextSteps, timeline: p.timeline, ipmvp: p.ipmvp, mvType: p.mvType
        }))
      };
    }
  };

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.Dash = Dash;
  load();
  selectedId = state.projects[0] && state.projects[0].id;
  renderAll();
  document.querySelectorAll(".modal-bg").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("show"); }));
})();
