import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useJourni } from "@/lib/JourniDataContext";
import SearchBar from "@/components/SearchBar";
import PlaceCard from "@/components/PlaceCard";
import CategoryIcon, { CATEGORY_LABELS } from "@/components/CategoryIcon";
import { Sparkles, X } from "lucide-react";

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function Home() {
  const navigate = useNavigate();
  const { visits, wantToGo, toggleWantToGo } = useJourni();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [borough, setBorough] = useState("all");
  const [dismissed, setDismissed] = useState([]);

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
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.neighborhood?.toLowerCase().includes(q)
      );
    }
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (borough !== "all") list = list.filter((p) => p.borough === borough);
    return list;
  }, [places, query, category, borough]);

  const visitedIds = new Set(visits.map((v) => v.place_id));
  const wtgIds = new Set(wantToGo.map((w) => w.place_id));

  const suggestions = useMemo(() => {
    // Suggest places the user hasn't logged or saved, prioritize variety.
    const unseen = places.filter((p) => !visitedIds.has(p.id) && !wtgIds.has(p.id));
    const seenCats = new Set(visits.map((v) => v.place_category));
    const novel = unseen.filter((p) => !seenCats.has(p.category));
    const pool = novel.length >= 3 ? novel : unseen;
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  }, [places, visitedIds, wtgIds, visits]);

  return (
    <div className="px-4 pt-5">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Journi</h1>
        <p className="text-sm text-stone-500">Track, rate & rank your NYC.</p>
      </header>

      <SearchBar value={query} onChange={setQuery} />

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
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-700">
            <Sparkles className="h-4 w-4 text-amber-500" /> Suggested for you
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {suggestions
              .filter((s) => !dismissed.includes(s.id))
              .map((s) => (
                <div key={s.id} className="relative w-64 shrink-0">
                  <PlaceCard
                    place={s}
                    footer={
                      <button
                        onClick={(e) => { e.stopPropagation(); setDismissed((d) => [...d, s.id]); }}
                        className="flex items-center gap-1 text-xs text-stone-400"
                      >
                        <X className="h-3 w-3" /> Dismiss
                      </button>
                    }
                  />
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          {query.trim() ? `${filtered.length} results` : "All places"}
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-stone-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
            No places found.
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
                        className="flex-1 rounded-full bg-primary py-1.5 text-xs font-medium text-white active:scale-95"
                      >
                        {visit ? "Re-log" : "Log"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleWantToGo(p); }}
                        className={`flex-1 rounded-full py-1.5 text-xs font-medium active:scale-95 ${saved ? "bg-purple-100 text-purple-700" : "border border-stone-200 text-stone-600"}`}
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
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`tap-highlight shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active ? "border-primary bg-primary text-white" : "border-stone-200 bg-card text-stone-600"
      }`}
    >
      {children}
    </button>
  );
}