import type { SupabaseClient } from "@supabase/supabase-js";

import {
  recommendationPlace,
  type FriendRating,
  type RecommendationPlace,
  type RecommendationUser,
} from "./domain/recommendationScoring.ts";
import { asTasteVector } from "./domain/tasteVectors.ts";

export type VisitRecord = {
  place_id: string;
  score: number;
  user_id: string;
};

export type RecommendationData = {
  acceptedFolloweeIds: string[];
  friendNames: Map<string, string>;
  hasTasteQuiz: boolean;
  hiddenPlaceIds: Set<string>;
  places: RecommendationPlace[];
  user: RecommendationUser;
  userVisits: VisitRecord[];
  visits: VisitRecord[];
  wantedPlaceIds: Set<string>;
};

export type StoredRecommendation = {
  place: RecommendationPlace;
  rank: number;
  reason: string;
  score: number;
};

type ProfileRow = {
  crowd_tolerance: number;
  price_sensitivity: number;
  taste_vector: number[];
};

type PlaceRow = {
  category: string;
  crowd_level: number;
  id: string;
  name: string;
  popularity_seed: number;
  price_tier: number;
  taste_vector: number[];
};

type FollowRow = {
  followee_id: string;
};

type FriendProfileRow = {
  display_name: string;
  id: string;
};

type WantedRow = {
  place_id: string;
};

type CachedRow = {
  place_id: string;
  rank: number;
  reason: string;
  score: number;
};

type HiddenRow = {
  place_id: string;
};

type OnboardingRow = {
  likert: Record<string, unknown>;
};

function throwQueryError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

function toPlace(row: PlaceRow): RecommendationPlace {
  return recommendationPlace({
    id: row.id,
    name: row.name,
    category: row.category,
    tasteVector: row.taste_vector,
    crowdLevel: row.crowd_level,
    priceTier: row.price_tier,
    popularitySeed: row.popularity_seed,
  });
}

export class RecommendationRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async loadData(userId: string): Promise<RecommendationData> {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const [
      profile,
      places,
      userVisits,
      wanted,
      follows,
      allVisits,
      hidden,
      onboarding,
    ] = await Promise.all([
      this.client
        .from("profiles")
        .select("taste_vector, crowd_tolerance, price_sensitivity")
        .eq("id", userId)
        .single(),
      this.client
        .from("places")
        .select(
          "id, name, category, taste_vector, crowd_level, " +
            "price_tier, popularity_seed",
        ),
      this.client
        .from("visits")
        .select("user_id, place_id, score")
        .eq("user_id", userId),
      this.client.from("want_to_go").select("place_id").eq("user_id", userId),
      this.client
        .from("follows")
        .select("followee_id")
        .eq("follower_id", userId)
        .eq("status", "accepted"),
      this.client.from("visits").select("user_id, place_id, score"),
      this.client
        .from("recommendations")
        .select("place_id")
        .eq("user_id", userId)
        .eq("dismissed", true)
        .gte("dismissed_at", sixtyDaysAgo.toISOString()),
      this.client
        .from("onboarding_responses")
        .select("likert")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    for (const result of [
      profile,
      places,
      userVisits,
      wanted,
      follows,
      allVisits,
      hidden,
      onboarding,
    ]) {
      throwQueryError(result.error);
    }
    if (!profile.data) {
      throw new Error("User profile was not found");
    }

    const followeeIds = ((follows.data ?? []) as FollowRow[]).map(
      (follow) => follow.followee_id,
    );
    return {
      user: this.toUser(profile.data as ProfileRow),
      places: ((places.data ?? []) as unknown as PlaceRow[]).map(toPlace),
      userVisits: (userVisits.data ?? []) as VisitRecord[],
      wantedPlaceIds: new Set(
        ((wanted.data ?? []) as WantedRow[]).map((row) => row.place_id),
      ),
      acceptedFolloweeIds: followeeIds,
      hiddenPlaceIds: new Set(
        ((hidden.data ?? []) as HiddenRow[]).map((row) => row.place_id),
      ),
      hasTasteQuiz:
        Object.keys((onboarding.data as OnboardingRow | null)?.likert ?? {}).length > 0,
      friendNames: await this.loadFriendNames(followeeIds),
      visits: (allVisits.data ?? []) as VisitRecord[],
    };
  }

  public async loadFreshCache(userId: string): Promise<StoredRecommendation[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await this.client
      .from("recommendations")
      .select("place_id, rank, score, reason")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .gte("generated_at", sevenDaysAgo.toISOString())
      .order("rank");
    throwQueryError(error);
    const rows = (data ?? []) as CachedRow[];
    if (rows.length === 0) {
      return [];
    }

    const { data: placeData, error: placeError } = await this.client
      .from("places")
      .select(
        "id, name, category, taste_vector, crowd_level, " +
          "price_tier, popularity_seed",
      )
      .in(
        "id",
        rows.map((row) => row.place_id),
      );
    throwQueryError(placeError);
    const placesById = new Map(
      ((placeData ?? []) as unknown as PlaceRow[]).map((row) => [row.id, toPlace(row)]),
    );
    return rows.flatMap((row) => {
      const place = placesById.get(row.place_id);
      return place
        ? [{ place, rank: row.rank, score: row.score, reason: row.reason }]
        : [];
    });
  }

  public async replaceCache(
    userId: string,
    recommendations: readonly StoredRecommendation[],
  ): Promise<void> {
    const { error: deleteError } = await this.client
      .from("recommendations")
      .delete()
      .eq("user_id", userId)
      .eq("dismissed", false);
    throwQueryError(deleteError);

    if (recommendations.length === 0) {
      return;
    }
    const generatedAt = new Date().toISOString();
    const { error: insertError } = await this.client.from("recommendations").upsert(
      recommendations.map((recommendation) => ({
        user_id: userId,
        place_id: recommendation.place.id,
        rank: recommendation.rank,
        score: recommendation.score,
        reason: recommendation.reason,
        dismissed: false,
        dismissed_at: null,
        generated_at: generatedAt,
      })),
      { onConflict: "user_id,place_id" },
    );
    throwQueryError(insertError);
  }

  public friendRatingsByPlace(data: RecommendationData): Map<string, FriendRating[]> {
    const followeeIds = new Set(data.acceptedFolloweeIds);
    const result = new Map<string, FriendRating[]>();
    for (const visit of data.visits) {
      if (!followeeIds.has(visit.user_id)) {
        continue;
      }
      const ratings = result.get(visit.place_id) ?? [];
      ratings.push({
        score: visit.score,
        displayName: data.friendNames.get(visit.user_id) ?? "A friend",
      });
      result.set(visit.place_id, ratings);
    }
    return result;
  }

  private async loadFriendNames(
    followeeIds: readonly string[],
  ): Promise<Map<string, string>> {
    if (followeeIds.length === 0) {
      return new Map();
    }
    const { data, error } = await this.client
      .from("profiles")
      .select("id, display_name")
      .in("id", [...followeeIds]);
    throwQueryError(error);
    return new Map(
      ((data ?? []) as FriendProfileRow[]).map((profile) => [
        profile.id,
        profile.display_name,
      ]),
    );
  }

  private toUser(profile: ProfileRow): RecommendationUser {
    return {
      tasteVector: asTasteVector(profile.taste_vector),
      crowdTolerance: profile.crowd_tolerance,
      priceSensitivity: profile.price_sensitivity,
    };
  }
}
