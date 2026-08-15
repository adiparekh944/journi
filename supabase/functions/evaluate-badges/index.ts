import type { SupabaseClient } from "@supabase/supabase-js";

import { authenticateRequest } from "../_shared/auth.ts";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from "../_shared/http.ts";
import { serve } from "../_shared/runtime.ts";

type BadgeRow = {
  badge_key: string;
};

class BadgeEvaluationService {
  public constructor(private readonly client: SupabaseClient) {}

  public async evaluate(userId: string): Promise<string[]> {
    const { error: evaluationError } = await this.client.rpc(
      "evaluate_badges_for_user",
      { p_user: userId },
    );
    if (evaluationError) {
      throw new Error(evaluationError.message);
    }

    const { data, error } = await this.client
      .from("user_badges")
      .select("badge_key")
      .eq("user_id", userId)
      .eq("seen", false)
      .order("earned_at");
    if (error) {
      throw new Error(error.message);
    }
    return (data as BadgeRow[]).map((badge) => badge.badge_key);
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
    const service = new BadgeEvaluationService(adminClient);
    const badgeKeys = await service.evaluate(user.id);
    return jsonResponse(request, { new_badge_keys: badgeKeys });
  } catch (error) {
    return errorResponse(request, error);
  }
});
