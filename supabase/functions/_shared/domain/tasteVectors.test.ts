import { describe, expect, it } from "vitest";

import { asTasteVector, TasteVectorCalculator } from "./tasteVectors.ts";

const calculator = new TasteVectorCalculator();

describe("TasteVectorCalculator", () => {
  it("maps Likert answers and modifier traits exactly", () => {
    const likert = Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [`q${index + 1}`, (index % 5) + 1]),
    );

    const profile = calculator.buildOnboardingProfile(likert, []);

    expect(profile.tasteVector).toEqual([0, 0.25, 0.5, 0.75, 1, 0, 0.25, 0.5, 0.75, 1]);
    expect(profile.crowdTolerance).toBe(1);
    expect(profile.priceSensitivity).toBe(0.25);
  });

  it("lets positive and negative behavior move the onboarding vector", () => {
    const baseline = asTasteVector(Array<number>(10).fill(0.5));
    const culture = asTasteVector([1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const art = asTasteVector([0.1, 1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const result = calculator.blendBehavior(
      baseline,
      [
        { placeVector: culture, score: 10 },
        { placeVector: art, score: 2 },
      ],
      [],
    );

    expect(result[0]).toBeGreaterThan(0.5);
    expect(result[1]).toBeLessThan(0.5);
  });

  it("uses want-to-go as a 0.75 positive signal", () => {
    const baseline = asTasteVector(Array<number>(10).fill(0.5));
    const art = asTasteVector([0.1, 1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const result = calculator.blendBehavior(baseline, [], [art]);

    expect(result).toEqual(baseline);
  });

  it("keeps a neutral profile when the taste quiz is skipped", () => {
    const profile = calculator.buildOnboardingProfile({}, []);

    expect(profile.tasteVector).toEqual(Array<number>(10).fill(0.5));
    expect(profile.crowdTolerance).toBe(0.5);
    expect(profile.priceSensitivity).toBe(0.5);
  });
});
