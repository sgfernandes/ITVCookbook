/* ITV Portfolio assistant — LLM chat over the project corpus + live dashboard state.
 *
 * Providers (chosen in ⚙ Settings; keys stay in the browser):
 *  - anthropic: Claude Messages API via the official Anthropic TypeScript SDK.
 *  - cborg:     LBNL CBORG gateway (LiteLLM, OpenAI-compatible) — one key for Anthropic,
 *               OpenAI, Google and LBL-hosted models. https://cborg.lbl.gov/api_examples/
 *  - custom:    any other OpenAI-compatible endpoint.
 * The full document corpus is sent as a (cached where supported) system block; the live
 * dashboard state follows it so stage updates are always reflected.
 * Without a key: offline mode — answers from dashboard state + keyword search of the corpus.
 */
const ANTHROPIC_SDK_URL = "https://esm.sh/@anthropic-ai/sdk";
const OPENAI_SDK_URL = "https://esm.sh/openai";
const SETTINGS_STORE = "itv_chat_settings";
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]); // Anthropic server-side refusal fallbacks

const PROVIDERS = {
  anthropic: {
    name: "Anthropic", keyStore: "itv_anthropic_key", defaultModel: "claude-opus-5-5", placeholder: "sk-ant-...",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
    keyHint: "Get a key at console.anthropic.com. It goes straight from this browser to api.anthropic.com and is never stored in the repo.",
    modelHint: "claude-opus-5-5 (default), claude-sonnet-5-5 or claude-haiku-5-5 (cheapest).",
    note: ""
  },
  cborg: {
    name: "CBORG", keyStore: "itv_cborg_key", defaultModel: "anthropic/claude-sonnet", placeholder: "CBORG API key",
    models: ["anthropic/claude-sonnet", "openai/gpt-4.1"],
    keyHint: "Request a CBORG key through ComputeView (LBNL). It goes straight from this browser to the CBORG gateway and is never stored in the repo.",
    modelHint: "Use “Load models” to list every model your key can use (e.g. anthropic/…, openai/…, google/…, lbl/…).",
    note: "⚠ CBORG guidance: the API should not be connected to a publicly accessible chatbot or interface. Use this only on a private copy of the dashboard (see README) and follow LBNL data-handling rules."
  },
  custom: {
    name: "Custom", keyStore: "itv_custom_key", defaultModel: "", placeholder: "API key",
    models: [],
    keyHint: "Key for your OpenAI-compatible gateway. It goes straight from this browser to that endpoint.",
    modelHint: "Model id as your gateway names it. “Load models” queries /model/info or /models.",
    note: ""
  }
};

const $ = (id) => document.getElementById(id);
const Dash = window.Dash;
const KB = (window.ITV_KNOWLEDGE && window.ITV_KNOWLEDGE.documents) || [];
const esc = Dash.esc;

let history = [];          // [{role, content}] — text-only turns sent to the API
let busy = false;
const sdks = {};
let useFallbacks = true;

// ── Prompt construction ─────────────────────────────────────────────────────
function buildStableSystem() {
  const fw = window.ITV_PORTFOLIO.framework;
  const stages = fw.stages.map((s) =>
    `Stage ${s.id} ${s.name}: ${s.objective}\n  Milestones: ${s.milestones.join("; ")}\n  Cookbook checklist sections: ${(s.checklist || []).join("; ")}\n  Exit gate (${s.gate.id} — ${s.gate.title}): ${s.gate.items.join("; ")}`).join("\n");
  const docs = KB.map((d) =>
    `<document id="${d.id}" project="${d.project}" date="${d.date}" source="${d.source}">\n<title>${d.title}</title>\n${d.text}\n</document>`).join("\n\n");

  return `You are the portfolio assistant for the DOE Industrial Technology Validation (ITV) program, Team A measurement & verification (M&V) projects. Users are M&V engineers and program staff tracking five technology validation projects through the ITV M&V Cookbook lifecycle.

How to answer:
- Ground every factual statement in the documents below or in the live dashboard state (sent separately). Cite inline with the document title and date in brackets, e.g. [Team A Technology Discussion, 2026-07-29] or [Dashboard history, 2026-10-15].
- If the sources do not contain the answer, say so plainly and suggest who to ask (site, vendor, tech lead) — do not guess numbers.
- Distinguish vendor/applicant CLAIMS from verified results. No project has verified savings yet unless the dashboard history says so.
- "What happened in a stage" questions: use the dashboard stage history first (it is the system of record for progress), then supporting documents.
- When useful, relate answers to the Cookbook stage, its checklist sections and its exit gate (what is needed to pass the next gate).
- The live dashboard state overrides older documents for current stage, milestones and question status.
- Be concise: short paragraphs, bullet lists or small tables. Markdown is rendered.

## Framework: ITV M&V Cookbook lifecycle (5 stages)
${stages}

## Project documents
${docs}`;
}

let STABLE_SYSTEM = null;
function stableSystem() { return STABLE_SYSTEM || (STABLE_SYSTEM = buildStableSystem()); }

function liveSystem() {
  return "## Live dashboard state (system of record for progress; JSON)\n" + JSON.stringify(Dash.liveContext());
}

// ── Settings ────────────────────────────────────────────────────────────────
function loadSettings() {
  let st = {};
  try { st = JSON.parse(localStorage.getItem(SETTINGS_STORE)) || {}; } catch (_) { /* ignore */ }
  st.provider = PROVIDERS[st.provider] ? st.provider : "anthropic";
  st.models = st.models || {};
  const legacy = localStorage.getItem("itv_chat_model"); // pre-provider versions stored the Anthropic model here
  if (legacy && !st.models.anthropic) st.models.anthropic = legacy;
  st.cborgBase = st.cborgBase || "https://api.cborg.lbl.gov";
  st.customBase = st.customBase || "";
  return st;
}
let settings = loadSettings();
function storeSettings() { localStorage.setItem(SETTINGS_STORE, JSON.stringify(settings)); }
function keyFor(pid) { const k = PROVIDERS[pid].keyStore; return localStorage.getItem(k) || sessionStorage.getItem(k) || ""; }
function getKey() { return keyFor(settings.provider); }
function getModel() { return settings.models[settings.provider] || PROVIDERS[settings.provider].defaultModel; }
function baseFor(pid) { return pid === "cborg" ? settings.cborgBase : pid === "custom" ? settings.customBase : "https://api.anthropic.com"; }
function ready() { return !!getKey() && !!getModel() && (settings.provider !== "custom" || !!settings.customBase); }
function modeLabel() { $("chat-mode").textContent = ready() ? `● ${PROVIDERS[settings.provider].name} · ${getModel()}` : "○ offline search"; }

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
    ? ["Which stage is each project in and what's blocking Gate 1?", "Compare open questions across projects", "Which projects are non-standard M&V and why?", "What does each project still need to pass Gate 1?"]
    : [`What happened in each stage so far for ${n}?`, `What are the open questions for ${n} and who should answer them?`, `What is the M&V boundary and KPI set for ${n}?`, `What risks could delay ${n}'s baseline stage?`];
  $("suggest").innerHTML = qs.map((q) => `<button type="button">${esc(q)}</button>`).join("");
  [...$("suggest").children].forEach((b, i) => b.onclick = () => Chat.ask(qs[i]));
}

function welcome() {
  $("chat-log").innerHTML = "";
  addMsg("sys", ready()
    ? `Answers use ${KB.length} project documents + the live dashboard state. Provider: ${esc(PROVIDERS[settings.provider].name)} · model: ${esc(getModel())}.`
    : `Offline mode: answers come from the dashboard state and keyword search over ${KB.length} documents. Add an API key (Anthropic, CBORG or another OpenAI-compatible provider) in ⚙ Settings for full LLM answers.`);
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
  if (/gate|checklist|criteria|cookbook|next/.test(ql)) {
    html += ps.map((p) => {
      const s = Dash.stage(p.currentStage);
      return `<h4>${esc(p.short)} — ${esc(s.gate.id)}: ${esc(s.gate.title)}</h4><ul>${s.gate.items.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` +
        `<p><b>Milestones:</b> ${s.milestones.map((m, i) => `${(p.milestonesDone || []).includes(i) ? "✓" : "○"} ${esc(m)}`).join(" · ")}</p>`;
    }).join("");
  }
  const hits = search(q, scope);
  if (hits.length) {
    html += `<h4>Relevant passages</h4>` + hits.map(({ c }) =>
      `<div class="excerpt">${esc(c.text.slice(0, 600))}${c.text.length > 600 ? "…" : ""}</div><div class="src">${esc(c.doc.title)} · ${esc(c.doc.date)} · ${esc(projName(c.doc.project))}</div>`).join("");
  }
  return html || "<p>No matching information found in the dashboard state or documents. Try different keywords, or add an API key for full answers.</p>";
}

// ── LLM call ────────────────────────────────────────────────────────────────
async function loadSDK(url) {
  if (!sdks[url]) sdks[url] = (await import(url)).default;
  return sdks[url];
}

function llmAnswer(userText, el) {
  return settings.provider === "anthropic" ? anthropicAnswer(userText, el) : openaiCompatAnswer(el);
}

async function anthropicAnswer(userText, el) {
  const Anthropic = await loadSDK(ANTHROPIC_SDK_URL);
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
      return anthropicAnswer(userText, el);
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

/** CBORG / OpenAI-compatible Chat Completions (streaming) via the official OpenAI SDK. */
async function openaiCompatAnswer(el) {
  const OpenAI = await loadSDK(OPENAI_SDK_URL);
  const pid = settings.provider;
  const base = baseFor(pid);
  const model = getModel();
  const client = new OpenAI({ apiKey: getKey(), baseURL: base, dangerouslyAllowBrowser: true, maxRetries: 1 });
  // Claude models behind LiteLLM need an explicit cache_control marker; OpenAI/Gemini cache automatically.
  const claude = /claude|anthropic/i.test(model);
  const system = claude
    ? [{ type: "text", text: stableSystem(), cache_control: { type: "ephemeral" } }, { type: "text", text: liveSystem() }]
    : stableSystem() + "\n\n" + liveSystem();

  let text = "", finish = null, usage = null, served = model;
  try {
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, ...history],
      stream: true,
      stream_options: { include_usage: true }
    });
    for await (const chunk of stream) {
      const choice = chunk.choices && chunk.choices[0];
      const delta = choice && choice.delta && choice.delta.content;
      if (delta) {
        text += delta;
        el.innerHTML = md(text);
        el.classList.add("typing");
        $("chat-log").scrollTop = $("chat-log").scrollHeight;
      }
      if (choice && choice.finish_reason) finish = choice.finish_reason;
      if (chunk.usage) usage = chunk.usage;
      if (chunk.model) served = chunk.model;
    }
    el.classList.remove("typing");
    if (finish === "length") text += "\n\n*(Answer truncated at the output limit.)*";
    else if (finish === "content_filter") text += "\n\n*The provider's content filter stopped this answer.*";
    el.innerHTML = md(text || "*(empty answer)*");
    const u = usage || {};
    const cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
    el.insertAdjacentHTML("beforeend", `<div class="src">${esc(PROVIDERS[pid].name)} · ${esc(served)} · input ${u.prompt_tokens ?? "?"} (cached ${cached}) · output ${u.completion_tokens ?? "?"} tokens</div>`);
    return text;
  } catch (err) {
    el.classList.remove("typing");
    const host = (() => { try { return new URL(base).host; } catch (_) { return base; } })();
    let msg;
    if (err instanceof OpenAI.AuthenticationError) msg = `Invalid ${PROVIDERS[pid].name} API key — update it in ⚙ Settings.`;
    else if (err instanceof OpenAI.PermissionDeniedError) msg = `This key can't use "${model}" (or has hit its budget).`;
    else if (err instanceof OpenAI.NotFoundError) msg = `Model "${model}" not found — use “Load models” in ⚙ Settings.`;
    else if (err instanceof OpenAI.RateLimitError) msg = "Rate or budget limit reached — wait a moment and try again.";
    else if (err instanceof OpenAI.APIConnectionError) msg = `Network error reaching ${host}${/api-local/.test(host) ? " (api-local only works on the LBL network/VPN)" : ""}.`;
    else if (err instanceof OpenAI.APIError) msg = `API error ${err.status ?? ""}: ${err.message}`;
    else msg = `Error: ${err.message || err}`;
    el.innerHTML = md(text) + `<p style="color:#a12b2b">${esc(msg)}</p>`;
    throw err;
  }
}

/** List chat models from a LiteLLM (/model/info) or OpenAI-style (/models) endpoint. */
async function fetchModels(base, key) {
  const root = base.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${key}` };
  const r = await fetch(`${root}/model/info`, { headers });
  if (r.ok) {
    const j = await r.json();
    return [...new Set((j.data || []).filter((m) => !m.model_info || !m.model_info.mode || m.model_info.mode === "chat").map((m) => m.model_name))].sort();
  }
  if (r.status === 401 || r.status === 403) throw new Error("key rejected");
  const r2 = await fetch(`${root}/models`, { headers });
  if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
  const j2 = await r2.json();
  return (j2.data || []).map((m) => m.id).sort();
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

    if (!ready()) {
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
    $("provider").value = settings.provider;
    $("endpoint-cborg").value = settings.cborgBase;
    $("endpoint-custom").value = settings.customBase;
    Chat.providerChanged();
    $("settings-modal").classList.add("show");
  },

  /** Refresh the dialog fields for the selected provider (keys/models are kept per provider). */
  providerChanged() {
    const pid = $("provider").value;
    const P = PROVIDERS[pid];
    $("f-endpoint").style.display = pid === "anthropic" ? "none" : "";
    $("endpoint-cborg").style.display = pid === "cborg" ? "" : "none";
    $("endpoint-custom").style.display = pid === "custom" ? "" : "none";
    $("load-models").style.display = pid === "anthropic" ? "none" : "";
    $("key-label").textContent = `${P.name} API key`;
    $("api-key").placeholder = P.placeholder;
    $("api-key").value = keyFor(pid);
    $("remember-key").checked = !!localStorage.getItem(P.keyStore);
    $("model").value = settings.models[pid] || P.defaultModel;
    $("model-list").innerHTML = P.models.map((m) => `<option value="${esc(m)}">`).join("");
    $("key-hint").textContent = P.keyHint;
    $("model-hint").textContent = P.modelHint;
    $("provider-note").textContent = P.note;
    $("provider-note").style.color = P.note ? "#8a6400" : "";
  },

  async loadModels() {
    const pid = $("provider").value;
    const base = pid === "cborg" ? $("endpoint-cborg").value : $("endpoint-custom").value.trim();
    const key = $("api-key").value.trim();
    if (!base || !key) { $("model-hint").textContent = "Enter the endpoint and API key first."; return; }
    $("model-hint").textContent = "Loading models…";
    try {
      const models = await fetchModels(base, key);
      $("model-list").innerHTML = models.map((m) => `<option value="${esc(m)}">`).join("");
      $("model-hint").textContent = `${models.length} chat models available — start typing or pick from the list.`;
    } catch (e) {
      $("model-hint").textContent = `Couldn't load models (${e.message}). You can still type a model id.`;
    }
  },

  saveSettings() {
    const pid = $("provider").value;
    const P = PROVIDERS[pid];
    const k = $("api-key").value.trim();
    localStorage.removeItem(P.keyStore); sessionStorage.removeItem(P.keyStore);
    if (k) ($("remember-key").checked ? localStorage : sessionStorage).setItem(P.keyStore, k);
    settings.provider = pid;
    settings.models[pid] = $("model").value.trim() || P.defaultModel;
    if (pid === "cborg") settings.cborgBase = $("endpoint-cborg").value;
    if (pid === "custom") settings.customBase = $("endpoint-custom").value.trim().replace(/\/+$/, "");
    storeSettings();
    useFallbacks = true;
    Dash.closeModal("settings-modal");
    modeLabel();
    Chat.reset();
  },

  clearKey() {
    const P = PROVIDERS[$("provider").value];
    localStorage.removeItem(P.keyStore); sessionStorage.removeItem(P.keyStore);
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
