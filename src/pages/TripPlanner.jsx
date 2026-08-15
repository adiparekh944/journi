import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import {
  ArrowLeft,
  BookmarkCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"];

const NYC_DAY_TEMPLATES = [
  {
    title: "Downtown icons",
    area: "Lower Manhattan",
    borough: "Manhattan",
    travel: "Easy walks · 10–15 min between stops",
    stops: [
      { name: "9/11 Memorial & Museum", neighborhood: "Financial District", category: "museum", avg_duration: "2 hours", best_time_to_go: "9:30 AM", description: "Start downtown before the crowds build." },
      { name: "One World Observatory", neighborhood: "Financial District", category: "viewpoint", avg_duration: "1.5 hours", best_time_to_go: "1:00 PM", description: "See the skyline from the top of One World Trade." },
      { name: "Brooklyn Bridge at sunset", neighborhood: "Civic Center", category: "landmark", avg_duration: "1.5 hours", best_time_to_go: "6:00 PM", description: "Walk toward Brooklyn for golden-hour city views." },
    ],
  },
  {
    title: "Midtown essentials",
    area: "Midtown Manhattan",
    borough: "Manhattan",
    travel: "Mostly walkable · one short subway ride",
    stops: [
      { name: "Grand Central Terminal", neighborhood: "Midtown East", category: "landmark", avg_duration: "1 hour", best_time_to_go: "9:30 AM", description: "Explore the celestial ceiling and main concourse." },
      { name: "Bryant Park & the New York Public Library", neighborhood: "Midtown", category: "park", avg_duration: "2 hours", best_time_to_go: "12:30 PM", description: "Take a relaxed Midtown lunch and architecture break." },
      { name: "Top of the Rock", neighborhood: "Rockefeller Center", category: "viewpoint", avg_duration: "1.5 hours", best_time_to_go: "6:00 PM", description: "Catch sunset with an Empire State Building view." },
    ],
  },
  {
    title: "Classic New York",
    area: "Central Park & Upper West Side",
    borough: "Manhattan",
    travel: "Walk the park · 10 min between stops",
    stops: [
      { name: "Central Park", neighborhood: "Upper West Side", category: "park", avg_duration: "2 hours", best_time_to_go: "9:00 AM", description: "Wander from Bethesda Terrace to the Bow Bridge." },
      { name: "American Museum of Natural History", neighborhood: "Upper West Side", category: "museum", avg_duration: "3 hours", best_time_to_go: "12:00 PM", description: "Pick a few favorite halls instead of rushing them all." },
      { name: "Lincoln Center", neighborhood: "Lincoln Square", category: "theater", avg_duration: "1.5 hours", best_time_to_go: "6:30 PM", description: "End with dinner nearby or an evening performance." },
    ],
  },
  {
    title: "Markets & village streets",
    area: "Chelsea & Greenwich Village",
    borough: "Manhattan",
    travel: "One scenic walking route · about 2 miles",
    stops: [
      { name: "The High Line", neighborhood: "Chelsea", category: "park", avg_duration: "1.5 hours", best_time_to_go: "9:30 AM", description: "Walk the elevated park while it is still calm." },
      { name: "Chelsea Market", neighborhood: "Chelsea", category: "market", avg_duration: "2 hours", best_time_to_go: "12:00 PM", description: "Browse the market and build your own lunch crawl." },
      { name: "Washington Square Park", neighborhood: "Greenwich Village", category: "landmark", avg_duration: "2 hours", best_time_to_go: "5:30 PM", description: "Explore the Village streets as the neighborhood livens up." },
    ],
  },
  {
    title: "A day in Brooklyn",
    area: "DUMBO & Brooklyn Heights",
    borough: "Brooklyn",
    travel: "Waterfront walks · 5–15 min between stops",
    stops: [
      { name: "DUMBO", neighborhood: "DUMBO", category: "landmark", avg_duration: "1.5 hours", best_time_to_go: "9:30 AM", description: "Get the classic Manhattan Bridge view before it gets busy." },
      { name: "Brooklyn Bridge Park", neighborhood: "Brooklyn Heights", category: "park", avg_duration: "2 hours", best_time_to_go: "12:30 PM", description: "Follow the waterfront piers and skyline overlooks." },
      { name: "Brooklyn Heights Promenade", neighborhood: "Brooklyn Heights", category: "viewpoint", avg_duration: "1.5 hours", best_time_to_go: "6:00 PM", description: "Finish with sunset over Lower Manhattan." },
    ],
  },
  {
    title: "Museum Mile",
    area: "Upper East Side",
    borough: "Manhattan",
    travel: "Walkable · build in a coffee break",
    stops: [
      { name: "The Metropolitan Museum of Art", neighborhood: "Upper East Side", category: "museum", avg_duration: "3 hours", best_time_to_go: "10:00 AM", description: "Choose two or three collections and enjoy them slowly." },
      { name: "Conservatory Garden", neighborhood: "East Harlem", category: "park", avg_duration: "1.5 hours", best_time_to_go: "2:00 PM", description: "Reset outdoors in Central Park's formal gardens." },
      { name: "Solomon R. Guggenheim Museum", neighborhood: "Upper East Side", category: "gallery", avg_duration: "2 hours", best_time_to_go: "5:00 PM", description: "See the Frank Lloyd Wright building and current exhibition." },
    ],
  },
  {
    title: "Queens culture & views",
    area: "Long Island City & Flushing",
    borough: "Queens",
    travel: "Two subway hops · allow 30 min for the transfer",
    stops: [
      { name: "MoMA PS1", neighborhood: "Long Island City", category: "gallery", avg_duration: "2 hours", best_time_to_go: "10:30 AM", description: "Start with experimental contemporary art in LIC." },
      { name: "Gantry Plaza State Park", neighborhood: "Long Island City", category: "park", avg_duration: "1.5 hours", best_time_to_go: "1:30 PM", description: "Take in one of the best Midtown skyline views." },
      { name: "Flushing food crawl", neighborhood: "Flushing", category: "market", avg_duration: "2.5 hours", best_time_to_go: "5:30 PM", description: "Sample dumplings, noodles, and desserts for dinner." },
    ],
  },
];

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function buildItinerary(savedPlaces, dayCount) {
  const saved = savedPlaces.slice(0, dayCount * TIME_SLOTS.length);
  const groupedSaved = [...saved].sort((a, b) => {
    const areaA = `${a.borough || ""}-${a.neighborhood || ""}`;
    const areaB = `${b.borough || ""}-${b.neighborhood || ""}`;
    return areaA.localeCompare(areaB);
  });
  const savedChunks = Array.from({ length: dayCount }, (_, index) =>
    groupedSaved.slice(index * TIME_SLOTS.length, (index + 1) * TIME_SLOTS.length)
  );
  const usedNames = new Set(saved.map((place) => normalize(place.name)));

  return Array.from({ length: dayCount }, (_, index) => {
    const savedForDay = savedChunks[index];
    const leadBorough = savedForDay[0]?.borough;
    const unusedTemplate = NYC_DAY_TEMPLATES.find(
      (template, templateIndex) => template.borough === leadBorough && templateIndex >= index
    );
    const template = unusedTemplate || NYC_DAY_TEMPLATES[index % NYC_DAY_TEMPLATES.length];
    const stops = savedForDay.map((place) => ({ ...place, isSaved: true }));

    const candidates = [
      ...template.stops,
      ...NYC_DAY_TEMPLATES.flatMap((day) => day.stops),
    ];

    for (const candidate of candidates) {
      if (stops.length === TIME_SLOTS.length) break;
      const key = normalize(candidate.name);
      if (!usedNames.has(key)) {
        stops.push({ ...candidate, isSaved: false });
        usedNames.add(key);
      }
    }

    const primaryArea = savedForDay[0]?.neighborhood || savedForDay[0]?.borough;
    return {
      ...template,
      title: savedForDay.length ? `${primaryArea || "Your picks"} day` : template.title,
      area: primaryArea || template.area,
      stops,
    };
  });
}

export default function TripPlanner() {
  const navigate = useNavigate();
  const { wantToGo, loading: savedLoading } = useJourni();
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [days, setDays] = useState(3);
  const [plannedDays, setPlannedDays] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.Place.list("-created_date", 500);
        setPlaces(all || []);
      } catch (error) {
        console.error("load places for trip planner failed", error);
      } finally {
        setPlacesLoading(false);
      }
    })();
  }, []);

  const savedPlaces = useMemo(
    () => wantToGo.map((item) => places.find((place) => place.id === item.place_id)).filter(Boolean),
    [wantToGo, places]
  );

  const itinerary = useMemo(
    () => (plannedDays ? buildItinerary(savedPlaces, plannedDays) : []),
    [plannedDays, savedPlaces]
  );

  const includedSavedCount = Math.min(savedPlaces.length, (plannedDays || days) * TIME_SLOTS.length);
  const isLoading = savedLoading || placesLoading;

  const makePlan = () => {
    setPlannedDays(days);
    window.setTimeout(() => document.getElementById("trip-itinerary")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="border-b-4 border-secondary bg-primary px-5 pb-8 pt-6 text-primary-foreground">
        <header className="mb-7 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="tap-highlight -ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-white/60">New York City</p>
            <h1 className="font-display text-2xl font-semibold">Plan your trip</h1>
          </div>
        </header>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="max-w-[270px] font-display text-[1.8rem] font-semibold leading-[1.08]">Turn your saved places into a day-by-day plan.</h2>
          </div>
          <span className="mb-1 shrink-0 rounded-lg border border-white/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
            Demo planner
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/70">
          <BookmarkCheck className="h-4 w-4" />
          {isLoading ? "Checking your saved places…" : `${savedPlaces.length} saved place${savedPlaces.length === 1 ? "" : "s"} ready`}
        </div>
      </div>

      <div className="-mt-3 px-5">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_-30px_rgba(20,51,42,0.7)]">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/65 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm">
              <MapPin className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Destination</p>
              <p className="text-sm font-semibold text-foreground">New York City, NY</p>
            </div>
            <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">Fixed for demo</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">How many days?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">We’ll plan 3 stops per day.</p>
            </div>
            <div className="flex items-center rounded-full border border-border bg-card p-1">
              <button
                onClick={() => setDays((value) => Math.max(1, value - 1))}
                disabled={days === 1}
                aria-label="Decrease days"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="min-w-16 text-center">
                <span className="text-lg font-bold text-foreground">{days}</span>
                <span className="ml-1 text-xs text-muted-foreground">{days === 1 ? "day" : "days"}</span>
              </div>
              <button
                onClick={() => setDays((value) => Math.min(7, value + 1))}
                disabled={days === 7}
                aria-label="Increase days"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={makePlan}
            disabled={isLoading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground active:scale-[0.99] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {plannedDays ? "Update my plan" : "Plan my trip"}
          </button>
        </section>

        {!plannedDays && (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/55 p-5 text-center">
            <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">Your itinerary will appear here</p>
            <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-muted-foreground">
              Saved places come first. We’ll add a few classic NYC picks to round out each day.
            </p>
          </div>
        )}

        {plannedDays && (
          <section id="trip-itinerary" className="mt-7">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your itinerary</p>
                <h2 className="mt-0.5 font-display text-2xl font-semibold text-foreground">{plannedDays} days in New York</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{plannedDays * 3} stops</p>
                <p className="text-[11px] text-muted-foreground">{includedSavedCount} from your list</p>
              </div>
            </div>

            {savedPlaces.length === 0 && (
              <div className="mb-4 flex items-start gap-3 rounded-xl bg-accent/35 p-3 text-accent-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-relaxed">
                  This demo plan uses curated NYC picks. Save places you love and update the plan to personalize it.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {itinerary.map((day, dayIndex) => (
                <article key={`${day.title}-${dayIndex}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_32px_-28px_rgba(20,51,42,0.65)]">
                  <div className="flex items-center gap-3 border-b border-border bg-muted/55 px-4 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                      {dayIndex + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">{day.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {day.area}
                      </p>
                    </div>
                    <div className="text-right text-[10px] leading-tight text-muted-foreground">
                      <p>Day {dayIndex + 1}</p>
                      <p>3 stops</p>
                    </div>
                  </div>

                  <div className="px-4 py-1">
                    {day.stops.map((stop, stopIndex) => (
                      <div key={`${stop.name}-${stopIndex}`} className="relative flex gap-3 py-4">
                        {stopIndex < day.stops.length - 1 && <div className="absolute left-[17px] top-10 h-[calc(100%-24px)] w-px bg-border" />}
                        <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-muted-foreground">
                          {stopIndex + 1}
                        </div>
                        <button
                          onClick={() => stop.id && navigate(`/place/${stop.id}`)}
                          disabled={!stop.id}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left disabled:cursor-default"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{TIME_SLOTS[stopIndex]}</span>
                              {stop.isSaved && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800">Saved</span>
                              )}
                            </div>
                            <p className="truncate text-sm font-semibold text-foreground">{stop.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {stop.description || `Explore this ${stop.category || "New York"} favorite in ${stop.neighborhood || stop.borough || "the city"}.`}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-medium text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> {stop.best_time_to_go || ["9:30 AM", "1:00 PM", "6:00 PM"][stopIndex]}</span>
                              <span>{stop.avg_duration || "1–2 hours"}</span>
                            </div>
                          </div>
                          {stop.id && <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 border-t border-border bg-muted/35 px-4 py-3 text-[10px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {day.travel}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
