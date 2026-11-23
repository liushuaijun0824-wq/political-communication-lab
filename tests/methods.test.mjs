import test from "node:test";
import assert from "node:assert/strict";
import {
  dataHealth,
  fleissKappa,
  kruskalWallisTest,
  mannWhitneyUTest,
  pairwiseCodingAgreement,
  spearman,
} from "../stats.js";

const close = (actual, expected, tolerance = 1e-5) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not close to ${expected}`);
};

test("Mann-Whitney U uses complete pairs, tie correction, and U as the statistic", () => {
  const rows = [
    { group: "A", outcome: 1 },
    { group: "A", outcome: 2 },
    { group: "A", outcome: 3 },
    { group: "B", outcome: 4 },
    { group: "B", outcome: 5 },
    { group: "B", outcome: 6 },
  ];
  const result = mannWhitneyUTest(rows, "group", "outcome");
  close(result.statistic, 0);
  close(result.n, 6);
  close(result.n1, 3);
  close(result.n2, 3);
  assert.ok(result.p > 0.01 && result.p < 0.02);
  assert.equal(result.approximation.includes("tie correction"), true);
});

test("Kruskal-Wallis H recovers the expected two-group statistic", () => {
  const rows = [
    { group: "A", outcome: 1 },
    { group: "A", outcome: 2 },
    { group: "A", outcome: 3 },
    { group: "B", outcome: 4 },
    { group: "B", outcome: 5 },
    { group: "B", outcome: 6 },
  ];
  const result = kruskalWallisTest(rows, "group", "outcome");
  close(result.statistic, 27 / 7);
  assert.equal(result.df, 1);
  close(result.groups[0].rankSum, 6);
  close(result.groups[1].rankSum, 15);
});

test("Spearman rho recognizes a monotonic relation", () => {
  const result = spearman([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  close(result.rho, 1);
  assert.equal(result.n, 5);
});

test("Fleiss kappa supports more than two coders and reports unit coverage", () => {
  const rows = [
    { coderA: "A", coderB: "A", coderC: "A" },
    { coderA: "A", coderB: "B", coderC: "B" },
    { coderA: "B", coderB: "B", coderC: "B" },
  ];
  const result = fleissKappa(rows, ["coderA", "coderB", "coderC"]);
  close(result.observedAgreement, 7 / 9);
  close(result.expectedAgreement, 41 / 81);
  close(result.kappa, 55 / 100);
  assert.equal(result.coders, 3);
  assert.equal(result.n, 3);
});

test("pairwise coding agreement reports each coder pair separately", () => {
  const rows = [
    { a: "yes", b: "yes", c: "no" },
    { a: "no", b: "yes", c: "no" },
    { a: "yes", b: "yes", c: "yes" },
  ];
  const pairs = pairwiseCodingAgreement(rows, ["a", "b", "c"]);
  assert.equal(pairs.length, 3);
  close(pairs[0].observedAgreement, 2 / 3);
  close(pairs[1].observedAgreement, 2 / 3);
  close(pairs[2].observedAgreement, 1 / 3);
});

test("data health identifies duplicate rows, IDs, constants, and IQR outliers", () => {
  const rows = [
    { id: "u1", group: "a", score: 1 },
    { id: "u1", group: "a", score: 100 },
    { id: "u2", group: "a", score: 2 },
    { id: "u2", group: "a", score: 2 },
    { id: "u3", group: "b", score: 3 },
  ];
  const health = dataHealth(rows, ["id", "group", "score"]);
  close(health.duplicateRows, 1);
  close(health.duplicateIds, 2);
  assert.deepEqual(health.duplicateIdValues, [
    { value: "u1", count: 2 },
    { value: "u2", count: 2 },
  ]);
  assert.deepEqual(health.constantVariables, []);
  close(health.variables[2].outliers, 1);
  close(health.variables[2].lowerBound, 0.5);
  close(health.variables[2].upperBound, 4.5);
});
