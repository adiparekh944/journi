import { z } from "zod";

import type { StoredRecommendation } from "./recommendationRepository.ts";
import { optionalEnvironmentValue } from "./runtime.ts";

type RatingHistoryItem = {
  name: string;
  score: number;
};

const enrichedReasonSchema = z.array(
  z.object({
    place_id: z.string().uuid(),
    reason: z
      .string()
      .min(1)
      .max(90)
      .refine((reason) => !reason.includes("!")),
  }),
);

const anthropicResponseSchema = z.object({
  content: z.array(
    z.object({
      text: z.string(),
      type: z.literal("text"),
    }),
  ),
});

const SYSTEM_PROMPT = `You write one-line recommendation reasons for a travel app.
Output a JSON array only, without a preamble or markdown fences.
Each item must be {"place_id": string, "reason": string}.
Each reason must be under 90 characters, second person, and specific.
Reference only the supplied user ratings. Never invent ratings.
Never use exclamation marks.`;

export async function enrichRecommendationReasons(
  recommendations: readonly StoredRecommendation[],
  ratingHistory: readonly RatingHistoryItem[],
): Promise<StoredRecommendation[]> {
  const enabled = optionalEnvironmentValue("ENABLE_LLM_REASONS") === "true";
  const apiKey = optionalEnvironmentValue("ANTHROPIC_API_KEY");
  if (!enabled || !apiKey || recommendations.length === 0) {
    return [...recommendations];
  }

  try {
    const topRecommendations = recommendations.slice(0, 6);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(4000),
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              ratings: ratingHistory,
              candidates: topRecommendations.map((recommendation) => ({
                place_id: recommendation.place.id,
                name: recommendation.place.name,
                deterministic_reason: recommendation.reason,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      return [...recommendations];
    }

    const payload = anthropicResponseSchema.parse(await response.json());
    const text = payload.content[0]?.text;
    if (!text) {
      return [...recommendations];
    }
    const enrichedReasons = enrichedReasonSchema.parse(JSON.parse(text));
    const reasonsByPlace = new Map(
      enrichedReasons.map((item) => [item.place_id, item.reason]),
    );
    return recommendations.map((recommendation) => ({
      ...recommendation,
      reason: reasonsByPlace.get(recommendation.place.id) ?? recommendation.reason,
    }));
  } catch {
    return [...recommendations];
  }
}
