import type { SupabaseClient } from "@supabase/supabase-js";

import { authenticateRequest } from "../_shared/auth.ts";
import {
  asTasteVector,
  type BehaviorVisit,
  type SeedTap,
  type SeedTapAction,
  TasteVectorCalculator,
  type TasteVector,
} from "../_shared/domain/tasteVectors.ts";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from "../_shared/http.ts";
import { serve } from "../_shared/runtime.ts";

type OnboardingRow = {
  likert: Record<string, unknown>;
  seed_taps: Record<string, unknown>;
};

type PlaceVectorRow = {
  id: string;
  taste_vector: number[];
};

type VisitRow = {
  place_id: string;
  score: number;
};

type WantedRow = {
  place_id: string;
};

function queryError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

function seedTapAction(value: unknown): SeedTapAction {
  if (value === "been" || value === "want" || value === "not_interested") {
    return value;
  }
  throw new Error("Onboarding seed taps contain an unsupported action");
}

async function loadOnboarding(
  client: SupabaseClient,
  userId: string,
): Promise<OnboardingRow> {
  const { data, error } = await client
    .from("onboarding_responses")
    .select("likert, seed_taps")
    .eq("user_id", userId)
    .single();
  queryError(error);
  if (!data) {
    throw new Error("Complete onboarding before refreshing your taste profile");
  }
  return data as OnboardingRow;
}

async function loadPlaceVectors(
  client: SupabaseClient,
  placeIds: readonly string[],
): Promise<Map<string, TasteVector>> {
  if (placeIds.length === 0) {
    return new Map();
  }
  const { data, error } = await client
    .from("places")
    .select("id, taste_vector")
    .in("id", [...new Set(placeIds)]);
  queryError(error);
  return new Map(
    ((data ?? []) as PlaceVectorRow[]).map((place) => [
      place.id,
      asTasteVector(place.taste_vector),
    ]),
  );
}

async function loadBehavior(
  client: SupabaseClient,
  userId: string,
): Promise<{ visits: VisitRow[]; wanted: WantedRow[] }> {
  const [visitResult, wantedResult] = await Promise.all([
    client.from("visits").select("place_id, score").eq("user_id", userId),
    client.from("want_to_go").select("place_id").eq("user_id", userId),
  ]);
  queryError(visitResult.error);
  queryError(wantedResult.error);
  return {
    visits: (visitResult.data ?? []) as VisitRow[],
    wanted: (wantedResult.data ?? []) as WantedRow[],
  };
}

class TasteVectorRefreshService {
  private readonly calculator = new TasteVectorCalculator();

  public constructor(private readonly client: SupabaseClient) {}

  public async refresh(userId: string): Promise<TasteVector> {
    const onboarding = await loadOnboarding(this.client, userId);
    const behavior = await loadBehavior(this.client, userId);
    const tappedIds = Object.keys(onboarding.seed_taps);
    const behaviorIds = [
      ...behavior.visits.map((visit) => visit.place_id),
      ...behavior.wanted.map((wanted) => wanted.place_id),
    ];
    const vectors = await loadPlaceVectors(this.client, [...tappedIds, ...behaviorIds]);
    const seedTaps = this.seedTaps(onboarding.seed_taps, vectors);
    const onboardingProfile = this.calculator.buildOnboardingProfile(
      onboarding.likert,
      seedTaps,
    );
    const visits = this.behaviorVisits(behavior.visits, vectors);
    const wantedVectors = behavior.wanted.map((wanted) => {
      const vector = vectors.get(wanted.place_id);
      if (!vector) {
        throw new Error(`Missing place vector for ${wanted.place_id}`);
      }
      return vector;
    });
    const finalVector = this.calculator.blendBehavior(
      onboardingProfile.tasteVector,
      visits,
      wantedVectors,
    );
    const { error } = await this.client
      .from("profiles")
      .update({
        taste_vector: finalVector,
        crowd_tolerance: onboardingProfile.crowdTolerance,
        price_sensitivity: onboardingProfile.priceSensitivity,
      })
      .eq("id", userId);
    queryError(error);
    return finalVector;
  }

  private behaviorVisits(
    rows: readonly VisitRow[],
    vectors: ReadonlyMap<string, TasteVector>,
  ): BehaviorVisit[] {
    return rows.map((row) => {
      const placeVector = vectors.get(row.place_id);
      if (!placeVector) {
        throw new Error(`Missing place vector for ${row.place_id}`);
      }
      return { placeVector, score: row.score };
    });
  }

  private seedTaps(
    taps: Readonly<Record<string, unknown>>,
    vectors: ReadonlyMap<string, TasteVector>,
  ): SeedTap[] {
    return Object.entries(taps).map(([placeId, action]) => {
      const placeVector = vectors.get(placeId);
      if (!placeVector) {
        throw new Error(`Missing tapped place vector for ${placeId}`);
      }
      return { placeVector, action: seedTapAction(action) };
    });
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
    const service = new TasteVectorRefreshService(adminClient);
    const tasteVector = await service.refresh(user.id);
    return jsonResponse(request, { taste_vector: tasteVector });
  } catch (error) {
    return errorResponse(request, error);
  }
});
