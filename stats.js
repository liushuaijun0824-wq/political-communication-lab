const EPSILON = 1e-12;

export function isMissing(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

export function toNumber(value) {
  if (isMissing(value)) return null;
  const parsed = Number(String(value).trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function mean(values) {
  const clean = values.map(toNumber).filter((value) => value !== null);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

export function sampleVariance(values) {
  const clean = values.map(toNumber).filter((value) => value !== null);
  if (clean.length < 2) return null;
  const average = mean(clean);
  return clean.reduce((sum, value) => sum + (value - average) ** 2, 0) / (clean.length - 1);
}

export function sampleSD(values) {
  const variance = sampleVariance(values);
  return variance === null ? null : Math.sqrt(variance);
}

export function median(values) {
  const clean = values
    .map(toNumber)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2
    ? clean[middle]
    : (clean[middle - 1] + clean[middle]) / 2;
}

export function quantile(values, probability) {
  const clean = values
    .map(toNumber)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  if (!clean.length) return null;
  if (clean.length === 1) return clean[0];
  const position = (clean.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return clean[lower] * (1 - weight) + clean[upper] * weight;
}

export function describe(values) {
  const clean = values.map(toNumber).filter((value) => value !== null);
  if (!clean.length) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  return {
    n: clean.length,
    mean: mean(clean),
    sd: sampleSD(clean),
    median: median(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  };
}

export function histogram(values, binCount = 8) {
  const clean = values.map(toNumber).filter((value) => value !== null);
  if (!clean.length) return [];
  const low = Math.min(...clean);
  const high = Math.max(...clean);
  if (low === high) {
    return [{ from: low, to: high, count: clean.length }];
  }
  const width = (high - low) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    from: low + index * width,
    to: low + (index + 1) * width,
    count: 0,
  }));
  clean.forEach((value) => {
    const rawIndex = Math.floor((value - low) / width);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  });
  return bins;
}

export function completeRows(rows, columns) {
  return rows
    .map((row) =>
      columns.map((column) => toNumber(row[column]))
    )
    .filter((values) => values.every((value) => value !== null));
}

export function pearson(valuesX, valuesY) {
  const pairs = valuesX
    .map((value, index) => [toNumber(value), toNumber(valuesY[index])])
    .filter(([x, y]) => x !== null && y !== null);
  if (pairs.length < 3) return null;
  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);
  const meanX = mean(xs);
  const meanY = mean(ys);
  const numerator = pairs.reduce(
    (sum, [x, y]) => sum + (x - meanX) * (y - meanY),
    0
  );
  const denominator = Math.sqrt(
    pairs.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0) *
      pairs.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0)
  );
  const r = Math.abs(denominator) < EPSILON ? null : numerator / denominator;
  if (r === null) return null;
  const df = pairs.length - 2;
  const t = df <= 0 ? null : r * Math.sqrt(df / Math.max(EPSILON, 1 - r * r));
  return {
    n: pairs.length,
    r,
    df,
    t,
    p: t === null ? null : studentTwoSidedP(t, df),
  };
}

export function cronbachAlpha(rows, columns) {
  if (columns.length < 2) return null;
  const matrix = completeRows(rows, columns);
  if (matrix.length < 2) return null;
  const itemVariances = columns.map((_, columnIndex) =>
    sampleVariance(matrix.map((row) => row[columnIndex]))
  );
  const totals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = sampleVariance(totals);
  if (itemVariances.some((value) => value === null) || totalVariance === null || totalVariance < EPSILON) {
    return null;
  }
  const k = columns.length;
  const alpha =
    (k / (k - 1)) *
    (1 -
      itemVariances.reduce((sum, value) => sum + value, 0) /
        totalVariance);
  return {
    n: matrix.length,
    k,
    alpha,
    itemVariances,
  };
}

export function missingDataReport(rows, headers) {
  const numeric = numericColumns(rows, headers);
  const categorical = categoricalColumns(rows, headers);
  const variables = headers.map((name) => {
    const nonMissing = rows.map((row) => row[name]).filter((value) => !isMissing(value));
    const inferredType = numeric.includes(name)
      ? "numeric"
      : categorical.includes(name)
        ? "categorical"
        : nonMissing.length
          ? "categorical"
          : "empty";
    return {
      name,
      inferredType,
      n: nonMissing.length,
      missing: rows.length - nonMissing.length,
      missingShare: rows.length ? (rows.length - nonMissing.length) / rows.length : 0,
      completeCases: nonMissing.length,
      uniqueValues: new Set(nonMissing.map((value) => String(value).trim())).size,
    };
  });
  const completeCaseRows = rows.filter((row) =>
    headers.every((header) => !isMissing(row[header]))
  ).length;
  return { totalRows: rows.length, variables, completeCaseRows };
}

export function frequencyTable(rows, column, limit = 20) {
  const counts = new Map();
  rows.forEach((row) => {
    const label = String(row[column] ?? "").trim();
    if (!label) return;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  const n = sorted.reduce((sum, [, count]) => sum + count, 0);
  return {
    column,
    n,
    levels: sorted.slice(0, limit).map(([label, count]) => ({
      label,
      count,
      share: count / n,
    })),
    omittedLevels: Math.max(0, sorted.length - limit),
  };
}

export function reverseCode(values, max = 5, min = 1) {
  return values.map((value) => {
    const number = toNumber(value);
    return number === null ? null : max + min - number;
  });
}

export function skewness(values) {
  const clean = values.map(toNumber).filter((value) => value !== null);
  if (clean.length < 3) return null;
  const average = mean(clean);
  const sd = sampleSD(clean);
  if (!sd || sd < EPSILON) return null;
  const adjusted = clean.length / ((clean.length - 1) * (clean.length - 2));
  return adjusted * clean.reduce((sum, value) => sum + ((value - average) / sd) ** 3, 0);
}

export function cronbachAlphaWithOptions(rows, columns, options = {}) {
  const reverse = (options.reverse ?? []).filter((column) => columns.includes(column));
  const preparedRows = rows.map((row) => {
    const next = { ...row };
    reverse.forEach((column) => {
      next[column] = reverseCode([row[column]])[0];
    });
    return next;
  });
  const result = cronbachAlpha(preparedRows, columns);
  if (!result) return null;
  const alphaIfDeleted = columns.map((_, index) => {
    const subset = cronbachAlpha(
      preparedRows,
      columns.filter((_, position) => position !== index)
    );
    return subset ? subset.alpha : null;
  });
  return { ...result, reverse, alphaIfDeleted };
}

export function groupComparison(rows, groupColumn, outcomeColumn) {
  const groups = new Map();
  rows.forEach((row) => {
    const group = String(row[groupColumn] ?? "").trim();
    const value = toNumber(row[outcomeColumn]);
    if (!group || value === null) return;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(value);
  });
  const summaries = [...groups.entries()]
    .map(([name, values]) => ({
      name,
      n: values.length,
      mean: mean(values),
      sd: sampleSD(values),
    }))
    .filter((group) => group.n >= 2);
  if (summaries.length < 2) return null;

  if (summaries.length === 2) {
    const a = groups.get(summaries[0].name);
    const b = groups.get(summaries[1].name);
    const varA = sampleVariance(a);
    const varB = sampleVariance(b);
    const se = Math.sqrt(varA / a.length + varB / b.length);
    if (se < EPSILON) return null;
    const difference = mean(a) - mean(b);
    const t = difference / se;
    const df =
      (varA / a.length + varB / b.length) ** 2 /
      ((varA / a.length) ** 2 / (a.length - 1) +
        (varB / b.length) ** 2 / (b.length - 1));
    return {
      type: "Welch independent t-test",
      groups: summaries,
      statistic: t,
      df,
      p: studentTwoSidedP(t, df),
      effect: Math.abs(difference) / Math.sqrt((varA + varB) / 2),
      effectLabel: "Cohen's d",
      direction: `${summaries[0].name} minus ${summaries[1].name}`,
    };
  }

  const included = [...groups.entries()]
    .filter(([name]) => summaries.some((group) => group.name === name))
    .map(([name, values]) => ({ name, values }));
  const grandMean = mean(included.flatMap((group) => group.values));
  const ssBetween = included.reduce(
    (sum, group) => sum + group.values.length * (mean(group.values) - grandMean) ** 2,
    0
  );
  const ssWithin = included.reduce(
    (sum, group) =>
      sum +
      group.values.reduce(
        (groupSum, value) => groupSum + (value - mean(group.values)) ** 2,
        0
      ),
    0
  );
  const dfBetween = included.length - 1;
  const dfWithin = included.reduce((sum, group) => sum + group.values.length, 0) - included.length;
  if (ssWithin < EPSILON || dfWithin <= 0) return null;
  const f = (ssBetween / dfBetween) / (ssWithin / dfWithin);
  return {
    type: "One-way ANOVA",
    groups: summaries,
    statistic: f,
    df: [dfBetween, dfWithin],
    p: fDistributionP(f, dfBetween, dfWithin),
    effect: ssBetween / (ssBetween + ssWithin),
    effectLabel: "Eta squared",
  };
}

export function chiSquare(rows, rowColumn, columnColumn) {
  const rowLevels = [...new Set(rows.map((row) => String(row[rowColumn] ?? "").trim()).filter(Boolean))];
  const columnLevels = [...new Set(rows.map((row) => String(row[columnColumn] ?? "").trim()).filter(Boolean))];
  if (rowLevels.length < 2 || columnLevels.length < 2) return null;
  const observed = rowLevels.map(() => columnLevels.map(() => 0));
  let n = 0;
  rows.forEach((row) => {
    const rowValue = String(row[rowColumn] ?? "").trim();
    const columnValue = String(row[columnColumn] ?? "").trim();
    const rowIndex = rowLevels.indexOf(rowValue);
    const columnIndex = columnLevels.indexOf(columnValue);
    if (rowIndex < 0 || columnIndex < 0) return;
    observed[rowIndex][columnIndex] += 1;
    n += 1;
  });
  if (n === 0) return null;
  const rowTotals = observed.map((row) => row.reduce((sum, value) => sum + value, 0));
  const columnTotals = columnLevels.map((_, columnIndex) =>
    observed.reduce((sum, row) => sum + row[columnIndex], 0)
  );
  const expected = observed.map((row, rowIndex) =>
    row.map((_, columnIndex) => (rowTotals[rowIndex] * columnTotals[columnIndex]) / n)
  );
  const statistic = observed.reduce(
    (sum, row, rowIndex) =>
      sum +
      row.reduce(
        (rowSum, value, columnIndex) =>
          rowSum +
          (value - expected[rowIndex][columnIndex]) ** 2 /
            Math.max(EPSILON, expected[rowIndex][columnIndex]),
        0
      ),
    0
  );
  const df = (rowLevels.length - 1) * (columnLevels.length - 1);
  const lowCells = expected.flat().filter((value) => value < 5).length;
  return {
    n,
    rows: rowLevels,
    columns: columnLevels,
    observed,
    expected,
    rowTotals,
    columnTotals,
    statistic,
    df,
    p: chiSquareDistributionP(statistic, df),
    cramersV: Math.sqrt(statistic / (n * Math.min(rowLevels.length - 1, columnLevels.length - 1))),
    lowExpectedShare: lowCells / expected.flat().length,
  };
}

export function ols(rows, outcomeColumn, predictorColumns) {
  if (!predictorColumns.length) return null;
  const columns = [outcomeColumn, ...predictorColumns];
  const matrix = completeRows(rows, columns);
  if (matrix.length <= predictorColumns.length + 1) return null;
  const y = matrix.map((row) => row[0]);
  const x = matrix.map((row) => [1, ...row.slice(1)]);
  const p = x[0].length;
  const xtx = Array.from({ length: p }, () => Array(p).fill(0));
  const xty = Array(p).fill(0);
  x.forEach((row, rowIndex) => {
    for (let i = 0; i < p; i += 1) {
      xty[i] += row[i] * y[rowIndex];
      for (let j = 0; j < p; j += 1) {
        xtx[i][j] += row[i] * row[j];
      }
    }
  });
  const xtxInverse = invertMatrix(xtx);
  if (!xtxInverse) return null;
  const coefficients = xtxInverse.map((row) =>
    row.reduce((sum, value, index) => sum + value * xty[index], 0)
  );
  const fitted = x.map((row) =>
    row.reduce((sum, value, index) => sum + value * coefficients[index], 0)
  );
  const residuals = y.map((value, index) => value - fitted[index]);
  const ssResidual = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const meanY = mean(y);
  const ssTotal = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const dfResidual = matrix.length - p;
  const mse = ssResidual / dfResidual;
  const rSquared = 1 - ssResidual / ssTotal;
  const adjustedRSquared = 1 - (1 - rSquared) * (matrix.length - 1) / dfResidual;
  const f = ((ssTotal - ssResidual) / (p - 1)) / Math.max(EPSILON, mse);
  const names = ["Intercept", ...predictorColumns];
  const terms = coefficients.map((estimate, index) => {
    const se = Math.sqrt(Math.max(0, mse * xtxInverse[index][index]));
    const t = se < EPSILON ? null : estimate / se;
    return {
      name: names[index],
      estimate,
      se,
      t,
      p: t === null ? null : studentTwoSidedP(t, dfResidual),
    };
  });
  return {
    n: matrix.length,
    terms,
    dfResidual,
    rSquared,
    adjustedRSquared,
    f,
    p: fDistributionP(f, p - 1, dfResidual),
  };
}

export function codingAgreement(rows, aiColumn, humanColumn) {
  const pairs = rows
    .map((row) => [
      String(row[aiColumn] ?? "").trim(),
      String(row[humanColumn] ?? "").trim(),
    ])
    .filter(([ai, human]) => ai && human);
  if (!pairs.length) return null;
  const levels = [...new Set(pairs.flat())].sort();
  const matrix = levels.map(() => levels.map(() => 0));
  pairs.forEach(([ai, human]) => {
    matrix[levels.indexOf(ai)][levels.indexOf(human)] += 1;
  });
  const n = pairs.length;
  const observedAgreement = matrix.reduce(
    (sum, row, index) => sum + row[index],
    0
  ) / n;
  const aiMarginals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const humanMarginals = levels.map((_, columnIndex) =>
    matrix.reduce((sum, row) => sum + row[columnIndex], 0)
  );
  const expectedAgreement =
    levels.reduce(
      (sum, _, index) => sum + aiMarginals[index] * humanMarginals[index],
      0
    ) / (n * n);
  const kappa =
    expectedAgreement >= 1 - EPSILON
      ? 1
      : (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
  return {
    n,
    levels,
    matrix,
    observedAgreement,
    expectedAgreement,
    kappa,
  };
}

export function parseCSV(text) {
  const source = String(text).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = source.split("\n", 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const filledRows = rows.filter((values) => values.some((value) => value.trim() !== ""));
  if (filledRows.length < 2) {
    return { headers: [], rows: [] };
  }
  const rawHeaders = filledRows[0].map((value, index) => value.trim() || `Column ${index + 1}`);
  const counts = new Map();
  const headers = rawHeaders.map((header) => {
    const count = counts.get(header) ?? 0;
    counts.set(header, count + 1);
    return count ? `${header} (${count + 1})` : header;
  });
  return {
    headers,
    rows: filledRows.slice(1).map((values) => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = values[index] ?? "";
      });
      return object;
    }),
  };
}

export function numericColumns(rows, headers) {
  return headers.filter((header) => {
    const values = rows.map((row) => row[header]).filter((value) => !isMissing(value));
    if (!values.length) return false;
    const numericShare =
      values.filter((value) => toNumber(value) !== null).length / values.length;
    return numericShare >= 0.8;
  });
}

export function categoricalColumns(rows, headers) {
  return headers.filter((header) => {
    const values = rows.map((row) => String(row[header] ?? "").trim()).filter(Boolean);
    if (!values.length) return false;
    return new Set(values).size >= 2 && new Set(values).size <= Math.max(12, Math.ceil(rows.length * 0.5));
  });
}

export function rowsToCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

function detectDelimiter(firstLine) {
  const candidates = [",", ";", "\t"];
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

function invertMatrix(matrix) {
  const size = matrix.length;
  const work = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, columnIndex) => (rowIndex === columnIndex ? 1 : 0)),
  ]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(work[row][pivot]) > Math.abs(work[best][pivot])) best = row;
    }
    if (Math.abs(work[best][pivot]) < EPSILON) return null;
    [work[pivot], work[best]] = [work[best], work[pivot]];
    const divisor = work[pivot][pivot];
    work[pivot] = work[pivot].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = work[row][pivot];
      work[row] = work[row].map((value, column) => value - factor * work[pivot][column]);
    }
  }
  return work.map((row) => row.slice(size));
}

function lnGamma(value) {
  const coefficients = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let y = value;
  const x = value;
  let temporary = x + 5.5;
  temporary -= (x + 0.5) * Math.log(temporary);
  let series = 1.000000000190015;
  coefficients.forEach((coefficient) => {
    y += 1;
    series += coefficient / y;
  });
  return -temporary + Math.log((2.5066282746310005 * series) / x);
}

function betaContinuedFraction(a, b, x) {
  const maxIterations = 250;
  const tolerance = 3e-14;
  const tiny = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const m2 = 2 * iteration;
    let aa = (iteration * (b - iteration) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + iteration) * (qab + iteration) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < tolerance) break;
  }
  return h;
}

function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (factor * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (factor * betaContinuedFraction(b, a, 1 - x)) / b;
}

function studentTwoSidedP(t, df) {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return null;
  return Math.min(1, Math.max(0, regularizedBeta(df / (df + t * t), df / 2, 0.5)));
}

function fDistributionP(f, df1, df2) {
  if (!Number.isFinite(f) || !Number.isFinite(df1) || !Number.isFinite(df2)) return null;
  if (f <= 0) return 1;
  return Math.min(1, Math.max(0, regularizedBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)));
}

function chiSquareDistributionP(statistic, df) {
  if (!Number.isFinite(statistic) || statistic < 0 || df <= 0) return null;
  return Math.min(1, Math.max(0, 1 - regularizedBeta(statistic / 2, df / 2, 0.5)));
}
