// ITV Team A project portfolio — shared baseline state for dashboard.html.
// Edit this file (or use the dashboard's "Download portfolio.js" button and commit
// the result) to move projects through stages for everyone. Local edits made in the
// dashboard are stored in the browser until exported.
// Sources: SecondBrain/Team A_ Technology Discussions 2026-07-29, ITV Initial Tech
// Assessment Presentation to DOE 2026-09-29, Team A_ITV Projects Profile, project
// profiles (projects/*.md), application submissions (2026-01-29).
window.ITV_PORTFOLIO = {
  version: "2026-11-03.1",
  asOf: "2026-11-03",
  team: "Team A — Nick, Sam, Ana Isabel",

  // ── Framework: ITV M&V Cookbook lifecycle × AgentM&V decision DAG ──────────
  framework: {
    stages: [
      {
        id: 1, name: "Planning", objective: "Establish and document an M&V strategy in a formal M&V Plan.",
        milestones: ["Application reviewed", "Technology evaluation review (Sections 1–20)", "Initial technology assessment to DOE", "Site/vendor questions resolved", "M&V Plan drafted", "Gate 1 sign-off"],
        agentmv: ["INGEST", "D1", "D3"],
        gate: { id: "Gate 1", title: "Project Setup & Strategy (before buying/installing meters)", items: [
          "Measurement boundary drawn around the specific sub-system (IPMVP Option B), not the whole facility",
          "Load classified (VLVS ⇒ continuous metering mandatory)",
          "Meters log at a finer interval than the planned model (e.g. 15-min for hourly/daily)",
          "Stakeholders signed off on KPI weights (Σwᵢ = 1.0) before data collection"
        ] }
      },
      {
        id: 2, name: "Baseline", objective: "Characterize the incumbent system and develop a predictive baseline model.",
        milestones: ["Meters & DAS installed", "Baseline data collection", "Data QA/QC", "Baseline model built", "Model scorecard passed"],
        agentmv: ["D2", "D4", "D5"],
        gate: { id: "Gates 2 & 4", title: "Data Hygiene & Sufficiency + Model Statistical Scorecard", items: [
          "Vendor sensor readings cross-checked (clamp meter, secondary logger or physics check)",
          "Outliers (±3σ) and nulls flagged and confirmed with site staff before removal",
          "Model passes the Big 6: R² ≥ 0.75, CV(RMSE) ≤ 20%, NDBE ≤ 0.005%, F p < 0.05, t ≥ 2.0, ρ < 0.7",
          "Coefficient signs physically sensible; residuals flat/homoscedastic"
        ] }
      },
      {
        id: 3, name: "Implementation", objective: "Verify installation/commissioning of the new technology and initiate post-implementation data streams.",
        milestones: ["Equipment installed", "Functional testing", "48–72 h data burn-in", "Memo to Proceed issued"],
        agentmv: ["D1", "D2"],
        gate: { id: "Gate 3", title: "Commissioning Go / No-Go (before starting post-clock)", items: [
          "Technology passed functional testing under normal production conditions",
          "All meters transmitted clean, gap-free, calibrated data for 48–72 hours",
          "M&V Lead issued the Memo to Proceed fixing the post-period start timestamp"
        ] }
      },
      {
        id: 4, name: "Post-Implementation", objective: "Collect, process, and validate operational data from the new technology.",
        milestones: ["Post-period data collection", "Same QA/QC rules as baseline", "Reliability & deviations tracked", "Non-routine events logged"],
        agentmv: ["D2", "D6"],
        gate: { id: "Coverage check", title: "Post-period data sufficiency", items: [
          "Post-period independent variables within 90%–110% of the baseline range",
          "Post data passed the same QA/QC rules as the baseline",
          "Non-routine events documented with dates and engineering basis"
        ] }
      },
      {
        id: 5, name: "Analysis & Reporting", objective: "Calculate verified savings, apply adjustments, quantify uncertainty, and produce the final report.",
        milestones: ["Savings calculated at standard conditions", "Routine & non-routine adjustments", "Uncertainty (FSU) quantified", "Critic review & certification", "Final report"],
        agentmv: ["D6", "D7", "D8"],
        gate: { id: "Gate 5", title: "Final Savings & Uncertainty Sign-Off (DOE reviewer checks)", items: [
          "Baseline and post models projected onto the same standard conditions",
          "NREs deducted (static changes adjusted, temporary shutdowns omitted)",
          "FSU < 50% at 68% confidence (include sensor error if savings are small)",
          "Unbundled physical savings reported alongside the weighted Total Value Index"
        ] }
      }
    ],
    // AgentM&V (agentmv/): Layer 3 agents over the CMDP decision DAG, Layer 4 traffic-light governance.
    agentmvSteps: [
      { id: "INGEST", agent: "Layer 1", name: "Telemetry & document ingest", does: "Load telemetry and parse plans, applications and site documents; hybrid (BM25 + dense) standards retrieval.", light: "green" },
      { id: "D1", agent: "A1 Facility & Telemetry Ingestor", name: "Facility facts, boundary & periods", does: "Extract grounded facility facts, measurement boundary, baseline/reporting periods and ECM install date from unstructured documents.", light: "yellow" },
      { id: "D2", agent: "A2 Data Quality & Fault Validator", name: "Data quality & drift mask", does: "Mask gaps/outliers, detect sensor drift; red if >40% masked or energy completeness <50%.", light: "green" },
      { id: "D3", agent: "A3 Protocol & Boundary Router", name: "IPMVP option & boundary", does: "Route to an IPMVP option (A/B/C/D) from protocol facts; red if undecided.", light: "yellow" },
      { id: "D4", agent: "A4 Pareto Baseline Modeler", name: "Baseline model grid & statutory gate", does: "Fit candidate models (2P–5P, TOWT, regression) and apply the Guideline 14 statistical gate.", light: "green" },
      { id: "D5", agent: "A4 Pareto Baseline Modeler", name: "Pareto model selection", does: "Rank the certified Pareto frontier and select the baseline model; red if the frontier is empty.", light: "yellow" },
      { id: "D6", agent: "A5 Causal & NRE Reconciler", name: "Savings & non-routine events", does: "Avoided energy with routine/non-routine adjustments; CUSUM / Bai-Perron break detection; red on unexplained breaks.", light: "yellow" },
      { id: "D7", agent: "A6 Adversarial Compliance Critic", name: "Certification & FSU", does: "Adversarial compliance critique, fractional savings uncertainty, certify or block — always a signed (red) human decision.", light: "red" },
      { id: "D8", agent: "A7 Auditable Report Generator", name: "Auditable report", does: "Generate the report with every number traced to a signed ledger entry.", light: "yellow" }
    ],
    governance: {
      green: "Deterministic step, all gates passed — executes without intervention.",
      yellow: "Agent proposal or soft warning — pauses for human confirmation.",
      red: "High-liability determination, gate failure, or override — requires a signed manual decision by the certifying engineer."
    }
  },

  // ── Projects ────────────────────────────────────────────────────────────────
  projects: [
    {
      id: "armstrong-svc",
      short: "Armstrong / SVC",
      name: "Armstrong International at SVC Manufacturing (PepsiCo)",
      title: "Vapor compression heat pumping for process heat recovery at a beverage plant",
      vendor: "Armstrong International (Three Rivers, MI)",
      host: "SVC Manufacturing, Inc. (PepsiCo) — Tolleson, AZ",
      sector: "Soft drink manufacturing (NAICS 312111)",
      category: "Waste heat recovery / heat pump / electrification",
      maturity: "Early commercial technology",
      mvType: "Standard M&V",
      ipmvp: "IPMVP Option B — retrofit isolation",
      betterPlants: true,
      technology: "Water-sourced vapor compression heat pump (R1234ze) + thermal energy storage; upgrades low-grade bottle/divert cooling heat to pre-heat pasteurization feed.",
      claims: [
        "Heat recovery 24% → >70% of heating load (storage 24→40%, heat pumps 40→70%+)",
        "Fuel Use Ratio >2,000 → <1,000 Btu/gal on four affected lines",
        "≈$500k/yr net utility savings",
        "≈16 M gal/yr cooling-tower water reduction; ~4,000 tCO₂e/yr Scope 1"
      ],
      boundary: "Four affected lines + thermal equipment: source loop → heat pump → storage → sink loop. Unaffected lines excluded. M&V includes electricity, boiler steam and cooling-tower water.",
      kpis: ["Fuel Use Ratio (Btu/gal)", "Heat captured/delivered & recovery share (%)", "Heat-pump COP", "HX effectiveness", "Steam & NG saved", "HP/pump electricity (kWh, peak kW)", "Thermal storage usable kWh-th", "Cooling-tower makeup water", "Net utility cost savings"],
      dataCollection: ["Utility/fuel meters, electric submeters", "Flow + temperature on source/sink loops", "Production historian (throughput, mix, schedule)", "15-min to hourly intervals"],
      risks: ["New meters at project start limit pre-period granularity", "Attribution complexity across an 8-line plant", "Confounding from production, schedule, seasonal and maintenance changes"],
      timeline: { install: "Install & commission within ~9 months (some uncertainty)", baseline: "New meters + >5 years of plant data", post: "Operate up to 12 months", duration: "2+ years" },
      currentStage: 1,
      milestonesDone: [0, 1, 2],
      agentmv: {
        "1:INGEST": { status: "done", note: "Application, Team A review deck and DOE assessment ingested." },
        "1:D1": { status: "review", note: "Facility facts and four-line boundary drafted; line boundaries/modes and storage dispatch rules await site confirmation." },
        "1:D3": { status: "review", note: "Option B proposed (retrofit isolation on affected lines); tech-lead verification pending per DOE guidance." }
      },
      openQuestions: [
        { id: "q1", text: "What exact line boundaries and operating modes are in scope?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q2", text: "How are storage dispatch rules defined (peak vs non-peak)?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q3", text: "What fallback exists if heat-pump availability drops?", stage: 3, source: "Team A review 2026-07-29", status: "open" },
        { id: "q4", text: "Confirm the basis for the >70% heating-load recovery target.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q5", text: "Confirm the water-savings calculation methodology.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q6", text: "Are scheduled maintenance activities planned during the baseline or reporting period?", stage: 2, source: "Team A review 2026-07-29", status: "open" },
        { id: "q7", text: "Which permits are required for the heat-pump installation?", stage: 3, source: "Team A review 2026-07-29", status: "open" },
        { id: "q8", text: "Confirm the KPI hierarchy (primary vs secondary) and how emissions claims are attributed.", stage: 1, source: "Project profile §20", status: "open" },
        { id: "q9", text: "How will thermal-storage capability be quantified within the M&V boundary?", stage: 1, source: "DOE assessment 2026-09-29", status: "open" }
      ],
      history: [
        { date: "2026-01-29", stage: 1, title: "ITV application submitted", detail: "SVC Manufacturing (PepsiCo) submitted the host-site application with Armstrong International as technology developer.", source: "submission-52995211" },
        { date: "2026-06-25", stage: 1, title: "Project profile & M&V approach drafted", detail: "20-section profile with cookbook-derived Option B approach, KPIs and questions (Nick & Sam).", source: "projects/armstrong-svc.md" },
        { date: "2026-07-29", stage: 1, title: "Team A technology evaluation review", detail: "Reviewed site, baseline (24% recovery, FUR 2,000 Btu/gal), new tech, M&V scope, data, risks; 7 site/vendor questions logged.", source: "Team A Technology Discussions" },
        { date: "2026-09-29", stage: 1, title: "Initial technology assessment presented to DOE", detail: "Baseline vs new-tech process diagram, M&V boundary (electricity, boiler steam, tower water), 9 KPI families, spaces for opportunity (370 TBtu/yr pool).", source: "ITV Initial Tech Assessment to DOE" }
      ],
      nextSteps: ["Resolve line-boundary and storage-dispatch questions with SVC/Armstrong", "Draft M&V Plan (meter map, normalization: throughput, mix, schedule)", "Specify new line-level meters before installation (Gate 1)"]
    },
    {
      id: "bhmc-glidewell",
      short: "BHMC / Glidewell",
      name: "Birmingham Hot Metal Coatings at Glidewell Specialties Foundry",
      title: "Electric ladle preheater validation at a foundry",
      vendor: "Birmingham Hot Metal Coatings (U.S. distributor) / Kanthal (manufacturer)",
      host: "Glidewell Specialties Foundry Co — Calera, AL",
      sector: "Iron foundries (NAICS 331511)",
      category: "Electrification",
      maturity: "Underutilized — proven in European foundries since 2007",
      mvType: "Non-standard M&V",
      ipmvp: "IPMVP Option B + expanded NEB tracking",
      betterPlants: false,
      technology: "Two 150 kW Kanthal electric resistance ladle preheaters with insulated hoods and temperature-feedback control, replacing two natural-gas preheat stations.",
      claims: [
        "Thermal efficiency 20–30% (gas) → up to 95% (electric)",
        "Energy 6,600 → 1,486 MMBtu/yr (70–80% reduction)",
        "Temperature control ±300°F → ±10°F; noise 85–95 dB → <60 dB",
        "Shell <95°F; no burner consumables; longer refractory life"
      ],
      boundary: "Ladle preheat station + downstream quality checkpoints; stabilization period before the formal post window. M&V includes electricity and natural gas; ladle characteristics and casting defects also of interest.",
      kpis: ["Energy per preheat cycle / per ton", "Heat-up time to temperature", "Max thermocouple difference (°F)", "Useful refractory lining heat", "Casting defects", "Noise & heater surface temperature", "Maintenance & refractory life"],
      dataCollection: ["Electric power meters at heater circuits", "Temperature sensors across ladle positions", "Event logs: cycle start, soak, pour readiness", "Quality records, maintenance logs, production context"],
      risks: ["Non-energy value harder to monetize consistently", "Shift/product-run variability confounds comparisons", "Short pilot window limits refractory-life attribution", "Planned 2027–28 facility modernization/relocation of units"],
      timeline: { install: "Install & commission within ~10 months", baseline: "12 months of baseline collection", post: "Operate up to 12 months", duration: "12 months (M&V)" },
      currentStage: 1,
      milestonesDone: [0, 1, 2],
      agentmv: {
        "1:INGEST": { status: "done", note: "Application, Team A review deck and DOE assessment ingested." },
        "1:D1": { status: "review", note: "Cycle-level boundary drafted (9 ladles, ~60 preheat cycles/week); KPI weighting and NEB acceptance criteria unconfirmed." },
        "1:D3": { status: "review", note: "Option B with matched-cycle analysis + NEBs proposed; non-standard M&V flag." }
      },
      openQuestions: [
        { id: "q1", text: "What are the acceptance thresholds for thermal-uniformity metrics?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q2", text: "How will refractory wear be measured and trended?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q3", text: "What are the contingencies for heater downtime?", stage: 3, source: "Team A review 2026-07-29", status: "open" },
        { id: "q4", text: "Confirm KPI weighting: energy vs quality/safety.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q5", text: "Confirm the gas/electric cost conversion methodology.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q6", text: "Are there common maintenance issues that interrupt operation or affect data gathering?", stage: 2, source: "Team A review 2026-07-29", status: "open" },
        { id: "q7", text: "Confirm the planned 2027–2028 relocation of the units occurs after all M&V activities and will not affect schedule, data collection or reporting.", stage: 1, source: "Team A review 2026-07-29", status: "open" }
      ],
      history: [
        { date: "2026-01-29", stage: 1, title: "ITV application submitted", detail: "Glidewell Specialties Foundry submitted with BHMC as technology partner.", source: "submission-52992159" },
        { date: "2026-06-25", stage: 1, title: "Project profile & M&V approach drafted", detail: "Profile with matched-cycle Option B approach and NEB tracking.", source: "projects/bhmc-glidewell.md" },
        { date: "2026-07-29", stage: 1, title: "Team A technology evaluation review", detail: "Reviewed gas baseline (20–30% efficiency), 2×150 kW electric units, claimed 70–80% energy reduction, NEB KPIs; 7 questions logged incl. 2027–28 relocation risk.", source: "Team A Technology Discussions" },
        { date: "2026-09-29", stage: 1, title: "Initial technology assessment presented to DOE", detail: "Gas vs electric process comparison, M&V scope (electricity + NG, ladle and defect data), heat-stored KPI, spaces for opportunity (45.6 TBtu/yr foundry pool).", source: "ITV Initial Tech Assessment to DOE" }
      ],
      nextSteps: ["Agree NEB acceptance criteria and KPI weights with Glidewell", "Confirm relocation timing vs M&V schedule", "Define matched-cycle classes (cold-start 90 min vs production reheat 30 min)"]
    },
    {
      id: "ceia-donaldson",
      short: "CEIA / Donaldson",
      name: "CEIA USA at Donaldson Company",
      title: "Induction-heated hot plates for curing adhesive sealant in air-filter assembly",
      vendor: "CEIA USA, Ltd. (Hudson, OH)",
      host: "Donaldson Company — Greeneville, TN",
      sector: "Industrial filtration & discrete manufacturing (NAICS 333411)",
      category: "Electrification (efficiency)",
      maturity: "Underutilized — commercialized, limited adoption for sealant curing",
      mvType: "Standard M&V",
      ipmvp: "IPMVP Option B — station-level isolation with quality gating",
      betterPlants: false,
      technology: "High-frequency (6–1,800 kHz) induction coil under a steel hot plate with IR temperature feedback; 2 induction plates on Line 13 vs 10 incumbent resistive plates.",
      claims: [
        "≈50% curing energy reduction",
        "Faster warm-up; plates can be switched off during pauses",
        "Lower ambient heat load on the factory floor",
        "Equivalent or better seal quality"
      ],
      boundary: "Energy: curing station + controls (+ chillers under discussion). Quality: seal integrity and defect/rework. Savings accepted only if quality stays within thresholds.",
      kpis: ["kWh per earned hour (earned hours = qty × standard hours/unit)", "Station profile by mode (startup / standby / curing)", "Plate temperature + cure time", "Accepted / failed / reworked units", "Power factor (kVAR)", "Facility cooling load (?)"],
      dataCollection: ["Station electric metering & thermal logging", "Production control and earned-hour logs", "Quality inspection/test data", "1–15 min (energy/temp); batch/lot (quality)"],
      risks: ["Product-mix shifts undermine baseline equivalence", "Equipment age/replacement/maintenance differences", "Commissioning learning effects may overlap the post period"],
      timeline: { install: "Install within 12 months (48 weeks)", baseline: "Up to 12 months of baseline data", post: "Operate >12 months", duration: "12 months (M&V)" },
      currentStage: 1,
      milestonesDone: [0, 1, 2],
      agentmv: {
        "1:INGEST": { status: "done", note: "Team A review deck and DOE assessment ingested; no CEIA application PDF in the workspace (profile built from workbook + public material)." },
        "1:D1": { status: "review", note: "Station boundary drafted; nameplates, kW per batch and chiller inclusion still unknown." },
        "1:D3": { status: "review", note: "Option B station-level isolation with a joint savings/quality decision rule proposed." }
      },
      openQuestions: [
        { id: "q1", text: "How much energy is used over one shift (kW per batch)?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q2", text: "What are the nameplates of the existing and proposed heating elements?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q3", text: "Will UPS or power capacitors be used for power-factor correction?", stage: 3, source: "Team A review 2026-07-29", status: "open" },
        { id: "q4", text: "What were the takeaways of previous attempts?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q5", text: "What are the exact quality acceptance thresholds by product family?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q6", text: "Are startup and idle periods measured?", stage: 2, source: "Team A review 2026-07-29", status: "open" },
        { id: "q7", text: "Are process or product changes planned during the evaluation?", stage: 2, source: "Team A review 2026-07-29", status: "open" },
        { id: "q8", text: "Confirm the savings basis and denominator definition.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q9", text: "Confirm treatment of abnormal events, maintenance and planned shutdowns.", stage: 4, source: "Team A review 2026-07-29", status: "open" },
        { id: "q10", text: "Should facility cooling load / chillers be inside the energy boundary?", stage: 1, source: "Team A review 2026-07-29", status: "open" }
      ],
      history: [
        { date: "2026-06-25", stage: 1, title: "Project profile & M&V approach drafted", detail: "Built from the assignment workbook and public CEIA material (no dedicated submission PDF available).", source: "projects/ceia-donaldson.md" },
        { date: "2026-07-29", stage: 1, title: "Team A technology evaluation review", detail: "Reviewed 12 resistive plates (6×2 processes) baseline, induction design, ~50% savings claim, quality gating; 9 questions logged.", source: "Team A Technology Discussions" },
        { date: "2026-09-29", stage: 1, title: "Initial technology assessment presented to DOE", detail: "Resistive vs induction comparison, M&V on electricity with seal quality, chiller make-up water and ramp-up of interest; 2 plates at Line 13; spaces for opportunity.", source: "ITV Initial Tech Assessment to DOE" }
      ],
      nextSteps: ["Obtain nameplates and per-batch kW from Donaldson", "Decide chiller/cooling-load inclusion in the boundary", "Define earned-hour denominator and quality thresholds"]
    },
    {
      id: "element16-svm",
      short: "Element 16 / SVM",
      name: "Element 16 Technologies at Searles Valley Minerals",
      title: "Sulfur electric thermal storage (SETS) for industrial process heat",
      vendor: "Element 16 Technologies, Inc. (Duarte, CA)",
      host: "Searles Valley Minerals — Trona, CA",
      sector: "Other nonmetallic mineral mining (NAICS 21239)",
      category: "Thermal storage / demand flexibility",
      maturity: "Early commercial technology (CEC-funded demonstrations)",
      mvType: "Non-standard M&V",
      ipmvp: "IPMVP Option B with tariff-aware cost modeling",
      betterPlants: false,
      technology: "Single-tank molten-sulfur electric thermal storage (100–300°C); electric heater → sulfur vessel/internal HX → HTF loop → steam generator delivering 150-psig steam alongside incumbent cogeneration supply.",
      claims: [
        "≈85% thermal-to-thermal round-trip efficiency",
        "Levelized cost of heat ≈3.8 ¢/kWh at host",
        "25–30 year design life",
        "Peak demand and cost reduction via load shifting"
      ],
      boundary: "Sulfur TES vessel, electric heater, circulation pumps, HTF loop, HTF-to-steam HX. Physical performance verified before economic claims; compare the same steam service and header conditions.",
      kpis: ["Useful thermal energy delivered to 150-psig header (kWh-th)", "Electricity-to-useful-heat efficiency", "Round-trip efficiency", "Charge/discharge rate & response time", "Steam flow/pressure/temperature vs service conditions", "Demand charges & energy cost reduction"],
      dataCollection: ["1-min electric interval metering for charging", "Flow/temperature metering on thermal discharge", "Controller dispatch logs & utility interval billing", "Pressure sensors on HTF and 150-psig header"],
      risks: ["Steam cost reduction ≠ steam demand reduction", "Baseline equivalence complex when dispatch strategy changes", "Electric/thermal telemetry alignment", "12-month installation window", "At workbook prices charging costs can exceed avoided gas (break-even ≈2.18 ¢/kWh)"],
      timeline: { install: "Install & commission in 6–9 months (discussion: ~6 months set-up, 3 months start-up data)", baseline: "Up to 12 months accessible", post: "6–9 months data collection; operate up to 12 months", duration: "24 months (M&V)" },
      currentStage: 1,
      milestonesDone: [0, 1, 2],
      agentmv: {
        "1:INGEST": { status: "done", note: "Application, CEC study reference, Team A review and DOE assessment ingested." },
        "1:D1": { status: "review", note: "Boundary drafted (heater → storage → HTF → steam HX); existing sensors, cogen ownership and PRV costs unconfirmed." },
        "1:D3": { status: "review", note: "Option B with physics-informed reduced-order model; equivalent thermal service definition is the open protocol fact." }
      },
      openQuestions: [
        { id: "q1", text: "How is equivalent thermal service defined for comparison?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q2", text: "Which dispatch constraints are fixed vs operator-tunable?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q3", text: "Are seasonal derate conditions expected?", stage: 2, source: "Team A review 2026-07-29", status: "open" },
        { id: "q4", text: "Confirm primary success metric: physical vs economic priority.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q5", text: "What are the differences between the CEC study and the SVM implementation?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q6", text: "How should LCOH integrate energy costs?", stage: 5, source: "Team A review 2026-07-29", status: "open" },
        { id: "q7", text: "How is the charge/discharge rate of the sulfur media factored in?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q8", text: "Does SVM own the cogeneration plant?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q9", text: "Are the PRV costs for the 150 and 450 psig headers similar?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q10", text: "How long is data measured (proposed: 3 months start-up, 6–9 months collection)?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q11", text: "Which sensors already exist at the site?", stage: 1, source: "Team A review 2026-07-29", status: "open" }
      ],
      history: [
        { date: "2026-01-29", stage: 1, title: "ITV application submitted", detail: "Element 16 Technologies submitted with Searles Valley Minerals as host.", source: "submission-52995362" },
        { date: "2026-06-25", stage: 1, title: "Project profile & M&V approach drafted", detail: "Profile with physical-before-economic Option B approach.", source: "projects/element16-svm.md" },
        { date: "2026-07-29", stage: 1, title: "Team A technology evaluation review", detail: "Reviewed SETS scope, KPIs, tariff-aware modeling and risks; meeting notes added timeline (6 mo set-up, 3 mo start-up, 6–9 mo collection) and 11 questions.", source: "Team A Technology Discussions" },
        { date: "2026-09-29", stage: 1, title: "Initial technology assessment presented to DOE", detail: "SETS integration diagram with 450→220→150 psig PRVs, Option B boundary, thermal KPIs, cost scenarios (charging vs waste-heat alternative).", source: "ITV Initial Tech Assessment to DOE" }
      ],
      nextSteps: ["Define equivalent thermal service and success-metric priority", "Inventory existing sensors; specify 1-min metering", "Obtain cogen ownership and tariff details for cost model"]
    },
    {
      id: "joulesai-manus",
      short: "JoulesAI / Manus Bio",
      name: "JoulesAI at Manus Bio",
      title: "Reinforcement-learning autonomous control for total electricity cost reduction",
      vendor: "Joules AI, Inc.",
      host: "Manus Bio Inc. — Augusta, GA",
      sector: "Bioindustrial & chemical manufacturing (NAICS 325199)",
      category: "Demand flexibility / battery dispatch",
      maturity: "Early commercial",
      mvType: "Non-standard M&V",
      ipmvp: "IPMVP Option B with counterfactual baseline replay (Digital Shadow)",
      betterPlants: false,
      technology: "RL control layer (JoulesOS) over existing EMS/SCADA, BESS controller and interval meters under Georgia Power RTP; Phase 1 read-only Digital Shadow → Phase 2 autonomous dispatch with local override.",
      claims: [
        "10–20% more BESS economic value vs rule-based control (10–30% TCE reduction in workbook)",
        "Better price responsiveness (RTP $0.06–$3.37/kWh observed)",
        "Constraint-compliant operation; BMS/PCS protections remain authoritative"
      ],
      boundary: "BESS dispatch decision + resulting grid exchange. Inside: dispatch logic, BESS response, TCE, cycling, constraint compliance. Outside/normalize: production load, seasonality, outages, tariff changes, NREs.",
      kpis: ["Total cost of electricity ($/kWh + demand charges, RTP both cases)", "Peak demand reduction & demand-charge savings", "Shifted energy (kWh)", "BESS round-trip efficiency", "Equivalent full cycles/yr", "Forecast MAPE (price, load)", "Constraint-violation rate (% intervals)"],
      dataCollection: ["EMS/SCADA interval telemetry", "BESS logs: SOC, charge/discharge power, alarms", "Utility interval billing and RTP price data", "Production/process context tags"],
      risks: ["Baseline comparability sensitive to production expansion", "Battery life-cost may offset short-term savings", "Data alignment across control logs, billing and process records"],
      timeline: { install: "Install & commission within 8 months", baseline: "12 months historical + new baseline collection", post: "Operate up to 12 months", duration: "18 months (M&V)" },
      currentStage: 1,
      milestonesDone: [0, 1, 2],
      agentmv: {
        "1:INGEST": { status: "done", note: "Application, Team A review, DOE assessment and CombinedTestData.xlsx (simulation cases) ingested." },
        "1:D1": { status: "review", note: "Boundary and counterfactual structure drafted; baseline controller logic and override conditions unconfirmed." },
        "1:D3": { status: "review", note: "Option B with interval-level Digital Shadow counterfactual proposed; TCE boundaries/tariff components to confirm." }
      },
      openQuestions: [
        { id: "q1", text: "What baseline controller logic defines the counterfactual?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q2", text: "How are battery degradation costs incorporated into claims?", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q3", text: "What override conditions can disable autonomous dispatch?", stage: 3, source: "Team A review 2026-07-29", status: "open" },
        { id: "q4", text: "Confirm TCE calculation boundaries and tariff components.", stage: 1, source: "Team A review 2026-07-29", status: "open" },
        { id: "q5", text: "Confirm KPI hierarchy: cost vs reliability vs battery health.", stage: 1, source: "Team A review 2026-07-29", status: "open" }
      ],
      history: [
        { date: "2026-01-29", stage: 1, title: "ITV application submitted", detail: "Joules AI submitted with Manus Bio as host site.", source: "submission-52994585" },
        { date: "2026-06-25", stage: 1, title: "Project profile & M&V approach drafted", detail: "Profile with counterfactual-replay Option B approach.", source: "projects/joulesai-manus.md" },
        { date: "2026-07-29", stage: 1, title: "Team A technology evaluation review", detail: "Reviewed rule-based baseline, RL platform, Phase 1/2 plan, KPIs and risks; 5 questions logged.", source: "Team A Technology Discussions" },
        { date: "2026-09-29", stage: 1, title: "Initial technology assessment presented to DOE", detail: "Architecture (market/site/asset/edge/cloud), measurement boundary with Digital Shadow counterfactual, 7 KPIs, conditional bill-savings scenarios.", source: "ITV Initial Tech Assessment to DOE" }
      ],
      nextSteps: ["Document the rule-based baseline controller logic", "Agree battery-degradation treatment and KPI hierarchy", "Plan Phase 1 Digital Shadow data feeds (read-only)"]
    }
  ]
};
