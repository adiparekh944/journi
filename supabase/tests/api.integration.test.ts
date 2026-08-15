import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../../src/lib/database.types";

const LOCAL_URL = "http://127.0.0.1:54321";
const EDGE_ENV_PATH = resolve(
  "supabase/.temp/start-secrets/",
  "supabase_edge_runtime_journi/env/docker.env",
);
const localRuntimeAvailable = existsSync(EDGE_ENV_PATH);

type LocalSecrets = {
  anonKey: string;
  serviceRoleKey: string;
};

type PlaceRow = {
  id: string;
  slug: string;
};

type VisitRow = {
  id: string;
  note: string | null;
  place_id: string;
  score: number;
};

type PostRow = {
  comment_count: number;
  id: string;
  like_count: number;
};

type FunctionResponse<T> = {
  data: T | null;
  error: { context?: Response; message: string } | null;
};

type LocalClient = SupabaseClient<Database>;

function localSecrets(): LocalSecrets {
  const variables = new Map<string, string>();
  const lines = readFileSync(EDGE_ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const separator = line.indexOf("=");
    if (separator < 1) {
      continue;
    }
    const name = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^"|"$/g, "");
    variables.set(name, value);
  }
  const anonKey = variables.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = variables.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!anonKey || !serviceRoleKey) {
    throw new Error("Local Supabase credentials were not generated");
  }
  return { anonKey, serviceRoleKey };
}

async function createConfirmedUser(
  adminClient: LocalClient,
  label: string,
): Promise<{ email: string; password: string; user: User }> {
  const email = `${label}-${randomUUID()}@journi.local`;
  const password = `Journi-${randomUUID()}-9a`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${label} traveler` },
  });
  if (error) {
    throw new Error(error.message);
  }
  return { email, password, user: data.user };
}

async function authenticatedClient(
  anonKey: string,
  email: string,
  password: string,
  storageKey: string,
): Promise<LocalClient> {
  const client = createClient<Database>(LOCAL_URL, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey,
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
  return client;
}

async function expectSuccess<T>(result: FunctionResponse<T>): Promise<T> {
  if (result.error) {
    const detail = result.error.context
      ? await result.error.context.clone().text()
      : result.error.message;
    throw new Error(detail);
  }
  expect(result.data).not.toBeNull();
  return result.data as T;
}

describe.skipIf(!localRuntimeAvailable)("Journi local backend API contract", () => {
  let adminClient: LocalClient;
  let primaryClient: LocalClient;
  let friendClient: LocalClient;
  let primaryUser: User;
  let friendUser: User;
  let primaryPlace: PlaceRow;
  let secondaryPlace: PlaceRow;
  let visit: VisitRow;
  let post: PostRow;

  beforeAll(async () => {
    const secrets = localSecrets();
    adminClient = createClient<Database>(LOCAL_URL, secrets.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: "journi-api-admin",
      },
    });
    const primary = await createConfirmedUser(adminClient, "Primary");
    const friend = await createConfirmedUser(adminClient, "Friend");
    primaryUser = primary.user;
    friendUser = friend.user;
    primaryClient = await authenticatedClient(
      secrets.anonKey,
      primary.email,
      primary.password,
      "journi-api-primary",
    );
    friendClient = await authenticatedClient(
      secrets.anonKey,
      friend.email,
      friend.password,
      "journi-api-friend",
    );

    const { data, error } = await primaryClient
      .from("places")
      .select("id, slug")
      .in("slug", ["central-park", "bryant-park"])
      .order("slug");
    if (error) {
      throw new Error(error.message);
    }
    const places = data as PlaceRow[];
    const firstPlace = places[0];
    const secondPlace = places[1];
    if (!firstPlace || !secondPlace) {
      throw new Error("API test places were not found");
    }
    secondaryPlace = firstPlace;
    primaryPlace = secondPlace;
  });

  afterAll(async () => {
    await adminClient.auth.admin.deleteUser(primaryUser.id);
    await adminClient.auth.admin.deleteUser(friendUser.id);
  });

  it("denies anonymous table access and protects every Edge Function", async () => {
    const secrets = localSecrets();
    const anonymousClient = createClient<Database>(LOCAL_URL, secrets.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: "journi-api-anonymous",
      },
    });
    const placeResult = await anonymousClient.from("places").select("id").limit(1);
    expect(placeResult.error).not.toBeNull();

    for (const functionName of [
      "recommend",
      "taste-vector-refresh",
      "evaluate-badges",
      "delete-visit",
    ]) {
      const endpoint = `${LOCAL_URL}/functions/v1/${functionName}`;
      const unauthorized = await fetch(endpoint, { method: "POST" });
      expect(unauthorized.status).toBe(401);

      const options = await fetch(endpoint, {
        method: "OPTIONS",
        headers: { origin: "http://localhost:5173" },
      });
      expect(options.status).toBe(204);
      expect(
        ["*", "http://localhost:5173"].includes(
          options.headers.get("access-control-allow-origin") ?? "",
        ),
      ).toBe(true);
    }

    const publicPlace = await anonymousClient.rpc("public_place", {
      p_slug: primaryPlace.slug,
    });
    expect(publicPlace.error).toBeNull();
    expect(publicPlace.data).not.toBeNull();
  });

  it("creates profiles through Auth and restricts profile visibility", async () => {
    const ownProfile = await primaryClient
      .from("profiles")
      .select("id, display_name, username")
      .eq("id", primaryUser.id)
      .single();
    expect(ownProfile.error).toBeNull();
    expect(ownProfile.data?.id).toBe(primaryUser.id);

    const privacyUpdate = await friendClient
      .from("profiles")
      .update({ is_private: true })
      .eq("id", friendUser.id);
    expect(privacyUpdate.error).toBeNull();
    const hiddenProfile = await primaryClient
      .from("profiles")
      .select("id")
      .eq("id", friendUser.id);
    expect(hiddenProfile.data).toEqual([]);

    const publicSummary = await createClient<Database>(
      LOCAL_URL,
      localSecrets().anonKey,
    ).rpc("profile_summary", {
      p_username: ownProfile.data?.username ?? "",
    });
    expect(publicSummary.error).toBeNull();
    expect(publicSummary.data).not.toBeNull();
  });

  it("runs onboarding and the taste-vector Edge Function", async () => {
    const likert = Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [`q${index + 1}`, (index % 5) + 1]),
    );
    const onboarding = await primaryClient.from("onboarding_responses").insert({
      user_id: primaryUser.id,
      likert,
      seed_taps: { [primaryPlace.id]: "been" },
    });
    expect(onboarding.error).toBeNull();

    const refreshResult = (await primaryClient.functions.invoke(
      "taste-vector-refresh",
      { body: {} },
    )) as FunctionResponse<{ taste_vector: number[] }>;
    const refreshed = await expectSuccess(refreshResult);
    expect(refreshed.taste_vector).toHaveLength(10);
    expect(refreshed.taste_vector.every((value) => value >= 0 && value <= 1)).toBe(
      true,
    );
  });

  it("serves search and generates 20 reasoned recommendations", async () => {
    const searchResult = await primaryClient.rpc("search_all", {
      p_query: "Central",
      p_limit: 20,
    });
    expect(searchResult.error).toBeNull();
    expect(searchResult.data).not.toBeNull();

    const recommendResult = (await primaryClient.functions.invoke("recommend", {
      body: {},
    })) as FunctionResponse<{
      recommendations: { place: { id: string }; reason: string }[];
    }>;
    const recommendations = (await expectSuccess(recommendResult)).recommendations;
    expect(recommendations).toHaveLength(20);
    expect(recommendations.every((item) => item.reason.trim().length > 0)).toBe(true);

    const placeId = recommendResult.data?.recommendations[0]?.place.id;
    expect(placeId).toBeTruthy();
    const dismissal = await primaryClient.rpc("set_recommendation_dismissal", {
      p_place_id: placeId ?? "",
      p_dismissed: true,
    });
    expect(dismissal.error).toBeNull();
    const reset = await primaryClient.rpc("reset_hidden_recommendations");
    expect(reset.error).toBeNull();
  });

  it("logs a visit and serves map and feed RPCs", async () => {
    const logResult = await primaryClient.rpc("log_visit", {
      p_place_id: primaryPlace.id,
      p_bucket: "liked",
      p_position: 0,
      p_payload: { visited_on: "2026-08-15", was_paid: false },
    });
    visit = await expectSuccess(logResult as FunctionResponse<VisitRow>);

    const editResult = await primaryClient.rpc("edit_visit_details", {
      p_visit_id: visit.id,
      p_payload: {
        note: "Edited through the verified API.",
        visited_on: "2026-08-15",
        was_paid: false,
      },
    });
    expect(editResult.error).toBeNull();
    expect(editResult.data?.score).toBe(visit.score);

    const streakResult = await primaryClient.rpc("current_streak", {
      p_user: primaryUser.id,
    });
    expect(streakResult.error).toBeNull();
    expect(streakResult.data).toBe(1);

    const mapResult = await primaryClient.rpc("map_pins", {
      p_user: primaryUser.id,
    });
    expect(mapResult.error).toBeNull();
    expect(mapResult.data).toHaveLength(1);

    const feedResult = await primaryClient.rpc("feed_page", {
      p_user: primaryUser.id,
      p_before: new Date(Date.now() + 60_000).toISOString(),
      p_limit: 20,
    });
    expect(feedResult.error).toBeNull();
    expect(feedResult.data).toHaveLength(1);

    const postResult = await primaryClient
      .from("posts")
      .select("id, like_count, comment_count")
      .eq("visit_id", visit.id)
      .single();
    post = await expectSuccess(postResult as FunctionResponse<PostRow>);
  });

  it("invalidates recommendations and evaluates badges", async () => {
    const cached = await primaryClient
      .from("recommendations")
      .select("id", { count: "exact", head: true });
    expect(cached.count).toBe(0);

    const badgeResult = (await primaryClient.functions.invoke("evaluate-badges", {
      body: {},
    })) as FunctionResponse<{ new_badge_keys: string[] }>;
    const badgeKeys = (await expectSuccess(badgeResult)).new_badge_keys;
    expect(badgeKeys).toContain("first_log");
  });

  it("uploads visit media and maintains social counters", async () => {
    const storagePath = `${primaryUser.id}/${visit.id}/api-test.webp`;
    const upload = await primaryClient.storage
      .from("visit-photos")
      .upload(storagePath, new Blob(["journi-image"]), {
        contentType: "image/webp",
      });
    expect(upload.error).toBeNull();

    const photoInsert = await primaryClient.from("visit_photos").insert({
      visit_id: visit.id,
      user_id: primaryUser.id,
      place_id: visit.place_id,
      storage_path: storagePath,
      width: 400,
      height: 300,
      sort_order: 0,
    });
    expect(photoInsert.error).toBeNull();

    const likeInsert = await primaryClient.from("post_likes").insert({
      post_id: post.id,
      user_id: primaryUser.id,
    });
    expect(likeInsert.error).toBeNull();
    const commentInsert = await primaryClient.from("comments").insert({
      post_id: post.id,
      user_id: primaryUser.id,
      body: "A verified API comment.",
    });
    expect(commentInsert.error).toBeNull();

    const updatedPost = await primaryClient
      .from("posts")
      .select("like_count, comment_count")
      .eq("id", post.id)
      .single();
    expect(updatedPost.data).toMatchObject({ like_count: 1, comment_count: 1 });

    const removal = await primaryClient.storage
      .from("visit-photos")
      .remove([storagePath]);
    expect(removal.error).toBeNull();
  });

  it("enforces private follow requests and accepted transitions", async () => {
    const followInsert = await primaryClient
      .from("follows")
      .insert({ follower_id: primaryUser.id, followee_id: friendUser.id })
      .select("status")
      .single();
    expect(followInsert.data?.status).toBe("pending");

    const acceptance = await friendClient
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_id", primaryUser.id)
      .eq("followee_id", friendUser.id)
      .select("status")
      .single();
    expect(acceptance.data?.status).toBe("accepted");
  });

  // ---------------------------------------------------------------------
  // Specification Part 17.2 requires these four explicitly.
  // ---------------------------------------------------------------------

  it("keeps rank positions unique when log_visit runs concurrently", async () => {
    const { data, error } = await primaryClient
      .from("places")
      .select("id, slug")
      .not("slug", "in", `(${primaryPlace.slug},${secondaryPlace.slug})`)
      .limit(5);
    expect(error).toBeNull();
    const places = (data ?? []) as PlaceRow[];
    expect(places).toHaveLength(5);

    // Every call asks for position 0 at the same moment. The advisory lock in
    // log_visit must serialize them rather than collide on visits_user_bucket_rank.
    const results = await Promise.all(
      places.map((place) =>
        primaryClient.rpc("log_visit", {
          p_place_id: place.id,
          p_bucket: "disliked",
          p_position: 0,
          p_payload: { was_paid: false },
        }),
      ),
    );
    for (const result of results) {
      expect(result.error).toBeNull();
    }

    const stored = await primaryClient
      .from("visits")
      .select("rank_position, score")
      .eq("user_id", primaryUser.id)
      .eq("bucket", "disliked")
      .order("rank_position");
    expect(stored.error).toBeNull();
    const rows = stored.data ?? [];
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.rank_position)).toEqual([0, 1, 2, 3, 4]);
    // Disliked band runs 0.0 to 3.3, best first.
    expect(rows.map((row) => Number(row.score))).toEqual([3.3, 2.5, 1.7, 0.8, 0.0]);

    // Collect the ids up front: every delete reshuffles rank_position, so
    // looking them up by position mid-loop would miss.
    const created = await primaryClient
      .from("visits")
      .select("id")
      .eq("user_id", primaryUser.id)
      .eq("bucket", "disliked");
    for (const row of (created.data ?? []) as { id: string }[]) {
      const removed = await primaryClient.rpc("delete_visit_and_rescore", {
        p_visit_id: row.id,
      });
      expect(removed.error).toBeNull();
    }
  });

  it("rejects the seventh photo on a visit", async () => {
    // An earlier test left one photo row on this visit.
    await primaryClient.from("visit_photos").delete().eq("visit_id", visit.id);

    const paths = Array.from(
      { length: 7 },
      (_, index) => `${primaryUser.id}/${visit.id}/limit-${index}.webp`,
    );
    for (let index = 0; index < 6; index += 1) {
      const inserted = await primaryClient.from("visit_photos").insert({
        visit_id: visit.id,
        user_id: primaryUser.id,
        place_id: visit.place_id,
        storage_path: paths[index] as string,
        width: 100,
        height: 100,
        sort_order: index,
      });
      expect(inserted.error).toBeNull();
    }

    const seventh = await primaryClient.from("visit_photos").insert({
      visit_id: visit.id,
      user_id: primaryUser.id,
      place_id: visit.place_id,
      storage_path: paths[6] as string,
      width: 100,
      height: 100,
      sort_order: 5,
    });
    expect(seventh.error).not.toBeNull();
    expect(seventh.error?.message).toContain("Maximum 6 photos per visit");

    await primaryClient.from("visit_photos").delete().eq("visit_id", visit.id);
  });

  it("rejects a paid visit that carries no value rating", async () => {
    const rejected = await primaryClient.rpc("edit_visit_details", {
      p_visit_id: visit.id,
      p_payload: { was_paid: true, amount_paid_usd: 24, value_rating: null },
    });
    expect(rejected.error).not.toBeNull();
    expect(rejected.error?.message).toContain("value_required_when_paid");

    // The same edit succeeds once the rating the constraint demands is present.
    const accepted = await primaryClient.rpc("edit_visit_details", {
      p_visit_id: visit.id,
      p_payload: { was_paid: true, amount_paid_usd: 24, value_rating: 4 },
    });
    expect(accepted.error).toBeNull();
  });

  it("hides a private user's visits from someone who does not follow them", async () => {
    // friendClient set is_private earlier in this suite.
    const friendVisit = await friendClient.rpc("log_visit", {
      p_place_id: secondaryPlace.id,
      p_bucket: "liked",
      p_position: 0,
      p_payload: { note: "Private visit", was_paid: false },
    });
    expect(friendVisit.error).toBeNull();

    // An accepted follow was created earlier, and it legitimately grants
    // visibility. Drop it so this asserts the no-relationship case.
    const unfollowed = await primaryClient
      .from("follows")
      .delete()
      .eq("follower_id", primaryUser.id)
      .eq("followee_id", friendUser.id);
    expect(unfollowed.error).toBeNull();

    const leaked = await primaryClient
      .from("visits")
      .select("id, note")
      .eq("user_id", friendUser.id);
    expect(leaked.error).toBeNull();
    expect(leaked.data).toEqual([]);

    // The owner still sees it.
    const own = await friendClient
      .from("visits")
      .select("id")
      .eq("user_id", friendUser.id);
    expect(own.data).toHaveLength(1);

    // Re-following restores visibility, confirming the rule is the follow edge
    // and not some incidental filter.
    await primaryClient
      .from("follows")
      .insert({ follower_id: primaryUser.id, followee_id: friendUser.id });
    await friendClient
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_id", primaryUser.id)
      .eq("followee_id", friendUser.id);
    const visible = await primaryClient
      .from("visits")
      .select("id")
      .eq("user_id", friendUser.id);
    expect(visible.data).toHaveLength(1);
  });

  it("does not leave a score-derived badge behind after log_visit", async () => {
    // A first liked place scores 10.0, so perfect_ten must be awarded by the
    // same transaction rather than waiting for the evaluate-badges function.
    const badges = await primaryClient
      .from("user_badges")
      .select("badge_key")
      .eq("user_id", primaryUser.id);
    expect(badges.error).toBeNull();
    const keys = (badges.data ?? []).map((row) => row.badge_key);
    expect(keys).toContain("first_log");
    expect(keys).toContain("perfect_ten");
  });

  it("partially edits a visit without erasing the fields it omits", async () => {
    const seeded = await primaryClient.rpc("edit_visit_details", {
      p_visit_id: visit.id,
      p_payload: {
        note: "Full detail",
        was_paid: true,
        amount_paid_usd: 30,
        value_rating: 5,
        crowd_experienced: 3,
        time_spent_minutes: 90,
        companion: "solo",
        would_return: true,
      },
    });
    expect(seeded.error).toBeNull();

    // Sending only a note must not null the payment or context columns.
    const edited = await primaryClient.rpc("edit_visit_details", {
      p_visit_id: visit.id,
      p_payload: { note: "Just the note" },
    });
    expect(edited.error).toBeNull();
    expect(edited.data).toMatchObject({
      note: "Just the note",
      was_paid: true,
      value_rating: 5,
      crowd_experienced: 3,
      time_spent_minutes: 90,
      companion: "solo",
      would_return: true,
    });
  });

  it("clears want-to-go and deletes ranked visits through RPCs", async () => {
    const wantedInsert = await primaryClient.from("want_to_go").insert({
      user_id: primaryUser.id,
      place_id: secondaryPlace.id,
      source: "manual",
    });
    expect(wantedInsert.error).toBeNull();

    const secondVisit = await primaryClient.rpc("log_visit", {
      p_place_id: secondaryPlace.id,
      p_bucket: "fine",
      p_position: 0,
      p_payload: { visited_on: "2026-08-15", was_paid: false },
    });
    expect(secondVisit.error).toBeNull();
    const wantedAfterVisit = await primaryClient
      .from("want_to_go")
      .select("id")
      .eq("place_id", secondaryPlace.id);
    expect(wantedAfterVisit.data).toEqual([]);

    const deleteResult = (await primaryClient.functions.invoke("delete-visit", {
      body: { visit_id: visit.id },
    })) as FunctionResponse<{ deleted: boolean }>;
    expect((await expectSuccess(deleteResult)).deleted).toBe(true);
    const deletedVisit = await primaryClient
      .from("visits")
      .select("id")
      .eq("id", visit.id);
    expect(deletedVisit.data).toEqual([]);
  });
});
