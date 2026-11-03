/* ITV Portfolio assistant — LLM chat over the project corpus + live dashboard state.
 *
 * With an API key: calls the Claude Messages API from the browser using the official
 * TypeScript SDK (loaded as an ES module on demand). The full document corpus is sent
 * as a cached system block; the live dashboard state goes in a second, uncached block
 * so stage updates are always reflected.
 * Without a key: offline mode — answers from dashboard state + keyword search of the corpus.
 */
const SDK_URL = "https://esm.sh/@anthropic-ai/sdk";
const KEY_STORE = "itv_anthropic_key";
const MODEL_STORE = "itv_chat_model";
const DEFAULT_MODEL = "claude-opus-5-5";
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]); // server-side refusal fallbacks supported

const $ = (id) => document.getElementById(id);
const Dash = window.Dash;
const KB = (window.ITV_KNOWLEDGE && window.ITV_KNOWLEDGE.documents) || [];
const esc = Dash.esc;

let history = [];          // [{role, content}] — text-only turns sent to the API
let busy = false;
let sdk = null;
let useFallbacks = true;

// ── Prompt construction ─────────────────────────────────────────────────────
function buildStableSystem() {
  const fw = window.ITV_PORTFOLIO.framework;
  const stages = fw.stages.map((s) =>
    `Stage ${s.id} ${s.name}: ${s.objective}\n  Milestones: ${s.milestones.join("; ")}\n  AgentM&V decisions: ${s.agentmv.join(", ")}\n  Exit gate (${s.gate.id} — ${s.gate.title}): ${s.gate.items.join("; ")}`).join("\n");
  const steps = fw.agentmvSteps.map((d) => `${d.id} [${d.agent}; default light ${d.light}] ${d.name}: ${d.does}`).join("\n");
  const docs = KB.map((d) =>
    `<document id="${d.id}" project="${d.project}" date="${d.date}" source="${d.source}">\n<title>${d.title}</title>\n${d.text}\n</document>`).join("\n\n");

  return `You are the portfolio assistant for the DOE Industrial Technology Validation (ITV) program, Team A measurement & verification (M&V) projects. Users are M&V engineers and program staff tracking five technology validation projects through the ITV M&V Cookbook lifecycle.

How to answer:
- Ground every factual statement in the documents below or in the live dashboard state (sent separately). Cite inline with the document title and date in brackets, e.g. [Team A Technology Discussion, 2026-07-29] or [Dashboard history, 2026-10-15].
- If the sources do not contain the answer, say so plainly and suggest who to ask (site, vendor, tech lead) — do not guess numbers.
- Distinguish vendor/applicant CLAIMS from verified results. No project has verified savings yet unless the dashboard history says so.
- "What happened in a stage" questions: use the dashboard stage history first (it is the system of record for progress), then supporting documents.
- When useful, relate answers to the Cookbook stage/gate and the AgentM&V decision nodes (INGEST, D1–D8) and their governance lights.
- The live dashboard state overrides older documents for current stage, milestones, question status and AgentM&V statuses.
- Be concise: short paragraphs, bullet lists or small tables. Markdown is rendered.

## Framework: ITV M&V Cookbook lifecycle (5 stages)
${stages}

## Framework: AgentM&V (neuro-symbolic multi-agent M&V system)
Layer 1 ingest/retrieval; Layer 2 deterministic engine (ASHRAE Guideline 14 statistics, statutory gate, Pareto frontier, change-point/NRE detection); Layer 3 agents A1–A7 orchestrated over the decision DAG INGEST → D1…D8; Layer 4 signed Merkle ledger with traffic-light governance.
${steps}
Governance: green = ${fw.governance.green} Yellow = ${fw.governance.yellow} Red = ${fw.governance.red}
Note: AgentM&V was built around interval energy time-series baselines; for these Option B projects with non-energy KPIs (quality, NEBs, cost/TCE) the mapping is conceptual — say so when it matters.

## Project documents
${docs}`;
}

let STABLE_SYSTEM = null;
function stableSystem() { return STABLE_SYSTEM || (STABLE_SYSTEM = buildStableSystem()); }

function liveSystem() {
  return "## Live dashboard state (system of record for progress; JSON)\n" + JSON.stringify(Dash.liveContext());
}

// ── Settings ────────────────────────────────────────────────────────────────
function getKey() { return localStorage.getItem(KEY_STORE) || sessionStorage.getItem(KEY_STORE) || ""; }
function getModel() { return localStorage.getItem(MODEL_STORE) || DEFAULT_MODEL; }
function modeLabel() { $("chat-mode").textContent = getKey() ? `● ${getModel()}` : "○ offline search"; }

// ── Rendering ───────────────────────────────────────────────────────────────
function md(src) {
  const blocks = [];
  let s = esc(src).replace(/```[\w-]*\n([\s\S]*?)```/g, (_, c) => { blocks.push(`<pre><code>${c}</code></pre>`); return `\u0000${blocks.length - 1}\u0000`; });
  const inline = (t) => t
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  const out = [];
  const lines = s.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*\|.*\|\s*$/.test(l)) {                      // table
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
      const body = rows.filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      out.push("<table>" + body.map((r, j) => `<tr>${cells(r).map((c) => j === 0 ? `<th>${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("") + "</table>");
    } else if (/^\s*([-*•]|\d+\.)\s+/.test(l)) {          // list
      const ordered = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+\.)\s+/, ""));
      i--;
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
    } else if (/^#{1,4}\s/.test(l)) {
      out.push(`<h4>${inline(l.replace(/^#+\s*/, ""))}</h4>`);
    } else if (l.trim()) {
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, n) => blocks[+n]);
}

function addMsg(role, html, cls = "") {
  const el = document.createElement("div");
  el.className = `msg ${role} ${cls}`;
  el.innerHTML = html;
  $("chat-log").appendChild(el);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
  return el;
}

function projName(id) { const p = Dash.project(id); return p ? p.short : "the portfolio"; }

function renderSuggestions() {
  const scope = $("chat-scope").value;
  const n = projName(scope);
  const qs = scope === "all"
    ? ["Which stage is each project in and what's blocking Gate 1?", "Compare open questions across projects", "Which projects are non-standard M&V and why?", "How do the projects map to AgentM&V decisions?"]
    : [`What happened in each stage so far for ${n}?`, `What are the open questions for ${n} and who should answer them?`, `What is the M&V boundary and KPI set for ${n}?`, `What risks could delay ${n}'s baseline stage?`];
  $("suggest").innerHTML = qs.map((q) => `<button type="button">${esc(q)}</button>`).join("");
  [...$("suggest").children].forEach((b, i) => b.onclick = () => Chat.ask(qs[i]));
}

function welcome() {
  $("chat-log").innerHTML = "";
  addMsg("sys", getKey()
    ? `Answers use ${KB.length} project documents + the live dashboard state. Model: ${esc(getModel())}.`
    : `Offline mode: answers come from the dashboard state and keyword search over ${KB.length} documents. Add an Anthropic API key in ⚙ Settings for full LLM answers.`);
}

// ── Offline mode ────────────────────────────────────────────────────────────
const CHUNKS = KB.flatMap((d) => {
  const parts = [], paras = d.text.split(/\n{2,}|\n(?=[A-Z][A-Z &/]{6,}\n)/);
  let buf = "";
  for (const p of paras) { if ((buf + p).length > 700 && buf) { parts.push(buf); buf = ""; } buf += (buf ? "\n" : "") + p; }
  if (buf) parts.push(buf);
  return parts.map((text) => ({ doc: d, text, toks: tokenize(text) }));
});
function tokenize(t) { return t.toLowerCase().match(/[a-z0-9]+/g) || []; }
const STOP = new Set("the a an of and or to in for on is are what which who how does do with at by from be this that it as was were has have project projects".split(" "));
function search(q, scope, k = 4) {
  const terms = tokenize(q).filter((t) => !STOP.has(t) && t.length > 1);
  const N = CHUNKS.length, avg = CHUNKS.reduce((n, c) => n + c.toks.length, 0) / N;
  const df = Object.fromEntries(terms.map((t) => [t, CHUNKS.filter((c) => c.toks.includes(t)).length]));
  return CHUNKS.filter((c) => scope === "all" || c.doc.project === scope || c.doc.project === "portfolio")
    .map((c) => {
      let s = 0;
      for (const t of terms) {
        const f = c.toks.filter((x) => x === t).length;
        if (f) s += Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5)) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * c.toks.length / avg));
      }
      return { c, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
}

function offlineAnswer(q, scope) {
  const ql = q.toLowerCase();
  const ps = scope === "all" ? Dash.state.projects : [Dash.project(scope)];
  let html = "";
  if (/stage|happen|history|status|progress|where|timeline/.test(ql)) {
    html += ps.map((p) => {
      const s = Dash.stage(p.currentStage);
      const ev = p.history.slice().sort((a, b) => a.date.localeCompare(b.date));
      return `<h4>${esc(p.short)} — Stage ${s.id}: ${esc(s.name)}</h4><ul>${ev.map((e) => `<li><b>${esc(e.date)}</b> [S${e.stage}] ${esc(e.title)}${e.detail ? " — " + esc(e.detail) : ""}</li>`).join("")}</ul>`;
    }).join("");
  }
  if (/question|open|unresolved|ask/.test(ql)) {
    html += ps.map((p) => {
      const oq = p.openQuestions.filter((x) => x.status !== "resolved");
      return `<h4>${esc(p.short)} — ${oq.length} open questions</h4><ul>${oq.map((x) => `<li>[S${x.stage}] ${esc(x.text)}</li>`).join("")}</ul>`;
    }).join("");
  }
  if (/agent|d[1-8]\b|framework|governance|ingest/.test(ql)) {
    html += ps.map((p) => `<h4>${esc(p.short)} — AgentM&V</h4><ul>${Object.entries(p.agentmv).map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v.status)}${v.note ? " — " + esc(v.note) : ""}</li>`).join("")}</ul>`).join("");
  }
  const hits = search(q, scope);
  if (hits.length) {
    html += `<h4>Relevant passages</h4>` + hits.map(({ c }) =>
      `<div class="excerpt">${esc(c.text.slice(0, 600))}${c.text.length > 600 ? "…" : ""}</div><div class="src">${esc(c.doc.title)} · ${esc(c.doc.date)} · ${esc(projName(c.doc.project))}</div>`).join("");
  }
  return html || "<p>No matching information found in the dashboard state or documents. Try different keywords, or add an API key for full answers.</p>";
}

// ── LLM call ────────────────────────────────────────────────────────────────
async function loadSDK() {
  if (!sdk) sdk = (await import(SDK_URL)).default;
  return sdk;
}

async function llmAnswer(userText, el) {
  const Anthropic = await loadSDK();
  const client = new Anthropic({ apiKey: getKey(), dangerouslyAllowBrowser: true });
  const model = getModel();
  const params = {
    model,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: stableSystem(), cache_control: { type: "ephemeral", ttl: "1h" } },
      { type: "text", text: liveSystem() }
    ],
    messages: history
  };
  if (useFallbacks && FALLBACK_MODELS.has(model)) {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }

  let text = "";
  try {
    const stream = client.beta.messages.stream(params);
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        text += ev.delta.text;
        el.innerHTML = md(text);
        el.classList.add("typing");
        $("chat-log").scrollTop = $("chat-log").scrollHeight;
      }
    }
    const final = await stream.finalMessage();
    el.classList.remove("typing");
    if (final.stop_reason === "refusal") {
      text += "\n\n*The model declined to answer this request.*";
    } else if (final.stop_reason === "max_tokens") {
      text += "\n\n*(Answer truncated at the output limit.)*";
    }
    el.innerHTML = md(text);
    const u = final.usage || {};
    el.insertAdjacentHTML("beforeend", `<div class="src">${esc(final.model)} · input ${u.input_tokens ?? 0} + cached ${u.cache_read_input_tokens ?? 0} (written ${u.cache_creation_input_tokens ?? 0}) · output ${u.output_tokens ?? 0} tokens</div>`);
    return text;
  } catch (err) {
    el.classList.remove("typing");
    // Older SDK builds or accounts without the fallback beta: retry once without it.
    if (useFallbacks && params.fallbacks && err instanceof Anthropic.BadRequestError && /fallback|beta/i.test(err.message)) {
      useFallbacks = false;
      return llmAnswer(userText, el);
    }
    let msg;
    if (err instanceof Anthropic.AuthenticationError) msg = "Invalid API key — update it in ⚙ Settings.";
    else if (err instanceof Anthropic.PermissionDeniedError) msg = "This API key doesn't have access to the selected model.";
    else if (err instanceof Anthropic.NotFoundError) msg = `Model "${model}" not found — pick another in ⚙ Settings.`;
    else if (err instanceof Anthropic.RateLimitError) msg = "Rate limited — wait a moment and try again.";
    else if (err instanceof Anthropic.APIConnectionError) msg = "Network error reaching api.anthropic.com.";
    else if (err instanceof Anthropic.APIError) msg = `API error ${err.status ?? ""}: ${err.message}`;
    else msg = `Error: ${err.message || err}`;
    el.innerHTML = md(text) + `<p style="color:#a12b2b">${esc(msg)}</p>`;
    throw err;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
const Chat = {
  toggle(open) {
    $("chat").classList.toggle("open", open);
    if (open) setTimeout(() => $("chat-text").focus(), 250);
  },

  setScope(id) {
    if ([...$("chat-scope").options].some((o) => o.value === id)) { $("chat-scope").value = id; renderSuggestions(); }
  },

  ask(text, scope) {
    if (scope) Chat.setScope(scope);
    Chat.toggle(true);
    $("chat-text").value = text;
    Chat.send();
  },

  async send() {
    const text = $("chat-text").value.trim();
    if (!text || busy) return;
    busy = true;
    $("chat-send").disabled = true;
    $("chat-text").value = "";
    const scope = $("chat-scope").value;
    addMsg("user", esc(text));
    const el = addMsg("bot", "", "typing");

    if (!getKey()) {
      el.classList.remove("typing");
      el.innerHTML = offlineAnswer(text, scope);
    } else {
      const scoped = scope === "all" ? text : `[Scope: ${Dash.project(scope).name} (project id ${scope})]\n${text}`;
      history.push({ role: "user", content: scoped });
      try {
        const answer = await llmAnswer(scoped, el);
        history.push({ role: "assistant", content: answer || "(no answer)" });
      } catch (_) {
        history.pop(); // keep history well-formed after a failed turn
      }
    }
    busy = false;
    $("chat-send").disabled = false;
    $("chat-log").scrollTop = $("chat-log").scrollHeight;
  },

  reset() { history = []; welcome(); },

  openSettings() {
    $("api-key").value = getKey();
    $("remember-key").checked = !!localStorage.getItem(KEY_STORE);
    $("model").value = getModel();
    $("settings-modal").classList.add("show");
  },

  saveSettings() {
    const k = $("api-key").value.trim();
    localStorage.removeItem(KEY_STORE); sessionStorage.removeItem(KEY_STORE);
    if (k) ($("remember-key").checked ? localStorage : sessionStorage).setItem(KEY_STORE, k);
    localStorage.setItem(MODEL_STORE, $("model").value);
    useFallbacks = true;
    Dash.closeModal("settings-modal");
    modeLabel();
    Chat.reset();
  },

  clearKey() {
    localStorage.removeItem(KEY_STORE); sessionStorage.removeItem(KEY_STORE);
    $("api-key").value = "";
    modeLabel();
    Chat.reset();
  }
};

window.Chat = Chat;
$("chat-scope").innerHTML = `<option value="all">All projects</option>` +
  Dash.state.projects.map((p) => `<option value="${p.id}">${esc(p.short)}</option>`).join("");
$("chat-scope").onchange = renderSuggestions;
modeLabel();
renderSuggestions();
welcome();
