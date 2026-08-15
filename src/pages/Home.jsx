import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import SearchBar from "@/components/SearchBar";
import PlaceCard from "@/components/PlaceCard";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import ActionChips from "@/components/ActionChips";
import { Sparkles, X, MapPin } from "lucide-react";

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { visits, wantToGo, toggleWantToGo } = useJourni();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [borough, setBorough] = useState("all");
  const [tab, setTab] = useState("places");

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.Place.list("-created_date", 500);
        setPlaces(all || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = places;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.neighborhood?.toLowerCase().includes(q));
    }
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (borough !== "all") list = list.filter((p) => p.borough === borough);
    return list;
  }, [places, query, category, borough]);

  const visitedIds = new Set(visits.map((v) => v.place_id));
  const wtgIds = new Set(wantToGo.map((w) => w.place_id));

  const suggestions = useMemo(() => {
    const unseen = places.filter((p) => !visitedIds.has(p.id) && !wtgIds.has(p.id) && p.category !== "restaurant" && p.category !== "bar");
    const seenCats = new Set(visits.map((v) => v.place_category));
    const novel = unseen.filter((p) => !seenCats.has(p.category));
    const pool = novel.length >= 3 ? novel : unseen;
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  }, [places, visitedIds, wtgIds, visits]);

  return (
    <div className="px-5 pt-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Explore New York</p>
          <h1 className="font-display text-[2.35rem] font-semibold leading-none tracking-tight text-foreground">Discover</h1>
        </div>
        <button onClick={() => navigate("/")} aria-label="Close search" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-4 flex gap-6 border-b border-border">
        {[
          { key: "places", label: "Places" },
          { key: "members", label: "Members" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative pb-2.5 text-sm font-semibold ${tab === t.key ? "text-primary" : "text-muted-foreground"}`}
          >
            {t.label}
            {tab === t.key && <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-secondary" />}
          </button>
        ))}
      </div>

      {tab === "places" ? (
        <>
          <SearchBar value={query} onChange={setQuery} placeholder="Search places, neighborhoods" />

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/35 text-primary"><MapPin className="h-4 w-4" /></span>
            <span className="flex-1 text-sm text-foreground">Current Location</span>
            <span className="text-xs text-muted-foreground">New York, NY</span>
          </div>

          <div className="mt-3">
            <ActionChips />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>All</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                <span className="flex items-center gap-1">
                  <CategoryIcon category={c} className="h-3.5 w-3.5" />
                  {CATEGORY_LABELS[c]}
                </span>
              </Chip>
            ))}
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {["all", "Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"].map((b) => (
              <Chip key={b} active={borough === b} onClick={() => setBorough(b)}>
                {b === "all" ? "All boroughs" : b}
              </Chip>
            ))}
          </div>

          {query.trim() === "" && category === "all" && borough === "all" && suggestions.length > 0 && (
            <section className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Suggested for you
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
                {suggestions.map((s) => (
                  <div key={s.id} className="w-64 shrink-0">
                    <PlaceCard place={s} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
              {query.trim() ? `${filtered.length} results` : "All places"}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/30 text-primary"><MapPin className="h-5 w-5" /></span>
                <p className="mt-3 text-sm font-semibold text-foreground">No places match that search</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a neighborhood or clear a filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((p) => {
                  const visit = visits.find((v) => v.place_id === p.id);
                  const saved = wtgIds.has(p.id);
                  return (
                    <PlaceCard
                      key={p.id}
                      place={p}
                      score={visit?.score}
                      footer={
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/log/${p.id}`); }}
                            className="flex-1 rounded-full bg-primary py-1.5 text-xs font-medium text-primary-foreground active:scale-95"
                          >
                            {visit ? "Re-log" : "Log"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWantToGo(p); }}
                            className={`flex-1 rounded-full py-1.5 text-xs font-medium ${saved ? "bg-secondary text-secondary-foreground" : "border border-border text-muted-foreground"}`}
                          >
                            {saved ? "Saved" : "Save"}
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Member search coming soon.
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`tap-highlight shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}
