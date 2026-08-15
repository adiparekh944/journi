// Core scoring engine for Journi.
// Scores are never entered manually — they come from head-to-head comparisons
// within a sentiment bucket, then spread evenly across the bucket's score range.

export const BUCKETS = {
  loved: { label: "Loved it", range: [7.0, 10.0], blurb: "You'd go back in a heartbeat." },
  fine: { label: "It was fine", range: [3.5, 6.99], blurb: "Good, not great." },
  no: { label: "Not for me", range: [0, 3.49], blurb: "Skip it next time." },
};

export const BUCKET_ORDER = ["loved", "fine", "no"];

export function bucketRange(bucket) {
  return BUCKETS[bucket]?.range || [0, 10];
}

// 0-10 -> color band used consistently across list, pins, place page, feed.
export function scoreColor(score) {
  if (score == null) return "neutral";
  if (score >= 8) return "green";
  if (score >= 5) return "yellow";
  return "red";
}

export function scoreColorHex(score) {
  const c = scoreColor(score);
  if (c === "green") return "#16a34a";
  if (c === "yellow") return "#eab308";
  if (c === "red") return "#dc2626";
  return "#94a3b8";
}

// Recompute scores for every visit in a bucket so they spread evenly across the
// bucket's range, preserving the sort order (best first). Returns a map visitId -> score.
export function recomputeBucketScores(sortedVisits, bucket) {
  const [lo, hi] = bucketRange(bucket);
  const k = sortedVisits.length;
  const map = {};
  sortedVisits.forEach((v, i) => {
    let score;
    if (k <= 1) score = (lo + hi) / 2;
    else score = hi - (i / (k - 1)) * (hi - lo);
    map[v.id] = Math.round(score * 10) / 10;
  });
  return map;
}

// One step of the binary-search comparison flow.
// sortedIds: ids of the bucket's visits, best -> worst.
// lo/hi: current search window (insert index is in [lo, hi]).
// Returns the next comparison to ask, or { done, index } when converged.
export function nextCompareStep(sortedIds, lo, hi) {
  if (lo >= hi) return { done: true, index: lo };
  const mid = Math.floor((lo + hi) / 2);
  return { done: false, mid, compareId: sortedIds[mid] };
}

// Apply a comparison result and return the new window (or a forced insertion on tie).
// result: "win" (new place beats mid) | "lose" | "tie"
export function applyCompareResult(sortedIds, lo, hi, result) {
  const mid = Math.floor((lo + hi) / 2);
  if (result === "win") return { lo, hi: mid, done: false };
  if (result === "lose") return { lo: mid + 1, hi, done: false };
  // tie -> insert at mid
  return { lo: mid, hi: mid, done: true, index: mid };
}

// Build the full ranked list across all of a user's visits (best -> worst).
// Bucket ranges don't overlap, so sorting by score desc keeps Loved > Fine > Not.
export function rankVisits(visits) {
  return [...visits].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}