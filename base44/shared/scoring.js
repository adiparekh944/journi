// Core scoring engine for Journi.
// Scores are never entered manually — they come from head-to-head comparisons
// within a sentiment bucket, then spread evenly across the bucket's score range.

// Bands are fixed by Part 5.1 of the specification and are also what
// rescore_bucket() uses in Postgres. They must not drift: the database is the
// authority for the stored score, so any other range here would render a score
// that disagrees with the one on the server.
export const BUCKETS = {
  loved: {
    label: "Loved it",
    range: [6.7, 10.0],
    blurb: "You would go back without thinking twice.",
  },
  fine: {
    label: "It was fine",
    range: [3.4, 6.6],
    blurb: "Glad you went. No strong feelings either way.",
  },
  no: {
    label: "Not for me",
    range: [0.0, 3.3],
    blurb: "You would tell a friend to skip it.",
  },
};

// Part 5.3 caps the comparison ladder; the user is never asked more than this.
export const MAX_COMPARISONS = 5;

export const BUCKET_ORDER = ["loved", "fine", "no"];

export function bucketRange(bucket) {
  return BUCKETS[bucket]?.range || [0, 10];
}

// 0-10 -> color band used consistently across list, pins, place page, feed.
// Part 0.3 defines four score bands, not three. Anything unrated is grey.
export function scoreColor(score) {
  if (score == null) return "none";
  if (score >= 8.0) return "high";
  if (score >= 6.0) return "positive";
  if (score >= 4.0) return "neutral";
  return "low";
}

// Full-chroma versions of the Part 0.3 band colours, so a pin or chip reads
// at a glance against a photograph.
export const SCORE_HEX = {
  high: "#16A34A",
  positive: "#77B816",
  neutral: "#F59E0B",
  low: "#F5222D",
  none: "#94A3B8",
  want: "#8B5CF6",
};

export function scoreColorHex(score) {
  return SCORE_HEX[scoreColor(score)] ?? SCORE_HEX.none;
}

/** Tailwind classes for a filled score chip. */
export function scoreChipClass(score) {
  const band = scoreColor(score);
  return {
    high: "bg-score-high text-white",
    positive: "bg-score-positive text-white",
    neutral: "bg-score-neutral text-white",
    low: "bg-score-low text-white",
    none: "bg-muted text-muted-foreground",
  }[band];
}

// Recompute scores for every visit in a bucket so they spread evenly across the
// bucket's range, preserving the sort order (best first). Returns a map visitId -> score.
export function recomputeBucketScores(sortedVisits, bucket) {
  const [lo, hi] = bucketRange(bucket);
  const k = sortedVisits.length;
  const map = {};
  sortedVisits.forEach((v, i) => {
    // Part 5.4: a lone place in a bucket takes the band maximum, not its midpoint.
    let score;
    if (k <= 1) score = hi;
    else score = hi - (i / (k - 1)) * (hi - lo);
    map[v.id] = Math.round(score * 10) / 10;
  });
  return map;
}

// One step of the binary-search comparison flow.
// sortedIds: ids of the bucket's visits, best -> worst.
// lo/hi: current search window (insert index is in [lo, hi]).
// Returns the next comparison to ask, or { done, index } when converged.
export function nextCompareStep(sortedIds, lo, hi, comparisons = 0) {
  // Converged, or the question budget is spent: insert at the window's floor.
  if (lo >= hi || comparisons >= MAX_COMPARISONS) return { done: true, index: lo };
  const mid = Math.floor((lo + hi) / 2);
  return { done: false, mid, compareId: sortedIds[mid] };
}

// Apply a comparison result and return the new window (or a forced insertion on tie).
// result: "win" (new place beats mid) | "lose" | "tie"
export function applyCompareResult(sortedIds, lo, hi, result, comparisons = 0) {
  const mid = Math.floor((lo + hi) / 2);
  const used = comparisons + 1;

  // "Too close to call" counts as losing to the pivot but ends the ladder
  // immediately, inserting just below it (Part 5.3).
  if (result === "tie") {
    return { lo: mid + 1, hi: mid + 1, done: true, index: mid + 1, comparisons: used };
  }

  const next =
    result === "win" ? { lo, hi: mid } : { lo: mid + 1, hi };

  if (next.lo >= next.hi || used >= MAX_COMPARISONS) {
    return { ...next, done: true, index: next.lo, comparisons: used };
  }
  return { ...next, done: false, comparisons: used };
}

// Build the full ranked list across all of a user's visits (best -> worst).
// Bucket ranges don't overlap, so sorting by score desc keeps Loved > Fine > Not.
export function rankVisits(visits) {
  return [...visits].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}