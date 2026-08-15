import { describe, expect, it } from "vitest";

import { asTasteVector } from "./tasteVectors.ts";
import { RecommendationScorer, recommendationPlace } from "./recommendationScoring.ts";

const scorer = new RecommendationScorer();
const user = {
  tasteVector: asTasteVector([0.9, 0.2, 0.7, 0.2, 0.1, 0.2, 0.8, 0.5, 0.2, 0.4]),
  crowdTolerance: 0.4,
  priceSensitivity: 0.8,
};
const place = recommendationPlace({
  id: "place-1",
  name: "Historic View",
  category: "landmark",
  tasteVector: [0.9, 0.2, 0.2, 0.1, 0.1, 0.1, 0.9, 0.3, 0.2, 0.4],
  crowdLevel: 5,
  priceTier: 4,
  popularitySeed: 80,
});

describe("RecommendationScorer", () => {
  it("applies the locked weighted formula and penalties", () => {
    const recommendation = scorer.score(user, place, {
      categoryVisitCount: 0,
      communityCount: 0,
      friendRatings: [],
    });

    const expected =
      0.45 * recommendation.signals.tasteMatch +
      0.25 * 0.35 +
      0.15 * 0.8 +
      0.15 -
      0.12 -
      0.16;
    expect(recommendation.score).toBeCloseTo(expected, 10);
  });

  it("prioritizes a strong friend rating in the reason", () => {
    const recommendation = scorer.score(user, place, {
      categoryVisitCount: 0,
      communityCount: 0,
      friendRatings: [{ displayName: "Maya", score: 8.7 }],
    });

    expect(recommendation.reason).toBe("Maya rated this 8.7");
  });

  it("always returns a non-empty deterministic reason", () => {
    const recommendation = scorer.score(user, place, {
      categoryVisitCount: 7,
      communityCount: 1,
      friendRatings: [],
    });

    expect(recommendation.reason.trim()).not.toBe("");
  });
});
