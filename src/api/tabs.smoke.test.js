/**
 * Every tab, exercised through the real client shim against the local stack.
 *
 * These assert the contract each screen depends on: not just that a query
 * succeeds, but that the fields the JSX reads are actually populated. The map
 * shipped broken because `place_latitude` was missing from the adapter while
 * every query still returned 200, so shape is what gets checked here.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { base44 } from "./base44Client";
import { supabase } from "./supabaseClient";

const DEMO_EMAIL = "demo_traveler@journi.demo";
const DEMO_PASSWORD = "journi-demo";

let stackAvailable = false;
let user = null;

beforeAll(async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (error) return;
    user = data.user;
    stackAvailable = true;
  } catch {
    stackAvailable = false;
  }
});

describe.skipIf(!process.env.VITE_SUPABASE_URL && !stackAvailable)("tab data contracts", () => {
  it("signs in the demo account", () => {
    expect(stackAvailable).toBe(true);
    expect(user?.id).toBeTruthy();
  });

  it("Search tab: places carry every field the cards read", async () => {
    const places = await base44.entities.Place.list("-created_date", 500);
    expect(places.length).toBeGreaterThanOrEqual(150);

    for (const place of places) {
      expect(place.id).toBeTruthy();
      expect(place.name).toBeTruthy();
      expect(place.category).toBeTruthy();
      expect(place.neighborhood).toBeTruthy();
      expect(place.description).toBeTruthy();
      expect(Array.isArray(place.official_photos)).toBe(true);
      expect(place.official_photos[0]).toMatch(/^https:\/\//);
      expect(typeof place.latitude).toBe("number");
      expect(typeof place.longitude).toBe("number");
      expect(typeof place.price_level).toBe("number");
    }

    // Borough labels must match the strings the filter chips compare against.
    const boroughs = new Set(places.map((place) => place.borough));
    expect([...boroughs].sort()).toEqual([
      "Brooklyn",
      "Manhattan",
      "Queens",
      "Staten Island",
      "The Bronx",
    ]);
  });

  it("Map tab: visits carry plottable coordinates", async () => {
    const visits = await base44.entities.Visit.filter(
      { user_id: user.id },
      "-score",
      500,
    );
    expect(visits.length).toBeGreaterThan(0);

    for (const visit of visits) {
      expect(typeof visit.place_latitude).toBe("number");
      expect(typeof visit.place_longitude).toBe("number");
      expect(Number.isFinite(visit.place_latitude)).toBe(true);
      expect(Number.isFinite(visit.place_longitude)).toBe(true);
      expect(visit.place_name).toBeTruthy();
      expect(visit.place_category).toBeTruthy();
      expect(visit.place_neighborhood).toBeTruthy();
      expect(["loved", "fine", "no"]).toContain(visit.sentiment_bucket);
      expect(Array.isArray(visit.photos)).toBe(true);
    }
  });

  it("Map tab: borough progress matches on label, not enum key", async () => {
    const places = await base44.entities.Place.list("-created_date", 500);
    // Part 15.1 fixes a floor per borough; the set may grow past it.
    const floors = {
      Manhattan: 60, Brooklyn: 40, Queens: 25, "The Bronx": 15, "Staten Island": 10,
    };
    for (const [borough, floor] of Object.entries(floors)) {
      const count = places.filter((place) => place.borough === borough).length;
      expect(count).toBeGreaterThanOrEqual(floor);
    }
    // Every place must land in a known borough.
    expect(
      places.filter((place) => !(place.borough in floors)),
    ).toHaveLength(0);
  });

  it("Feed tab: follows, posts, likes and comments resolve", async () => {
    const following = await base44.entities.Follow.filter(
      { follower_id: user.id, status: "accepted" },
      "-created_date",
      500,
    );
    expect(following.length).toBeGreaterThan(0);
    for (const follow of following) {
      expect(follow.following_id).toBeTruthy();
      expect(follow.id).toContain(":");
    }

    const authorIds = [user.id, ...following.map((follow) => follow.following_id)];
    const feedVisits = await base44.entities.Visit.filter(
      { user_id: authorIds },
      "-created_date",
      100,
    );
    expect(feedVisits.length).toBeGreaterThan(10);

    const target = feedVisits[0];
    const likes = await base44.entities.Like.filter({ visit_id: target.id }, "-created_date", 200);
    const comments = await base44.entities.Comment.filter(
      { visit_id: target.id },
      "created_date",
      200,
    );
    expect(Array.isArray(likes)).toBe(true);
    expect(Array.isArray(comments)).toBe(true);
    for (const comment of comments) {
      expect(typeof comment.text).toBe("string");
    }
  });

  it("Feed tab: liking and commenting round-trips through posts", async () => {
    const own = await base44.entities.Visit.filter({ user_id: user.id }, "-created_date", 1);
    const visit = own[0];

    const like = await base44.entities.Like.create({ user_id: user.id, visit_id: visit.id });
    expect(like.id).toContain(":");
    const afterLike = await base44.entities.Like.filter({ visit_id: visit.id });
    expect(afterLike.some((row) => row.user_id === user.id)).toBe(true);
    await base44.entities.Like.delete(like.id);

    const comment = await base44.entities.Comment.create({
      user_id: user.id,
      visit_id: visit.id,
      text: "Smoke test comment.",
    });
    expect(comment.text).toBe("Smoke test comment.");
    await base44.entities.Comment.delete(comment.id);
  });

  it("Profile tab: the signed-in account exposes a display name", async () => {
    const account = await base44.auth.me();
    expect(account.id).toBe(user.id);
    expect(account.full_name).toBeTruthy();
    expect(account.email).toBe(DEMO_EMAIL);

    const followers = await base44.entities.Follow.filter({
      following_id: user.id,
      status: "accepted",
    });
    expect(Array.isArray(followers)).toBe(true);
  });

  it("Want to go tab: rows resolve to real places", async () => {
    const wanted = await base44.entities.WantToGo.filter(
      { user_id: user.id },
      "-created_date",
      500,
    );
    expect(Array.isArray(wanted)).toBe(true);
    const places = await base44.entities.Place.list("-created_date", 500);
    for (const row of wanted) {
      expect(places.some((place) => place.id === row.place_id)).toBe(true);
    }
  });

  it("Place detail tab: a place resolves by id and by slug", async () => {
    const bySlug = await base44.entities.Place.get("central-park");
    expect(bySlug.name).toBe("Central Park");
    expect(bySlug.latitude).toBeCloseTo(40.7829, 3);

    const byId = await base44.entities.Place.get(bySlug.id);
    expect(byId.id).toBe(bySlug.id);

    const ratings = await base44.entities.Visit.filter({ place_id: bySlug.id }, "-score", 200);
    expect(Array.isArray(ratings)).toBe(true);
  });

  it("Log tab: a visit round-trips through the ranking RPCs", async () => {
    const places = await base44.entities.Place.list("-created_date", 500);
    const existing = await base44.entities.Visit.filter({ user_id: user.id }, "-score", 500);
    const visited = new Set(existing.map((visit) => visit.place_id));
    const target = places.find((place) => !visited.has(place.id));
    expect(target).toBeTruthy();

    // The screens speak in `loved`; the database stores `liked`.
    const created = await base44.entities.Visit.create({
      place_id: target.id,
      sentiment_bucket: "loved",
      rank_position: 0,
      note: "Smoke test visit.",
    });
    expect(created.id).toBeTruthy();
    expect(created.sentiment_bucket).toBe("loved");
    expect(Number(created.score)).toBeGreaterThanOrEqual(6.7);

    const edited = await base44.entities.Visit.update(created.id, { note: "Edited." });
    expect(edited.note).toBe("Edited.");

    await base44.entities.Visit.delete(created.id);
    const after = await base44.entities.Visit.filter({ id: created.id });
    expect(after).toEqual([]);
  });

  it("Search RPC and recommendations answer", async () => {
    const results = await base44.rpc.search("Central", 20);
    expect(results.places.length).toBeGreaterThan(0);
    expect(results.places[0].name).toBe("Central Park");

    const pins = await base44.rpc.mapPins(user.id);
    expect(Array.isArray(pins)).toBe(true);

    const recommended = await base44.rpc.recommendations();
    expect(recommended.recommendations.length).toBeGreaterThan(0);
    for (const item of recommended.recommendations) {
      expect(item.reason.trim().length).toBeGreaterThan(0);
    }
  });
});
