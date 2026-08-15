/**
 * Part 17.1 of the specification requires unit cover for the comparison ladder
 * and for a pure mirror of rescore_bucket. Both live here because the client
 * ladder decides the insertion position that log_visit is then handed.
 */

import { describe, expect, it } from "vitest";

import {
  BUCKETS,
  MAX_COMPARISONS,
  applyCompareResult,
  bucketRange,
  recomputeBucketScores,
  nextCompareStep,
} from "./scoring.js";

/** Drive a full ladder, answering with a fixed strategy. Returns the outcome. */
function runLadder(bucketSize, answer) {
  const ids = Array.from({ length: bucketSize }, (_, index) => `p${index}`);
  let lo = 0;
  let hi = bucketSize;
  let comparisons = 0;

  for (;;) {
    const step = nextCompareStep(ids, lo, hi, comparisons);
    if (step.done) return { index: step.index, comparisons };

    const next = applyCompareResult(ids, lo, hi, answer(step.mid), comparisons);
    comparisons = next.comparisons;
    if (next.done) return { index: next.index, comparisons };
    lo = next.lo;
    hi = next.hi;
  }
}

describe("comparison ladder", () => {
  for (const size of [0, 1, 2, 5, 10, 25]) {
    it(`never exceeds the question budget for a bucket of ${size}`, () => {
      for (const answer of [() => "win", () => "lose", (mid) => (mid % 2 ? "win" : "lose")]) {
        const result = runLadder(size, answer);
        const theoretical = Math.ceil(Math.log2(size + 1));
        expect(result.comparisons).toBeLessThanOrEqual(
          Math.min(MAX_COMPARISONS, theoretical),
        );
        expect(result.index).toBeGreaterThanOrEqual(0);
        expect(result.index).toBeLessThanOrEqual(size);
      }
    });
  }

  it("asks nothing when the bucket is empty and inserts at the top", () => {
    const result = runLadder(0, () => "win");
    expect(result.comparisons).toBe(0);
    expect(result.index).toBe(0);
  });

  it("puts a place that beats everything at position 0", () => {
    expect(runLadder(10, () => "win").index).toBe(0);
  });

  it("puts a place that loses to everything last", () => {
    expect(runLadder(10, () => "lose").index).toBe(10);
  });

  it("never asks more than five questions even on a large bucket", () => {
    // 200 places would need 8 comparisons for an exact binary search.
    const result = runLadder(200, (mid) => (mid % 3 === 0 ? "win" : "lose"));
    expect(result.comparisons).toBe(MAX_COMPARISONS);
  });

  it("treats 'too close to call' as just below the pivot and stops", () => {
    const ids = Array.from({ length: 9 }, (_, index) => `p${index}`);
    const step = nextCompareStep(ids, 0, 9, 0);
    const next = applyCompareResult(ids, 0, 9, "tie", 0);
    expect(next.done).toBe(true);
    expect(next.index).toBe(step.mid + 1);
    expect(next.comparisons).toBe(1);
  });
});

describe("recomputeBucketScores mirrors rescore_bucket", () => {
  const visitsOf = (count) =>
    Array.from({ length: count }, (_, index) => ({ id: `v${index}` }));

  it("uses the band maximum for a single place", () => {
    const scores = recomputeBucketScores(visitsOf(1), "loved");
    expect(scores.v0).toBe(10.0);
    expect(recomputeBucketScores(visitsOf(1), "fine").v0).toBe(6.6);
    expect(recomputeBucketScores(visitsOf(1), "no").v0).toBe(3.3);
  });

  it("uses both endpoints for two places", () => {
    const scores = recomputeBucketScores(visitsOf(2), "loved");
    expect([scores.v0, scores.v1]).toEqual([10.0, 6.7]);
  });

  it("spaces five places evenly and monotonically", () => {
    const scores = recomputeBucketScores(visitsOf(5), "loved");
    const values = visitsOf(5).map((visit) => scores[visit.id]);
    expect(values[0]).toBe(10.0);
    expect(values[4]).toBe(6.7);
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeLessThan(values[index - 1]);
    }
  });

  it("matches the Phase 2 acceptance example for six loved places", () => {
    const scores = recomputeBucketScores(visitsOf(6), "loved");
    const values = visitsOf(6).map((visit) => scores[visit.id]);
    // The same numbers the pgTAP suite asserts against the database.
    expect(values).toEqual([10.0, 9.3, 8.7, 8.0, 7.4, 6.7]);
  });

  it("keeps the bands exactly where Part 5.1 puts them", () => {
    expect(bucketRange("loved")).toEqual([6.7, 10.0]);
    expect(bucketRange("fine")).toEqual([3.4, 6.6]);
    expect(bucketRange("no")).toEqual([0.0, 3.3]);
    // Bands must not overlap, or ranking across buckets breaks.
    expect(BUCKETS.fine.range[1]).toBeLessThan(BUCKETS.loved.range[0]);
    expect(BUCKETS.no.range[1]).toBeLessThan(BUCKETS.fine.range[0]);
  });
});
