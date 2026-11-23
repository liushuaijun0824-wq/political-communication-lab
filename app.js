import {
  categoricalColumns,
  chiSquare,
  codingAgreement,
  describe,
  cronbachAlphaWithOptions,
  dataHealth,
  fleissKappa,
  frequencyTable,
  groupComparison,
  histogram,
  kruskalWallisTest,
  mannWhitneyUTest,
  missingDataReport,
  numericColumns,
  ols,
  parseCSV,
  pairwiseCodingAgreement,
  pearson,
  rowsToCSV,
  skewness,
  spearman,
  toNumber,
  twoProportionSampleSize,
} from "./stats.js";
import {
  allowedHosts,
  fetchPageText,
  isAllowedUrl,
  normalizeUrl,
  parsePageHTML,
  parsePastedText,
  toMarkdown,
} from "./extract.js";

const state = {
  headers: [],
  rows: [],
  numeric: [],
  categorical: [],
  sourceName: "Practice data",
  exportRows: [],
  methodNote: "",
  activeName: "none",
  extractedPage: null,
  extractCollection: [],
};

const elements = {
  status: document.querySelector("#datasetStatus"),
  source: document.querySelector("#datasetSource"),
  summary: document.querySelector("#datasetSummary"),
  previewHead: document.querySelector("#dataPreviewHead"),
  previewBody: document.querySelector("#dataPreviewBody"),
  practice: document.querySelector("#loadPractice"),
  file: document.querySelector("#csvFile"),
  exportResult: document.querySelector("#exportResult"),
  activeResultLabel: document.querySelector("#activeResultLabel"),
  describeVariable: document.querySelector("#describeVariable"),
  nonparamMode: document.querySelector("#nonparamMode"),
  nonparamGroup: document.querySelector("#nonparamGroup"),
  nonparamOutcome: document.querySelector("#nonparamOutcome"),
  spearmanX: document.querySelector("#spearmanX"),
  spearmanY: document.querySelector("#spearmanY"),
  frequencyVariable: document.querySelector("#frequencyVariable"),
  reliabilityItems: document.querySelector("#reliabilityItems"),
  reverseItems: document.querySelector("#reverseItems"),
  groupVariable: document.querySelector("#groupVariable"),
  outcomeVariable: document.querySelector("#outcomeVariable"),
  compareMode: document.querySelector("#compareMode"),
  corrX: document.querySelector("#corrX"),
  corrY: document.querySelector("#corrY"),
  regOutcome: document.querySelector("#regOutcome"),
  regPredictors: document.querySelector("#regPredictors"),
  aiLabel: document.querySelector("#aiLabel"),
  humanLabel: document.querySelector("#humanLabel"),
  coderItems: document.querySelector("#coderItems"),
  powerBaseline: document.querySelector("#powerBaseline"),
  powerExpected: document.querySelector("#powerExpected"),
  powerAlpha: document.querySelector("#powerAlpha"),
  powerTarget: document.querySelector("#powerTarget"),
  describeResult: document.querySelector("#describeResult"),
  dataHealthResult: document.querySelector("#dataHealthResult"),
  nonparametricResult: document.querySelector("#nonparametricResult"),
  frequencyResult: document.querySelector("#frequencyResult"),
  reliabilityResult: document.querySelector("#reliabilityResult"),
  compareResult: document.querySelector("#compareResult"),
  correlationResult: document.querySelector("#correlationResult"),
  regressionResult: document.querySelector("#regressionResult"),
  codingResult: document.querySelector("#codingResult"),
  multicoderResult: document.querySelector("#multicoderResult"),
  powerResult: document.querySelector("#powerResult"),
  missingReport: document.querySelector("#missingReport"),
  methodNote: document.querySelector("#methodNote"),
  copyMethod: document.querySelector("#copyMethod"),
  extractUrl: document.querySelector("#extractUrl"),
  pasteText: document.querySelector("#pasteText"),
  extractStatus: document.querySelector("#extractStatus"),
  extractResult: document.querySelector("#extractResult"),
  extractCollection: document.querySelector("#extractCollection"),
  exportCollection: document.querySelector("#exportCollection"),
};

const results = {
  describe: elements.describeResult,
  frequency: elements.frequencyResult,
  reliability: elements.reliabilityResult,
  compare: elements.compareResult,
  correlation: elements.correlationResult,
  regression: elements.regressionResult,
  coding: elements.codingResult,
  datahealth: elements.dataHealthResult,
  nonparametric: elements.nonparametricResult,
  multicoder: elements.multicoderResult,
  power: elements.powerResult,
  missing: elements.missingReport,
  extract: elements.extractResult,
};

Object.values(results).forEach(showEmpty);

initializeTabs();
initializeForms();
elements.practice.addEventListener("click", loadPracticeData);
elements.file.addEventListener("change", loadSelectedFile);
elements.exportResult.addEventListener("click", downloadActiveResult);
elements.copyMethod.addEventListener("click", copyMethodNote);
elements.compareMode.addEventListener("change", updateCompareFields);
elements.nonparamMode.addEventListener("change", updateNonparamFields);
elements.exportCollection.addEventListener("click", downloadExtractCollection);
initializeSimulator();
window.addEventListener("resize", renderPreview);
loadPracticeData();

async function loadPracticeData() {
  setStatus("Loading practice data…");
  try {
    const response = await fetch("practice-data.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    applyDataset(parseCSV(await response.text()), "Practice data");
  } catch (error) {
    setStatus("Practice data could not load. Choose a CSV file.");
    showEmpty(results.describe, `The practice file could not be loaded: ${error.message}`);
  }
}

async function loadSelectedFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    setStatus("That file is larger than 10 MB.");
    event.target.value = "";
    return;
  }
  setStatus(`Reading ${file.name}…`);
  try {
    applyDataset(parseCSV(await file.text()), file.name);
  } catch (error) {
    setStatus(`Could not read ${file.name}.`);
    showEmpty(results.describe, error.message);
  }
  event.target.value = "";
}

function applyDataset(parsed, sourceName) {
  if (!parsed.rows.length) {
    setStatus("The CSV has no data rows.");
    return;
  }
  state.headers = parsed.headers;
  state.rows = parsed.rows;
  state.numeric = numericColumns(parsed.rows, parsed.headers);
  state.categorical = categoricalColumns(parsed.rows, parsed.headers);
  state.sourceName = sourceName;
  state.exportRows = [];
  state.methodNote = "";
  state.activeName = "none";
  state.extractedPage = null;
  state.extractCollection = [];
  elements.exportResult.disabled = true;
  elements.exportCollection.disabled = true;
  elements.activeResultLabel.textContent = "Active result: none";
  elements.methodNote.textContent = "Run an analysis first. Its method note will appear here.";
  elements.copyMethod.disabled = true;
  elements.extractStatus.textContent = "Ready for a public URL.";
  elements.source.textContent = sourceName === "Practice data" ? "Practice data" : "Local CSV";
  setStatus(`${sourceName} · ${parsed.rows.length} rows · ${parsed.headers.length} columns`);
  renderDatasetSummary();
  renderPreview();
  renderMissingReport();
  populateControls();
  Object.values(results).forEach(showEmpty);
  renderExtractCollection();
  runDescription();
  console.info("Research workbench dataset", {
    source: sourceName,
    rows: parsed.rows.length,
    columns: parsed.headers,
    numericColumns: state.numeric,
    categoricalColumns: state.categorical,
  });
}

function setStatus(message) {
  elements.status.textContent = message;
}

function renderDatasetSummary() {
  const missing = state.rows.reduce(
    (sum, row) =>
      sum + state.headers.filter((header) => String(row[header] ?? "").trim() === "").length,
    0
  );
  elements.summary.innerHTML = [
    metricMarkup("Rows", state.rows.length),
    metricMarkup("Columns", state.headers.length),
    metricMarkup("Numeric", state.numeric.length),
    metricMarkup("Missing cells", missing),
  ].join("");
}

function renderPreview() {
  const visibleHeaders = state.headers.slice(
    0,
    window.matchMedia("(max-width: 639px)").matches
      ? 4
      : window.matchMedia("(max-width: 1023px)").matches
        ? 6
        : 12
  );
  elements.previewHead.innerHTML = `<tr>${visibleHeaders
    .map((header) => `<th scope="col">${escapeHTML(header)}</th>`)
    .join("")}</tr>`;
  elements.previewBody.innerHTML = state.rows
    .slice(0, 8)
    .map(
      (row) =>
        `<tr>${visibleHeaders
          .map((header) => `<td>${escapeHTML(row[header] ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");
}

function renderMissingReport() {
  const report = missingDataReport(state.rows, state.headers);
  elements.missingReport.innerHTML = `
    <div class="rw-result-head"><h4>Missing-data report</h4><span>${report.totalRows} source rows · ${report.completeCaseRows} complete cases</span></div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Variable</th><th scope="col">Type</th><th scope="col">n</th><th scope="col">Missing</th><th scope="col">Share missing</th><th scope="col">Levels</th></tr></thead>
      <tbody>${report.variables
        .map(
          (variable) => `<tr><td>${escapeHTML(variable.name)}</td><td>${escapeHTML(variable.inferredType)}</td><td>${variable.n}</td><td>${variable.missing}</td><td>${formatPercent(variable.missingShare)}</td><td>${variable.uniqueValues}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    <p class="rw-note">Type labels are inferred from the CSV. Complete cases are rows with no missing cell across all variables; individual tests may use a different analyzed sample.</p>`;
}

function populateControls() {
  fillSelect(elements.describeVariable, state.numeric, state.numeric[0]);
  fillSelect(elements.nonparamGroup, state.categorical, preferredColumn(["condition", "group", "source"]));
  fillSelect(elements.nonparamOutcome, state.numeric, state.numeric[0]);
  fillSelect(elements.spearmanX, state.numeric, state.numeric[0]);
  fillSelect(elements.spearmanY, state.numeric, state.numeric[1] ?? state.numeric[0]);
  fillCheckboxes(
    elements.coderItems,
    state.categorical,
    state.categorical.filter((name) => /coder|human|judge|annotator/i.test(name)).slice(0, 3),
    "coder"
  );
  fillSelect(elements.frequencyVariable, state.categorical, preferredColumn(["human_trace", "human_style"]));
  fillCheckboxes(
    elements.reliabilityItems,
    state.numeric,
    state.numeric.filter((name) => !/id$/i.test(name)).slice(0, 4),
    "reliability"
  );
  fillCheckboxes(elements.reverseItems, state.numeric, [], "reverse");
  fillSelect(elements.corrX, state.numeric, state.numeric[0]);
  fillSelect(elements.corrY, state.numeric, state.numeric[1] ?? state.numeric[0]);
  fillSelect(elements.regOutcome, state.numeric, state.numeric[0]);
  fillCheckboxes(
    elements.regPredictors,
    state.numeric.filter((name) => name !== state.numeric[0]),
    state.numeric.filter((name) => name !== state.numeric[0]).slice(0, 2),
    "predictor"
  );
  fillSelect(elements.aiLabel, state.categorical, preferredColumn(["ai_trace", "ai_label"]));
  fillSelect(elements.humanLabel, state.categorical, preferredColumn(["human_trace", "human_label"]));
  updateCompareFields();
}

function updateCompareFields() {
  const crosstab = elements.compareMode.value === "crosstab";
  const rowLabel = document.querySelector('label[for="groupVariable"]');
  const outcomeLabel = document.querySelector('label[for="outcomeVariable"]');
  rowLabel.textContent = crosstab ? "Row variable" : "Grouping variable";
  outcomeLabel.textContent = crosstab ? "Column variable" : "Outcome";
  fillSelect(
    elements.groupVariable,
    state.categorical,
    preferredColumn(["broadcast_group", "condition", "group"])
  );
  fillSelect(
    elements.outcomeVariable,
    crosstab ? state.categorical : state.numeric,
    crosstab ? preferredColumn(["human_trace", "human_style"]) : state.numeric[0]
  );
}

function updateNonparamFields() {
  const mode = elements.nonparamMode.value;
  const isCorrelation = mode === "spearman";
  const isGroupTest = mode === "mann" || mode === "kruskal";
  elements.nonparamGroupFields.hidden = !isGroupTest;
  elements.nonparamOutcomeFields.hidden = !isGroupTest;
  elements.nonparamCorrFields.hidden = !isCorrelation;
  elements.nonparamCorrYFields.hidden = !isCorrelation;
}

function runDataHealth() {
  const result = dataHealth(state.rows, state.headers);
  if (!result) {
    showEmpty(results.datahealth, "Load a dataset with rows and columns before auditing data quality.");
    return;
  }
  const worstMissing = [...result.variables]
    .sort((a, b) => b.missing - a.missing)
    .filter((variable) => variable.missing > 0)
    .slice(0, 6);
  const outlierVariables = result.variables.filter((variable) => variable.outliers > 0);
  results.datahealth.innerHTML = `
    <div class="rw-result-head"><h4>Dataset audit</h4><span>${result.totalRows} rows · ${result.totalColumns} columns</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("Duplicate rows", result.duplicateRows)}
      ${statMarkup("Repeated IDs", result.duplicateIds ?? "No ID")}
      ${statMarkup("Constant columns", result.constantVariables.length)}
      ${statMarkup("Outlier columns", outlierVariables.length)}
    </div>
    ${result.idHeader ? `<p class="rw-note">ID field detected: ${escapeHTML(result.idHeader)}. ${result.duplicateIds} repeated ID value(s) were found.</p>` : `<p class="rw-note">No standard ID field was detected, so duplicate unit IDs were not checked.</p>`}
    ${result.constantVariables.length ? `<p class="rw-warning">Constant columns may add no information to models: ${escapeHTML(result.constantVariables.join(", "))}.</p>` : ""}
    ${outlierVariables.length ? `
      <table class="rw-result-table">
        <thead><tr><th scope="col">Numeric variable</th><th scope="col">IQR outliers</th><th scope="col">Expected range</th></tr></thead>
        <tbody>${outlierVariables
          .map(
            (variable) =>
              `<tr><td>${escapeHTML(variable.name)}</td><td>${variable.outliers}</td><td>${formatNumber(variable.lowerBound)} to ${formatNumber(variable.upperBound)}</td></tr>`
          )
          .join("")}</tbody>
      </table>
      <p class="rw-note">Outliers are flagged by the 1.5 × IQR rule. They are warnings, not deletion instructions.</p>` : ""}
    <table class="rw-result-table">
      <thead><tr><th scope="col">Variable</th><th scope="col">Type</th><th scope="col">Missing</th><th scope="col">Levels</th></tr></thead>
      <tbody>${worstMissing
        .map(
          (variable) =>
            `<tr><td>${escapeHTML(variable.name)}</td><td>${escapeHTML(variable.type)}</td><td>${variable.missing}</td><td>${variable.uniqueValues}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    ${worstMissing.length ? "" : `<p class="rw-note">No missing values were detected.</p>`}`;
  setActiveResult(
    "Data quality audit",
    [
      { result: "Data quality", metric: "rows", value: result.totalRows },
      { result: "Data quality", metric: "columns", value: result.totalColumns },
      { result: "Data quality", metric: "duplicate_rows", value: result.duplicateRows },
      { result: "Data quality", metric: "id_field", value: result.idHeader ?? "none" },
      { result: "Data quality", metric: "duplicate_ids", value: result.duplicateIds ?? "not checked" },
      { result: "Data quality", metric: "constant_columns", value: result.constantVariables.join("|") },
      ...result.variables.flatMap((variable) => [
        { result: "Data quality", metric: `${variable.name}:missing`, value: variable.missing },
        { result: "Data quality", metric: `${variable.name}:outliers`, value: variable.outliers ?? "" },
      ]),
    ]
  );
}

function runNonparametric() {
  const mode = elements.nonparamMode.value;
  if (mode === "spearman") {
    const x = elements.spearmanX.value;
    const y = elements.spearmanY.value;
    const result = spearman(
      state.rows.map((row) => row[x]),
      state.rows.map((row) => row[y])
    );
    if (!result) {
      showEmpty(results.nonparametric, "Choose two numeric variables with at least three complete pairs.");
      return;
    }
    results.nonparametric.innerHTML = `
      <div class="rw-result-head"><h4>Spearman rank correlation</h4><span>${escapeHTML(x)} with ${escapeHTML(y)}</span></div>
      <div class="rw-stat-grid">
        ${statMarkup("ρ", formatNumber(result.rho))}
        ${statMarkup("p", formatP(result.p))}
        ${statMarkup("n", result.n)}
        ${statMarkup("df", result.df)}
      </div>
      <p class="rw-note">Spearman’s ρ measures monotonic association. The p value is a t approximation and does not establish causality.</p>`;
    setActiveResult(
      "Spearman rank correlation",
      [
        { result: "Spearman", metric: "x", value: x },
        { result: "Spearman", metric: "y", value: y },
        { result: "Spearman", metric: "n", value: result.n },
        { result: "Spearman", metric: "rho", value: round(result.rho) },
        { result: "Spearman", metric: "p", value: round(result.p, 8) },
      ]
    );
    return;
  }

  const group = elements.nonparamGroup.value;
  const outcome = elements.nonparamOutcome.value;
  const result = mode === "mann"
    ? mannWhitneyUTest(state.rows, group, outcome)
    : kruskalWallisTest(state.rows, group, outcome);
  if (!result) {
    showEmpty(results.nonparametric, mode === "mann"
      ? "Mann-Whitney U needs one grouping variable with exactly two levels and a numeric outcome."
      : "Kruskal-Wallis H needs one grouping variable with two or more levels and a numeric outcome.");
    return;
  }
  const df = Array.isArray(result.df) ? result.df.join(", ") : result.df;
  results.nonparametric.innerHTML = `
    <div class="rw-result-head"><h4>${escapeHTML(result.type)}</h4><span>${escapeHTML(outcome)} by ${escapeHTML(group)}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup(mode === "mann" ? "U" : "H", formatNumber(result.statistic))}
      ${statMarkup(mode === "mann" ? "z" : "df", mode === "mann" ? formatNumber(result.z) : result.df)}
      ${statMarkup("p", formatP(result.p))}
      ${statMarkup(mode === "mann" ? "r effect" : result.effectLabel, formatNumber(result.effect))}
    </div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Group</th><th scope="col">n</th><th scope="col">Median</th><th scope="col">Mean</th><th scope="col">SD</th><th scope="col">Rank sum</th></tr></thead>
      <tbody>${result.groups
        .map(
          (entry) =>
            `<tr><td>${escapeHTML(entry.name)}</td><td>${entry.n}</td><td>${formatNumber(entry.median)}</td><td>${formatNumber(entry.mean)}</td><td>${formatNumber(entry.sd)}</td><td>${formatNumber(entry.rankSum)}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    <p class="rw-note">${escapeHTML(result.approximation)}. Complete cases are used and missing values are excluded.</p>`;
  setActiveResult(
    result.type,
    [
      { result: result.type, metric: "group", value: group },
      { result: result.type, metric: "outcome", value: outcome },
      { result: result.type, metric: "n", value: result.n },
      { result: result.type, metric: "statistic", value: round(result.statistic) },
      { result: result.type, metric: mode === "mann" ? "z" : "df", value: mode === "mann" ? round(result.z) : result.df },
      { result: result.type, metric: "p", value: round(result.p, 8) },
      { result: result.type, metric: result.effectLabel, value: round(result.effect) },
      ...result.groups.flatMap((entry) => [
        { result: result.type, metric: `median:${entry.name}`, value: round(entry.median) },
        { result: result.type, metric: `rank_sum:${entry.name}`, value: round(entry.rankSum) },
      ]),
    ]
  );
}

function initializeForms() {
  document.querySelectorAll("form[data-analysis]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const analysis = form.dataset.analysis;
      if (analysis === "describe") runDescription();
      if (analysis === "datahealth") runDataHealth();
      if (analysis === "nonparametric") runNonparametric();
      if (analysis === "frequency") runFrequency();
      if (analysis === "reliability") runReliability();
      if (analysis === "compare") runComparison();
      if (analysis === "correlation") runCorrelation();
      if (analysis === "regression") runRegression();
      if (analysis === "coding") runCodingAudit();
      if (analysis === "multicoder") runMultiCoder();
      if (analysis === "power") runPowerAnalysis();
      if (analysis === "extract") runExtract();
      if (analysis === "paste") runPaste();
    });
  });
}

function runDescription() {
  const variable = elements.describeVariable.value;
  const summary = describe(state.rows.map((row) => row[variable]));
  if (!summary) {
    showEmpty(results.describe, `No numeric values were found in ${variable}.`);
    return;
  }
  const bins = histogram(state.rows.map((row) => row[variable]), 8);
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  const skew = skewness(state.rows.map((row) => row[variable]));
  results.describe.innerHTML = `
    <div class="rw-result-head"><h4>${escapeHTML(variable)}</h4><span>complete cases n = ${summary.n}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("Mean", formatNumber(summary.mean))}
      ${statMarkup("SD", formatNumber(summary.sd))}
      ${statMarkup("Median", formatNumber(summary.median))}
      ${statMarkup("IQR", `${formatNumber(summary.q1)}–${formatNumber(summary.q3)}`)}
      ${statMarkup("Skewness", formatNumber(skew))}
    </div>
    <div class="rw-hist" role="img" aria-label="Histogram of ${escapeHTML(variable)}">
      ${bins
        .map(
          (bin) => `<span class="rw-bar" style="height:${Math.max(
            3,
            (bin.count / maxCount) * 100
          )}%" title="${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${bin.count}"><span>${formatNumber(bin.from)}</span></span>`
        )
        .join("")}
    </div>
    <p class="rw-note">Minimum ${formatNumber(summary.min)} · Maximum ${formatNumber(summary.max)}. Missing or non-numeric values are excluded. The distribution is ${skew === null ? "not interpretable" : Math.abs(skew) < 0.5 ? "roughly symmetric" : skew > 0 ? "right-skewed" : "left-skewed"}.</p>`;
  setActiveResult(
    `${variable} description`,
    [
      { result: "Description", metric: "Variable", value: variable },
      { result: "Description", metric: "n", value: summary.n },
      { result: "Description", metric: "Mean", value: round(summary.mean) },
      { result: "Description", metric: "SD", value: round(summary.sd) },
      { result: "Description", metric: "Median", value: round(summary.median) },
      { result: "Description", metric: "Skewness", value: round(skew) },
      { result: "Description", metric: "Minimum", value: round(summary.min) },
      { result: "Description", metric: "Maximum", value: round(summary.max) },
    ]
  );
}

function runFrequency() {
  const variable = elements.frequencyVariable.value;
  const result = frequencyTable(state.rows, variable, 12);
  if (!result || !result.levels.length) {
    showEmpty(results.frequency, `No categorical values were found in ${variable}.`);
    return;
  }
  results.frequency.innerHTML = `
    <div class="rw-result-head"><h4>${escapeHTML(variable)}</h4><span>n = ${result.n} · ${result.levels.length} shown</span></div>
    <div class="rw-hist" role="img" aria-label="Frequency bar chart of ${escapeHTML(variable)}">
      ${result.levels
        .map(
          (level) => `<span class="rw-bar" style="height:${Math.max(3, level.share * 100)}%" title="${escapeHTML(level.label)}: ${level.count}"><span>${escapeHTML(level.label)}</span></span>`
        )
        .join("")}
    </div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Level</th><th scope="col">Count</th><th scope="col">Share</th></tr></thead>
      <tbody>${result.levels
        .map(
          (level) => `<tr><td>${escapeHTML(level.label)}</td><td>${level.count}</td><td>${formatPercent(level.share)}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    ${result.omittedLevels ? `<p class="rw-note">${result.omittedLevels} additional level(s) are omitted from this view.</p>` : ""}`;
  setActiveResult(
    `${variable} frequency`,
    result.levels.map((level) => ({ result: "Frequency", metric: level.label, value: level.count }))
  );
}

function runReliability() {
  const columns = checkedValues(elements.reliabilityItems);
  const reverse = checkedValues(elements.reverseItems).filter((column) => columns.includes(column));
  const result = cronbachAlphaWithOptions(state.rows, columns, { reverse });
  if (!result) {
    showEmpty(results.reliability, "Choose at least two numeric items with at least two complete rows.");
    return;
  }
  const warning =
    result.alpha < 0.7
      ? "Alpha is below .70. Inspect item wording and covariance before using a summed scale."
      : result.alpha > 0.95
        ? "Alpha is above .95. The items may be highly redundant."
        : "";
  const reverseNote = reverse.length ? `Reverse-coded before scaling: ${reverse.join(", ")}.` : "";
  results.reliability.innerHTML = `
    <div class="rw-result-head"><h4>Cronbach’s alpha</h4><span>complete cases n = ${result.n} · k = ${result.k}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("Alpha", formatNumber(result.alpha))}
      ${statMarkup("Items", result.k)}
      ${statMarkup("Complete cases", result.n)}
      ${statMarkup("Reversed", reverse.length)}
    </div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Item</th><th scope="col">Variance</th><th scope="col">α if deleted</th></tr></thead>
      <tbody>${columns.map((column, index) => `<tr><td>${escapeHTML(column)}${reverse.includes(column) ? " (reversed)" : ""}</td><td>${formatNumber(result.itemVariances[index])}</td><td>${formatNumber(result.alphaIfDeleted[index])}</td></tr>`).join("")}</tbody>
    </table>
    ${warning ? `<p class="rw-warning">${warning}</p>` : ""}
    <p class="rw-note">${reverseNote} Alpha is an internal-consistency statistic. It does not establish unidimensionality or validity.</p>`;
  setActiveResult(
    "Cronbach's alpha",
    [
      { result: "Cronbach's alpha", metric: "n", value: result.n },
      { result: "Cronbach's alpha", metric: "items", value: result.k },
      { result: "Cronbach's alpha", metric: "alpha", value: round(result.alpha) },
      { result: "Cronbach's alpha", metric: "reverse", value: reverse.join("|") },
      ...columns.map((column, index) => ({
        result: "Cronbach's alpha",
        metric: `alpha_if_deleted:${column}`,
        value: round(result.alphaIfDeleted[index]),
      })),
      ...columns.map((column, index) => ({
        result: "Cronbach's alpha",
        metric: `variance:${column}`,
        value: round(result.itemVariances[index]),
      })),
    ]
  );
}

function runComparison() {
  const mode = elements.compareMode.value;
  if (mode === "crosstab") {
    renderCrosstab();
  } else {
    renderGroupComparison();
  }
}

function renderGroupComparison() {
  const group = elements.groupVariable.value;
  const outcome = elements.outcomeVariable.value;
  const result = groupComparison(state.rows, group, outcome);
  if (!result) {
    showEmpty(results.compare, "Choose a grouping column and a numeric outcome with at least two groups.");
    return;
  }
  const df = Array.isArray(result.df) ? result.df.join(", ") : formatNumber(result.df);
  results.compare.innerHTML = `
    <div class="rw-result-head"><h4>${escapeHTML(result.type)}</h4><span>${escapeHTML(outcome)} by ${escapeHTML(group)}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup(result.type.includes("t-test") ? "t" : "F", formatNumber(result.statistic))}
      ${statMarkup("df", df)}
      ${statMarkup("p", formatP(result.p))}
      ${statMarkup(result.effectLabel, formatNumber(result.effect))}
    </div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Group</th><th scope="col">n</th><th scope="col">Mean</th><th scope="col">SD</th></tr></thead>
      <tbody>${result.groups
        .map(
          (entry) =>
            `<tr><td>${escapeHTML(entry.name)}</td><td>${entry.n}</td><td>${formatNumber(entry.mean)}</td><td>${formatNumber(entry.sd)}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    ${result.direction ? `<p class="rw-note">Difference: ${escapeHTML(result.direction)}. The p value is two-sided.</p>` : `<p class="rw-note">ANOVA assumes independent observations and a numeric outcome. Inspect group distributions before relying on the test.</p>`}`;
  setActiveResult(
    result.type,
    [
      { result: result.type, metric: "outcome", value: outcome },
      { result: result.type, metric: "group", value: group },
      { result: result.type, metric: "statistic", value: round(result.statistic) },
      { result: result.type, metric: "df", value: df },
      { result: result.type, metric: "p", value: round(result.p, 8) },
      { result: result.type, metric: result.effectLabel, value: round(result.effect) },
      ...result.groups.flatMap((entry) => [
        { result: result.type, metric: `n:${entry.name}`, value: entry.n },
        { result: result.type, metric: `mean:${entry.name}`, value: round(entry.mean) },
        { result: result.type, metric: `sd:${entry.name}`, value: round(entry.sd) },
      ]),
    ]
  );
}

function renderCrosstab() {
  const rowVariable = elements.groupVariable.value;
  const columnVariable = elements.outcomeVariable.value;
  const result = chiSquare(state.rows, rowVariable, columnVariable);
  if (!result) {
    showEmpty(results.compare, "Choose two categorical variables with at least two levels each.");
    return;
  }
  const lowShare = result.lowExpectedShare;
  results.compare.innerHTML = `
    <div class="rw-result-head"><h4>Chi-square test of independence</h4><span>${escapeHTML(rowVariable)} by ${escapeHTML(columnVariable)}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("χ²", formatNumber(result.statistic))}
      ${statMarkup("df", result.df)}
      ${statMarkup("p", formatP(result.p))}
      ${statMarkup("Cramer’s V", formatNumber(result.cramersV))}
    </div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">${escapeHTML(rowVariable)}</th>${result.columns.map((column) => `<th scope="col">${escapeHTML(column)}</th>`).join("")}<th scope="col">Total</th></tr></thead>
      <tbody>${result.observed
        .map(
          (row, rowIndex) =>
            `<tr><td>${escapeHTML(result.rows[rowIndex])}</td>${row
              .map((value) => `<td>${value}</td>`)
              .join("")}<td>${result.rowTotals[rowIndex]}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    ${lowShare > 0.2 ? `<p class="rw-warning">${Math.round(lowShare * 100)}% of expected cells are below 5. Treat the chi-square approximation cautiously.</p>` : ""}
    <p class="rw-note">n = ${result.n}. Cramer’s V is reported as a descriptive effect size.</p>`;
  setActiveResult(
    "Chi-square test of independence",
    [
      { result: "Chi-square", metric: "row variable", value: rowVariable },
      { result: "Chi-square", metric: "column variable", value: columnVariable },
      { result: "Chi-square", metric: "n", value: result.n },
      { result: "Chi-square", metric: "chi-square", value: round(result.statistic) },
      { result: "Chi-square", metric: "df", value: result.df },
      { result: "Chi-square", metric: "p", value: round(result.p, 8) },
      { result: "Chi-square", metric: "Cramer's V", value: round(result.cramersV) },
    ]
  );
}

function runCorrelation() {
  const x = elements.corrX.value;
  const y = elements.corrY.value;
  const result = pearson(
    state.rows.map((row) => row[x]),
    state.rows.map((row) => row[y])
  );
  if (!result) {
    showEmpty(results.correlation, "Choose two numeric variables with at least three complete pairs.");
    return;
  }
  results.correlation.innerHTML = `
    <div class="rw-result-head"><h4>Pearson correlation</h4><span>${escapeHTML(x)} with ${escapeHTML(y)}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("r", formatNumber(result.r))}
      ${statMarkup("p", formatP(result.p))}
      ${statMarkup("n", result.n)}
      ${statMarkup("df", result.df)}
    </div>
    <p class="rw-note">Pearson’s r measures linear association. A small p value does not establish a causal relationship.</p>`;
  setActiveResult(
    "Pearson correlation",
    [
      { result: "Pearson correlation", metric: "x", value: x },
      { result: "Pearson correlation", metric: "y", value: y },
      { result: "Pearson correlation", metric: "n", value: result.n },
      { result: "Pearson correlation", metric: "r", value: round(result.r) },
      { result: "Pearson correlation", metric: "p", value: round(result.p, 8) },
    ]
  );
}

function runRegression() {
  const outcome = elements.regOutcome.value;
  const predictors = checkedValues(elements.regPredictors);
  const result = ols(state.rows, outcome, predictors);
  if (!result) {
    showEmpty(results.regression, "Choose a numeric outcome and at least one numeric predictor with enough complete rows.");
    return;
  }
  results.regression.innerHTML = `
    <div class="rw-result-head"><h4>OLS regression</h4><span>${escapeHTML(outcome)} · n = ${result.n}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("R²", formatNumber(result.rSquared))}
      ${statMarkup("Adjusted R²", formatNumber(result.adjustedRSquared))}
      ${statMarkup("F", formatNumber(result.f))}
      ${statMarkup("Model p", formatP(result.p))}
    </div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Term</th><th scope="col">Estimate</th><th scope="col">SE</th><th scope="col">t</th><th scope="col">p</th></tr></thead>
      <tbody>${result.terms
        .map(
          (term) =>
            `<tr><td>${escapeHTML(term.name)}</td><td>${formatNumber(term.estimate)}</td><td>${formatNumber(term.se)}</td><td>${formatNumber(term.t)}</td><td>${formatP(term.p)}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    <p class="rw-note">Ordinary least squares with complete cases. Check linearity, independence, residual spread, and influential observations.</p>`;
  setActiveResult(
    "OLS regression",
    [
      { result: "OLS regression", metric: "outcome", value: outcome },
      { result: "OLS regression", metric: "n", value: result.n },
      { result: "OLS regression", metric: "R2", value: round(result.rSquared) },
      { result: "OLS regression", metric: "adjusted_R2", value: round(result.adjustedRSquared) },
      { result: "OLS regression", metric: "F", value: round(result.f) },
      { result: "OLS regression", metric: "model_p", value: round(result.p, 8) },
      ...result.terms.flatMap((term) => [
        { result: "OLS regression", metric: `estimate:${term.name}`, value: round(term.estimate) },
        { result: "OLS regression", metric: `se:${term.name}`, value: round(term.se) },
        { result: "OLS regression", metric: `p:${term.name}`, value: round(term.p, 8) },
      ]),
    ]
  );
}

function runCodingAudit() {
  const aiColumn = elements.aiLabel.value;
  const humanColumn = elements.humanLabel.value;
  if (aiColumn === humanColumn) {
    showEmpty(results.coding, "Choose two different columns: one for AI proposals and one for human decisions.");
    return;
  }
  const result = codingAgreement(state.rows, aiColumn, humanColumn);
  if (!result) {
    showEmpty(results.coding, "Choose two categorical label columns with paired non-missing values.");
    return;
  }
  results.coding.innerHTML = `
    <div class="rw-result-head"><h4>Nominal coding agreement</h4><span>paired records n = ${result.n}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("Observed", formatPercent(result.observedAgreement))}
      ${statMarkup("Expected", formatPercent(result.expectedAgreement))}
      ${statMarkup("Cohen’s κ", formatNumber(result.kappa))}
      ${statMarkup("Levels", result.levels.length)}
    </div>
    <div class="rw-matrices">
      ${matrixMarkup("Observed count", result.matrix, result.levels, result.levels)}
      ${matrixMarkup("Human final label", result.matrix, result.levels, result.levels, true)}
    </div>
    <p class="rw-note">Agreement measures consistency between the two columns. It does not establish validity or which label is substantively correct.</p>`;
  setActiveResult(
    "Coding agreement",
    [
      { result: "Coding agreement", metric: "AI column", value: aiColumn },
      { result: "Coding agreement", metric: "human column", value: humanColumn },
      { result: "Coding agreement", metric: "n", value: result.n },
      { result: "Coding agreement", metric: "observed agreement", value: round(result.observedAgreement) },
      { result: "Coding agreement", metric: "expected agreement", value: round(result.expectedAgreement) },
      { result: "Coding agreement", metric: "Cohen's kappa", value: round(result.kappa) },
    ]
  );
}

function runMultiCoder() {
  const coderColumns = checkedValues(elements.coderItems);
  if (coderColumns.length < 2) {
    showEmpty(results.multicoder, "Choose at least two categorical coder columns.");
    return;
  }
  const result = fleissKappa(state.rows, coderColumns);
  const pairs = pairwiseCodingAgreement(state.rows, coderColumns);
  if (!result) {
    showEmpty(results.multicoder, "No complete rows were found across the selected coder columns.");
    return;
  }
  results.multicoder.innerHTML = `
    <div class="rw-result-head"><h4>Fleiss’ kappa</h4><span>${result.coders} coders · complete units n = ${result.n}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("Fleiss’ κ", result.kappa === null ? "n.a." : formatNumber(result.kappa))}
      ${statMarkup("Observed", formatPercent(result.observedAgreement))}
      ${statMarkup("Expected", formatPercent(result.expectedAgreement))}
      ${statMarkup("Categories", result.categories.length)}
    </div>
    ${result.kappa === null ? `<p class="rw-warning">One category or a degenerate marginal distribution prevents κ interpretation. Report observed agreement and inspect the codebook.</p>` : `<p class="rw-note">κ below .60 suggests substantive coding disagreement; below .40 is generally weak.</p>`}
    <table class="rw-result-table">
      <thead><tr><th scope="col">Coder pair</th><th scope="col">Paired n</th><th scope="col">Observed agreement</th><th scope="col">Cohen’s κ</th></tr></thead>
      <tbody>${pairs
        .map(
          (pair) =>
            `<tr><td>${escapeHTML(pair.first)} × ${escapeHTML(pair.second)}</td><td>${pair.n}</td><td>${formatPercent(pair.observedAgreement)}</td><td>${formatNumber(pair.kappa)}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    <p class="rw-note">Fleiss’ kappa treats coders as interchangeable. The pairwise table helps identify which coder pair is responsible for disagreement.</p>`;
  setActiveResult(
    "Fleiss' kappa",
    [
      { result: "Fleiss' kappa", metric: "coder columns", value: coderColumns.join("|") },
      { result: "Fleiss' kappa", metric: "complete units", value: result.n },
      { result: "Fleiss' kappa", metric: "coders", value: result.coders },
      { result: "Fleiss' kappa", metric: "observed agreement", value: round(result.observedAgreement) },
      { result: "Fleiss' kappa", metric: "expected agreement", value: round(result.expectedAgreement) },
      { result: "Fleiss' kappa", metric: "kappa", value: result.kappa === null ? "" : round(result.kappa) },
      ...pairs.flatMap((pair) => [
        { result: "Fleiss' kappa", metric: `pair:${pair.first} x ${pair.second}:n`, value: pair.n },
        { result: "Fleiss' kappa", metric: `pair:${pair.first} x ${pair.second}:agreement`, value: round(pair.observedAgreement) },
        { result: "Fleiss' kappa", metric: `pair:${pair.first} x ${pair.second}:kappa`, value: round(pair.kappa) },
      ]),
    ]
  );
}

function runPowerAnalysis() {
  const baseline = Number(elements.powerBaseline.value);
  const expected = Number(elements.powerExpected.value);
  const alpha = Number(elements.powerAlpha.value);
  const power = Number(elements.powerTarget.value);
  const result = twoProportionSampleSize(baseline, expected, alpha, power);
  if (!result) {
    showEmpty(results.power, "Enter shares between 0 and 1, plus an alpha and target power between 0 and 1.");
    return;
  }
  results.power.innerHTML = `
    <div class="rw-result-head"><h4>Required sample size</h4><span>${escapeHTML(result.method)}</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("n per group", result.nPerGroup.toLocaleString("en-US"))}
      ${statMarkup("Total n", result.totalN.toLocaleString("en-US"))}
      ${statMarkup("Difference", formatPercent(Math.abs(expected - baseline)))}
      ${statMarkup("Cohen’s h", formatNumber(result.effectH))}
    </div>
    <p class="rw-note">Planning approximation for independent groups. Recalculate after refining expected rates and account for attrition before collection.</p>`;
  setActiveResult("Two-proportion sample size plan", [
    { result: "Sample size plan", metric: "baseline share", value: baseline },
    { result: "Sample size plan", metric: "expected share", value: expected },
    { result: "Sample size plan", metric: "alpha two-sided", value: alpha },
    { result: "Sample size plan", metric: "target power", value: power },
    { result: "Sample size plan", metric: "n per group", value: result.nPerGroup },
    { result: "Sample size plan", metric: "total n", value: result.totalN },
    { result: "Sample size plan", metric: "Cohen h", value: round(result.effectH) },
  ]);
}

function initializeSimulator() {
  const attribution = document.querySelector("#simAttribution");
  const disclosure = document.querySelector("#simDisclosure");
  const attributionValue = document.querySelector("#simAttributionValue");
  const disclosureValue = document.querySelector("#simDisclosureValue");
  const certainty = document.querySelector("#simCertainty");
  const transparency = document.querySelector("#simTransparency");
  const alert = document.querySelector("#simAlert");
  if (!attribution || !disclosure || !attributionValue || !disclosureValue || !certainty || !transparency || !alert) return;

  const render = () => {
    const attributionScore = Number(attribution.value);
    const disclosureScore = Number(disclosure.value);
    attributionValue.value = attributionScore;
    disclosureValue.value = disclosureScore;
    certainty.textContent = `${Math.round((attributionScore * 0.8 + disclosureScore * 0.2) * 10) / 10}`;
    transparency.textContent = `${Math.round((disclosureScore * 0.8 + attributionScore * 0.2) * 10) / 10}`;
    alert.textContent = Math.min(attributionScore, disclosureScore) < 50 ? "Review" : "Stable";
  };
  attribution.addEventListener("input", render);
  disclosure.addEventListener("input", render);
  render();
}

function matrixMarkup(title, matrix, rows, columns, transpose = false) {
  const actual = transpose
    ? rows.map((_, columnIndex) => matrix.map((row) => row[columnIndex]))
    : matrix;
  return `
    <div>
      <p class="rw-matrix-title">${escapeHTML(title)}</p>
      <table class="rw-result-table">
        <thead><tr><th scope="col"></th>${columns.map((column) => `<th scope="col">${escapeHTML(column)}</th>`).join("")}</tr></thead>
        <tbody>${actual
          .map(
            (row, index) =>
              `<tr><th scope="row">${escapeHTML(rows[index])}</th>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`
          )
          .join("")}</tbody>
      </table>
    </div>`;
}

function initializeTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      let targetIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") targetIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") targetIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = tabs.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      tabs[targetIndex].focus();
      activateTab(tabs[targetIndex]);
    });
  });
}

function activateTab(selected) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const active = tab === selected;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.querySelector(`#${tab.getAttribute("aria-controls")}`).hidden = !active;
  });
}

function fillSelect(select, options, preferred) {
  const previous = select.value;
  select.innerHTML = options
    .map((option) => `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`)
    .join("");
  const target = options.includes(previous) ? previous : options.includes(preferred) ? preferred : options[0];
  select.value = target ?? "";
  select.disabled = !options.length;
}

function fillCheckboxes(container, options, selected, groupName) {
  const previous = checkedValues(container);
  const wanted = previous.length ? previous.filter((value) => options.includes(value)) : selected;
  container.innerHTML = options
    .map(
      (option, index) =>
        `<label class="rw-check"><input type="checkbox" name="${groupName}" value="${escapeHTML(option)}" ${wanted.includes(option) ? "checked" : ""}><span>${escapeHTML(option)}</span></label>`
    )
    .join("");
  if (!options.length) container.innerHTML = '<span class="rw-note">No numeric columns found.</span>';
}

function checkedValues(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function preferredColumn(candidates) {
  return candidates.find((candidate) => state.categorical.includes(candidate)) ?? state.categorical[0];
}

function showEmpty(target, message = "Choose a method and run the analysis. The result will appear here.") {
  if (!target) return;
  target.innerHTML = `<div class="rw-empty">${escapeHTML(message)}</div>`;
}

async function runExtract() {
  const input = elements.extractUrl.value;
  let url;
  try {
    url = normalizeUrl(input);
  } catch (error) {
    showEmpty(results.extract, error.message);
    return;
  }
  if (!isAllowedUrl(input)) {
    showEmpty(results.extract, `This demo accepts only public hosts on the allowlist: ${allowedHosts().join(", ")}. Paste text from another page below.`);
    elements.extractStatus.textContent = "Site not in the public demo allowlist.";
    return;
  }
  elements.extractStatus.textContent = `Reading ${url.hostname}…`;
  try {
    const html = await fetchPageText(url);
    const record = parsePageHTML(html, url.toString());
    renderExtractedRecord(record, url.toString(), "Public URL");
  } catch (error) {
    showEmpty(results.extract, `Could not extract this page: ${error.message}`);
    elements.extractStatus.textContent = "Extraction failed.";
  }
}

function runPaste() {
  const record = parsePastedText(elements.pasteText.value);
  if (!record.text) {
    showEmpty(results.extract, "Paste some page text first.");
    return;
  }
  renderExtractedRecord(record, "pasted text", "Pasted text");
}

function renderExtractedRecord(record, source, mode) {
  state.extractedPage = record;
  state.extractCollection.push({
    source,
    title: record.title,
    description: record.description,
    published: record.published,
    domain: record.domain,
    sourceType: record.sourceType,
    words: record.wordCount,
    characters: record.textChars,
    linkCount: record.links.length,
    links: record.links.join(" | "),
    text: record.text,
    aiStatus: "AI extracted · human review pending",
    humanDecision: "",
    reviewNote: "",
  });
  elements.extractStatus.textContent = `${mode} · ${record.wordCount} words · ${record.links.length} links`;
  results.extract.innerHTML = `
    <div class="rw-result-head"><h4>${escapeHTML(record.title)}</h4><span>${record.textChars} characters</span></div>
    <div class="rw-stat-grid">
      ${statMarkup("Words", record.wordCount)}
      ${statMarkup("Links", record.links.length)}
      ${statMarkup("Published", record.published ? escapeHTML(record.published.slice(0, 10)) : "n.a.")}
      ${statMarkup("Source", mode)}
    </div>
    ${record.description ? `<p class="rw-note">${escapeHTML(record.description)}</p>` : ""}
    <pre class="rw-code">${escapeHTML(record.text.slice(0, 3000))}${record.text.length > 3000 ? "\n\n…" : ""}</pre>
    <button class="rw-button" type="button" id="copyExtractReport">Copy extract report</button>
    <p class="rw-help">${escapeHTML(source)}</p>`;
  elements.extractResult.querySelector("#copyExtractReport")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(record));
      elements.extractStatus.textContent = "Extract report copied to clipboard.";
    } catch {
      elements.extractStatus.textContent = "Clipboard unavailable. Use the CSV export instead.";
    }
  });
  setActiveResult("URL extract", [
    { result: "URL extract", metric: "source", value: source },
    { result: "URL extract", metric: "title", value: record.title },
    { result: "URL extract", metric: "published", value: record.published },
    { result: "URL extract", metric: "words", value: record.wordCount },
    { result: "URL extract", metric: "characters", value: record.textChars },
    { result: "URL extract", metric: "links", value: record.links.join("|") },
    { result: "URL extract", metric: "text", value: record.text.slice(0, 5000) },
  ]);
  renderExtractCollection();
}

function renderExtractCollection() {
  const rows = state.extractCollection;
  elements.exportCollection.disabled = !rows.length;
  if (!rows.length) {
    showEmpty(elements.extractCollection, "No extracted records in the current session.");
    return;
  }
  elements.extractCollection.innerHTML = `
    <div class="rw-result-head"><h4>AI extraction queue</h4><span>${rows.length} record(s) ready for human review</span></div>
    <table class="rw-result-table">
      <thead><tr><th scope="col">Source</th><th scope="col">Title</th><th scope="col">Words</th><th scope="col">AI status</th></tr></thead>
      <tbody>${rows
        .map(
          (record, index) =>
            `<tr><td>${escapeHTML(record.domain || `record ${index + 1}`)}</td><td>${escapeHTML(record.title)}</td><td>${record.words}</td><td>${escapeHTML(record.aiStatus)}</td></tr>`
        )
        .join("")}</tbody>
    </table>
    <p class="rw-note">This queue is not automatically transformed into the analysis dataset. Download it, review each row, then load the corrected CSV into the Data tab.</p>`;
}

function downloadExtractCollection() {
  if (!state.extractCollection.length) return;
  const csv = rowsToCSV(state.extractCollection);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-extraction-review-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.exportCollection.textContent = "Review CSV exported";
  setTimeout(() => {
    elements.exportCollection.textContent = "Download collection CSV";
  }, 1800);
}

function setActiveResult(name, exportRows) {
  state.exportRows = exportRows;
  state.activeName = name;
  elements.exportResult.disabled = !exportRows.length;
  elements.activeResultLabel.textContent = `Active result: ${name}`;
  state.methodNote = buildMethodNote(name, exportRows);
  elements.methodNote.textContent = state.methodNote;
  elements.copyMethod.disabled = false;
}

function buildMethodNote(name, exportRows) {
  const rows = ["Method note", "===========", `Result: ${name}`, `Source: ${state.sourceName}`, `Dataset: ${state.rows.length} rows, ${state.headers.length} columns`];
  const grouped = new Map();
  exportRows.forEach((row) => {
    if (!grouped.has(row.result)) grouped.set(row.result, []);
    grouped.get(row.result).push(`${row.metric} = ${row.value}`);
  });
  grouped.forEach((lines, result) => {
    rows.push("", `[${result}]`, ...lines);
  });
  rows.push("", "Data remain in the browser. Complete-case n is reported for every analysis.");
  return rows.join("\n");
}

async function copyMethodNote() {
  if (!state.methodNote) return;
  try {
    await navigator.clipboard.writeText(state.methodNote);
    elements.copyMethod.textContent = "Copied";
    setTimeout(() => {
      elements.copyMethod.textContent = "Copy method note";
    }, 1800);
  } catch {
    elements.copyMethod.textContent = "Select and copy manually";
  }
}

function downloadActiveResult() {
  if (!state.exportRows.length) return;
  const csv = rowsToCSV(state.exportRows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `research-result-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.exportResult.textContent = "Result exported";
  setTimeout(() => {
    elements.exportResult.textContent = "Download result";
  }, 1800);
}

function metricMarkup(label, value) {
  return `<div class="rw-metric"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function statMarkup(label, value) {
  return `<div class="rw-stat"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function formatNumber(value, digits = 3) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "n.a.";
  const number = Number(value);
  if (Math.abs(number) >= 1000) return number.toLocaleString("en-US", { maximumFractionDigits: digits });
  return number.toFixed(digits).replace(/\.?0+$/, "");
}

function formatP(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "n.a.";
  return value < 0.001 ? "< .001" : Number(value).toFixed(3);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function round(value, digits = 6) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "";
  return Number(Number(value).toFixed(digits));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The application still works without offline caching.
    });
  });
}

const observedSections = [...document.querySelectorAll("main > section[id], footer[id]")];
const navigationLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navigationLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        link.toggleAttribute("aria-current", active);
        if (active) link.setAttribute("aria-current", "page");
      });
    },
    { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.2, 0.6] }
  );
  observedSections.forEach((section) => observer.observe(section));
}
