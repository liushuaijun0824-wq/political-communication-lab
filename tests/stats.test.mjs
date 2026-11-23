import test from "node:test";
import assert from "node:assert/strict";
import {
  chiSquare,
  codingAgreement,
  cronbachAlpha,
  cronbachAlphaWithOptions,
  describe,
  frequencyTable,
  fisherExactTwoSidedP,
  groupComparison,
  missingDataReport,
  normalQuantile,
  ols,
  parseCSV,
  pearson,
  reverseCode,
  skewness,
  twoProportionSampleSize,
} from "../stats.js";

const close = (actual, expected, tolerance = 1e-5) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not close to ${expected}`);
};

test("descriptive statistics use complete numeric values", () => {
  const result = describe([1, 2, 3, 4, null, "missing"]);
  close(result.n, 4);
  close(result.mean, 2.5);
  close(result.sd, Math.sqrt(5 / 3));
  close(result.median, 2.5);
});

test("Pearson correlation recognizes a perfect linear relation", () => {
  const result = pearson([1, 2, 3, 4], [2, 4, 6, 8]);
  close(result.r, 1);
  close(result.p, 0);
});

test("Cronbach alpha is one for identical items", () => {
  const rows = [1, 2, 3, 4, 5].map((value) => ({ a: value, b: value, c: value }));
  const result = cronbachAlpha(rows, ["a", "b", "c"]);
  close(result.alpha, 1);
});

test("Welch t-test reports the expected statistic", () => {
  const rows = [
    { group: "A", outcome: 1 },
    { group: "A", outcome: 2 },
    { group: "A", outcome: 3 },
    { group: "B", outcome: 3 },
    { group: "B", outcome: 4 },
    { group: "B", outcome: 5 },
  ];
  const result = groupComparison(rows, "group", "outcome");
  close(result.statistic, -Math.sqrt(6));
  close(result.df, 4);
});

test("chi-square reports the expected statistic", () => {
  const rows = [];
  [
    ["A", "X", 10],
    ["A", "Y", 20],
    ["B", "X", 20],
    ["B", "Y", 10],
  ].forEach(([row, column, count]) => {
    for (let index = 0; index < count; index += 1) rows.push({ row, column });
  });
  const result = chiSquare(rows, "row", "column");
  close(result.statistic, 20 / 3);
  assert.equal(result.df, 1);
});

test("OLS recovers an exact slope and intercept", () => {
  const rows = [1, 2, 3, 4, 5].map((x) => ({ x, y: 1 + 2 * x }));
  const result = ols(rows, "y", ["x"]);
  close(result.terms[0].estimate, 1);
  close(result.terms[1].estimate, 2);
  close(result.rSquared, 1);
});

test("coding agreement reports observed agreement and kappa", () => {
  const rows = [
    { ai: "clear", human: "clear" },
    { ai: "clear", human: "clear" },
    { ai: "clear", human: "partial" },
    { ai: "partial", human: "clear" },
    { ai: "partial", human: "partial" },
  ];
  const result = codingAgreement(rows, "ai", "human");
  close(result.observedAgreement, 0.6);
  close(result.kappa, 0.1666666667);
});

test("CSV parser handles quoted commas and escaped quotes", () => {
  const parsed = parseCSV('id,note,value\n1,"a, b",4\n2,"a ""quote""",5');
  assert.deepEqual(parsed.headers, ["id", "note", "value"]);
  assert.equal(parsed.rows[0].note, "a, b");
  assert.equal(parsed.rows[1].note, 'a "quote"');
});

test("missing data report counts cells and complete cases", () => {
  const rows = [
    { score: 1, label: "a" },
    { score: "", label: "b" },
    { score: 3, label: "" },
  ];
  const result = missingDataReport(rows, ["score", "label"]);
  assert.equal(result.totalRows, 3);
  assert.equal(result.variables[0].inferredType, "numeric");
  assert.equal(result.variables[0].missing, 1);
  assert.equal(result.variables[0].uniqueValues, 2);
  assert.equal(result.completeCaseRows, 1);
});

test("frequency table sorts and truncates levels", () => {
  const rows = [{ x: "b" }, { x: "a" }, { x: "b" }, { x: "c" }, { x: "" }];
  const result = frequencyTable(rows, "x", 2);
  assert.deepEqual(result.levels, [
    { label: "b", count: 2, share: 0.5 },
    { label: "a", count: 1, share: 0.25 },
  ]);
  assert.equal(result.omittedLevels, 1);
  assert.equal(result.n, 4);
});

test("reverse code keeps missing values null", () => {
  assert.deepEqual(reverseCode([1, 5, "", 3]), [5, 1, null, 3]);
});

test("skewness reports zero for a symmetric sample and null for a flat one", () => {
  close(skewness([1, 2, 3, 4, 5]), 0);
  assert.equal(skewness([2, 2, 2, 2]), null);
});

test("Cronbach alpha options reverse-code selected items and report alpha if deleted", () => {
  const rows = [1, 2, 3, 4, 5].map((value) => ({
    a: value,
    b: 6 - value,
    c: value,
  }));
  const result = cronbachAlphaWithOptions(rows, ["a", "b", "c"], { reverse: ["b"] });
  close(result.alpha, 1);
  assert.deepEqual(result.reverse, ["b"]);
  result.alphaIfDeleted.forEach((value) => close(value, 1));
});

test("normal quantile reproduces standard critical values", () => {
  close(normalQuantile(0.975), 1.9599639845, 1e-8);
  close(normalQuantile(0.8), 0.8416212336, 1e-8);
  close(normalQuantile(0.5), 0);
});

test("Fisher exact test reproduces the preregistered pilot result", () => {
  const p = fisherExactTwoSidedP([[4, 6], [5, 15]]);
  close(p, 0.4310816619662152, 1e-10);
});

test("two-proportion planner estimates a useful sample size", () => {
  const result = twoProportionSampleSize(0.25, 0.4, 0.05, 0.8);
  assert.equal(Number.isInteger(result.nPerGroup), true);
  assert.ok(result.nPerGroup >= 140 && result.nPerGroup <= 170);
  close(result.effectH, 0.3222408548, 1e-6);
  assert.equal(twoProportionSampleSize(1, 1), null);
});
