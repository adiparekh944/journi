import { asTasteVector, type TasteVector } from "./tasteVectors.ts";

export const DIMENSION_LABELS = [
  "historic",
  "art and museum",
  "outdoor",
  "food",
  "nightlife",
  "market and shopping",
  "skyline and architecture",
  "active",
  "off-the-beaten-path",
  "easygoing",
] as const;

export type RecommendationUser = {
  crowdTolerance: number;
  priceSensitivity: number;
  tasteVector: TasteVector;
};

export type RecommendationPlace = {
  category: string;
  crowdLevel: number;
  id: string;
  name: string;
  popularitySeed: number;
  priceTier: number;
  tasteVector: TasteVector;
};

export type FriendRating = {
  displayName: string;
  score: number;
};

export type CategoryAnchor = {
  name: string;
  score: number;
};

export type RecommendationSignals = {
  categoryAnchor?: CategoryAnchor;
  categoryVisitCount: number;
  communityAverage?: number;
  communityCount: number;
  friendRatings: readonly FriendRating[];
  topCategory?: string;
};

export type ScoredRecommendation = {
  place: RecommendationPlace;
  reason: string;
  score: number;
  signals: {
    crowdPenalty: number;
    diversityBonus: number;
    friendSignal: number;
    pricePenalty: number;
    qualitySignal: number;
    tasteMatch: number;
  };
};

export function cosineSimilarity(first: TasteVector, second: TasteVector): number {
  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let index = 0; index < first.length; index += 1) {
    const firstValue = first[index] ?? 0;
    const secondValue = second[index] ?? 0;
    dotProduct += firstValue * secondValue;
    firstMagnitude += firstValue ** 2;
    secondMagnitude += secondValue ** 2;
  }
  if (firstMagnitude === 0 || secondMagnitude === 0) {
    return 0;
  }
  return dotProduct / Math.sqrt(firstMagnitude * secondMagnitude);
}

function strongestSharedDimension(
  userVector: TasteVector,
  placeVector: TasteVector,
): number | undefined {
  let strongestIndex: number | undefined;
  let strongestValue = 0.65;

  for (let index = 0; index < userVector.length; index += 1) {
    const userValue = userVector[index] ?? 0;
    const placeValue = placeVector[index] ?? 0;
    const sharedStrength = Math.min(userValue, placeValue);
    if (sharedStrength > strongestValue) {
      strongestIndex = index;
      strongestValue = sharedStrength;
    }
  }
  return strongestIndex;
}

function diversityBonus(categoryVisitCount: number): number {
  if (categoryVisitCount < 2) {
    return 1;
  }
  return categoryVisitCount < 5 ? 0.5 : 0;
}

function deterministicReason(
  user: RecommendationUser,
  place: RecommendationPlace,
  signals: RecommendationSignals,
): string {
  const strongFriendRatings = signals.friendRatings.filter(
    (rating) => rating.score >= 7.5,
  );
  const [friendRating] = strongFriendRatings;
  if (strongFriendRatings.length === 1 && friendRating) {
    return `${friendRating.displayName} rated this ${friendRating.score.toFixed(1)}`;
  }
  if (strongFriendRatings.length > 1) {
    return `${strongFriendRatings.length} friends have been here`;
  }

  const dimensionIndex = strongestSharedDimension(user.tasteVector, place.tasteVector);
  if (dimensionIndex !== undefined) {
    const label = DIMENSION_LABELS[dimensionIndex];
    return `You keep rating ${label} spots highly`;
  }
  if (signals.categoryAnchor) {
    const { name, score } = signals.categoryAnchor;
    return `Because you gave ${name} a ${score.toFixed(1)}`;
  }
  if (signals.categoryVisitCount < 2 && signals.topCategory) {
    return `Something different from your usual ${signals.topCategory} picks`;
  }
  return "Popular with travelers who share your taste";
}

export class RecommendationScorer {
  public score(
    user: RecommendationUser,
    place: RecommendationPlace,
    context: RecommendationSignals,
  ): ScoredRecommendation {
    // SPEC-GAP: Part 8.2 describes rescaling cosine from [-1,1] to [0,1] but
    // then notes it "lands in [0,1] already" because every taste value is
    // non-negative, which asTasteVector guarantees. Clamping honours both
    // statements; applying (c + 1) / 2 instead would compress every result into
    // [0.5, 1.0] and halve the range of the 0.45-weighted taste term.
    const rawCosine = cosineSimilarity(user.tasteVector, place.tasteVector);
    const tasteMatch = Math.min(1, Math.max(0, rawCosine));
    const friendSignal = context.friendRatings.length
      ? context.friendRatings.reduce((sum, rating) => sum + rating.score / 10, 0) /
        context.friendRatings.length
      : 0.35;
    const qualitySignal =
      context.communityCount >= 3 && context.communityAverage !== undefined
        ? context.communityAverage / 10
        : place.popularitySeed / 100;
    const categoryDiversity = diversityBonus(context.categoryVisitCount);
    const crowdPenalty = ((1 - user.crowdTolerance) * (place.crowdLevel - 1) * 0.2) / 4;
    const pricePenalty = (user.priceSensitivity * place.priceTier * 0.2) / 4;
    const score =
      0.45 * tasteMatch +
      0.25 * friendSignal +
      0.15 * qualitySignal +
      0.15 * categoryDiversity -
      crowdPenalty -
      pricePenalty;

    return {
      place,
      score,
      reason: deterministicReason(user, place, context),
      signals: {
        tasteMatch,
        friendSignal,
        qualitySignal,
        diversityBonus: categoryDiversity,
        crowdPenalty,
        pricePenalty,
      },
    };
  }
}

export function recommendationPlace(
  value: Omit<RecommendationPlace, "tasteVector"> & {
    tasteVector: readonly number[];
  },
): RecommendationPlace {
  return {
    ...value,
    tasteVector: asTasteVector(value.tasteVector),
  };
}
