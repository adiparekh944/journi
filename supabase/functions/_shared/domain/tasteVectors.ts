export const TASTE_VECTOR_SIZE = 10;

export type TasteVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type SeedTapAction = "been" | "want" | "not_interested";

export type SeedTap = {
  action: SeedTapAction;
  placeVector: TasteVector;
};

export type BehaviorVisit = {
  placeVector: TasteVector;
  score: number;
};

export type OnboardingProfile = {
  crowdTolerance: number;
  priceSensitivity: number;
  tasteVector: TasteVector;
};

const TAP_WEIGHTS: Record<SeedTapAction, number> = {
  been: 0.35,
  want: 0.25,
  not_interested: -0.3,
};

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function asTasteVector(values: readonly number[]): TasteVector {
  if (values.length !== TASTE_VECTOR_SIZE) {
    throw new Error("Taste vectors must contain exactly 10 values");
  }
  const normalized = values.map((value) => clampUnit(value));
  return normalized as TasteVector;
}

function normalizedLikert(value: unknown, question: string): number {
  if (value === undefined) {
    return 0.5;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${question} must be an integer from 1 through 5`);
  }
  if (value < 1 || value > 5) {
    throw new Error(`${question} must be an integer from 1 through 5`);
  }
  return (value - 1) / 4;
}

export class TasteVectorCalculator {
  public buildOnboardingProfile(
    likert: Readonly<Record<string, unknown>>,
    seedTaps: readonly SeedTap[],
  ): OnboardingProfile {
    const initialValues = Array.from({ length: TASTE_VECTOR_SIZE }, (_, index) =>
      normalizedLikert(likert[`q${index + 1}`], `q${index + 1}`),
    );
    const tasteVector = asTasteVector(initialValues);

    for (const seedTap of seedTaps) {
      const weight = TAP_WEIGHTS[seedTap.action];
      for (let index = 0; index < TASTE_VECTOR_SIZE; index += 1) {
        const currentValue = tasteVector[index] ?? 0;
        const placeValue = seedTap.placeVector[index] ?? 0;
        tasteVector[index] = clampUnit(
          currentValue + weight * (placeValue - currentValue) * 0.5,
        );
      }
    }

    return {
      tasteVector,
      crowdTolerance: 1 - normalizedLikert(likert.q11, "q11"),
      priceSensitivity: normalizedLikert(likert.q12, "q12"),
    };
  }

  public blendBehavior(
    onboardingVector: TasteVector,
    visits: readonly BehaviorVisit[],
    wantedPlaceVectors: readonly TasteVector[],
  ): TasteVector {
    const accumulator = Array<number>(TASTE_VECTOR_SIZE).fill(0);
    let totalWeight = 0;

    for (const visit of visits) {
      const weight = visit.score - 5;
      totalWeight += Math.abs(weight);
      this.accumulate(accumulator, visit.placeVector, weight);
    }

    for (const placeVector of wantedPlaceVectors) {
      const weight = 0.75;
      totalWeight += weight;
      this.accumulate(accumulator, placeVector, weight);
    }

    if (totalWeight === 0) {
      return [...onboardingVector] as TasteVector;
    }

    const behaviorVector = asTasteVector(
      accumulator.map((value) => 0.5 + (value / totalWeight) * 0.5),
    );
    const behaviorWeight = Math.min(0.85, (visits.length / 25) * 0.85);
    return asTasteVector(
      onboardingVector.map((value, index) => {
        const behaviorValue = behaviorVector[index] ?? 0;
        return value * (1 - behaviorWeight) + behaviorValue * behaviorWeight;
      }),
    );
  }

  private accumulate(
    accumulator: number[],
    placeVector: TasteVector,
    weight: number,
  ): void {
    for (let index = 0; index < TASTE_VECTOR_SIZE; index += 1) {
      const currentValue = accumulator[index] ?? 0;
      const placeValue = placeVector[index] ?? 0;
      accumulator[index] = currentValue + weight * placeValue;
    }
  }
}
