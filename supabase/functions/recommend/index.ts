import { authenticateRequest } from "../_shared/auth.ts";
import {
  RecommendationScorer,
  type CategoryAnchor,
  type RecommendationSignals,
} from "../_shared/domain/recommendationScoring.ts";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from "../_shared/http.ts";
import { enrichRecommendationReasons } from "../_shared/llmReasons.ts";
import {
  type RecommendationData,
  RecommendationRepository,
  type StoredRecommendation,
} from "../_shared/recommendationRepository.ts";
import { serve } from "../_shared/runtime.ts";

const RECOMMENDATION_LIMIT = 20;

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function communityByPlace(
  visits: RecommendationData["visits"],
): Map<string, { average: number; count: number }> {
  const totals = new Map<string, { count: number; total: number }>();
  for (const visit of visits) {
    const current = totals.get(visit.place_id) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += visit.score;
    totals.set(visit.place_id, current);
  }
  return new Map(
    [...totals].map(([placeId, value]) => [
      placeId,
      { count: value.count, average: value.total / value.count },
    ]),
  );
}

function categoryInsights(data: RecommendationData): {
  anchors: Map<string, CategoryAnchor>;
  counts: Map<string, number>;
  topCategory?: string;
} {
  const placesById = new Map(data.places.map((place) => [place.id, place]));
  const anchors = new Map<string, CategoryAnchor>();
  const counts = new Map<string, number>();

  for (const visit of data.userVisits) {
    const place = placesById.get(visit.place_id);
    if (!place) {
      continue;
    }
    increment(counts, place.category);
    const currentAnchor = anchors.get(place.category);
    if (!currentAnchor || visit.score > currentAnchor.score) {
      anchors.set(place.category, { name: place.name, score: visit.score });
    }
  }
  const topCategory = [...counts].sort((first, second) => second[1] - first[1])[0]?.[0];
  return { anchors, counts, ...(topCategory ? { topCategory } : {}) };
}

class RecommendationService {
  private readonly scorer = new RecommendationScorer();

  public constructor(private readonly repository: RecommendationRepository) {}

  public async getRecommendations(userId: string): Promise<StoredRecommendation[]> {
    const cached = await this.repository.loadFreshCache(userId);
    if (cached.length > 0) {
      return cached;
    }

    const data = await this.repository.loadData(userId);
    const friendRatings = this.repository.friendRatingsByPlace(data);
    const community = communityByPlace(data.visits);
    const categories = categoryInsights(data);
    const excludedPlaceIds = new Set([
      ...data.userVisits.map((visit) => visit.place_id),
      ...data.wantedPlaceIds,
      ...data.hiddenPlaceIds,
    ]);
    if (!data.hasTasteQuiz && data.userVisits.length < 3) {
      const popular = data.places
        .filter((place) => !excludedPlaceIds.has(place.id))
        .sort((first, second) => {
          const popularity = second.popularitySeed - first.popularitySeed;
          return popularity || first.id.localeCompare(second.id);
        })
        .slice(0, RECOMMENDATION_LIMIT)
        .map((place, rank) => ({
          place,
          rank,
          score: place.popularitySeed / 100,
          reason: "Popular in NYC right now",
        }));
      await this.repository.replaceCache(userId, popular);
      return popular;
    }
    const scored = data.places
      .filter((place) => !excludedPlaceIds.has(place.id))
      .map((place) => {
        const communitySignal = community.get(place.id);
        const categoryAnchor = categories.anchors.get(place.category);
        const signals: RecommendationSignals = {
          categoryVisitCount: categories.counts.get(place.category) ?? 0,
          communityCount: communitySignal?.count ?? 0,
          friendRatings: friendRatings.get(place.id) ?? [],
          ...(communitySignal ? { communityAverage: communitySignal.average } : {}),
          ...(categoryAnchor ? { categoryAnchor } : {}),
          ...(categories.topCategory ? { topCategory: categories.topCategory } : {}),
        };
        return this.scorer.score(data.user, place, signals);
      })
      .sort((first, second) => {
        const scoreDifference = second.score - first.score;
        return scoreDifference || first.place.id.localeCompare(second.place.id);
      })
      .slice(0, RECOMMENDATION_LIMIT)
      .map((recommendation, rank) => ({
        place: recommendation.place,
        rank,
        score: recommendation.score,
        reason: recommendation.reason,
      }));
    const placeById = new Map(data.places.map((place) => [place.id, place]));
    const ratingHistory = data.userVisits.flatMap((visit) => {
      const place = placeById.get(visit.place_id);
      return place ? [{ name: place.name, score: visit.score }] : [];
    });
    const enriched = await enrichRecommendationReasons(scored, ratingHistory);
    await this.repository.replaceCache(userId, enriched);
    return enriched;
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse(request);
  }
  if (request.method !== "POST") {
    return methodNotAllowed(request);
  }

  try {
    const { adminClient, user } = await authenticateRequest(request);
    const repository = new RecommendationRepository(adminClient);
    const recommendations = await new RecommendationService(
      repository,
    ).getRecommendations(user.id);
    return jsonResponse(request, { recommendations });
  } catch (error) {
    return errorResponse(request, error);
  }
});
